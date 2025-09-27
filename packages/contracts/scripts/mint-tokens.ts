import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const tokenAddress = process.env.MOCK_USDC_ADDRESS || "0xE6599241896a3DC9Ec2F947AdFd80DFb4414e7De";
  const userAddress = process.env.USER_ADDRESS || "0x2ab2Ce5e3830d1d212009e57ec74BB0B1A51Ab3e";
  
  const token = await ethers.getContractAt("MockUSDC", tokenAddress);
  
  // Check current balance
  const balanceBefore = await token.balanceOf(userAddress);
  console.log("Balance before:", ethers.formatEther(balanceBefore), "mUSDC");
  
  // Mint 1000 tokens to user
  const tx = await token.mint(userAddress, ethers.parseEther("1000"));
  await tx.wait();
  console.log("Minted 1000 mUSDC to", userAddress);
  
  // Check new balance
  const balanceAfter = await token.balanceOf(userAddress);
  console.log("Balance after:", ethers.formatEther(balanceAfter), "mUSDC");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
