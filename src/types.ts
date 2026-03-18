// All shared types for the crypto-price-pwa application.
// Previously declared as ambient globals in interfaces.d.ts; now explicitly exported.

export type TLoadingState = "error" | "loading" | "empty" | "success";

export type Currency = "AUD" | "USD" | "EUR" | "GBP";

export const ALL_COIN_KEYS_CONST = [
  "BTC",
  "ETH",
  "XRP",
  "SOL",
  "DOGE",
  "ADA",
  "LTC",
] as const;

export type CoinKey = (typeof ALL_COIN_KEYS_CONST)[number];

/** Raw multi-price API response: coin → currency → price string */
export type IPriceData = {
  [K in CoinKey]?: { [currency: string]: string };
};

/** Single-currency price map returned by the API for one coin */
export interface ICurrencyPriceData {
  [key: string]: string;
}

/**
 * Today's price payload stored in component state and localStorage.
 * Keys are CoinKey values (formatted price string) plus `<CoinKey>_raw`
 * (numeric), and a required `date` timestamp string.
 */
export interface ITodayCurrencyPriceData {
  date: string;
  [key: string]: string | number | undefined;
}

/** One data point from the CryptoCompare histoday endpoint */
export interface IHistoricalPriceData {
  time: number;
  high: number;
  low: number;
  open: number;
  volumefrom: number;
  volumeto: number;
  close: number;
  conversionType: "direct";
  conversionSymbol: "";
}

/** Display metadata for a single coin */
export interface ICoinMeta {
  symbol: CoinKey;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
}

/** A user-defined price alert */
export interface IPriceAlert {
  id: string;
  coin: CoinKey;
  targetPrice: number;
  direction: "above" | "below";
  currency: Currency;
  triggered: boolean;
}
