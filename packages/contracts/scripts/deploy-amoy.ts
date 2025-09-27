import { ethers } from "hardhat";

async function main() {
  const PaymentSession = await ethers.getContractFactory("PaymentSession");
  const contract = await PaymentSession.deploy();
  await contract.waitForDeployment();
  console.log("PaymentSession (Amoy) deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

