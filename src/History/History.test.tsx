import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import History from "./History";

vi.mock("../cryptoService", () => ({
  getPriceHistoricalDays: vi.fn(),
}));

import { getPriceHistoricalDays } from "../cryptoService";

const mockGetHistoricalDays = vi.mocked(getPriceHistoricalDays);

/** Build a minimal histoday API response for `n` days */
const buildMockResponse = (n = 7) => ({
  Data: Array.from({ length: n + 1 }, (_, i) => ({
    time: 1700000000 + i * 86400,
    high: 50000 + i * 100,
    low: 48000 + i * 100,
    open: 49000 + i * 100,
    close: 49500 + i * 100,
    volumefrom: 1000,
    volumeto: 49500000,
    conversionType: "direct" as const,
    conversionSymbol: "" as const,
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(navigator, "onLine", { value: true, writable: true });
});

describe("History", () => {
  it("shows loading skeleton on initial render", () => {
    mockGetHistoricalDays.mockReturnValue(new Promise(() => {}));

    render(<History currency="AUD" />);
    const skeleton = document.querySelector(".skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("renders the Historical Data heading", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);
    expect(screen.getByText("Historical Data")).toBeInTheDocument();
  });

  it("renders coin chart sections after data loads", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText(/Bitcoin/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Ethereum/i)).toBeInTheDocument();
  });

  it("shows error state when API call fails and no cache exists", async () => {
    mockGetHistoricalDays.mockRejectedValue(new Error("Network error"));
    render(<History currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });
  });

  it("toggles to table view", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    await waitFor(() => screen.getByText("table"));

    await userEvent.click(screen.getByText("table"));

    // Table should now show Date column header
    await waitFor(() => {
      expect(screen.getByText("Date")).toBeInTheDocument();
    });
  });

  it("changes the amount when typing in the number input", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    const input = screen.getByRole("spinbutton", { name: "Duration amount" });
    expect(input).toHaveValue(7);

    fireEvent.change(input, { target: { value: "14" } });
    expect(input).toHaveValue(14);
  });

  it("clamps amount to the unit's minimum when a value below min is entered", () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    const input = screen.getByRole("spinbutton", { name: "Duration amount" });
    fireEvent.change(input, { target: { value: "0" } });
    // Min for "days" unit is 2
    expect(input).toHaveValue(2);
  });

  it("switches to the weeks unit", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    await userEvent.click(screen.getByText("weeks"));
    // weeks button should now appear selected (has bg-white class)
    expect(screen.getByText("weeks").className).toMatch(/bg-white/);
  });

  it("restores data from localStorage when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });

    const cachedData = [{ date: "Nov 1", BTC: 45000, ETH: 2500 }];
    localStorage.setItem("history-chart-7", JSON.stringify(cachedData));

    render(<History currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText(/Bitcoin/i)).toBeInTheDocument();
    });

    expect(mockGetHistoricalDays).not.toHaveBeenCalled();
  });

  it("shows stale data banner when falling back to cache on API error", async () => {
    mockGetHistoricalDays.mockRejectedValue(new Error("Rate limited"));

    const cachedEntry = {
      data: [{ date: "Nov 1", BTC: 45000, ETH: 2500 }],
      cachedAt: Date.now() - 3600_000, // 1 hour ago
    };
    localStorage.setItem("history-chart-7", JSON.stringify(cachedEntry));

    render(<History currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText(/Historical data unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Bitcoin/i)).toBeInTheDocument();
  });
});
