// Legacy Results component – kept for compatibility.
// Sections now render their own card layouts directly.
const allCoinKeys: CoinKey[] = ["ETH", "BTC", "XRP"];

const Results = ({ results }: { results: ITodayCurrencyPriceData }) => {
  return (
    <div className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{results.date}</p>
      <div className="grid grid-cols-3 gap-2">
        {allCoinKeys.map((key) => (
          <div key={key} className="text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {results[key]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{key}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export { Results };
