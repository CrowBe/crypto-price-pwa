type TLoadingState = "error" | "loading" | "empty" | "success";
type Currency = "AUD" | "USD";

const allCoinKeys = ["ETH", "BTC", "XRP"] as const;
type CoinKey = (typeof allCoinKeys)[number];

interface IPriceData {
  ETH?: { AUD: string; USD?: string };
  BTC?: { AUD: string; USD?: string };
  XRP?: { AUD: string; USD?: string };
}

interface ICurrencyPriceData {
  ETH: string;
  BTC: string;
  XRP: string;
}

interface ITodayCurrencyPriceData extends ICurrencyPriceData {
  date: string;
  /** Raw numeric values for trend calculations */
  ETH_raw?: number;
  BTC_raw?: number;
  XRP_raw?: number;
}

interface IHistoricalPriceData {
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

interface ICoinMeta {
  symbol: CoinKey;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
}
