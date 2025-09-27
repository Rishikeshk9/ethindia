// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGameRegistry {
    struct GameInfo { address signer; bool enabled; }
    function getGame(bytes32 gameId) external view returns (GameInfo memory);
}

/// Simple x402-like session escrow with token-per-second metering.
/// - User approves budget in ERC20 to this contract, then calls open(...)
/// - Session accrues owed = min(budget, ratePerSecond * elapsedSeconds)
/// - On close, contract transfers owed to payee and refunds the remainder to user
contract PaymentSession {
    // EIP-712 domain separator parts
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant OFFER_TYPEHASH = keccak256("Offer(bytes32 gameId,address token,address payee,uint256 budget,uint256 ratePerSecond,uint256 nonce,uint64 expiry)");
    bytes32 private constant NAME_HASH = keccak256("PaymentSession");
    bytes32 private constant VERSION_HASH = keccak256("1");

    IGameRegistry public registry;
    mapping(bytes32 => bool) public usedOfferNonce; // nonce -> used
    struct Session {
        address token;            // ERC20 used for payments (e.g., mUSDC)
        address payee;            // Recipient of metered payments
        uint256 budget;           // Total budget escrowed (token units)
        uint256 ratePerSecond;    // Token units per second
        uint64 startedAt;         // Start timestamp
        bool active;              // Active flag
    }

    event SessionOpened(
        address indexed user,
        bytes32 indexed sessionId,
        address indexed token,
        address payee,
        uint256 budget,
        uint256 ratePerSecond,
        uint64 startedAt
    );
    event SessionClosed(
        address indexed user,
        bytes32 indexed sessionId,
        address indexed token,
        address payee,
        uint256 spent,
        uint256 refund,
        uint64 closedAt
    );

    // user => id => Session
    mapping(address => mapping(bytes32 => Session)) private sessionsByUserAndId;

    function getSession(address user, bytes32 sessionId) external view returns (Session memory) {
        return sessionsByUserAndId[user][sessionId];
    }

    function getAccrued(address user, bytes32 sessionId) public view returns (uint256 spent, uint256 elapsed, uint256 budget) {
        Session memory s = sessionsByUserAndId[user][sessionId];
        if (!s.active) return (0, 0, 0);
        budget = s.budget;
        elapsed = uint256(block.timestamp - s.startedAt);
        uint256 owed = elapsed * s.ratePerSecond;
        spent = owed > budget ? budget : owed;
    }

    /// Open a metered session by escrowing `budget` tokens from msg.sender.
    /// Requirements: msg.sender approved `budget` to this contract beforehand.
    function open(bytes32 sessionId, address token, address payee, uint256 budget, uint256 ratePerSecond) external {
        require(token != address(0), "token");
        require(payee != address(0), "payee");
        require(budget > 0, "budget=0");
        require(ratePerSecond > 0, "rate=0");
        Session storage s = sessionsByUserAndId[msg.sender][sessionId];
        require(!s.active, "active");

        // Pull tokens from user
        require(IERC20(token).transferFrom(msg.sender, address(this), budget), "pull");

        // Init session
        s.token = token;
        s.payee = payee;
        s.budget = budget;
        s.ratePerSecond = ratePerSecond;
        s.startedAt = uint64(block.timestamp);
        s.active = true;

        emit SessionOpened(msg.sender, sessionId, token, payee, budget, ratePerSecond, s.startedAt);
    }

    struct Offer {
        bytes32 gameId;
        address token;
        address payee;
        uint256 budget;
        uint256 ratePerSecond;
        uint256 nonce;
        uint64 expiry;
    }

    constructor(IGameRegistry _registry) {
        registry = _registry;
    }

    function openWithOffer(bytes32 sessionId, Offer calldata offer, bytes calldata sig) external {
        require(block.timestamp <= offer.expiry, "expired");
        require(!usedOfferNonce[bytes32(offer.nonce)], "nonce used");

        IGameRegistry.GameInfo memory g = registry.getGame(offer.gameId);
        require(g.enabled && g.signer != address(0), "game disabled");

        // EIP-712 digest
        bytes32 structHash = keccak256(abi.encode(
            OFFER_TYPEHASH,
            offer.gameId,
            offer.token,
            offer.payee,
            offer.budget,
            offer.ratePerSecond,
            offer.nonce,
            offer.expiry
        ));
        bytes32 domainSeparator = keccak256(abi.encode(
            EIP712_DOMAIN_TYPEHASH,
            NAME_HASH,
            VERSION_HASH,
            block.chainid,
            address(this)
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (bytes32 r, bytes32 s, uint8 v) = _split(sig);
        address recovered = ecrecover(digest, v, r, s);
        require(recovered == g.signer, "bad sig");
        usedOfferNonce[bytes32(offer.nonce)] = true;

        // proceed like open
        _openInternal(msg.sender, sessionId, offer.token, offer.payee, offer.budget, offer.ratePerSecond);
    }

    function _openInternal(address user, bytes32 sessionId, address token, address payee, uint256 budget, uint256 ratePerSecond) internal {
        require(IERC20(token).transferFrom(user, address(this), budget), "pull");
        Session storage s = sessionsByUserAndId[user][sessionId];
        require(!s.active, "active");
        s.token = token;
        s.payee = payee;
        s.budget = budget;
        s.ratePerSecond = ratePerSecond;
        s.startedAt = uint64(block.timestamp);
        s.active = true;
        emit SessionOpened(user, sessionId, token, payee, budget, ratePerSecond, s.startedAt);
    }

    function _split(bytes memory sig) private pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "sig len");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /// Close session, pay accrued to payee and refund remaining to user.
    function close(bytes32 sessionId) external {
        Session storage s = sessionsByUserAndId[msg.sender][sessionId];
        require(s.active, "no session");

        (uint256 spent, , uint256 budget) = getAccrued(msg.sender, sessionId);
        uint256 refund = budget - spent;

        // Zero-out before external calls
        address token = s.token;
        address payee = s.payee;
        s.active = false;
        s.token = address(0);
        s.payee = address(0);
        s.budget = 0;
        s.ratePerSecond = 0;
        s.startedAt = 0;

        if (spent > 0) require(IERC20(token).transfer(payee, spent), "pay");
        if (refund > 0) require(IERC20(token).transfer(msg.sender, refund), "refund");

        emit SessionClosed(msg.sender, sessionId, token, payee, spent, refund, uint64(block.timestamp));
    }
}

