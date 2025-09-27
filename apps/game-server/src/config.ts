export const PAYMENT_SESSION_ADDRESS = "0x2DF53aeF059e623b969a1c54D56e58591A9368C1"; // Amoy latest (offer-based)
export const USDC_ADDRESSES: Record<number, string> = {
  31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  80002: "0xE6599241896a3DC9Ec2F947AdFd80DFb4414e7De"
};

export const PAYMENT_SESSION_ABI = [
  { "inputs": [
      { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "payee", "type": "address" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" },
      { "internalType": "uint256", "name": "ratePerSecond", "type": "uint256" }
    ], "name": "open", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ], "name": "close", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "user", "type": "address" }, { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ], "name": "getAccrued", "outputs": [
      { "internalType": "uint256", "name": "spent", "type": "uint256" },
      { "internalType": "uint256", "name": "elapsed", "type": "uint256" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" }
    ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "user", "type": "address" }, { "internalType": "bytes32", "name": "sessionId", "type": "bytes32" } ], "name": "getSession", "outputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "payee", "type": "address" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" },
      { "internalType": "uint256", "name": "ratePerSecond", "type": "uint256" },
      { "internalType": "uint64", "name": "startedAt", "type": "uint64" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ], "stateMutability": "view", "type": "function" }
];

export const RPC_AMOY = process.env.AMOY_RPC_URL || process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";

