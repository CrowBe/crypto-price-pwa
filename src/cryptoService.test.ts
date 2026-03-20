import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPriceMulti, getPriceHistorical, getPriceHistoricalDays } from "./cryptoService";

// Mock CoinGecko provider functions
vi.mock("./apiProviders", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  fetchMultiPriceCoinGecko: vi.fn(),
  fetchHistoricalDaysCoinGecko: vi.fn(),
  COINGECKO_IDS: {
    BTC: "bitcoin",
    ETH: "ethereum",
    XRP: "ripple",
    SOL: "solana",
    DOGE: "dogecoin",
    ADA: "cardano",
    LTC: "litecoin",
  },
}));

// Mock the CryptoCompare axios client (used as fallback)
vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
  },
}));

import { fetchMultiPriceCoinGecko, fetchHistoricalDaysCoinGecko, withRetry } from "./apiProviders";
import cryptoCompareClient from "./api";

const mockCoinGeckoMulti = vi.mocked(fetchMultiPriceCoinGecko);
const mockCoinGeckoHistory = vi.mocked(fetchHistoricalDaysCoinGecko);
const mockCCGet = vi.mocked(cryptoCompareClient.get);
const mockWithRetry = vi.mocked(withRetry);

beforeEach(() => {
  vi.clearAllMocks();
  // Default withRetry to just call through
  mockWithRetry.mockImplementation((fn) => fn());
});

// ---------------------------------------------------------------------------
// getPriceMulti
// ---------------------------------------------------------------------------

describe("getPriceMulti", () => {
  it("returns data from CoinGecko when it succeeds", async () => {
    const geckoData: IPriceData = { BTC: { AUD: "150000" }, ETH: { AUD: "5000" } };
    mockCoinGeckoMulti.mockResolvedValueOnce(geckoData);

    const result = await getPriceMulti(["BTC", "ETH"], ["AUD"]);

    expect(mockCoinGeckoMulti).toHaveBeenCalledWith(["BTC", "ETH"], ["AUD"]);
    expect(result).toEqual(geckoData);
    expect(mockCCGet).not.toHaveBeenCalled();
  });

  it("falls back to CryptoCompare when CoinGecko fails", async () => {
    mockCoinGeckoMulti.mockRejectedValueOnce(new Error("Rate limited"));
    const ccData: IPriceData = { BTC: { AUD: "149000" } };
    mockCCGet.mockResolvedValueOnce({ data: ccData });

    const result = await getPriceMulti(["BTC"], ["AUD"]);

    expect(mockCoinGeckoMulti).toHaveBeenCalled();
    expect(mockCCGet).toHaveBeenCalledWith("pricemulti", { params: { fsyms: ["BTC"], tsyms: ["AUD"] } });
    expect(result).toEqual(ccData);
  });

  it("throws when both CoinGecko and CryptoCompare fail", async () => {
    mockCoinGeckoMulti.mockRejectedValueOnce(new Error("CoinGecko down"));
    mockCCGet.mockRejectedValueOnce(new Error("CryptoCompare down"));

    await expect(getPriceMulti(["BTC"], ["AUD"])).rejects.toThrow("CryptoCompare down");
  });
});

// ---------------------------------------------------------------------------
// getPriceHistorical
// ---------------------------------------------------------------------------

describe("getPriceHistorical", () => {
  it("calls the CryptoCompare pricehistorical endpoint", async () => {
    const ts = 1700000000;
    const mockResponse = { data: { BTC: { AUD: "40000.00" } } };
    mockCCGet.mockResolvedValueOnce(mockResponse);

    const result = await getPriceHistorical("BTC", ["AUD"], ts);

    expect(mockCCGet).toHaveBeenCalledWith("pricehistorical", {
      params: { fsym: "BTC", tsyms: ["AUD"], ts },
    });
    expect(result).toEqual(mockResponse.data);
  });

  it("propagates errors from the API client", async () => {
    mockCCGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(getPriceHistorical("BTC", ["AUD"], 1700000000)).rejects.toThrow("Network error");
  });
});

// ---------------------------------------------------------------------------
// getPriceHistoricalDays
// ---------------------------------------------------------------------------

describe("getPriceHistoricalDays", () => {
  const mockHistoricalData: IHistoricalPriceData[] = [
    {
      time: 1700000000,
      high: 45000,
      low: 40000,
      open: 42000,
      close: 44000,
      volumefrom: 100,
      volumeto: 4400000,
      conversionType: "direct",
      conversionSymbol: "",
    },
  ];

  it("returns data from CoinGecko when it succeeds", async () => {
    mockCoinGeckoHistory.mockResolvedValueOnce({ Data: mockHistoricalData });

    const result = await getPriceHistoricalDays("BTC", "AUD", 10);

    expect(mockCoinGeckoHistory).toHaveBeenCalledWith("BTC", "AUD", 10);
    expect(result.Data).toEqual(mockHistoricalData);
    expect(mockCCGet).not.toHaveBeenCalled();
  });

  it("falls back to CryptoCompare when CoinGecko fails", async () => {
    mockCoinGeckoHistory.mockRejectedValueOnce(new Error("Rate limited"));
    mockCCGet.mockResolvedValueOnce({ data: { Data: mockHistoricalData } });

    const result = await getPriceHistoricalDays("BTC", "AUD", 10);

    expect(mockCoinGeckoHistory).toHaveBeenCalled();
    expect(mockCCGet).toHaveBeenCalledWith("histoday", {
      params: { fsym: "BTC", tsym: "AUD", limit: 10 },
    });
    expect(result.Data).toEqual(mockHistoricalData);
  });

  it("uses AUD and limit=10 as defaults", async () => {
    mockCoinGeckoHistory.mockResolvedValueOnce({ Data: mockHistoricalData });

    await getPriceHistoricalDays("ETH");

    expect(mockCoinGeckoHistory).toHaveBeenCalledWith("ETH", "AUD", 10);
  });

  it("throws when both providers fail", async () => {
    mockCoinGeckoHistory.mockRejectedValueOnce(new Error("CoinGecko down"));
    mockCCGet.mockRejectedValueOnce(new Error("CryptoCompare down"));

    await expect(getPriceHistoricalDays("BTC")).rejects.toThrow("CryptoCompare down");
  });
});
