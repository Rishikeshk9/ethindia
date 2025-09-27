export const PAYMENT_SESSION_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Anvil default deploy address

export const PAYMENT_SESSION_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "budgetUsd", "type": "uint256" }
    ],
    "name": "open",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "close",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "budgetUsdByUser",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "budgetUsd", "type": "uint256" },
      { "indexed": false, "internalType": "uint64", "name": "openedAt", "type": "uint64" }
    ],
    "name": "SessionOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "spentUsd", "type": "uint256" },
      { "indexed": false, "internalType": "uint64", "name": "closedAt", "type": "uint64" }
    ],
    "name": "SessionClosed",
    "type": "event"
  }
];


