"use client";
import { useEffect, useMemo, useState } from "react";
import { createConfig, http, useAccount, useConnect, useDisconnect, WagmiConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther } from "viem";
import { createPublicClient, createWalletClient, custom, parseEther } from "viem";
import { foundry } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PAYMENT_SESSION_ADDRESS, PAYMENT_SESSION_ABI } from "../config/contracts";

const config = createConfig({
  chains: [foundry],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545")
  },
  connectors: [injected()] as any
});

function GameInner() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const [offer, setOffer] = useState<any>(null);
  const [status, setStatus] = useState<string>("idle");

  const publicClient = useMemo(() => createPublicClient({ chain: foundry, transport: http("http://127.0.0.1:8545") }), []);

  useEffect(() => {
    fetch("http://localhost:4000/offer").then(r => r.json()).then(setOffer).catch(() => setOffer(null));
  }, []);

  async function addAnvilNetwork() {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      await (window.ethereum as any).request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x7A69", // 31337
            chainName: "Anvil Localhost",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"],
            blockExplorerUrls: []
          }
        ]
      });
      alert("Anvil network added to MetaMask");
    } catch (e) {
      console.error(e);
      alert("Failed to add network. Check console.");
    }
  }

  async function openSession() {
    if (!window.ethereum) return alert("Install MetaMask");
    const walletClient = createWalletClient({ chain: foundry, transport: custom(window.ethereum as any) });
    const [account] = await walletClient.getAddresses();
    setStatus("opening");
    try {
      await walletClient.writeContract({
        address: PAYMENT_SESSION_ADDRESS as `0x${string}`,
        abi: PAYMENT_SESSION_ABI as any,
        functionName: "open",
        args: [BigInt(5)],
        account
      });
      setStatus("open");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  async function closeSession() {
    if (!window.ethereum) return;
    const walletClient = createWalletClient({ chain: foundry, transport: custom(window.ethereum as any) });
    const [account] = await walletClient.getAddresses();
    setStatus("closing");
    try {
      await walletClient.writeContract({
        address: PAYMENT_SESSION_ADDRESS as `0x${string}`,
        abi: PAYMENT_SESSION_ABI as any,
        functionName: "close",
        args: [],
        account
      });
      setStatus("closed");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Match402</h1>
      <p>Pay-per-minute multiplayer with agentic micro-payments.</p>
      <p>Local PaymentSession: <code>{PAYMENT_SESSION_ADDRESS}</code></p>
      <div style={{ marginTop: 16 }}>
        {!isConnected ? (
          <button onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>Connect Wallet</button>
        ) : (
          <button onClick={() => disconnect()}>Disconnect</button>
        )}
        <button onClick={addAnvilNetwork} style={{ marginLeft: 8 }}>Add Anvil to MetaMask</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={openSession} disabled={!isConnected || status === "opening"}>Open Session (budget 5 USD)</button>
        <button onClick={closeSession} disabled={!isConnected || status === "closing"} style={{ marginLeft: 8 }}>Close Session</button>
        <div>Status: {status}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <pre>{offer ? JSON.stringify(offer, null, 2) : "Loading offer..."}</pre>
      </div>
    </main>
  );
}

export default function Home() {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <GameInner />
      </WagmiConfig>
    </QueryClientProvider>
  );
}

