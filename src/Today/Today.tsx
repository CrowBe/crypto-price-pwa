import { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { format } from "date-fns";
import { enAU } from "date-fns/locale";
import { getPriceMulti } from "../cryptoService";
import { formatCurrency, COIN_META, COIN_ICONS, ALL_COIN_KEYS } from "../utils";
import useStatus from "../hooks/useStatus";
import { LoadingState, ErrorState, EmptyState } from "../Results";

const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
const appKey = import.meta.env.VITE_PUSHER_KEY;

/**
 * Architecture note
 * -----------------
 * When Pusher env vars are set, the server (crypto-price-server) is responsible
 * for fetching prices on a schedule and broadcasting them via the "coin-prices"
 * Pusher channel. This component performs ONE initial fetch so the UI populates
 * immediately without waiting for the next broadcast, then switches to a
 * purely passive listener — no client-side polling loop is started.
 *
 * When Pusher is NOT configured the component falls back to direct polling
 * (every 60 s) against CoinGecko / CryptoCompare.
 *
 * This eliminates the previous circular flow where the client was both
 * fetching prices from the APIs AND posting them back to the server so the
 * server could re-broadcast them via Pusher to the same client.
 */

/** Cache entry stored in localStorage — wraps the price payload with a timestamp */
interface TodayCacheEntry {
  data: ITodayCurrencyPriceData;
  cachedAt: number; // Unix ms
}

interface TodayProps {
  currency: Currency;
  onPriceUpdate?: (prices: Record<CoinKey, number>) => void;
}

const CoinCard = ({
  coinKey,
  price,
  currency,
}: {
  coinKey: CoinKey;
  price: string;
  currency: Currency;
}) => {
  const meta = COIN_META[coinKey];
  const icon = COIN_ICONS[coinKey];

  return (
    <div className="coin-card animate-fade-in">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-full ${meta.bgClass} flex items-center justify-center text-lg font-bold ${meta.textClass}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {coinKey}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{meta.name}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          {price}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{currency} price</p>
      </div>
    </div>
  );
};

const Today = ({ currency, onPriceUpdate }: TodayProps) => {
  const [todayPrice, setTodayPrice] = useState<ITodayCurrencyPriceData>();
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [isStale, setIsStale] = useState(false);
  const [cacheTime, setCacheTime] = useState<string>();
  const { Status, setStatus } = useStatus("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const getCurrentTimeString = () =>
    format(new Date(), "HH:mm", { locale: enAU });

  const saveStateToLocalStorage = (today: ITodayCurrencyPriceData) => {
    const entry: TodayCacheEntry = { data: today, cachedAt: Date.now() };
    localStorage.setItem("today-state", JSON.stringify(entry));
  };

  const restoreStateFromLocalStorage = () => {
    const raw = localStorage.getItem("today-state");
    if (!raw) {
      setStatus("empty");
      return;
    }
    try {
      // Support both the new { data, cachedAt } shape and the old plain shape
      const parsed = JSON.parse(raw) as TodayCacheEntry | ITodayCurrencyPriceData;
      const entry = "cachedAt" in parsed
        ? parsed
        : { data: parsed as ITodayCurrencyPriceData, cachedAt: 0 };

      setTodayPrice(entry.data as ITodayCurrencyPriceData);
      if (entry.cachedAt) {
        setCacheTime(format(new Date(entry.cachedAt), "HH:mm d MMM", { locale: enAU }));
      }
      setIsStale(true);
      setStatus("success");
    } catch {
      setStatus("empty");
    }
  };

  const handleSuccess = (response: ITodayCurrencyPriceData) => {
    const hasAnyPrice = ALL_COIN_KEYS.some((key) => response[key]);
    if (response && hasAnyPrice) {
      const today: ITodayCurrencyPriceData = { date: getCurrentTimeString() };
      ALL_COIN_KEYS.forEach((key) => {
        today[key] = response[key] || todayPrice?.[key] || "—";
        today[`${key}_raw`] = response[`${key}_raw`];
      });
      saveStateToLocalStorage(today);
      setTodayPrice(today);
      setLastUpdated(getCurrentTimeString());
      setIsStale(false);
      setCacheTime(undefined);
      setStatus("success");

      if (onPriceUpdate) {
        const rawPrices: Partial<Record<CoinKey, number>> = {};
        ALL_COIN_KEYS.forEach((key) => {
          const raw = response[`${key}_raw`];
          if (typeof raw === "number") rawPrices[key] = raw;
        });
        onPriceUpdate(rawPrices as Record<CoinKey, number>);
      }
    } else {
      setStatus("error");
    }
  };

  const handleError = (err: unknown) => {
    // All providers failed — attempt to show cached data with a stale warning
    const raw = localStorage.getItem("today-state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as TodayCacheEntry | ITodayCurrencyPriceData;
        const entry = "cachedAt" in parsed
          ? parsed
          : { data: parsed as ITodayCurrencyPriceData, cachedAt: 0 };

        setTodayPrice(entry.data as ITodayCurrencyPriceData);
        if (entry.cachedAt) {
          setCacheTime(format(new Date(entry.cachedAt), "HH:mm d MMM", { locale: enAU }));
        }
        setIsStale(true);
        setStatus("success");
        return;
      } catch {
        // fall through to error state
      }
    }
    setError(String(err));
    setStatus("error");
  };

  /**
   * Fetch prices directly from the API and update the UI.
   * Used for the initial load and for the polling fallback.
   */
  const fetchResults = (statusChange = true) => {
    if (statusChange) setStatus("loading");
    getPriceMulti(ALL_COIN_KEYS, [currency])
      .then((res) => {
        const data: ITodayCurrencyPriceData = { date: getCurrentTimeString() };
        ALL_COIN_KEYS.forEach((key) => {
          const coinData = res[key];
          const rawStr = coinData?.[currency] ?? coinData?.["AUD"];
          data[key] = rawStr ? formatCurrency(parseFloat(rawStr), currency) : "—";
          data[`${key}_raw`] = rawStr ? parseFloat(rawStr) : undefined;
        });
        handleSuccess(data);
      })
      .catch(handleError);
  };

  /**
   * Polling loop: fetch prices every 60 s, used when Pusher is not configured.
   * In Pusher mode the server drives updates — no client-side loop is needed.
   */
  const schedulePoll = () => {
    timerRef.current = setTimeout(() => {
      fetchResults(false);
      schedulePoll();
    }, 60_000);
  };

  useEffect(() => {
    if (!window.navigator.onLine) {
      restoreStateFromLocalStorage();
      return;
    }

    if (appKey && cluster) {
      // --- Pusher mode ---
      // The server fetches prices on a schedule and broadcasts them here.
      // We do one initial direct fetch so data appears immediately, then
      // rely entirely on incoming Pusher events — no polling loop.
      const pusher = new Pusher(appKey, {
        cluster,
        forceTLS: true,
        enabledTransports: ["ws", "wss", "xhr_polling"],
      });

      const channel = pusher.subscribe("coin-prices");

      pusher.connection.bind("error", (err: unknown) => {
        console.error("Pusher connection error:", err);
      });

      channel.bind("prices", (data: ITodayCurrencyPriceData) => {
        handleSuccess(data);
      });

      // Initial fetch so the UI isn't empty while waiting for first broadcast
      fetchResults();

      return () => {
        clearTimeout(timerRef.current);
        pusher.unsubscribe("coin-prices");
        pusher.disconnect();
      };
    } else {
      // --- Polling mode ---
      fetchResults();
      schedulePoll();
      return () => clearTimeout(timerRef.current);
    }
  }, [currency]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isStale ? "bg-amber-400" : "bg-emerald-500 animate-pulse-slow"}`}></span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Live Prices
          </h2>
        </div>
        {isStale && cacheTime ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Cached data from {cacheTime}
          </p>
        ) : lastUpdated ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Updated {lastUpdated}
          </p>
        ) : null}
      </div>

      {isStale && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Live prices unavailable — showing cached data
          {cacheTime ? ` from ${cacheTime}` : ""}.{" "}
          <button
            onClick={() => fetchResults()}
            className="ml-1 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300"
          >
            Retry
          </button>
        </div>
      )}

      <Status
        loading={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ALL_COIN_KEYS.map((k) => (
              <div key={k} className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton w-10 h-10 rounded-full"></div>
                  <div className="skeleton w-8 h-4 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton w-16 h-3 rounded"></div>
                  <div className="skeleton w-32 h-7 rounded"></div>
                  <div className="skeleton w-20 h-3 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        }
        empty={<EmptyState />}
        error={<ErrorState error={error} retry={() => fetchResults()} />}
        success={
          todayPrice ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ALL_COIN_KEYS.map((key) => (
                <CoinCard
                  key={key}
                  coinKey={key}
                  price={todayPrice[key] as string || "—"}
                  currency={currency}
                />
              ))}
            </div>
          ) : (
            <></>
          )
        }
      />
    </section>
  );
};

export default Today;
