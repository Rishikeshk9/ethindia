export const PAYMENT_SESSION_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Anvil default

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
  }
];

