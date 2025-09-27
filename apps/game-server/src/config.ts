export const PAYMENT_SESSION_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Latest deploy
export const USDC_ADDRESSES: Record<number, string> = {
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  80002: "0x7FFB2e5fb52F2043aFbd1644dCECc27900A1BF73"
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
  }
];

