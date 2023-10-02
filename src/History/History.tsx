import { useEffect, useState } from "react";
import "./History.css";
import { getPriceHistoricalDays } from "../cryptoService";
import { format, fromUnixTime } from "date-fns";
import { Results } from "../Results";
import { AUDollarFormatter } from "../utils";

const History = () => {
  const [numDays, setNumDays] = useState<number>(2);
  const [historicalData, setHistoricalData] = useState<{
    [key: string]: ITodayCurrencyPriceData;
  }>();
  const adjustNumDays = (direction: "decrement" | "increment") => {
    if (direction === "decrement" && numDays > 1) {
      setNumDays(numDays - 1);
    } else if (direction === "increment" && numDays < 10) {
      setNumDays(numDays + 1);
    } else {
      alert("Cannot set the number of days to be less than 1 or more than 10");
    }
  };

  const fetchDays = () => {
    getPriceHistoricalDays("BTC", "AUD", numDays - 1)
      .then((btcRes) => {
        let btc = [...btcRes.Data];
        getPriceHistoricalDays("ETH", "AUD", numDays - 1).then((ethRes) => {
          let eth = [...ethRes.Data];
          getPriceHistoricalDays("XRP", "AUD", numDays - 1).then((xrpRes) => {
            let xrp = [...xrpRes.Data];
            let temp: { [key: string]: ITodayCurrencyPriceData } = {};
            for (let i = 0; i < numDays; i++) {
              let dateKey = format(fromUnixTime(btc[i].time), "dd-MM-yy");
              temp[dateKey] = {
                date: format(fromUnixTime(btc[i].time), "MMM do yy"),
                BTC: AUDollarFormatter.format(btc[i].close),
                ETH: AUDollarFormatter.format(eth[i].close),
                XRP: AUDollarFormatter.format(xrp[i].close),
              };
            }
            setHistoricalData(temp);
          });
        });
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchDays();
  }, [numDays]);
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
        {historicalData
          ? Object.keys(historicalData).map((day) => {
              return <Results results={historicalData[day]} key={day} />;
            })
          : null}
      </div>
    </div>
  );
};

export default History;
