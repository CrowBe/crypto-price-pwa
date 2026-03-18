import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPriceMulti, getPriceHistorical, getPriceHistoricalDays } from "./cryptoService";

// Mock the axios client module used by cryptoService
vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
  },
}));

import cryptoCompareClient from "./api";

const mockGet = vi.mocked(cryptoCompareClient.get);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPriceMulti", () => {
  it("calls the pricemulti endpoint with coins and currencies", async () => {
    const mockResponse = {
      data: { BTC: { AUD: "150000.00" }, ETH: { AUD: "5000.00" } },
    };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getPriceMulti(["BTC", "ETH"], ["AUD"]);

    expect(mockGet).toHaveBeenCalledWith("pricemulti", {
      params: { fsyms: ["BTC", "ETH"], tsyms: ["AUD"] },
    });
    expect(result).toEqual(mockResponse.data);
  });

  it("propagates errors from the API client", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(getPriceMulti(["BTC"], ["AUD"])).rejects.toThrow("Network error");
  });
});

describe("getPriceHistorical", () => {
  it("calls the pricehistorical endpoint with the correct params", async () => {
    const ts = 1700000000;
    const mockResponse = { data: { BTC: { AUD: "40000.00" } } };
    mockGet.mockResolvedValueOnce(mockResponse);

    const result = await getPriceHistorical("BTC", ["AUD"], ts);

    expect(mockGet).toHaveBeenCalledWith("pricehistorical", {
      params: { fsym: "BTC", tsyms: ["AUD"], ts },
    });
    expect(result).toEqual(mockResponse.data);
  });
});

describe("getPriceHistoricalDays", () => {
  const mockHistoday = {
    data: {
      Data: [
        { time: 1700000000, high: 45000, low: 40000, open: 42000, close: 44000, volumefrom: 100, volumeto: 4400000, conversionType: "direct", conversionSymbol: "" },
      ],
    },
  };

  it("calls the histoday endpoint with defaults", async () => {
    mockGet.mockResolvedValueOnce(mockHistoday);

    const result = await getPriceHistoricalDays("BTC");

    expect(mockGet).toHaveBeenCalledWith("histoday", {
      params: { fsym: "BTC", tsym: "AUD", limit: 10 },
    });
    expect(result).toEqual(mockHistoday.data);
  });

  it("accepts custom currency and limit", async () => {
    mockGet.mockResolvedValueOnce(mockHistoday);

    await getPriceHistoricalDays("ETH", "USD", 30);

    expect(mockGet).toHaveBeenCalledWith("histoday", {
      params: { fsym: "ETH", tsym: "USD", limit: 30 },
    });
  });

  it("returns the Data array from the response", async () => {
    mockGet.mockResolvedValueOnce(mockHistoday);
    const result = await getPriceHistoricalDays("BTC");
    expect(Array.isArray(result.Data)).toBe(true);
    expect(result.Data[0].close).toBe(44000);
  });
});
