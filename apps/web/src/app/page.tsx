import { PAYMENT_SESSION_ADDRESS } from "../config/contracts";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Match402</h1>
      <p>Pay-per-minute multiplayer with agentic micro-payments.</p>
      <p>
        Local PaymentSession: <code>{PAYMENT_SESSION_ADDRESS}</code>
      </p>
    </main>
  );
}

