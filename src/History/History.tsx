import { useCallback, useEffect, useState } from "react";
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
import { format, fromUnixTime } from "date-fns";
import { ErrorState, LoadingState, EmptyState } from "../Results";
import { formatCurrency, COIN_META, ALL_COIN_KEYS } from "../utils";
import useStatus from "../hooks/useStatus";

interface HistoryProps {
  currency: Currency;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

type TimeUnit = "days" | "weeks" | "months";

const UNIT_CONFIG: Record<TimeUnit, { min: number; max: number; toDays: (n: number) => number; label: string }> = {
  days:   { min: 2,  max: 90,  toDays: (n) => n,      label: "Days"   },
  weeks:  { min: 1,  max: 52,  toDays: (n) => n * 7,  label: "Weeks"  },
  months: { min: 1,  max: 24,  toDays: (n) => n * 30, label: "Months" },
};

const History = ({ currency }: HistoryProps) => {
  const [amount, setAmount] = useState<number>(7);
  const [unit, setUnit] = useState<TimeUnit>("days");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string>("");
  const [activeView, setActiveView] = useState<"chart" | "table">("chart");
  const { Status, setStatus } = useStatus("loading");

  const numDays = UNIT_CONFIG[unit].toDays(amount);

  const handleUnitChange = (newUnit: TimeUnit) => {
    const cfg = UNIT_CONFIG[newUnit];
    setUnit(newUnit);
    setAmount((prev) => Math.min(Math.max(prev, cfg.min), cfg.max));
  };

  const handleAmountChange = (value: string) => {
    const n = parseInt(value, 10);
    const cfg = UNIT_CONFIG[unit];
    if (!isNaN(n)) setAmount(Math.min(Math.max(n, cfg.min), cfg.max));
  };

  const restoreStateFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(`history-chart-${numDays}`);
    if (saved) {
      setChartData(JSON.parse(saved));
      setStatus("success");
    } else {
      setStatus("empty");
    }
  }, [numDays, setStatus]);

  const fetchDays = useCallback(async () => {
    setStatus("loading");
    try {
      const results = await Promise.all(
        ALL_COIN_KEYS.map((coin) => getPriceHistoricalDays(coin, currency, numDays))
      );

      const points: ChartDataPoint[] = [];
      const firstCoinData = results[0].Data;
      for (let i = numDays - 1; i >= 0; i--) {
        const point: ChartDataPoint = {
          date: format(fromUnixTime(firstCoinData[i].time), "MMM d"),
        };
        ALL_COIN_KEYS.forEach((coin, idx) => {
          point[coin] = results[idx].Data[i].close;
        });
        points.push(point);
      }

      setChartData(points);
      localStorage.setItem(`history-chart-${numDays}`, JSON.stringify(points));
      setStatus("success");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }, [numDays, currency, setStatus]);

  useEffect(() => {
    if (!window.navigator.onLine) {
      restoreStateFromLocalStorage();
      return;
    }
    fetchDays();
  }, [numDays, currency, fetchDays, restoreStateFromLocalStorage]);

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
          {/* Duration input */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <input
              type="number"
              value={amount}
              min={UNIT_CONFIG[unit].min}
              max={UNIT_CONFIG[unit].max}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-12 text-sm font-semibold text-center text-slate-900 dark:text-slate-100 bg-transparent tabular-nums focus:outline-none"
              aria-label="Duration amount"
            />
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-md p-0.5 gap-0.5">
              {(["days", "weeks", "months"] as TimeUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => handleUnitChange(u)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold capitalize transition-all duration-200 ${
                    unit === u
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
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

      <Status
        loading={
          <div className="card p-6">
            <div className="skeleton w-full h-64 rounded-lg"></div>
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
                  return (
                    <div key={coin}>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: meta.color }}
                        ></span>
                        {meta.name} ({coin})
                      </h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={chartData} margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
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
                            {formatCurrency(row[key] as number, currency)}
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
