import { ethers } from "hardhat";

const GAME_IDS = [
  "default.game",
  "shooter.game",
  "racer.game"
];

async function main() {
  const registryAddr = process.env.GAME_REGISTRY_ADDRESS || "0xAB476Ca5De5C30581b09F3F9eCc262B1C4a5ABD3";
  const [deployer] = await ethers.getSigners();
  console.log("Using registry:", registryAddr, "signer:", deployer.address);
  const reg = await ethers.getContractAt("GameRegistry", registryAddr);
  for (const name of GAME_IDS) {
    const gameId = ethers.id(name);
    const tx = await reg.setGame(gameId, deployer.address, true);
    await tx.wait();
    console.log("Set game:", name, gameId);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });


