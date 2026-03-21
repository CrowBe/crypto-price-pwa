import { useCallback, useEffect, useRef, useState } from "react";
import type { SVGProps } from "react";
import type { Currency, CoinKey, IHistoricalPriceData } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getPriceHistoricalDays } from "../cryptoService";
import { format } from "date-fns";
import { enAU } from "date-fns/locale";
import { ErrorState, EmptyState } from "../Results";
import { formatCurrency, COIN_META, ALL_COIN_KEYS } from "../utils";
import useStatus from "../hooks/useStatus";

interface HistoryProps {
  currency: Currency;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

/** Cache entry stored in localStorage — wraps chart data with a timestamp */
interface HistoryCacheEntry {
  data: ChartDataPoint[];
  cachedAt: number; // Unix ms
}

type TimePreset = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";
type CoinStatus = "loading" | "success" | "error";

const PRESETS: { label: TimePreset; days: number }[] = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

const MAX_AUTO_RETRIES = 3;

/** Custom X-axis tick that angles labels for readability on small screens. */
const AngledTick = (props: SVGProps<SVGTextElement> & { x?: number; y?: number; payload?: { value: string } }) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="end"
        fill="currentColor"
        fontSize={11}
        transform="rotate(-35)"
      >
        {payload?.value}
      </text>
    </g>
  );
};

/** Skeleton placeholder matching the shape of a single coin chart row. */
const CoinChartSkeleton = ({ coin, attempt }: { coin: CoinKey; attempt?: number }) => {
  const meta = COIN_META[coin];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full inline-block opacity-30"
          style={{ backgroundColor: meta.color }}
        />
        <div className="skeleton h-4 w-36 rounded" />
      </div>
      <div className="skeleton w-full rounded-lg" style={{ height: 160 }} />
      {attempt !== undefined && attempt > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
          Retrying… attempt {attempt} of {MAX_AUTO_RETRIES}
        </p>
      )}
    </div>
  );
};

