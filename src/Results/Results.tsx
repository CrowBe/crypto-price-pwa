import "./Results.css";
const allCoinKeys: CoinKey[] = ["ETH", "BTC", "XRP"];

const Results = ({ results }: { results: ITodayCurrencyPriceData }) => {
  return (
    <div className="results">
      <p className="date">{results.date}</p>
      <div className="columns">
        {allCoinKeys.map((key) => {
          return (
            <div className="column" key={key}>
              <h5>{results[key]}</h5>
              <p>{key}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { Results };
