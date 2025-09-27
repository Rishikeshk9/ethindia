import { ethers } from "hardhat";

const GAME_ID = ethers.id("default.game");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const GameRegistry = await ethers.getContractFactory("GameRegistry");
  const registry = await GameRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("GameRegistry deployed:", registryAddr);

  const tx = await registry.setGame(GAME_ID, deployer.address, true);
  await tx.wait();
  console.log("Game set:", GAME_ID, "signer:", deployer.address);

  const PaymentSession = await ethers.getContractFactory("PaymentSession");
  const session = await PaymentSession.deploy(registryAddr);
  await session.waitForDeployment();
  const sessionAddr = await session.getAddress();
  console.log("PaymentSession deployed:", sessionAddr);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


