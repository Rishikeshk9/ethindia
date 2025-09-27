export const ADDRESSES: Record<number, string | null> = {
  31337: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Anvil (placeholder)
  80002: "0x6d859f944e728dD659Ca58Db736B96A14015F03d" // Amoy (latest PaymentSession)
};

export const PAYMENT_SESSION_ABI = [
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

export const USDC_ADDRESSES: Record<number, string | null> = {
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  80002: "0x7FFB2e5fb52F2043aFbd1644dCECc27900A1BF73"
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
  }
];


