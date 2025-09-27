import { ethers } from "hardhat";

async function main() {
  const tokenAddress = process.env.MOCK_USDC_ADDRESS || "0xE6599241896a3DC9Ec2F947AdFd80DFb4414e7De";
  const spenderAddress = process.env.PAYMENT_SESSION_ADDRESS || "0x2DF53aeF059e623b969a1c54D56e58591A9368C1"; // PaymentSession
  
  // This will be run with your wallet address as the signer
  const [signer] = await ethers.getSigners();
  console.log("Approver:", signer.address);
  
  const token = await ethers.getContractAt("MockUSDC", tokenAddress);
  
  // Check current balance and allowance
  const balance = await token.balanceOf(signer.address);
  const currentAllowance = await token.allowance(signer.address, spenderAddress);
  
  console.log("Balance:", ethers.formatEther(balance), "mUSDC");
  console.log("Current allowance:", ethers.formatEther(currentAllowance), "mUSDC");
  
  // Approve a huge amount (1 million tokens)
  const approveAmount = ethers.parseEther("1000000");
  const tx = await token.approve(spenderAddress, approveAmount);
  await tx.wait();
  
  console.log("Approved", ethers.formatEther(approveAmount), "mUSDC to PaymentSession");
  
  // Verify the approval
  const newAllowance = await token.allowance(signer.address, spenderAddress);
  console.log("New allowance:", ethers.formatEther(newAllowance), "mUSDC");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
