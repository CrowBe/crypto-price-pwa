import "./Results.css";
const allCoinKeys: CoinKey[] = ["ETH", "BTC", "XRP"];

const Results = ({ results }: { results: ITodayCurrencyPriceData }) => {
  return (
    <div className="results">
      <p className="date">{results.date}</p>
      <div className="columns">
        {allCoinKeys.map((key) => {
          let price = results[key].toString();
          const dollarsAndCents = price.split(".");
          if (dollarsAndCents[0].length > 3) {
            price = `${dollarsAndCents[0].slice(
              0,
              -3
            )},${dollarsAndCents[0].slice(-3)}.${dollarsAndCents[1] || "00"}`;
          }
          price = `$${price} AUD`;
          return (
            <div className="column" key={key}>
              <h5>{price}</h5>
              <p>{key}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { Results };
