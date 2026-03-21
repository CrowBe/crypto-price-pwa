/**
 * Feed – unified feed UI component.
 *
 * Shows a chronologically sorted list of items from X, YouTube, and NewsAPI.
 * Supports source filtering, read/unread toggling, and manual refresh.
 */

import { useFeed } from "./useFeed";
import type { FeedSource } from "./types";
import { formatDistanceToNow } from "date-fns";

const SOURCE_LABELS: Record<FeedSource, { label: string; color: string }> = {
  x: { label: "X", color: "bg-black text-white dark:bg-white dark:text-black" },
  youtube: { label: "YouTube", color: "bg-red-600 text-white" },
  newsapi: { label: "News", color: "bg-blue-600 text-white" },
};

const FILTERS: Array<{ key: FeedSource | null; label: string }> = [
  { key: null, label: "All" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "newsapi", label: "News" },
];

export default function Feed() {
  const {
    items,
    loading,
    syncStatuses,
    refreshAll,
    toggleRead,
    readAll,
    filter,
    setFilter,
  } = useFeed();

  const unreadCount = items.filter((i) => !i.read).length;
  const anySyncing = syncStatuses.some((s) => s.syncing);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Feed
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {items.length} items{unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={readAll}
              className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={refreshAll}
            disabled={anySyncing}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {anySyncing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Source filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
              filter === f.key
                ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sync status indicators */}
      {syncStatuses.some((s) => s.lastError) && (
        <div className="text-xs text-red-500 dark:text-red-400 space-y-1">
          {syncStatuses
            .filter((s) => s.lastError)
            .map((s) => (
              <p key={s.source}>
                {SOURCE_LABELS[s.source].label}: {s.lastError}
              </p>
            ))}
        </div>
      )}

      {/* Feed list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <p className="text-sm">No feed items yet.</p>
          <p className="text-xs mt-1">
            Configure your sources in settings to start syncing.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`group rounded-xl border transition-all duration-200 ${
                item.read
                  ? "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 opacity-70"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
              }`}
            >
              <div className="flex gap-3 p-3">
                {/* Thumbnail */}
                {item.imageUrl && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-16 h-16 sm:w-20 sm:h-14 object-cover rounded-lg"
                      loading="lazy"
                    />
                  </a>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {/* Source badge */}
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${SOURCE_LABELS[item.source].color}`}
                    >
                      {SOURCE_LABELS[item.source].label}
                    </span>

                    {/* Unread dot */}
                    {!item.read && (
                      <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1"
                    onClick={() => toggleRead(item.id, true)}
                  >
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h3>
                  </a>

                  {item.snippet && item.source !== "x" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {item.snippet}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>{item.author}</span>
                    <span>·</span>
                    <time dateTime={item.publishedAt}>
                      {formatDistanceToNow(new Date(item.publishedAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => toggleRead(item.id)}
                  className="shrink-0 self-center opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                  title={item.read ? "Mark unread" : "Mark read"}
                >
                  {item.read ? "unread" : "read"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
