/*
Submit standard-json-input verification to Etherscan API v2 (supports Polygon Amoy via chainid) and poll status.
Usage:
  node scripts/verify-polygonscan.ts -- --address 0x... --contract src/PaymentSession.sol:PaymentSession --chainid 80002
Env:
  ETHERSCAN_API_KEY or POLYGONSCAN_API_KEY
*/
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

type BuildInfo = {
  solcVersion: string;
  input: any;
  output: any;
};

function args() {
  const idx = process.argv.indexOf("--");
  const arr = idx >= 0 ? process.argv.slice(idx + 1) : [];
  const map: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) {
    const k = arr[i]?.replace(/^--/, "");
    const v = arr[i + 1];
    if (k && v) map[k] = v;
  }
  if (!map.address || !map.contract) {
    throw new Error("Missing --address and --contract <src/Path.sol:Name>");
  }
  return map;
}

function loadBuild(contractPathColon: string): { info: BuildInfo; relPath: string; name: string } {
  const [relPath, name] = contractPathColon.split(":");
  const dir = path.join(process.cwd(), "artifacts", "build-info");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as BuildInfo;
    if (j.output?.contracts?.[relPath]?.[name]) {
      return { info: j, relPath, name };
    }
  }
  throw new Error(`Build info not found for ${contractPathColon}`);
}

function solcTag(v: string): string {
  // Best-known commit for 0.8.24
  const commit = v === "0.8.24" ? "+commit.e11b9ed9" : "+commit.unknown";
  return `v${v}${commit}`;
}

async function post(params: Record<string, string>, chainid?: string) {
  const bodyObj = { ...params } as Record<string, string>;
  // Ensure chainid is placed in query string per Etherscan v2 requirements
  if (chainid) delete bodyObj.chainid;
  const body = new URLSearchParams(bodyObj);
  const base = "https://api.etherscan.io/v2/api";
  const url = chainid ? `${base}?chainid=${encodeURIComponent(chainid)}` : base;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  } as any);
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

async function main() {
  const { address, contract } = args();
  let { chainid } = args();
  if (!chainid) chainid = "80002"; // default Polygon Amoy
  // Load API key from either unified v2 variable or legacy
  let apiKey = process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY || process.env.OKLINK_API_KEY || "";
  if (!apiKey) {
    // try parent .env
    const rootEnv = path.resolve(process.cwd(), "../.env");
    if (fs.existsSync(rootEnv)) {
      dotenv.config({ path: rootEnv });
      apiKey = process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY || process.env.OKLINK_API_KEY || "";
    }
  }
  if (!apiKey) throw new Error("ETHERSCAN_API_KEY or POLYGONSCAN_API_KEY not set");
  const { info, relPath, name } = loadBuild(contract);
  const sourceCode = JSON.stringify(info.input);
  const contractname = `${relPath}:${name}`;
  const compilerversion = solcTag(info.solcVersion);

  const submit = await post({
    module: "contract",
    action: "verifysourcecode",
    apikey: apiKey,
    codeformat: "solidity-standard-json-input",
    sourceCode,
    contractaddress: address,
    contractname,
    compilerversion
  }, chainid);
  console.log("submit:", submit.json);
  if (!submit.ok || submit.json.status !== "1") {
    process.exitCode = 1;
    return;
  }
  const guid: string = submit.json.result;
  // poll
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const st = await post({ module: "contract", action: "checkverifystatus", guid, apikey: apiKey }, chainid);
    console.log("status:", st.json);
    const msg = String(st.json?.message || "");
    if (msg.includes("Pass") || st.json?.result?.includes?.("Pass")) {
      console.log("Verified on Polygonscan:", address);
      return;
    }
    if (msg.includes("Already Verified")) {
      console.log("Already verified on Polygonscan:", address);
      return;
    }
  }
  console.warn("Verification polling timed out for", address);
}

// Node18+ fetch
declare const fetch: any;

main().catch(e => { console.error(e); process.exitCode = 1; });


