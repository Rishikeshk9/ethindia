export const ADDRESSES: Record<number, string | null> = {
  31337: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  80002: "0x2DF53aeF059e623b969a1c54D56e58591A9368C1"
};

export const REGISTRY_ADDRESSES: Record<number, string | null> = {
  31337: null, // not deployed on localnet
  80002: "0xBD02066D1f963e55f1aF2Fe6D1885E8679392F7f"
};

export const PAYMENT_SESSION_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" },
      { "components": [
          { "internalType": "bytes32", "name": "gameId", "type": "bytes32" },
          { "internalType": "address", "name": "token", "type": "address" },
          { "internalType": "address", "name": "payee", "type": "address" },
          { "internalType": "uint256", "name": "budget", "type": "uint256" },
          { "internalType": "uint256", "name": "ratePerSecond", "type": "uint256" },
          { "internalType": "uint256", "name": "nonce", "type": "uint256" },
          { "internalType": "uint64", "name": "expiry", "type": "uint64" }
        ], "internalType": "struct PaymentSession.Offer", "name": "offer", "type": "tuple" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "openWithOffer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "payee", "type": "address" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" },
      { "internalType": "uint256", "name": "ratePerSecond", "type": "uint256" }
    ],
    "name": "open",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ],
    "name": "close",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "user", "type": "address" }, { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ],
    "name": "getAccrued",
    "outputs": [
      { "internalType": "uint256", "name": "spent", "type": "uint256" },
      { "internalType": "uint256", "name": "elapsed", "type": "uint256" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "user", "type": "address" }, { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ],
    "name": "getSession",
    "outputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "payee", "type": "address" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" },
      { "internalType": "uint256", "name": "ratePerSecond", "type": "uint256" },
      { "internalType": "uint64", "name": "startedAt", "type": "uint64" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const REGISTRY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "gameId", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "signer", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "enabled", "type": "bool" }
    ],
    "name": "GameUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getAllGames",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "getGame",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "signer",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "enabled",
            "type": "bool"
          }
        ],
        "internalType": "struct GameRegistry.GameInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const USDC_ADDRESSES: Record<number, string | null> = {
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  80002: "0xE6599241896a3DC9Ec2F947AdFd80DFb4414e7De"
};

export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];


