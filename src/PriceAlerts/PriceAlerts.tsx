import { useState, useEffect, useRef } from "react";
import { COIN_META, COIN_ICONS, ALL_COIN_KEYS, formatCurrency } from "../utils";

interface PriceAlertsProps {
  currency: Currency;
  livePrices: Record<CoinKey, number>;
}

const STORAGE_KEY = "price-alerts";

const loadAlerts = (): IPriceAlert[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveAlerts = (alerts: IPriceAlert[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
};

const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

const showNotification = (coin: CoinKey, price: number, currency: Currency, direction: "above" | "below") => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const meta = COIN_META[coin];
  const icon = COIN_ICONS[coin];
  const dirLabel = direction === "above" ? "risen above" : "fallen below";
  new Notification(`${icon} ${meta.name} price alert`, {
    body: `${meta.name} has ${dirLabel} your target. Current price: ${formatCurrency(price, currency)}`,
    icon: "/pwa-192x192.png",
  });
};

const PriceAlerts = ({ currency, livePrices }: PriceAlertsProps) => {
  const [alerts, setAlerts] = useState<IPriceAlert[]>(loadAlerts);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinKey>("BTC");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const triggeredRef = useRef<Set<string>>(new Set());

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  // Check alerts against live prices
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return;

    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.triggered) return alert;
        if (alert.currency !== currency) return alert;

        const currentPrice = livePrices[alert.coin];
        if (currentPrice === undefined) return alert;

        const key = alert.id;
        const hit =
          (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
          (alert.direction === "below" && currentPrice <= alert.targetPrice);

        if (hit && !triggeredRef.current.has(key)) {
          triggeredRef.current.add(key);
          showNotification(alert.coin, currentPrice, currency, alert.direction);
          return { ...alert, triggered: true };
        }
        return alert;
      })
    );
  }, [livePrices, currency]);

  const handleAddAlert = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    const granted = await requestNotificationPermission();
    setNotifPermission("Notification" in window ? Notification.permission : "denied");

    const newAlert: IPriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      coin: selectedCoin,
      targetPrice: price,
      direction,
      currency,
      triggered: false,
    };

    setAlerts((prev) => [...prev, newAlert]);
    setTargetPrice("");
  };

  const handleRemoveAlert = (id: string) => {
    triggeredRef.current.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearTriggered = () => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
    triggeredRef.current.clear();
  };

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Price Alerts
          </h2>
          {activeAlerts.length > 0 && (
            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              {activeAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {isOpen ? "Hide" : "Add alert"}
        </button>
      </div>

      {isOpen && (
        <div className="card p-4 mb-4 animate-fade-in">
          {notifPermission === "denied" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
              Browser notifications are blocked. Enable them in your browser settings to receive alerts.
            </p>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            {/* Coin selector */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Coin</label>
              <select
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value as CoinKey)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_COIN_KEYS.map((coin) => (
                  <option key={coin} value={coin}>
                    {COIN_ICONS[coin]} {COIN_META[coin].name} ({coin})
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Trigger when</label>
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                {(["above", "below"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                      direction === d
                        ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Target price */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Target price ({currency})
              </label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 50000"
                min="0"
                step="any"
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
              />
            </div>

            <button
              onClick={handleAddAlert}
              disabled={!targetPrice || parseFloat(targetPrice) <= 0}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Add Alert
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
          No alerts set. Add one above to get notified when a price target is hit.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Active alerts */}
          {activeAlerts.map((alert) => {
            const meta = COIN_META[alert.coin];
            const icon = COIN_ICONS[alert.coin];
            return (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${meta.textClass}`}>{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {meta.name} ({alert.coin})
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Notify when price goes{" "}
                      <span className={alert.direction === "above" ? "text-emerald-500" : "text-red-500"}>
                        {alert.direction}
                      </span>{" "}
                      {formatCurrency(alert.targetPrice, alert.currency)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAlert(alert.id)}
                  className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label="Remove alert"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Triggered
                </p>
                <button
                  onClick={handleClearTriggered}
                  className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
              {triggeredAlerts.map((alert) => {
                const meta = COIN_META[alert.coin];
                const icon = COIN_ICONS[alert.coin];
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {meta.name} — target hit ✓
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {alert.direction} {formatCurrency(alert.targetPrice, alert.currency)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAlert(alert.id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none"
                      aria-label="Remove alert"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PriceAlerts;
