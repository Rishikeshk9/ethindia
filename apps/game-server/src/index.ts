import Fastify from "fastify";
import { WebSocketServer } from "ws";

const fastify = Fastify({ logger: true });

fastify.get("/health", async () => ({ ok: true }));

// Simple 402 offer endpoint for demo
fastify.get("/offer", async () => ({
  origin: "match.demo",
  priceUsdPerMinute: 0.03,
  maxMinutes: 30,
  assetSymbol: "USDC"
}));

const start = async () => {
  await fastify.listen({ port: 4000, host: "0.0.0.0" });
  const server = (fastify.server as any);
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "hello" }));
  });
};

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});

