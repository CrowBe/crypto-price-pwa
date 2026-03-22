import { useState, useEffect, useRef, useCallback } from "react";
import type { Currency, ICoinMarketData } from "../types";
import {
  fetchCoinMarkets,
  searchCoins,
  COIN_MARKETS_PER_PAGE,
  withRetry,
} from "../apiProviders";
import { formatCurrency } from "../utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
      <div className="skeleton w-6 h-4 rounded shrink-0" />
      <div className="skeleton w-7 h-7 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3.5 w-24 rounded" />
        <div className="skeleton h-3 w-10 rounded" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="skeleton h-3.5 w-20 rounded ml-auto" />
        <div className="skeleton h-3 w-14 rounded ml-auto" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CoinRow — one row in the table
// ---------------------------------------------------------------------------

function CoinRow({
  coin,
  rank,
  currency,
}: {
  coin: ICoinMarketData;
  rank: number;
  currency: Currency;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Rank */}
      <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-right shrink-0 tabular-nums">
        {rank}
      </span>

      {/* Icon */}
      <img
        src={coin.image}
        alt={coin.name}
        className="w-7 h-7 rounded-full shrink-0"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate leading-tight">
          {coin.name}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">
          {coin.symbol}
        </p>
      </div>

      {/* Price + 24h change */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
          {coin.current_price !== null
            ? formatCurrency(coin.current_price, currency)
            : "—"}
        </p>
        <PctBadge value={coin.price_change_percentage_24h} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination controls (desktop)
// ---------------------------------------------------------------------------

function PageControls({
  page,
  hasMore,
  isLoading,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  // Show up to 5 page numbers around current page
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = start + 4;
  for (let p = start; p <= end; p++) {
    if (p === page || p < page || (p > page && hasMore) || p <= page) {
      pages.push(p);
    }
    if (pages.length >= 5) break;
  }

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={onPrev}
        disabled={page === 1 || isLoading}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        ‹
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          disabled={isLoading}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            p === page
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={onNext}
        disabled={!hasMore || isLoading}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CoinMarketListProps {
  currency: Currency;
}

const CoinMarketList = ({ currency }: CoinMarketListProps) => {
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  // Desktop paging state
  const [page, setPage] = useState(1);

  // Mobile infinite-scroll state
  const [mobileCoins, setMobileCoins] = useState<ICoinMarketData[]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileHasMore, setMobileHasMore] = useState(true);

  // Shared state
  const [coins, setCoins] = useState<ICoinMarketData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sentinel ref for IntersectionObserver (mobile)
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Abort controller for in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // Guards against the double-fetch that occurs on initial mount when both the
  // query/currency effect and the desktop page effect run simultaneously.
  const isInitialMountRef = useRef(true);

  // ---------------------------------------------------------------------------
  // Fetch logic
  // ---------------------------------------------------------------------------

  const fetchPage = useCallback(
    async (targetPage: number, append = false) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        let ids: string[] | undefined;
        if (debouncedQuery.trim()) {
          ids = await withRetry(() => searchCoins(debouncedQuery.trim()));
          if (ids.length === 0) {
            setCoins([]);
            setMobileCoins([]);
            setHasMore(false);
            setMobileHasMore(false);
            return;
          }
        }

        const result = await withRetry(() =>
          fetchCoinMarkets(currency, targetPage, ids)
        );

        const pageHasMore = ids
          ? false // search returns all results at once
          : result.length === COIN_MARKETS_PER_PAGE;

        if (append) {
          setMobileCoins((prev) => [...prev, ...result]);
          setMobileHasMore(pageHasMore);
        } else {
          // Populate both desktop and mobile state so the first page is
          // visible on mobile without waiting for the IntersectionObserver.
          setCoins(result);
          setMobileCoins(result);
          setHasMore(pageHasMore);
          setMobileHasMore(pageHasMore);
          setError(null); // Clear any stale error from a concurrent failed request
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("Failed to load coins. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currency, debouncedQuery, isMobile]
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // When query or currency changes, reset to page 1
  useEffect(() => {
    setPage(1);
    setMobilePage(1);
    setMobileCoins([]);
    setMobileHasMore(true);
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, currency]);

  // Desktop: re-fetch when page changes (skip on initial mount — the
  // query/currency effect above already fires the first fetch).
  useEffect(() => {
    if (isMobile) return;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    fetchPage(page, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isMobile]);

  // Mobile: IntersectionObserver to trigger loading next page
  useEffect(() => {
    if (!isMobile) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileHasMore && !isLoadingMore && !isLoading) {
          const nextPage = mobilePage + 1;
          setMobilePage(nextPage);
          fetchPage(nextPage, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, mobileHasMore, isLoadingMore, isLoading, mobilePage, fetchPage]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const displayedCoins = isMobile ? mobileCoins : coins;
  const startRank = isMobile ? 1 : (page - 1) * COIN_MARKETS_PER_PAGE + 1;

  return (
    <section>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 shrink-0">
          Market
        </h2>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search coins…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* List container */}
      <div className="card overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <span className="w-6 shrink-0" />
          <span className="w-7 shrink-0" />
          <span className="flex-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Coin
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
            Price / 24h
          </span>
        </div>

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
            <span>{error}</span>
            <button
              onClick={() => fetchPage(isMobile ? 1 : page, false)}
              className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton (first load or desktop page change) */}
        {isLoading && !error && (
          <>
            {Array.from({ length: COIN_MARKETS_PER_PAGE }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        )}

        {/* Coin rows */}
        {!isLoading && !error && displayedCoins.length > 0 && (
          <>
            {displayedCoins.map((coin, i) => (
              <CoinRow
                key={`${coin.id}-${i}`}
                coin={coin}
                rank={startRank + i}
                currency={currency}
              />
            ))}
          </>
        )}

        {/* Empty state (search with no results) */}
        {!isLoading && !error && displayedCoins.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            No coins found{query ? ` for "${query}"` : ""}.
          </div>
        )}

        {/* Mobile: loading more skeleton rows */}
        {isMobile && isLoadingMore && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={`more-${i}`} />
            ))}
          </>
        )}

        {/* Mobile: sentinel element for IntersectionObserver */}
        {isMobile && mobileHasMore && !isLoading && (
          <div ref={sentinelRef} className="h-1" aria-hidden />
        )}

        {/* Mobile: end of list */}
        {isMobile && !mobileHasMore && !isLoading && displayedCoins.length > 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">
            — End of list —
          </p>
        )}
      </div>

      {/* Desktop pagination */}
      {!isMobile && !isLoading && !error && displayedCoins.length > 0 && (
        <PageControls
          page={page}
          hasMore={hasMore}
          isLoading={isLoading}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
          onPage={(p) => setPage(p)}
        />
      )}
    </section>
  );
};

export default CoinMarketList;
