import { ethers } from "hardhat";

async function main() {
  const PaymentSession = await ethers.getContractFactory("PaymentSession");
  const contract = await PaymentSession.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("PaymentSession (Amoy) deployed to:", addr);
  // No constructor args; verification happens via separate step
  try {
    await (ethers as any).run("verify:verify", { address: addr, constructorArguments: [] });
    console.log("Verified PaymentSession at", addr);
  } catch (e) {
    console.warn("Verify skipped/failed:", (e as any)?.message || e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

