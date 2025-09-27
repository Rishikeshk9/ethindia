"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createConfig, http, useAccount, useChainId, useConnect, useDisconnect, WagmiConfig, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther } from "viem";
import { createPublicClient, createWalletClient, custom, parseEther, keccak256, toBytes, http as viemHttp } from "viem";
import { foundry, polygonAmoy } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ADDRESSES, PAYMENT_SESSION_ABI, ERC20_ABI, USDC_ADDRESSES, REGISTRY_ADDRESSES, REGISTRY_ABI } from "../config/contracts";

const ALL_GAMES = [
  { id: "default.game", name: "Default Arena", priceUsdPerMinute: 0.03, token: "mUSDC" },
  { id: "shooter.game", name: "Blaster Royale", priceUsdPerMinute: 0.10, token: "mUSDC" },
  { id: "racer.game", name: "Turbo Racer", priceUsdPerMinute: 0.06, token: "mUSDC" }
];

const config = createConfig({
  chains: [foundry, polygonAmoy],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
    [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology")
  },
  connectors: [injected()] as any
});

function GameInner() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [offer, setOffer] = useState<any>(null);
  const [status, setStatus] = useState<string>("idle");
  const [spentUsd, setSpentUsd] = useState<number>(0);
  const tickIdRef = useRef<any>(null);
  const openedAtMsRef = useRef<number | null>(null);
  const budgetUsd = 5;
  const [accountAddr, setAccountAddr] = useState<`0x${string}` | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenUnit, setTokenUnit] = useState<bigint>(BigInt(10) ** BigInt(18));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>(ALL_GAMES[0].id);
  const [games, setGames] = useState<typeof ALL_GAMES>([]);
  const [balance, setBalance] = useState<string>("0");

  // derive active contract address by connected chain
  const currentAddress = useMemo(() => (ADDRESSES as any)[chainId] ?? null, [chainId]);
  const currentRegistryAddress = useMemo(() => (REGISTRY_ADDRESSES as any)[chainId] ?? null, [chainId]);
  const activeChain = useMemo(() => (chainId === polygonAmoy.id ? polygonAmoy : foundry), [chainId]);

  useEffect(() => {
    fetch("http://localhost:4000/offer").then(r => r.json()).then(setOffer).catch(() => setOffer(null));
    try {
      const saved = localStorage.getItem("match402.sessionId");
      if (saved) setSessionId(saved);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      if (!currentRegistryAddress) {
        setGames([]);
        return;
      }
      try {
        if (!publicClient) return;
        const allGameIds = await publicClient.readContract({
          address: currentRegistryAddress as `0x${string}`,
          abi: REGISTRY_ABI,
          functionName: "getAllGames"
        }) as `0x${string}`[];

        const enabledGames = [];
        for (const gameId of allGameIds) {
          const gameInfo = await publicClient.readContract({
            address: currentRegistryAddress as `0x${string}`,
            abi: REGISTRY_ABI,
            functionName: "getGame",
            args: [gameId]
          }) as { signer: string; enabled: boolean; };

          if (gameInfo.enabled) {
            const game = ALL_GAMES.find(g => keccak256(toBytes(g.id)) === gameId);
            if (game) {
              enabledGames.push(game);
            }
          }
        }

        setGames(enabledGames);
        if (enabledGames.length > 0) setSelectedGame(enabledGames[0].id);
      } catch (e) {
        console.error("Failed to fetch games", e);
        setGames([]);
      }
    })();
  }, [currentRegistryAddress, activeChain, publicClient]);

  // Fetch user's mUSDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      try {
        const tokenAddress = (USDC_ADDRESSES as any)[chainId] as `0x${string}` | null;
        if (!tokenAddress) return;
        if (!publicClient) return;
        const bal: bigint = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI as any,
          functionName: "balanceOf",
          args: [address]
        })) as any;
        setBalance(formatEther(bal));
      } catch (e) {
        console.error("Failed to fetch balance", e);
        setBalance("0");
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [address, chainId, activeChain, publicClient]);

  // Resolve token decimals for current chain (used to convert on server ticks)
  useEffect(() => {
    (async () => {
      try {
        const tokenAddress = (USDC_ADDRESSES as any)[chainId] as `0x${string}` | null;
        if (!tokenAddress) return;
        if (!publicClient) return;
        const dec: number = await publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI as any, functionName: "decimals", args: [] }) as any;
        setTokenDecimals(dec);
        setTokenUnit(BigInt(10) ** BigInt(dec));
      } catch {}
    })();
  }, [chainId, activeChain, publicClient]);

  useEffect(() => {
    if (!address || !sessionId) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:4000");
      ws.onopen = () => {
        if (address && sessionId) ws!.send(JSON.stringify({ type: "subscribe", address, sessionId, gameId: "default.game" }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg?.type === "tick") {
            const spent = BigInt(msg.spent);
            const usd = Number(spent) / Math.pow(10, tokenDecimals || 18);
            setSpentUsd(Math.min(budgetUsd, usd));
            setStatus(msg.active ? "open" : "idle");
          }
        } catch {}
      };
    } catch {}
    return () => { try { if (ws && ws.readyState === WebSocket.OPEN) ws.close(); } catch {} };
  }, [address, tokenDecimals, sessionId]);

  // Hydrate from server snapshot if we have sessionId
  useEffect(() => {
    (async () => {
      if (!address || !sessionId) return;
      try {
        const r = await fetch(`http://localhost:4000/session?address=${address}&sessionId=${sessionId}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j && j.spent) {
          const usd = Number(BigInt(j.spent)) / Math.pow(10, tokenDecimals || 18);
          setSpentUsd(Math.min(budgetUsd, usd));
        }
        setStatus(j?.active ? "open" : "idle");
      } catch {}
    })();
  }, [address, sessionId, tokenDecimals]);

  async function addAmoyNetwork() {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      await (window.ethereum as any).request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x13882" }] });
      alert("Switched to Polygon Amoy in MetaMask");
    } catch (switchErr: any) {
      if (switchErr?.code === 4902) {
        try {
          await (window.ethereum as any).request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x13882",
                chainName: "Polygon Amoy",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: ["https://rpc-amoy.polygon.technology"],
                blockExplorerUrls: ["https://www.oklink.com/amoy"]
              }
            ]
          });
          await (window.ethereum as any).request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x13882" }] });
          alert("Switched to Polygon Amoy in MetaMask");
        } catch (addErr) {
          console.error(addErr);
          alert("Failed to add/switch network. Check console.");
        }
      } else {
        console.error(switchErr);
        alert("Failed to switch network. Check console.");
      }
    }
  }

  async function mintTokens() {
    if (!address) return alert("Connect wallet");
    try {
      const res = await fetch("http://localhost:4000/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address })
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Faucet request failed");
      }
      alert("100 mUSDC minted! It may take a moment for your balance to update.");
    } catch (e: any) {
      console.error(e);
      alert(`Minting failed: ${e.message}`);
    }
  }

  async function openSession() {
    if (!window.ethereum) return alert("Install MetaMask");
    const walletClient = createWalletClient({ chain: activeChain, transport: custom(window.ethereum as any) });
    const [account] = await walletClient.getAddresses();
    setAccountAddr(account as `0x${string}`);
    setStatus("opening");
    try {
      const addressToUse = currentAddress;
      if (!addressToUse) throw new Error("Contract address not set for current chain");
      // Generate sessionId
      const sid = `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((a,b)=>a+b.toString(16).padStart(2,"0"),"")}` as const;
      setSessionId(sid);
      try { localStorage.setItem("match402.sessionId", sid); } catch {}

      // Fetch signed offer from backend
      const res = await fetch(`http://localhost:4000/offer?gameId=${encodeURIComponent(selectedGame)}`);
      if (!res.ok) throw new Error("Offer fetch failed");
      const { offer, sig } = await res.json();

      const tokenAddress = offer.token as `0x${string}`;
      // Check allowance
      if (!publicClient) throw new Error("Public client not available");
      const allowanceAbi = [{ "inputs": [{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}], "name":"allowance", "outputs":[{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view", "type":"function" }];
      const currentAllowance: bigint = await publicClient.readContract({ address: tokenAddress, abi: allowanceAbi as any, functionName: "allowance", args: [account as `0x${string}`, addressToUse as `0x${string}`] }) as any;
      const needed = BigInt(offer.budget);
      if (currentAllowance < needed) {
        await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI as any,
          functionName: "approve",
          args: [addressToUse as `0x${string}`, needed],
          account,
          chain: activeChain,
          gas: BigInt(60000)
        });
      }

      // Open with signed offer
      await walletClient.writeContract({
        address: addressToUse as `0x${string}`,
        abi: PAYMENT_SESSION_ABI as any,
        functionName: "openWithOffer",
        args: [sid, offer, sig],
        account,
        chain: activeChain,
        gas: BigInt(200000)
      });
      setSpentUsd(0);
      openedAtMsRef.current = Date.now();
      if (tickIdRef.current) clearInterval(tickIdRef.current);
      setStatus("open");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  async function closeSession() {
    if (!window.ethereum) return;
    const walletClient = createWalletClient({ chain: activeChain, transport: custom(window.ethereum as any) });
    const [account] = await walletClient.getAddresses();
    setStatus("closing");
    try {
      const addressToUse = currentAddress;
      if (!addressToUse) throw new Error("Contract address not set for current chain");
      if (!sessionId) throw new Error("No sessionId");
      await walletClient.writeContract({
        address: addressToUse as `0x${string}`,
        abi: PAYMENT_SESSION_ABI as any,
        functionName: "close",
        args: [sessionId],
        account,
        chain: activeChain
      });
      setStatus("closed");
      if (tickIdRef.current) clearInterval(tickIdRef.current);
      // final on-chain refresh
      try {
        if (accountAddr) {
          const pc = createPublicClient({ 
          chain: activeChain, 
          transport: viemHttp(activeChain.id === polygonAmoy.id ? "https://rpc-amoy.polygon.technology" : "http://127.0.0.1:8545") 
        });
          const tokenAddress = (USDC_ADDRESSES as any)[chainId] as `0x${string}` | null;
          if (tokenAddress) {
            const decimals: number = await pc.readContract({ address: tokenAddress, abi: ERC20_ABI as any, functionName: "decimals", args: [] }) as any;
            const unit = BigInt(10) ** BigInt(decimals);
            const res = await pc.readContract({
              address: addressToUse as `0x${string}`,
              abi: PAYMENT_SESSION_ABI as any,
              functionName: "getAccrued",
              args: [accountAddr, sessionId]
            });
            const [spentTokens] = res as unknown as [bigint, bigint, bigint];
            const usd = Number(spentTokens) / Number(unit);
            setSpentUsd(Math.min(budgetUsd, +usd));
          }
        }
      } catch {}
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  useEffect(() => {
    return () => {
      if (tickIdRef.current) clearInterval(tickIdRef.current);
    };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Match402</h1>
      <p>Pay-per-minute multiplayer with agentic micro-payments.</p>
      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        {games.map(g => (
          <div key={g.id} onClick={() => setSelectedGame(g.id)} style={{ cursor: "pointer", border: selectedGame === g.id ? "2px solid #7c3aed" : "1px solid #ccc", borderRadius: 8, padding: 12, width: 220 }}>
            <div style={{ fontWeight: 600 }}>{g.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>gameId: <code>{g.id}</code></div>
            <div style={{ marginTop: 8 }}>Rate: ${g.priceUsdPerMinute.toFixed(2)}/min</div>
            <div style={{ fontSize: 12, color: "#666" }}>Token: {g.token}</div>
          </div>
        ))}
        {games.length === 0 && <div>Loading games or no games available...</div>}
      </div>
      <p>PaymentSession (chain {chainId || "?"}): <code>{currentAddress ?? "(not configured)"}</code></p>
      <div style={{ marginTop: 16 }}>
        {!isConnected ? (
          <button onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>Connect Wallet</button>
        ) : (
          <button onClick={() => disconnect()}>Disconnect</button>
        )}
        <button onClick={addAmoyNetwork} style={{ marginLeft: 8 }}>Switch to Polygon Amoy</button>
        <button onClick={mintTokens} style={{ marginLeft: 8 }} disabled={!isConnected}>Mint 100 mUSDC</button>
        {isConnected && <span style={{ marginLeft: 12 }}>Balance: {Number(balance).toFixed(2)} mUSDC</span>}
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={openSession} disabled={!isConnected || status === "opening" || !currentAddress}>Open Session (budget 5 USD)</button>
        <button onClick={closeSession} disabled={!isConnected || status === "closing" || !currentAddress} style={{ marginLeft: 8 }}>Close Session</button>
        <div>Status: {status}</div>
        {sessionId && <div style={{ fontSize: 12, color: "#555" }}>Session ID: <code>{sessionId}</code> · Game: default.game</div>}
      </div>
      <div style={{ marginTop: 16 }}>
        <div>Spent: ${spentUsd.toFixed(2)} / ${budgetUsd.toFixed(2)}</div>
        <div style={{ width: 300, height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (spentUsd / budgetUsd) * 100)}%`, height: "100%", background: "#7c3aed" }} />
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          Rate: {offer?.rateUsdPerSecond ? `$${offer.rateUsdPerSecond.toFixed(4)}/s` : offer?.rateUsdPerMinute ? `$${(offer.rateUsdPerMinute/60).toFixed(4)}/s` : "$0.0500/s"}
        </div>
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

