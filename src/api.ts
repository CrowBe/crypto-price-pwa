import axios from "axios";
import QueryString from "qs";

// retrieve the api key from the env variables
const apiKey = process.env.REACT_APP_COIN_API_KEY;

// Instantiate an axios request with the reusable portion of the api url
const cryptoCompareClient = axios.create({
  baseURL: "https://min-api.cryptocompare.com/data/",
  headers: { Accept: "application/json", Authorization: `Apikey ${apiKey}` },
  paramsSerializer: (params) =>
    QueryString.stringify(params, { arrayFormat: "comma" }),
});

// Use an interceptor to set the api key as a parameter on every request
cryptoCompareClient.interceptors.request.use((config) => ({
  ...config,
  params: {
    ...config.params,
  },
}));

export default cryptoCompareClient;
