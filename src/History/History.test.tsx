import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("shows error state when API call fails", async () => {
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

  it("increments the day count when + button is clicked", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    // Initial display is "7 days"
    expect(screen.getByText("7 days")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Increase days" }));
    expect(screen.getByText("8 days")).toBeInTheDocument();
  });

  it("decrements the day count when − button is clicked", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse());
    render(<History currency="AUD" />);

    await userEvent.click(screen.getByRole("button", { name: "Decrease days" }));
    expect(screen.getByText("6 days")).toBeInTheDocument();
  });

  it("disables decrement button at minimum (2 days)", async () => {
    mockGetHistoricalDays.mockResolvedValue(buildMockResponse(2));
    render(<History currency="AUD" />);

    // Reduce to minimum
    for (let i = 0; i < 10; i++) {
      const btn = screen.getByRole("button", { name: "Decrease days" });
      if (!btn.hasAttribute("disabled")) await userEvent.click(btn);
    }

    expect(screen.getByRole("button", { name: "Decrease days" })).toBeDisabled();
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
});
