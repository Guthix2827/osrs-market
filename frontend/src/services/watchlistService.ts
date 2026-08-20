import { API_BASE_URL } from "../config/api";
import type { WatchSummary } from "../types/watchlist";

async function getWatchSummary(
    itemId: number,
    signal?: AbortSignal,
): Promise<WatchSummary> {
    const response = await fetch(
        `${API_BASE_URL}/api/items/${itemId}/watch-summary`,
        {
            signal,
        },
    );

    if (!response.ok) {
        throw new Error(
            `Failed to load watch summary: ${response.status}`,
        );
    }

    return response.json();
}

export const WATCH_SUMMARY_REFRESH_MS = 30 * 60 * 1000;

export const watchlistService = {
    getWatchSummary,
    WATCH_SUMMARY_REFRESH_MS
};