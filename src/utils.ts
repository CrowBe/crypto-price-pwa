export const createCurrencyFormatter = (currency: Currency) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "AUD" ? 2 : 2,
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
};

export const COIN_ICONS: Record<CoinKey, string> = {
  BTC: "₿",
  ETH: "Ξ",
  XRP: "✕",
};
