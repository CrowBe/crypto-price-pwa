import axios from "axios";
import QueryString from "qs";

const apiKey = import.meta.env.VITE_COIN_API_KEY;

const cryptoCompareClient = axios.create({
  baseURL: "https://min-api.cryptocompare.com/data/",
  headers: { Accept: "application/json", Authorization: `Apikey ${apiKey}` },
  paramsSerializer: (params) =>
    QueryString.stringify(params, { arrayFormat: "comma" }),
});

cryptoCompareClient.interceptors.request.use((config) => ({
  ...config,
  params: {
    ...config.params,
  },
}));

export default cryptoCompareClient;
