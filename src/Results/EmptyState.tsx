const EmptyState = () => {
  return (
    <div className="card p-8 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
        ₿
      </div>
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">No data available</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          No price data found. Check your API configuration.
        </p>
      </div>
    </div>
  );
};

export { EmptyState };
