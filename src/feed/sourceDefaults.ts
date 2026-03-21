import type { FeedSource, SourceConfig } from "./types";

/** Default config for a newly added source. */
export function defaultSourceConfig(source: FeedSource): SourceConfig {
  return {
    source,
    enabled: false,
    pollIntervalMinutes: 15,
  };
}
