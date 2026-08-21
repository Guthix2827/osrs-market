export type WatchlistChangeRange =
    | "30m"
    | "1h"
    | "6h"
    | "12h"
    | "24h";

export interface WatchSummary {
    itemId: number;
    generatedAt: number;
    currentMidPrice: number | null;
    references: Record<
        WatchlistChangeRange,
        number | null
    >;
}