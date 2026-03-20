import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Today from "./Today";

// Mock cryptoService so no real HTTP calls are made
vi.mock("../cryptoService", () => ({
  getPriceMulti: vi.fn(),
}));

// Mock pusher-js so we don't try to open WebSocket connections
vi.mock("pusher-js", () => ({
  default: vi.fn().mockImplementation(() => ({
    subscribe: vi.fn().mockReturnValue({
      bind: vi.fn(),
    }),
    connection: { bind: vi.fn() },
    unsubscribe: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

import { getPriceMulti } from "../cryptoService";

const mockGetPriceMulti = vi.mocked(getPriceMulti);

const mockApiResponse = {
  BTC: { AUD: "150000" },
  ETH: { AUD: "5000" },
  XRP: { AUD: "1.20" },
  SOL: { AUD: "250" },
  DOGE: { AUD: "0.30" },
  ADA: { AUD: "0.90" },
  LTC: { AUD: "120" },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // jsdom defaults: online
  Object.defineProperty(navigator, "onLine", { value: true, writable: true });
});

describe("Today", () => {
  it("shows loading skeleton on initial render", () => {
    mockGetPriceMulti.mockReturnValue(new Promise(() => {})); // never resolves

    render(<Today currency="AUD" />);
    // Skeleton cards should be in the DOM while loading
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders coin cards after successful data fetch", async () => {
    mockGetPriceMulti.mockResolvedValue(mockApiResponse);

    render(<Today currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    });

    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("Solana")).toBeInTheDocument();
  });

  it("displays formatted prices for the selected currency", async () => {
    mockGetPriceMulti.mockResolvedValue(mockApiResponse);

    render(<Today currency="AUD" />);

    await waitFor(() => {
      // Formatted BTC price should be present
      expect(screen.getByText(/150,000/)).toBeInTheDocument();
    });
  });

  it("shows error state when API call fails", async () => {
    mockGetPriceMulti.mockRejectedValue(new Error("API down"));

    render(<Today currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });
  });

  it("restores from localStorage when offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });

    const cached = {
      date: "12:00",
      BTC: "A$150,000.00",
      ETH: "A$5,000.00",
      XRP: "A$1.20",
      SOL: "A$250.00",
      DOGE: "A$0.30",
      ADA: "A$0.90",
      LTC: "A$120.00",
    };
    localStorage.setItem("today-state", JSON.stringify(cached));

    render(<Today currency="AUD" />);

    await waitFor(() => {
      expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    });

    expect(mockGetPriceMulti).not.toHaveBeenCalled();
  });

  it("calls onPriceUpdate callback with raw numeric prices", async () => {
    mockGetPriceMulti.mockResolvedValue(mockApiResponse);
    const onPriceUpdate = vi.fn();

    render(<Today currency="AUD" onPriceUpdate={onPriceUpdate} />);

    await waitFor(() => {
      expect(onPriceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ BTC: 150000 })
      );
    });
  });
});
