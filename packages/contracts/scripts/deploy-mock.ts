import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const musdc = await MockUSDC.deploy();
  await musdc.waitForDeployment();
  const addr = await musdc.getAddress();
  console.log("MockUSDC deployed to:", addr);
  try {
    await (ethers as any).run("verify:verify", { address: addr, constructorArguments: [] });
    console.log("Verified MockUSDC at", addr);
  } catch (e) {
    console.warn("Verify skipped/failed:", (e as any)?.message || e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

