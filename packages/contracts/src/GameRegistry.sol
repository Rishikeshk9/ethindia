// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Minimal registry to authorize per-game signers and enable/disable games.
contract GameRegistry {
    address public owner;

    struct GameInfo {
        address signer; // EIP-712 signer used to authorize offers
        bool enabled;
    }

    mapping(bytes32 => GameInfo) private gameIdToInfo;

    event OwnerTransferred(address indexed prev, address indexed next);
    event GameUpdated(bytes32 indexed gameId, address indexed signer, bool enabled);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setGame(bytes32 gameId, address signer, bool enabled) external onlyOwner {
        require(gameId != bytes32(0), "gameId");
        gameIdToInfo[gameId] = GameInfo({ signer: signer, enabled: enabled });
        emit GameUpdated(gameId, signer, enabled);
    }

    function getGame(bytes32 gameId) external view returns (GameInfo memory) {
        return gameIdToInfo[gameId];
    }
}


