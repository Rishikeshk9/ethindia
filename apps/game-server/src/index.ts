import Fastify from "fastify";
import cors from "@fastify/cors";
import { WebSocketServer } from "ws";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";
import { PAYMENT_SESSION_ADDRESS, PAYMENT_SESSION_ABI, RPC_AMOY } from "./config";

const fastify = Fastify({ logger: true });

fastify.get("/health", async () => ({ ok: true }));

// Simple 402 offer endpoint for demo
fastify.get("/offer", async () => ({
  origin: "match.demo",
  priceUsdPerMinute: 0.03,
  maxMinutes: 30,
  assetSymbol: "USDC",
  rateUsdPerSecond: 0.03 / 60
}));

const subscribers = new Map<string, Set<any>>(); // key: user|sessionId -> set of ws
const trackedByUser = new Map<string, Set<string>>(); // user -> set of sessionIds

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
    push(address, { type: "tick", active, spent: spent.toString(), elapsed: Number(elapsed), budget: budget.toString(), sessionId }, sessionId);
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
    return { address, sessionId, active, token, payee, budget: sbudget.toString(), ratePerSecond: ratePerSecond.toString(), startedAt: Number(startedAt), spent: spent.toString(), elapsed: Number(elapsed) };
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

