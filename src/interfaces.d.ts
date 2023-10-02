type TLoadingState = "error" | "loading" | "empty" | "success";
const allCoinKeys = ["ETH", "BTC", "XRP"] as const;
type CoinKey = (typeof allCoinKeys)[number];
interface IPriceData {
  ETH?: { AUD: string };
  BTC?: { AUD: string };
  XRP?: { AUD: string };
}
interface ITodayPriceData extends IPriceData {
  date: string;
}

interface ICurrencyPriceData {
  ETH: string;
  BTC: string;
  XRP: string;
}

interface ITodayCurrencyPriceData extends ICurrencyPriceData {
  date: string;
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
