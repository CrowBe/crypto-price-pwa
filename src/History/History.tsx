import { useCallback, useEffect, useState } from "react";
import "./History.css";
import { getPriceHistoricalDays } from "../cryptoService";
import { format, fromUnixTime } from "date-fns";
import { EmptyState, ErrorState, LoadingState, Results } from "../Results";
import { AUDollarFormatter } from "../utils";
import useStatus from "../hooks/useStatus";

const History = () => {
  const [numDays, setNumDays] = useState<number>(2);
  const [historicalData, setHistoricalData] = useState<{
    [key: string]: ITodayCurrencyPriceData;
  }>();
  const [error, setError] = useState<string>("");
  const { Status, setStatus } = useStatus("loading");
  const adjustNumDays = (direction: "decrement" | "increment") => {
    if (direction === "decrement" && numDays > 1) {
      setNumDays(numDays - 1);
    } else if (direction === "increment" && numDays < 10) {
      setNumDays(numDays + 1);
    } else {
      alert("Cannot set the number of days to be less than 1 or more than 10");
    }
  };

  const restoreStateFromLocalStorage = useCallback(() => {
    let temp: { [key: string]: ITodayCurrencyPriceData } = {};
    for (let i = 0; i < numDays; i++) {
      let dayState: string | null = localStorage.getItem(`day-state-${i + 1}`);
      if (dayState) {
        let dayObj = JSON.parse(dayState);
        if (dayObj.date) {
          temp[dayObj.date] = dayObj;
        }
      }
    }
    setHistoricalData(temp);
  }, [numDays]);

  const fetchDays = useCallback(() => {
    setStatus("loading");
    getPriceHistoricalDays("BTC", "AUD", numDays)
      .then((btcRes) => {
        let btc = [...btcRes.Data];
        getPriceHistoricalDays("ETH", "AUD", numDays).then((ethRes) => {
          let eth = [...ethRes.Data];
          getPriceHistoricalDays("XRP", "AUD", numDays).then((xrpRes) => {
            let xrp = [...xrpRes.Data];
            let temp: { [key: string]: ITodayCurrencyPriceData } = {};
            for (let i = numDays - 1; i >= 0; i--) {
              let dateKey = format(fromUnixTime(btc[i].time), "dd-MM-yy");
              temp[dateKey] = {
                date: format(fromUnixTime(btc[i].time), "MMM do yy"),
                BTC: AUDollarFormatter.format(btc[i].close),
                ETH: AUDollarFormatter.format(eth[i].close),
                XRP: AUDollarFormatter.format(xrp[i].close),
              };
            }
            setHistoricalData(temp);
            setStatus("success");
          });
        });
      })
      .catch((err) => {
        setError(err);
        setStatus("error");
      });
  }, [numDays, setStatus]);

  useEffect(() => {
    let online = window.navigator.onLine;
    if (!online) {
      return restoreStateFromLocalStorage();
    }
    fetchDays();
  }, [numDays, fetchDays, restoreStateFromLocalStorage]);
  return (
    <div className="history-section-container">
      <h2>Historical Data</h2>
      {/* Add variable for n of days */}
      <p className="section-description">
        Daily average price for the past{" "}
        <button onClick={() => adjustNumDays("decrement")}>-</button>
        <em> {numDays} </em>
        <button onClick={() => adjustNumDays("increment")}>+</button> days
      </p>
      <div className="days-container">
        <Status
          loading={<LoadingState />}
          empty={<EmptyState />}
          error={<ErrorState error={error} retry={fetchDays} />}
          success={
            <>
              {historicalData
                ? Object.keys(historicalData).map((day) => (
                    <Results results={historicalData[day]} key={day} />
                  ))
                : null}
            </>
          }
        />
      </div>
    </div>
  );
};

export default History;
