import cryptoCompareClient from "./api";

export const getPriceMulti = async (
  fsyms: CoinKey[],
  tsyms: string[]
): Promise<IPriceData> =>
  (
    await cryptoCompareClient.get("pricemulti", {
      params: { fsyms, tsyms },
    })
  ).data;

export const getPriceHistorical = async (
  fsym: CoinKey,
  tsyms: string[],
  ts: number
): Promise<IPriceData> =>
  (
    await cryptoCompareClient.get("pricehistorical", {
      params: { fsym, tsyms, ts },
    })
  ).data;

export const getPriceHistoricalDays = async (
  fsym: CoinKey,
  tsym: "AUD" | "USD" = "AUD",
  limit: number = 10
): Promise<{ Data: IHistoricalPriceData[] }> =>
  (await cryptoCompareClient.get("histoday", { params: { fsym, tsym, limit } }))
    .data;
