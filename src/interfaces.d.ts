type TLoadingState = "error" | "loading" | "empty" | "success";
type Currency = "AUD" | "USD" | "EUR" | "GBP";

const allCoinKeys = ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "LTC"] as const;
type CoinKey = (typeof allCoinKeys)[number];

type IPriceData = {
  [K in CoinKey]?: { [currency: string]: string };
};

interface ICurrencyPriceData {
  [key: string]: string;
}

interface ITodayCurrencyPriceData {
  date: string;
  [key: string]: string | number | undefined;
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

interface IPriceAlert {
  id: string;
  coin: CoinKey;
  targetPrice: number;
  direction: "above" | "below";
  currency: Currency;
  triggered: boolean;
}
