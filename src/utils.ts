export const createCurrencyFormatter = (currency: Currency) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

export const AUDollarFormatter = createCurrencyFormatter("AUD");
export const USDollarFormatter = createCurrencyFormatter("USD");

export const formatCurrency = (value: number, currency: Currency): string =>
  createCurrencyFormatter(currency).format(value);

export const sortByDateDescending = (a: string, b: string) =>
  new Date(b).getTime() - new Date(a).getTime();

export const COIN_META: Record<CoinKey, ICoinMeta> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    color: "#f7931a",
    bgClass: "bg-orange-50 dark:bg-orange-900/20",
    textClass: "text-orange-500",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    color: "#627eea",
    bgClass: "bg-indigo-50 dark:bg-indigo-900/20",
    textClass: "text-indigo-500",
  },
  XRP: {
    symbol: "XRP",
    name: "XRP",
    color: "#346aa9",
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    textClass: "text-blue-500",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    color: "#9945ff",
    bgClass: "bg-purple-50 dark:bg-purple-900/20",
    textClass: "text-purple-500",
  },
  DOGE: {
    symbol: "DOGE",
    name: "Dogecoin",
    color: "#c2a633",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    textClass: "text-yellow-600",
  },
  ADA: {
    symbol: "ADA",
    name: "Cardano",
    color: "#0d1e7f",
    bgClass: "bg-sky-50 dark:bg-sky-900/20",
    textClass: "text-sky-600",
  },
  LTC: {
    symbol: "LTC",
    name: "Litecoin",
    color: "#bfbbbb",
    bgClass: "bg-slate-100 dark:bg-slate-700/40",
    textClass: "text-slate-500",
  },
};

export const COIN_ICONS: Record<CoinKey, string> = {
  BTC: "₿",
  ETH: "Ξ",
  XRP: "✕",
  SOL: "◎",
  DOGE: "Ð",
  ADA: "₳",
  LTC: "Ł",
};

export const ALL_COIN_KEYS: CoinKey[] = ["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "LTC"];
