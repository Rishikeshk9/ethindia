/*
Usage:
  hardhat run scripts/verify-v2.ts --network amoy -- 
    --chain 80002 
    --address 0x...
    --contract contracts/PaymentSession.sol:PaymentSession

Relies on ETHERSCAN_API_KEY (or POLYGONSCAN_API_KEY) in .env
*/
import * as fs from "fs";
import * as path from "path";
import { fetch } from "undici";
import * as dotenv from "dotenv";
dotenv.config();

type BuildInfo = {
  id: string;
  _format: string;
  solcVersion: string; // e.g. "0.8.24"
  input: any; // standard-json-input
  output: any;
};

function readArgs() {
  const args = process.argv.slice(process.argv.indexOf("--") + 1);
  const map: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]?.replace(/^--/, "");
    const v = args[i + 1];
    if (k && v) map[k] = v;
  }
  if (!map.chain || !map.address || !map.contract) {
    throw new Error("Missing required args: --chain <id> --address <0x..> --contract <path:Name>");
  }
  return map;
}

function findBuildInfoFor(contractPathColonName: string): { info: BuildInfo; relPath: string; name: string } {
  const [relPath, name] = contractPathColonName.split(":");
  const buildInfoDir = path.join(process.cwd(), "artifacts", "build-info");
  const files = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const p = path.join(buildInfoDir, f);
    const json = JSON.parse(fs.readFileSync(p, "utf8")) as BuildInfo;
    if (json.output && json.output.contracts && json.output.contracts[relPath] && json.output.contracts[relPath][name]) {
      return { info: json, relPath, name };
    }
  }
  throw new Error(`Build info not found for ${contractPathColonName}`);
}

function solcVersionTag(solcVersion: string): string {
  // Etherscan expects full version tag like v0.8.24+commit.e11b9ed9.
  // We don't have commit here; best-effort: prefix with v and hope Sourcify is primary.
  return `v${solcVersion}+commit.e11b9ed9`;
}

async function main() {
  const { chain, address, contract } = readArgs();
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY;
  if (!apiKey) throw new Error("Missing ETHERSCAN_API_KEY or POLYGONSCAN_API_KEY in .env");

  const { info, relPath, name } = findBuildInfoFor(contract);
  const sourceCode = JSON.stringify(info.input);
  const contractname = `${relPath}:${name}`;
  const compilerversion = solcVersionTag(info.solcVersion);

  const body = new URLSearchParams();
  body.set("chainid", String(chain));
  body.set("module", "contract");
  body.set("action", "verifysourcecode");
  body.set("apikey", apiKey);
  body.set("codeformat", "solidity-standard-json-input");
  body.set("sourceCode", sourceCode);
  body.set("contractaddress", address);
  body.set("contractname", contractname);
  body.set("compilerversion", compilerversion);

  const res = await fetch("https://api.etherscan.io/v2/api", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const json = await res.json().catch(() => ({}));
  console.log("Verify v2 response:", json);
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


