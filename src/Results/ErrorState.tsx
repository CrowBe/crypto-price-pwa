const ErrorState = ({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) => {
  if (error) console.error(error);
  return (
    <div className="card p-6 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">Something went wrong</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Unable to fetch price data</p>
      </div>
      {retry && (
        <button
          onClick={retry}
          className="btn-primary"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export { ErrorState };