const History = ({ currency }: HistoryProps) => {
  const [preset, setPreset] = useState<TimePreset>("1W");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [coinStatuses, setCoinStatuses] = useState<Record<CoinKey, CoinStatus>>(
    () => Object.fromEntries(ALL_COIN_KEYS.map((k) => [k, "loading"])) as Record<CoinKey, CoinStatus>
  );
  const [coinRetryAttempts, setCoinRetryAttempts] = useState<Partial<Record<CoinKey, number>>>({});
  const [error, setError] = useState<string>("");
  const [activeView, setActiveView] = useState<"chart" | "table">("chart");
  const [isStale, setIsStale] = useState(false);
  const [cacheTime, setCacheTime] = useState<string>();
  const { Status, setStatus } = useStatus("loading");

  /** Abort signal shared across per-coin retries; invalidated on each new fetchDays call. */
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  const numDays = PRESETS.find((p) => p.label === preset)!.days;

  const restoreStateFromLocalStorage = useCallback(() => {
    const raw = localStorage.getItem(`history-chart-${numDays}`);
    if (!raw) {
      setStatus("empty");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as HistoryCacheEntry | ChartDataPoint[];
      const entry = Array.isArray(parsed)
        ? { data: parsed, cachedAt: 0 }
        : parsed;

      setChartData(entry.data);
      if (entry.cachedAt) {
        setCacheTime(format(new Date(entry.cachedAt), "HH:mm d MMM", { locale: enAU }));
      }
      setIsStale(true);
      setCoinStatuses(Object.fromEntries(ALL_COIN_KEYS.map((k) => [k, "success"])) as Record<CoinKey, CoinStatus>);
      setStatus("success");
    } catch {
      setStatus("empty");
    }
  }, [numDays, setStatus]);

  const saveToLocalStorage = (points: ChartDataPoint[]) => {
    const entry: HistoryCacheEntry = { data: points, cachedAt: Date.now() };
    localStorage.setItem(`history-chart-${numDays}`, JSON.stringify(entry));
  };

  /**
   * Retry a single coin's fetch up to MAX_AUTO_RETRIES times with exponential backoff.
   * Updates chartData in-place on success. Shows per-coin skeleton during attempts.
   * Aborts silently if the abort signal fires (e.g. user changes preset).
   */
  const retryCoinFetch = useCallback(
    async (coin: CoinKey, abort: { aborted: boolean }) => {
      for (let attempt = 0; attempt < MAX_AUTO_RETRIES; attempt++) {
        if (abort.aborted) return;

        if (attempt > 0) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
          await new Promise((r) => setTimeout(r, delay));
          if (abort.aborted) return;
        }

        setCoinRetryAttempts((prev) => ({ ...prev, [coin]: attempt + 1 }));

        try {
          const result = await getPriceHistoricalDays(coin, currency, numDays);
          if (abort.aborted) return;

          const sorted = [...result.Data].sort((a, b) => a.time - b.time);
          setChartData((prev) =>
            prev.map((point, i) => ({ ...point, [coin]: sorted[i]?.close ?? 0 }))
          );
          setCoinStatuses((prev) => ({ ...prev, [coin]: "success" }));
          setCoinRetryAttempts((prev) => {
            const next = { ...prev };
            delete next[coin];
            return next;
          });
          return;
        } catch {
          // continue to next attempt
        }
      }

      if (!abort.aborted) {
        setCoinStatuses((prev) => ({ ...prev, [coin]: "error" }));
        setCoinRetryAttempts((prev) => {
          const next = { ...prev };
          delete next[coin];
          return next;
        });
      }
    },
    [currency, numDays]
  );

  const fetchDays = useCallback(async () => {
    // Cancel any in-progress per-coin retries from a previous fetch
    abortRef.current.aborted = true;
    const abort = { aborted: false };
    abortRef.current = abort;

    setStatus("loading");
    setCoinStatuses(Object.fromEntries(ALL_COIN_KEYS.map((k) => [k, "loading"])) as Record<CoinKey, CoinStatus>);
    setCoinRetryAttempts({});
    setIsStale(false);
    setCacheTime(undefined);

    try {
      // Use allSettled so a single coin failure doesn't block the whole chart
      const settled = await Promise.allSettled(
        ALL_COIN_KEYS.map((coin) => getPriceHistoricalDays(coin, currency, numDays))
      );

      if (abort.aborted) return;

      // Track which coins failed or returned empty data
      const failed: CoinKey[] = [];
      const coinData: (IHistoricalPriceData[] | null)[] = settled.map((result, i) => {
        if (result.status === "rejected" || !result.value.Data.length) {
          failed.push(ALL_COIN_KEYS[i]);
          return null;
        }
        return result.value.Data;
      });

      // Sort each coin's data chronologically (oldest → newest)
      const sortedCoinData = coinData.map((data) =>
        data ? [...data].sort((a, b) => a.time - b.time) : null
      );

      const referenceData = sortedCoinData.find((d) => d !== null);
      if (!referenceData) throw new Error("No historical data available for any coin");

      // Build chart points in chronological order
      const points: ChartDataPoint[] = referenceData.map((entry, i) => {
        const d = new Date(entry.time * 1000);
        const dateStr =
          numDays <= 1
            ? `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
            : `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
        const point: ChartDataPoint = { date: dateStr };
        ALL_COIN_KEYS.forEach((coin, idx) => {
          const dp = sortedCoinData[idx]?.[i];
          point[coin] = dp ? dp.close : 0;
        });
        return point;
      });

      setChartData(points);
      saveToLocalStorage(points);

      // Mark successful coins; failed coins stay "loading" and get auto-retried
      setCoinStatuses(
        Object.fromEntries(
          ALL_COIN_KEYS.map((coin) => [coin, failed.includes(coin) ? "loading" : "success"])
        ) as Record<CoinKey, CoinStatus>
      );
      setStatus("success");

      // Kick off per-coin retries for any that failed — these update chartData in-place
      for (const coin of failed) {
        retryCoinFetch(coin, abort);
      }
    } catch (err) {
      if (abort.aborted) return;

      // All providers failed — try cache with stale warning
      const raw = localStorage.getItem(`history-chart-${numDays}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as HistoryCacheEntry | ChartDataPoint[];
          const cacheEntry = Array.isArray(parsed)
            ? { data: parsed, cachedAt: 0 }
            : parsed;

          setChartData(cacheEntry.data);
          if (cacheEntry.cachedAt) {
            setCacheTime(format(new Date(cacheEntry.cachedAt), "HH:mm d MMM", { locale: enAU }));
          }
          setIsStale(true);
          setCoinStatuses(Object.fromEntries(ALL_COIN_KEYS.map((k) => [k, "success"])) as Record<CoinKey, CoinStatus>);
          setStatus("success");
          return;
        } catch {
          // fall through to error state
        }
      }
      setError(String(err));
      setStatus("error");
    }
  }, [numDays, currency, setStatus, retryCoinFetch]);

  useEffect(() => {
    if (!window.navigator.onLine) {
      restoreStateFromLocalStorage();
      return;
    }
    fetchDays();
  }, [numDays, currency, fetchDays, restoreStateFromLocalStorage]);

  // Abort in-flight retries on unmount
  useEffect(() => {
    return () => {
      abortRef.current.aborted = true;
    };
  }, []);

  const formatTooltipValue = (value: number, name: string) => [
    formatCurrency(value, currency),
    COIN_META[name as CoinKey]?.name ?? name,
  ];

  return (
    <section>
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Historical Data
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset time range selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 gap-0.5">
            {PRESETS.map(({ label }) => (
              <button
                key={label}
                onClick={() => setPreset(label)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  preset === label
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                  activeView === v
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isStale && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Historical data unavailable — showing cached data
          {cacheTime ? ` from ${cacheTime}` : ""}.{" "}
          <button
            onClick={fetchDays}
            className="ml-1 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300"
          >
            Retry
          </button>
        </div>
      )}

      <Status
        loading={
          /* Per-coin skeletons match the actual chart layout for a smooth transition */
          <div className="card p-4 sm:p-6 space-y-6">
            {ALL_COIN_KEYS.map((coin) => (
              <CoinChartSkeleton key={coin} coin={coin} />
            ))}
          </div>
        }
        empty={<EmptyState />}
        error={<ErrorState error={error} retry={fetchDays} />}
        success={
          <div className="card overflow-hidden animate-fade-in">
            {activeView === "chart" ? (
              <div className="p-4 sm:p-6 space-y-6">
                {ALL_COIN_KEYS.map((coin) => {
                  const meta = COIN_META[coin];
                  const coinStatus = coinStatuses[coin];
                  const attempt = coinRetryAttempts[coin];
                  return (
                    <div key={coin}>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.name} ({coin})
                      </h3>

                      {coinStatus === "loading" ? (
                        /* Per-coin skeleton with optional retry progress indicator */
                        <div>
                          <div className="skeleton w-full rounded-lg" style={{ height: 160 }} />
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-3 h-3 border border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
                            {attempt
                              ? `Retrying… attempt ${attempt} of ${MAX_AUTO_RETRIES}`
                              : "Loading…"}
                          </p>
                        </div>
                      ) : coinStatus === "error" ? (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303-3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.05 3.378c.866-1.5 3.032-1.5 3.898 0l5.355 9.246zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          Failed to load {meta.name} after {MAX_AUTO_RETRIES} attempts.
                          <button
                            onClick={() => {
                              setCoinStatuses((prev) => ({ ...prev, [coin]: "loading" }));
                              retryCoinFetch(coin, abortRef.current);
                            }}
                            className="ml-1 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData} margin={{ top: 2, right: 8, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                            <XAxis
                              dataKey="date"
                              tick={<AngledTick />}
                              tickLine={false}
                              axisLine={false}
                              interval="equidistantPreserveStart"
                            />
                            <YAxis
                              tickFormatter={(v: number) => formatCurrency(v, currency).replace(/\.\d+/, "")}
                              tick={{ fontSize: 10, fill: "currentColor" }}
                              tickLine={false}
                              axisLine={false}
                              width={80}
                            />
                            <Tooltip
                              formatter={formatTooltipValue}
                              contentStyle={{ backgroundColor: "var(--tooltip-bg, #1e293b)", border: "none", borderRadius: "8px", fontSize: "12px" }}
                              labelStyle={{ color: "#94a3b8" }}
                              itemStyle={{ color: "#f8fafc" }}
                            />
                            <Line type="monotone" dataKey={coin} stroke={meta.color} strokeWidth={2} dot={false} name={coin} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table view */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-slate-500 dark:text-slate-400 font-medium">
                        Date
                      </th>
                      {ALL_COIN_KEYS.map((key) => (
                        <th
                          key={key}
                          className={`text-right px-4 py-3 font-medium ${COIN_META[key].textClass}`}
                        >
                          {COIN_META[key].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr
                        key={row.date}
                        className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                          i === 0 ? "font-medium" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {row.date}
                        </td>
                        {ALL_COIN_KEYS.map((key) => (
                          <td
                            key={key}
                            className="px-4 py-3 text-right text-slate-900 dark:text-slate-100 tabular-nums"
                          >
                            {coinStatuses[key] !== "success" ? (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            ) : (
                              formatCurrency(row[key] as number, currency)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        }
      />
    </section>
  );
};

export default History;
