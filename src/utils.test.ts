import { describe, it, expect } from "vitest";
import {
  createCurrencyFormatter,
  formatCurrency,
  sortByDateDescending,
  COIN_META,
  COIN_ICONS,
  ALL_COIN_KEYS,
} from "./utils";
import type { CoinKey, Currency } from "./types";

describe("createCurrencyFormatter", () => {
  it("returns an Intl.NumberFormat instance", () => {
    const fmt = createCurrencyFormatter("AUD");
    expect(fmt).toBeInstanceOf(Intl.NumberFormat);
  });

  it("formats a number as AUD currency", () => {
    const result = createCurrencyFormatter("AUD").format(1234.5);
    expect(result).toContain("1,234.50");
    // Symbol varies by locale/environment – just confirm it contains the number
  });

  it("formats a number as USD currency", () => {
    const result = createCurrencyFormatter("USD").format(9999.99);
    expect(result).toContain("9,999.99");
  });
});

describe("formatCurrency", () => {
  const cases: Array<[number, Currency, string]> = [
    [0, "AUD", "0.00"],
    [50000, "USD", "50,000.00"],
    [1.5, "EUR", "1.50"],
    [100, "GBP", "100.00"],
  ];

  it.each(cases)("formats %d %s to contain '%s'", (value, currency, expected) => {
    expect(formatCurrency(value, currency)).toContain(expected);
  });

  it("returns a string", () => {
    expect(typeof formatCurrency(1000, "AUD")).toBe("string");
  });
});

describe("sortByDateDescending", () => {
  it("sorts newer dates before older ones", () => {
    const dates = ["2024-01-01", "2024-03-15", "2024-02-10"];
    const sorted = [...dates].sort(sortByDateDescending);
    expect(sorted[0]).toBe("2024-03-15");
    expect(sorted[2]).toBe("2024-01-01");
  });

  it("returns 0 for equal dates", () => {
    expect(sortByDateDescending("2024-06-01", "2024-06-01")).toBe(0);
  });

  it("returns a negative number when a is newer", () => {
    expect(sortByDateDescending("2024-12-01", "2024-01-01")).toBeLessThan(0);
  });
});

describe("ALL_COIN_KEYS", () => {
  it("contains all 7 expected coins", () => {
    expect(ALL_COIN_KEYS).toHaveLength(7);
    expect(ALL_COIN_KEYS).toEqual(
      expect.arrayContaining(["BTC", "ETH", "XRP", "SOL", "DOGE", "ADA", "LTC"])
    );
  });
});

describe("COIN_META", () => {
  it("has an entry for every coin key", () => {
    ALL_COIN_KEYS.forEach((key) => {
      expect(COIN_META).toHaveProperty(key);
    });
  });

  it("each entry has required fields", () => {
    ALL_COIN_KEYS.forEach((key: CoinKey) => {
      const meta = COIN_META[key];
      expect(meta.symbol).toBe(key);
      expect(typeof meta.name).toBe("string");
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof meta.bgClass).toBe("string");
      expect(typeof meta.textClass).toBe("string");
    });
  });

  it("Bitcoin has the correct name and color", () => {
    expect(COIN_META.BTC.name).toBe("Bitcoin");
    expect(COIN_META.BTC.color).toBe("#f7931a");
  });
});

describe("COIN_ICONS", () => {
  it("has an icon for every coin key", () => {
    ALL_COIN_KEYS.forEach((key) => {
      expect(COIN_ICONS).toHaveProperty(key);
      expect(typeof COIN_ICONS[key]).toBe("string");
      expect(COIN_ICONS[key].length).toBeGreaterThan(0);
    });
  });

  it("Bitcoin icon is the ₿ symbol", () => {
    expect(COIN_ICONS.BTC).toBe("₿");
  });
});
