/**
 * Ambient type declarations - re-exported from types.ts for backwards compatibility.
 * New code should import directly from './types'.
 */
export type {
  TLoadingState,
  Currency,
  CoinKey,
  IPriceData,
  ICurrencyPriceData,
  ITodayCurrencyPriceData,
  IHistoricalPriceData,
  ICoinMeta,
  IPriceAlert,
} from "./types";

// Re-declare as globals so existing files without explicit imports still type-check.
declare global {
  type TLoadingState = import("./types").TLoadingState;
  type Currency = import("./types").Currency;
  type CoinKey = import("./types").CoinKey;
  type IPriceData = import("./types").IPriceData;
  type ICurrencyPriceData = import("./types").ICurrencyPriceData;
  type ITodayCurrencyPriceData = import("./types").ITodayCurrencyPriceData;
  type IHistoricalPriceData = import("./types").IHistoricalPriceData;
  type ICoinMeta = import("./types").ICoinMeta;
  type IPriceAlert = import("./types").IPriceAlert;
}
