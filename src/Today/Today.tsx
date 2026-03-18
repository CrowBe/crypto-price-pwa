import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Pusher from "pusher-js";
import { format } from "date-fns";
import { enAU } from "date-fns/locale";
import { getPriceMulti } from "../cryptoService";
import { formatCurrency, COIN_META, COIN_ICONS } from "../utils";
import useStatus from "../hooks/useStatus";
import { LoadingState, ErrorState, EmptyState } from "../Results";

const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
const appKey = import.meta.env.VITE_PUSHER_KEY;
const pusherApi = import.meta.env.VITE_PUSHER_API;

interface TodayProps {
  currency: Currency;
}

const allCoinKeys: CoinKey[] = ["BTC", "ETH", "XRP"];

const CoinCard = ({
  coinKey,
  price,
  rawValue,
  currency,
}: {
  coinKey: CoinKey;
  price: string;
  rawValue?: number;
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

const Today = ({ currency }: TodayProps) => {
  const [todayPrice, setTodayPrice] = useState<ITodayCurrencyPriceData>();
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const { Status, setStatus } = useStatus("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveStateToLocalStorage = (today: ITodayCurrencyPriceData) => {
    localStorage.setItem("today-state", JSON.stringify(today));
  };

  const restoreStateFromLocalStorage = () => {
    const saved = localStorage.getItem("today-state");
    if (saved) {
      setTodayPrice(JSON.parse(saved));
      setStatus("success");
    } else {
      setStatus("empty");
    }
  };

  const getCurrentTimeString = () =>
    format(new Date(), "HH:mm", { locale: enAU });

  const sendPricePusher = (response: ITodayCurrencyPriceData) => {
    axios
      .post(`${pusherApi}/prices/new`, {
        ...todayPrice,
        ETH: response.ETH,
        BTC: response.BTC,
        XRP: response.XRP,
      })
      .catch((err) => console.error("Pusher post error:", err));
  };

  const handleSuccess = (response: ITodayCurrencyPriceData) => {
    if (response && (response.ETH || response.BTC || response.XRP)) {
      const today: ITodayCurrencyPriceData = {
        date: getCurrentTimeString(),
        ETH: response.ETH || todayPrice?.ETH || "—",
        BTC: response.BTC || todayPrice?.BTC || "—",
        XRP: response.XRP || todayPrice?.XRP || "—",
        ETH_raw: response.ETH_raw,
        BTC_raw: response.BTC_raw,
        XRP_raw: response.XRP_raw,
      };
      saveStateToLocalStorage(today);
      setTodayPrice(today);
      setLastUpdated(getCurrentTimeString());
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  const handleError = (err: unknown) => {
    setError(String(err));
    setStatus("error");
  };

  const fetchResults = (callback = handleSuccess, statusChange = true) => {
    if (statusChange) setStatus("loading");
    getPriceMulti(["BTC", "ETH", "XRP"], [currency])
      .then((res) => {
        const eth = res?.ETH?.[currency as keyof typeof res.ETH] ?? res?.ETH?.AUD;
        const btc = res?.BTC?.[currency as keyof typeof res.BTC] ?? res?.BTC?.AUD;
        const xrp = res?.XRP?.[currency as keyof typeof res.XRP] ?? res?.XRP?.AUD;

        const data: ITodayCurrencyPriceData = {
          date: getCurrentTimeString(),
          ETH: eth ? formatCurrency(parseFloat(eth), currency) : "—",
          BTC: btc ? formatCurrency(parseFloat(btc), currency) : "—",
          XRP: xrp ? formatCurrency(parseFloat(xrp), currency) : "—",
          ETH_raw: eth ? parseFloat(eth) : undefined,
          BTC_raw: btc ? parseFloat(btc) : undefined,
          XRP_raw: xrp ? parseFloat(xrp) : undefined,
        };
        callback(data);
      })
      .catch(handleError);

    timerRef.current = setTimeout(() => fetchResults(sendPricePusher), 60000);
  };

  useEffect(() => {
    if (!window.navigator.onLine) {
      restoreStateFromLocalStorage();
      return;
    }

    if (appKey && cluster) {
      const pusher = new Pusher(appKey, {
        cluster,
        forceTLS: true,
        enabledTransports: ["ws", "wss", "xhr_polling"],
      });

      const prices = pusher.subscribe("coin-prices");
      fetchResults();

      pusher.connection.bind("error", (err: unknown) => {
        console.error("Pusher connection error:", err);
      });

      prices.bind("prices", (data: ITodayCurrencyPriceData) => {
        handleSuccess(data);
      });

      return () => {
        clearTimeout(timerRef.current);
        pusher.unsubscribe("coin-prices");
      };
    } else {
      // No Pusher config — just fetch once
      fetchResults();
      return () => clearTimeout(timerRef.current);
    }
  }, [currency]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Live Prices
          </h2>
        </div>
        {lastUpdated && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Updated {lastUpdated}
          </p>
        )}
      </div>

      <Status
        loading={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allCoinKeys.map((k) => (
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allCoinKeys.map((key) => (
                <CoinCard
                  key={key}
                  coinKey={key}
                  price={todayPrice[key]}
                  rawValue={todayPrice[`${key}_raw` as keyof ITodayCurrencyPriceData] as number | undefined}
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
