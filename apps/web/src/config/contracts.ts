export const ADDRESSES: Record<number, string | null> = {
  31337: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Anvil
  80002: null // fill after Amoy deploy
};

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


