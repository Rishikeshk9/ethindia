export type SessionOffer = {
  origin: string;
  priceUsdPerMinute: number;
  maxMinutes: number;
  assetSymbol: string;
};

export function parseOffer(payload: unknown): SessionOffer {
  const offer = payload as Partial<SessionOffer>;
  if (!offer.origin || !offer.priceUsdPerMinute || !offer.maxMinutes || !offer.assetSymbol) {
    throw new Error("Invalid 402 offer payload");
  }
  return offer as SessionOffer;
}

export function formatUsdCents(amountUsd: number): string {
  return `$${amountUsd.toFixed(2)}`;
}

