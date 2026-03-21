/**
 * Alternative API providers for crypto price data.
 *
 * Provider priority:
 *   1. CoinGecko (free demo tier, 50 req/min) — set VITE_COINGECKO_API_KEY for higher limits
 *   2. CryptoCompare (original, kept as fallback)
 *
 * All fetches go through withRetry() so transient rate-limit errors are retried
 * with exponential back-off before the next provider is tried.
 */

import axios from "axios";
import type { CoinKey, Currency, IPriceData, IHistoricalPriceData, ICoinMarketData } from "./types";

// ---------------------------------------------------------------------------
// Retry utility
// ---------------------------------------------------------------------------

/**
 * Calls `fn` up to `maxAttempts` times. On failure, waits
 * baseDelayMs * 2^attempt ms before the next attempt.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * 2 ** attempt)
        );
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// CoinGecko provider
// ---------------------------------------------------------------------------

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const coingeckoApiKey = import.meta.env.VITE_COINGECKO_API_KEY as
  | string
  | undefined;

/** Maps our internal CoinKey symbols to CoinGecko coin IDs */
export const COINGECKO_IDS: Record<CoinKey, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
  DOGE: "dogecoin",
  ADA: "cardano",
  LTC: "litecoin",
};

function coingeckoHeaders(): Record<string, string> {
  return coingeckoApiKey ? { "x-cg-demo-api-key": coingeckoApiKey } : {};
}

/**
 * Fetch current prices from CoinGecko.
 * Returns data in the same shape as IPriceData (uppercase keys, string values).
 */
export async function fetchMultiPriceCoinGecko(
  coins: CoinKey[],
  currencies: string[]
): Promise<IPriceData> {
  const ids = coins.map((c) => COINGECKO_IDS[c]).join(",");
  const vs_currencies = currencies.map((c) => c.toLowerCase()).join(",");

  const { data } = await axios.get<Record<string, Record<string, number>>>(
    `${COINGECKO_BASE}/simple/price`,
    {
      params: { ids, vs_currencies },
      headers: coingeckoHeaders(),
    }
  );

  const result: IPriceData = {};
  coins.forEach((coin) => {
    const geckoData = data[COINGECKO_IDS[coin]];
    if (geckoData) {
      result[coin] = {};
      currencies.forEach((currency) => {
        const price = geckoData[currency.toLowerCase()];
        if (price !== undefined) {
          result[coin]![currency] = String(price);
        }
      });
    }
  });
  return result;
}

/**
 * Fetch daily historical OHLC data from CoinGecko.
 * Returns data shaped as { Data: IHistoricalPriceData[] } matching the
 * CryptoCompare histoday format that the rest of the app expects.
 *
 * Note: CoinGecko's market_chart endpoint is used so any number of days works.
 * Only close prices are available; open/high/low are set to the same value.
 */
export async function fetchHistoricalDaysCoinGecko(
  coin: CoinKey,
  currency: Currency,
  days: number
): Promise<{ Data: IHistoricalPriceData[] }> {
  const id = COINGECKO_IDS[coin];

  // market_chart?interval=daily gives one data point per day for arbitrary N
  const { data } = await axios.get<{
    prices: [number, number][];
    total_volumes: [number, number][];
  }>(`${COINGECKO_BASE}/coins/${id}/market_chart`, {
    params: { vs_currency: currency.toLowerCase(), days, interval: "daily" },
    headers: coingeckoHeaders(),
  });

  if (!data.prices.length) {
    throw new Error(`No historical price data returned by CoinGecko for ${coin}`);
  }

  const historicalData: IHistoricalPriceData[] = data.prices.map(
    ([tsMs, price], i) => ({
      // Normalise to midnight UTC so dates align with CryptoCompare
      time: Math.floor(tsMs / 86_400_000) * 86_400,
      open: price,
      high: price,
      low: price,
      close: price,
      volumefrom: 0,
      volumeto: data.total_volumes[i]?.[1] ?? 0,
      conversionType: "direct" as const,
      conversionSymbol: "" as const,
    })
  );

  return { Data: historicalData };
}

// ---------------------------------------------------------------------------
// CoinGecko market listing + search
// ---------------------------------------------------------------------------

export const COIN_MARKETS_PER_PAGE = 20;

/**
 * Fetch a paginated list of coins from CoinGecko /coins/markets.
 * When `ids` is provided the results are filtered to those specific IDs
 * (used after a search to resolve matching coin IDs into full market data).
 */
export async function fetchCoinMarkets(
  currency: Currency,
  page: number,
  ids?: string[]
): Promise<ICoinMarketData[]> {
  const params: Record<string, string | number> = {
    vs_currency: currency.toLowerCase(),
    order: "market_cap_desc",
    per_page: COIN_MARKETS_PER_PAGE,
    page,
    sparkline: "false",
    price_change_percentage: "24h",
  };

  if (ids && ids.length > 0) {
    params.ids = ids.join(",");
    // When filtering by IDs, fetch all at once — no paging needed
    params.per_page = Math.min(ids.length, 250);
    params.page = 1;
  }

  const { data } = await axios.get<ICoinMarketData[]>(
    `${COINGECKO_BASE}/coins/markets`,
    { params, headers: coingeckoHeaders() }
  );

  return data;
}

/**
 * Search CoinGecko for coins matching `query`.
 * Returns up to `limit` matching coin IDs suitable for passing to fetchCoinMarkets.
 */
export async function searchCoins(query: string, limit = 50): Promise<string[]> {
  if (!query.trim()) return [];

  const { data } = await axios.get<{
    coins: { id: string; name: string; symbol: string }[];
  }>(`${COINGECKO_BASE}/search`, {
    params: { query },
    headers: coingeckoHeaders(),
  });

  return data.coins.slice(0, limit).map((c) => c.id);
}
