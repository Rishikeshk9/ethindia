import dotenv from "dotenv";
import path from "node:path";
// Load env from current dir and monorepo root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../packages/contracts/.env") });
import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import { createPublicClient, http, toBytes, keccak256, createWalletClient } from "viem";
import { polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { PAYMENT_SESSION_ADDRESS, PAYMENT_SESSION_ABI, RPC_AMOY, USDC_ADDRESSES } from "./config";

const ALL_GAMES = [
  { id: "default.game", name: "Default Arena", priceUsdPerMinute: 0.03, token: "mUSDC" },
  { id: "shooter.game", name: "Blaster Royale", priceUsdPerMinute: 0.10, token: "mUSDC" },
  { id: "racer.game", name: "Turbo Racer", priceUsdPerMinute: 0.06, token: "mUSDC" }
];

const fastify = Fastify({ logger: true });
const signerPriv = (process.env.GAME_SIGNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || "").trim();
const signer = signerPriv ? privateKeyToAccount((signerPriv.startsWith("0x") ? signerPriv : ("0x" + signerPriv)) as `0x${string}`) : null;

fastify.get("/health", async () => ({ ok: true }));

fastify.post("/faucet", async (req, reply) => {
  try {
    if (!signer) return reply.code(500).send({ error: "server signer not configured" });
    const { address } = (req as any).body || {};
    if (!address || !address.startsWith("0x")) {
      return reply.code(400).send({ error: "invalid address" });
    }
    const tokenAddress = USDC_ADDRESSES[polygonAmoy.id];
    const walletClient = createWalletClient({ account: signer, chain: polygonAmoy, transport: http(RPC_AMOY) });
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: [{ "inputs": [{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}], "name":"mint", "outputs":[], "stateMutability":"nonpayable", "type":"function" }] as any,
      functionName: "mint",
      args: [address, BigInt(100) * BigInt(10 ** 18)]
    });
    return { hash };
  } catch (e: any) {
    return reply.code(500).send({ error: String(e?.message || e) });
  }
});

// EIP-712 Signed Offer endpoint
fastify.get("/offer", async (req, reply) => {
  try {
    if (!signer) return reply.code(500).send({ error: "server signer not configured" });
    const q: any = (req as any).query || {};
    const gameIdRaw = String(q.gameId || "default.game");
    const token = (q.token as string) || USDC_ADDRESSES[polygonAmoy.id];
    const payee = (q.payee as string) || signer.address;
    const now = Math.floor(Date.now() / 1000);
    const expiry = BigInt(now + Number(q.expiry || 3600));
    const nonce = BigInt(BigInt.asUintN(64, BigInt(now)) ^ BigInt(Math.floor(Math.random() * 1e9)));

    // Budget/Rate in token units (derive from USD if needed)
    const pc = createPublicClient({ chain: polygonAmoy, transport: http(RPC_AMOY) });
    const decimals: number = await pc.readContract({
      address: token as `0x${string}`,
      abi: [{ inputs: [], name: "decimals", outputs: [{ internalType: "uint8", name: "", type: "uint8" }], stateMutability: "view", type: "function" }] as any,
      functionName: "decimals",
      args: []
    }) as any;
    let budget: bigint;
    let ratePerSecond: bigint;
    if (q.budgetTokens && q.rateTokensPerSecond) {
      budget = BigInt(q.budgetTokens);
      ratePerSecond = BigInt(q.rateTokensPerSecond);
    } else {
      const selectedGame = ALL_GAMES.find(g => g.id === gameIdRaw) || ALL_GAMES[0];
      const budgetUsd = Number(q.budgetUsd || 5);
      const rateUsdPerMinute = selectedGame.priceUsdPerMinute;
      const rateUsdPerSecond = Number(q.rateUsdPerSecond || (rateUsdPerMinute / 60));
      const scale = Math.pow(10, decimals);
      budget = BigInt(Math.floor(budgetUsd * scale));
      ratePerSecond = BigInt(Math.max(1, Math.floor(rateUsdPerSecond * scale)));
    }

    const gameId = gameIdRaw.startsWith("0x") && gameIdRaw.length === 66
      ? (gameIdRaw as `0x${string}`)
      : (keccak256(toBytes(gameIdRaw)) as `0x${string}`);

    const domain = {
      name: "PaymentSession",
      version: "1",
      chainId: polygonAmoy.id,
      verifyingContract: PAYMENT_SESSION_ADDRESS as `0x${string}`
    } as const;
    const types = {
      Offer: [
        { name: "gameId", type: "bytes32" },
        { name: "token", type: "address" },
        { name: "payee", type: "address" },
        { name: "budget", type: "uint256" },
        { name: "ratePerSecond", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint64" }
      ]
    } as const;
    const offer = {
      gameId,
      token: token as `0x${string}`,
      payee: payee as `0x${string}`,
      budget,
      ratePerSecond,
      nonce,
      expiry
    } as const;
    const sig = await signer.signTypedData({ domain, types, primaryType: "Offer", message: offer });
    return {
      offer: {
        ...offer,
        budget: offer.budget.toString(),
        ratePerSecond: offer.ratePerSecond.toString(),
        nonce: offer.nonce.toString(),
        expiry: Number(offer.expiry)
      },
      sig
    };
  } catch (e: any) {
    return reply.code(500).send({ error: String(e?.message || e) });
  }
});

const subscribers = new Map<string, Set<any>>(); // key: user|sessionId -> set of ws
const trackedByUser = new Map<string, Set<string>>(); // user -> set of sessionIds
const sessionMeta = new Map<string, { gameId?: string }>(); // key -> metadata

function makeKey(address: string, sessionId?: string) {
  return sessionId ? `${address.toLowerCase()}|${sessionId.toLowerCase()}` : address.toLowerCase();
}
function subscribe(address: string, ws: any, sessionId?: string) {
  const key = makeKey(address, sessionId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(ws);
  if (sessionId) {
    const u = address.toLowerCase();
    if (!trackedByUser.has(u)) trackedByUser.set(u, new Set());
    trackedByUser.get(u)!.add(sessionId.toLowerCase());
    sessionMeta.set(key, { gameId: undefined });
  }
}
function unsubscribe(ws: any) {
  for (const set of subscribers.values()) set.delete(ws);
}
function push(address: string, payload: any, sessionId?: string) {
  const set = subscribers.get(makeKey(address, sessionId));
  if (!set) return;
  for (const ws of set) {
    try { ws.send(JSON.stringify(payload)); } catch {}
  }
}

const pc = createPublicClient({ chain: polygonAmoy, transport: http(RPC_AMOY) });

async function pollUser(address: `0x${string}`, sessionId: `0x${string}`) {
  try {
    const args = [address, sessionId] as const;
    const [spent, elapsed, budget] = await pc.readContract({
      address: PAYMENT_SESSION_ADDRESS as `0x${string}`,
      abi: PAYMENT_SESSION_ABI as any,
      functionName: "getAccrued",
      args
    }) as unknown as [bigint, bigint, bigint];
    const session = await pc.readContract({
      address: PAYMENT_SESSION_ADDRESS as `0x${string}`,
      abi: PAYMENT_SESSION_ABI as any,
      functionName: "getSession",
      args
    }) as unknown as [string, string, bigint, bigint, bigint, boolean];
    const active = session[5];
    const meta = sessionMeta.get(makeKey(address, sessionId)) || {};
    push(address, { type: "tick", active, spent: spent.toString(), elapsed: Number(elapsed), budget: budget.toString(), sessionId, gameId: meta.gameId }, sessionId);
  } catch (e) {
    // ignore
  }
}

setInterval(async () => {
  for (const key of subscribers.keys()) {
    const [addr, sid] = key.split("|");
    if (sid) await pollUser(addr as `0x${string}`, sid as `0x${string}`);
  }
}, 1000);

const start = async () => {
  await fastify.register(cors, { origin: ["http://localhost:3000", "http://127.0.0.1:3000"] });
  await fastify.listen({ port: 4000, host: "0.0.0.0" });
  const server = (fastify.server as any);
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === "subscribe" && typeof msg.address === "string") {
          if (!msg.sessionId || typeof msg.sessionId !== "string") {
            ws.send(JSON.stringify({ type: "error", message: "sessionId required" }));
            return;
          }
          subscribe(msg.address, ws, msg.sessionId);
          const key = makeKey(msg.address, msg.sessionId);
          const prev = sessionMeta.get(key) || {};
          sessionMeta.set(key, { ...prev, gameId: typeof msg.gameId === "string" ? msg.gameId : prev.gameId });
          ws.send(JSON.stringify({ type: "subscribed", address: msg.address, sessionId: msg.sessionId }));
        } else if (msg?.type === "unsubscribe" && typeof msg.address === "string") {
          const key = makeKey(msg.address, msg.sessionId);
          subscribers.get(key)?.delete(ws);
          ws.send(JSON.stringify({ type: "unsubscribed", address: msg.address, sessionId: msg.sessionId }));
        }
      } catch {}
    });
    ws.on("close", () => unsubscribe(ws));
    ws.send(JSON.stringify({ type: "hello" }));
  });
};

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});

