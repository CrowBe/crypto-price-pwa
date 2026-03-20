/**
 * Crypto price service — multi-provider with retry and fallback.
 *
 * Provider order for live prices:
 *   1. CoinGecko   (withRetry, up to 3 attempts)
 *   2. CryptoCompare (withRetry, up to 3 attempts)
 *
 * Provider order for historical data:
 *   1. CoinGecko   (withRetry, up to 3 attempts)
 *   2. CryptoCompare (withRetry, up to 3 attempts)
 *
 * If all providers fail, the error is re-thrown so callers can fall back to
 * their own localStorage cache and surface a stale-data warning.
 */

import cryptoCompareClient from "./api";
import {
  withRetry,
  fetchMultiPriceCoinGecko,
  fetchHistoricalDaysCoinGecko,
} from "./apiProviders";

// ---------------------------------------------------------------------------
// CryptoCompare helpers (kept as fallback)
// ---------------------------------------------------------------------------

async function fetchMultiPriceCryptoCompare(
  fsyms: CoinKey[],
  tsyms: string[]
): Promise<IPriceData> {
  return (
    await cryptoCompareClient.get("pricemulti", {
      params: { fsyms, tsyms },
    })
  ).data;
}

async function fetchHistoricalDaysCryptoCompare(
  fsym: CoinKey,
  tsym: Currency,
  limit: number
): Promise<{ Data: IHistoricalPriceData[] }> {
  return (
    await cryptoCompareClient.get("histoday", { params: { fsym, tsym, limit } })
  ).data;
}

// ---------------------------------------------------------------------------
// Public API (same signatures as before so existing callers are unaffected)
// ---------------------------------------------------------------------------

/**
 * Fetch current prices for multiple coins in multiple currencies.
 * Tries CoinGecko first, then CryptoCompare, each with up to 3 retries.
 */
export const getPriceMulti = async (
  fsyms: CoinKey[],
  tsyms: string[]
): Promise<IPriceData> => {
  try {
    return await withRetry(() => fetchMultiPriceCoinGecko(fsyms, tsyms));
  } catch {
    // CoinGecko failed — try CryptoCompare
    return await withRetry(() => fetchMultiPriceCryptoCompare(fsyms, tsyms));
  }
};

/**
 * Fetch the historical price for a single coin at a specific Unix timestamp.
 * Uses CryptoCompare only (no CoinGecko equivalent on the free tier).
 */
export const getPriceHistorical = async (
  fsym: CoinKey,
  tsyms: string[],
  ts: number
): Promise<IPriceData> =>
  withRetry(() =>
    cryptoCompareClient
      .get("pricehistorical", { params: { fsym, tsyms, ts } })
      .then((r) => r.data)
  );

/**
 * Fetch daily OHLC history for a single coin.
 * Tries CoinGecko first, then CryptoCompare, each with up to 3 retries.
 */
export const getPriceHistoricalDays = async (
  fsym: CoinKey,
  tsym: Currency = "AUD",
  limit: number = 10
): Promise<{ Data: IHistoricalPriceData[] }> => {
  try {
    return await withRetry(() =>
      fetchHistoricalDaysCoinGecko(fsym, tsym, limit)
    );
  } catch {
    // CoinGecko failed — try CryptoCompare
    return await withRetry(() =>
      fetchHistoricalDaysCryptoCompare(fsym, tsym, limit)
    );
  }
};
