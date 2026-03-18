import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PriceAlerts from "./PriceAlerts";
import type { CoinKey } from "../types";

const emptyPrices = {} as Record<CoinKey, number>;

const defaultPrices: Record<CoinKey, number> = {
  BTC: 50000,
  ETH: 3000,
  XRP: 0.6,
  SOL: 150,
  DOGE: 0.1,
  ADA: 0.5,
  LTC: 80,
};

// Stub the Notification global before each test so permission is predictable
function stubNotification(permission: NotificationPermission = "granted") {
  const ctor = vi.fn();
  vi.stubGlobal(
    "Notification",
    Object.assign(ctor, {
      permission,
      requestPermission: vi.fn().mockResolvedValue(permission),
    })
  );
  return ctor;
}

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PriceAlerts", () => {
  it("renders the section heading", () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    expect(screen.getByText("Price Alerts")).toBeInTheDocument();
  });

  it("shows empty state message when no alerts exist", () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    expect(screen.getByText(/No alerts set/i)).toBeInTheDocument();
  });

  it("toggles the add-alert form on button click", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    const addButton = screen.getByText("Add alert");
    expect(screen.queryByPlaceholderText("e.g. 50000")).not.toBeInTheDocument();

    await userEvent.click(addButton);
    expect(screen.getByPlaceholderText("e.g. 50000")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Hide"));
    expect(screen.queryByPlaceholderText("e.g. 50000")).not.toBeInTheDocument();
  });

  it("adds a new alert with valid price input", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);

    await userEvent.click(screen.getByText("Add alert"));
    await userEvent.type(screen.getByPlaceholderText("e.g. 50000"), "60000");
    await userEvent.click(screen.getByRole("button", { name: "Add Alert" }));

    // "Notify when price goes" only appears in the active alert list rows
    await waitFor(() => {
      expect(screen.getByText(/Notify when price goes/i)).toBeInTheDocument();
    });
  });

  it("disables Add Alert button when price is empty", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    await userEvent.click(screen.getByText("Add alert"));
    const addBtn = screen.getByRole("button", { name: "Add Alert" });
    expect(addBtn).toBeDisabled();
  });

  it("removes an alert when the × button is clicked", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);

    // Add an alert
    await userEvent.click(screen.getByText("Add alert"));
    await userEvent.type(screen.getByPlaceholderText("e.g. 50000"), "60000");
    await userEvent.click(screen.getByRole("button", { name: "Add Alert" }));

    await waitFor(() => expect(screen.getByText(/Notify when price goes/i)).toBeInTheDocument());

    // Remove it
    const removeBtn = screen.getByRole("button", { name: "Remove alert" });
    await userEvent.click(removeBtn);

    await waitFor(() => expect(screen.getByText(/No alerts set/i)).toBeInTheDocument());
  });

  it("shows the active alert count badge", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    await userEvent.click(screen.getByText("Add alert"));
    await userEvent.type(screen.getByPlaceholderText("e.g. 50000"), "60000");
    await userEvent.click(screen.getByRole("button", { name: "Add Alert" }));

    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("shows notification denied warning when permission is blocked", async () => {
    stubNotification("denied");
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    await userEvent.click(screen.getByText("Add alert"));
    expect(screen.getByText(/Browser notifications are blocked/i)).toBeInTheDocument();
  });

  it("marks an alert as triggered when live price crosses target (above)", async () => {
    stubNotification();

    // Start below the target
    const { rerender } = render(
      <PriceAlerts
        currency="AUD"
        livePrices={{ ...defaultPrices, BTC: 40000 }}
      />
    );

    // Add a "BTC above 45000" alert manually via localStorage
    const alert = {
      id: "test-id-1",
      coin: "BTC",
      targetPrice: 45000,
      direction: "above",
      currency: "AUD",
      triggered: false,
    };
    localStorage.setItem("price-alerts", JSON.stringify([alert]));

    // Re-mount with the alert loaded from storage
    const { rerender: rerender2 } = render(
      <PriceAlerts
        currency="AUD"
        livePrices={{ ...defaultPrices, BTC: 40000 }}
      />
    );

    // Now push price above the target
    rerender2(
      <PriceAlerts
        currency="AUD"
        livePrices={{ ...defaultPrices, BTC: 46000 }}
      />
    );

    await waitFor(() => {
      // Alert should now be marked triggered (shown in triggered section)
      expect(screen.getByText(/target hit/i)).toBeInTheDocument();
    });
  });

  it("persists alerts in localStorage", async () => {
    stubNotification();
    render(<PriceAlerts currency="AUD" livePrices={emptyPrices} />);
    await userEvent.click(screen.getByText("Add alert"));
    await userEvent.type(screen.getByPlaceholderText("e.g. 50000"), "55000");
    await userEvent.click(screen.getByRole("button", { name: "Add Alert" }));

    await waitFor(() => {
      const stored = localStorage.getItem("price-alerts");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].targetPrice).toBe(55000);
    });
  });
});