// --- REST: session snapshot and listing ---
fastify.get("/session", async (req, reply) => {
  try {
    const q: any = (req as any).query || {};
    const address = String(q.address || "");
    const sessionId = String(q.sessionId || "");
    if (!address || !sessionId) return reply.code(400).send({ error: "address and sessionId required" });
    if (!address.startsWith("0x") || address.length !== 42) return reply.code(400).send({ error: "invalid address" });
    if (!sessionId.startsWith("0x") || sessionId.length !== 66) return reply.code(400).send({ error: "invalid sessionId" });
    const args = [address as `0x${string}`, sessionId as `0x${string}`] as const;
    const [spent, elapsed, budget] = await pc.readContract({ address: PAYMENT_SESSION_ADDRESS as `0x${string}`, abi: PAYMENT_SESSION_ABI as any, functionName: "getAccrued", args }) as unknown as [bigint, bigint, bigint];
    const session = await pc.readContract({ address: PAYMENT_SESSION_ADDRESS as `0x${string}`, abi: PAYMENT_SESSION_ABI as any, functionName: "getSession", args }) as unknown as [string, string, bigint, bigint, bigint, boolean];
    const [token, payee, sbudget, ratePerSecond, startedAt, active] = session;
    const key = makeKey(address, sessionId);
    const meta = sessionMeta.get(key) || {};
    return { address, sessionId, gameId: meta.gameId, active, token, payee, budget: sbudget.toString(), ratePerSecond: ratePerSecond.toString(), startedAt: Number(startedAt), spent: spent.toString(), elapsed: Number(elapsed) };
  } catch (e: any) {
    return reply.code(500).send({ error: String(e?.message || e) });
  }
});

fastify.get("/sessions", async (req, reply) => {
  try {
    const q: any = (req as any).query || {};
    const address = String(q.address || "").toLowerCase();
    if (!address) return reply.code(400).send({ error: "address required" });
    const set = trackedByUser.get(address) || new Set<string>();
    const list = Array.from(set);
    return { address, sessionIds: list };
  } catch (e: any) {
    return reply.code(500).send({ error: String(e?.message || e) });
  }
});

