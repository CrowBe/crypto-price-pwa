import cryptoCompareClient from "./api";

export const getPriceMulti = async (
  fsyms: string[],
  tsyms: string[]
): Promise<IPriceData> =>
  (
    await cryptoCompareClient.get("pricemulti", {
      params: { fsyms, tsyms },
    })
  ).data;

export const getPriceHistorical = async (
  fsym: string,
  tsyms: string[],
  ts: number
): Promise<IPriceData> =>
  (
    await cryptoCompareClient.get("pricehistorical", {
      params: { fsym, tsyms, ts },
    })
  ).data;
