import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoinMarketList from "./CoinMarketList";

vi.mock("../apiProviders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../apiProviders")>();
  return {
    ...actual,
    fetchCoinMarkets: vi.fn(),
    searchCoins: vi.fn(),
    withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
  };
});

import { fetchCoinMarkets, searchCoins } from "../apiProviders";

const mockFetchCoinMarkets = vi.mocked(fetchCoinMarkets);
const mockSearchCoins = vi.mocked(searchCoins);

/** Build a page of mock ICoinMarketData. */
function buildCoins(count = 5, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    id: `coin-${offset + i}`,
    symbol: `C${offset + i}`,
    name: `Coin ${offset + i}`,
    image: `https://example.com/coin-${offset + i}.png`,
    current_price: 1000 + offset + i,
    market_cap: 1_000_000,
    market_cap_rank: offset + i + 1,
    price_change_percentage_24h: i % 2 === 0 ? 1.5 : -0.8,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Default: successful fetch of 5 coins
  mockFetchCoinMarkets.mockResolvedValue(buildCoins(5));
  mockSearchCoins.mockResolvedValue([]);
});

describe("CoinMarketList", () => {
  it("shows skeleton rows while loading", () => {
    mockFetchCoinMarkets.mockReturnValue(new Promise(() => {})); // never resolves
    render(<CoinMarketList currency="AUD" />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders coin rows after a successful fetch", async () => {
    render(<CoinMarketList currency="AUD" />);
    await waitFor(() => {
      expect(screen.getByText("Coin 0")).toBeInTheDocument();
    });
    expect(screen.getByText("Coin 4")).toBeInTheDocument();
  });

  it("displays the Market heading", () => {
    render(<CoinMarketList currency="AUD" />);
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("shows COIN and PRICE / 24H column headers", async () => {
    render(<CoinMarketList currency="AUD" />);
    expect(screen.getByText("Coin")).toBeInTheDocument();
    expect(screen.getByText("Price / 24h")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    mockFetchCoinMarkets.mockRejectedValue(new Error("Network error"));
    render(<CoinMarketList currency="AUD" />);
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load coins. Please try again.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("retries fetch when Retry button is clicked", async () => {
    mockFetchCoinMarkets
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(buildCoins(5));

    render(<CoinMarketList currency="AUD" />);

    await waitFor(() => screen.getByText("Retry"));
    await userEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("Coin 0")).toBeInTheDocument();
    });
  });

  it("shows empty state when search returns no results", async () => {
    mockSearchCoins.mockResolvedValue([]);
    mockFetchCoinMarkets.mockResolvedValue([]);

    render(<CoinMarketList currency="AUD" />);

    const input = screen.getByPlaceholderText("Search coins…");
    await userEvent.type(input, "unknowncoin");

    await waitFor(() => {
      expect(
        screen.getByText(/No coins found for "unknowncoin"/i)
      ).toBeInTheDocument();
    });
  });

  it("filters coins when searching and shows results", async () => {
    mockSearchCoins.mockResolvedValue(["bitcoin"]);
    mockFetchCoinMarkets.mockImplementation((_currency, _page, ids) => {
      if (ids && ids.includes("bitcoin")) {
        return Promise.resolve([
          {
            id: "bitcoin",
            symbol: "BTC",
            name: "Bitcoin",
            image: "https://example.com/btc.png",
            current_price: 85000,
            market_cap: 1_000_000_000,
            market_cap_rank: 1,
            price_change_percentage_24h: 2.3,
          },
        ]);
      }
      return Promise.resolve(buildCoins(5));
    });

    render(<CoinMarketList currency="AUD" />);

    // Wait for initial load
    await waitFor(() => screen.getByText("Coin 0"));

    const input = screen.getByPlaceholderText("Search coins…");
    await userEvent.type(input, "bitcoin");

    await waitFor(() => {
      expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    });
    expect(mockSearchCoins).toHaveBeenCalledWith("bitcoin");
  });

  it("clear button removes search query", async () => {
    render(<CoinMarketList currency="AUD" />);

    const input = screen.getByPlaceholderText("Search coins…");
    await userEvent.type(input, "eth");

    const clearBtn = screen.getByLabelText("Clear search");
    expect(clearBtn).toBeInTheDocument();

    await userEvent.click(clearBtn);
    expect(input).toHaveValue("");
  });

  it("refetches when currency prop changes", async () => {
    const { rerender } = render(<CoinMarketList currency="AUD" />);
    await waitFor(() => screen.getByText("Coin 0"));

    mockFetchCoinMarkets.mockResolvedValue(buildCoins(5));
    rerender(<CoinMarketList currency="USD" />);

    await waitFor(() => {
      expect(mockFetchCoinMarkets).toHaveBeenCalledWith("USD", 1, undefined);
    });
  });

  it("serves cached data with stale banner when API fails on initial load", async () => {
    const cachedCoins = buildCoins(3);
    localStorage.setItem(
      "coinmarkets-AUD",
      JSON.stringify({ data: cachedCoins, cachedAt: Date.now() - 60_000 })
    );
    mockFetchCoinMarkets.mockRejectedValue(new Error("503 Service Unavailable"));

    render(<CoinMarketList currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText("Coin 0")).toBeInTheDocument();
    });
    expect(screen.getByText(/Live data unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("Failed to load coins")).not.toBeInTheDocument();
  });

  it("saves first-page results to localStorage on success", async () => {
    const coins = buildCoins(5);
    mockFetchCoinMarkets.mockResolvedValue(coins);

    render(<CoinMarketList currency="AUD" />);
    await waitFor(() => screen.getByText("Coin 0"));

    const cached = JSON.parse(localStorage.getItem("coinmarkets-AUD") ?? "null");
    expect(cached).not.toBeNull();
    expect(cached.data).toHaveLength(5);
    expect(cached.cachedAt).toBeGreaterThan(0);
  });

  it("retries live data from stale banner Retry button", async () => {
    const cachedCoins = buildCoins(2);
    localStorage.setItem(
      "coinmarkets-AUD",
      JSON.stringify({ data: cachedCoins, cachedAt: Date.now() })
    );
    mockFetchCoinMarkets
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(buildCoins(5));

    render(<CoinMarketList currency="AUD" />);

    // First render falls back to cache
    await waitFor(() => screen.getByText(/Live data unavailable/i));

    // Retry fetches live data
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Live data unavailable/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText("Coin 0")).toBeInTheDocument();
  });

  it("displays positive price change in green and negative in red", async () => {
    mockFetchCoinMarkets.mockResolvedValue([
      {
        id: "up-coin",
        symbol: "UP",
        name: "UpCoin",
        image: "",
        current_price: 100,
        market_cap: 0,
        market_cap_rank: 1,
        price_change_percentage_24h: 5.0,
      },
      {
        id: "down-coin",
        symbol: "DN",
        name: "DownCoin",
        image: "",
        current_price: 50,
        market_cap: 0,
        market_cap_rank: 2,
        price_change_percentage_24h: -3.0,
      },
    ]);

    render(<CoinMarketList currency="AUD" />);

    await waitFor(() => screen.getByText("UpCoin"));

    const positiveBadge = screen.getByText(/5\.00%/);
    expect(positiveBadge.className).toMatch(/emerald/);

    const negativeBadge = screen.getByText(/3\.00%/);
    expect(negativeBadge.className).toMatch(/red/);
  });
});
