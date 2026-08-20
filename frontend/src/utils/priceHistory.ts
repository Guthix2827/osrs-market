import type {PricePoint, VolumeChartPoint} from "../types/item";
import type { PriceHistoryRange } from "../services/itemService";
import type {ZoomRangeType} from "../components/PriceHistoryChart.tsx";

const FIVE_MINUTES = 5 * 60;
const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;

export function normalizeVolumeHistory(
    history: PricePoint[],
    range: PriceHistoryRange,
): VolumeChartPoint[] {
    if (history.length === 0) {
        return [];
    }

    switch (range) {
        case "24H":
        case "7D":
            return toHourlyVolume(
                history,
            );

        case "30D":
        case "1Y":
            return toDailyVolume(
                history,
            );
    }
}

export function normalizePriceHistory(
    history: PricePoint[],
    range: PriceHistoryRange,
): PricePoint[] {
    if (history.length === 0) {
        return [];
    }

    switch (range) {
        case "24H":
            return fillFiveMinuteGaps(history);

        case "7D":
            return toHourlyPoints(history);

        case "30D":
        case "1Y":
            return toDailyPoints(history);
    }
}

function toDailyPoints(
    history: PricePoint[],
): PricePoint[] {
    const sorted =
        [...history].sort(
            (a, b) =>
                a.timestamp -
                b.timestamp,
        );

    const buckets = new Map<
        number,
        PricePoint[]
    >();

    for (const point of sorted) {
        const day =
            Math.floor(
                point.timestamp /
                ONE_DAY,
            ) * ONE_DAY;

        const bucket =
            buckets.get(day) ?? [];

        bucket.push(point);

        buckets.set(
            day,
            bucket,
        );
    }

    const result: PricePoint[] = [];

    let lastHigh: number | null = null;
    let lastLow: number | null = null;

    for (const [timestamp, points] of buckets) {
        let high: number | null = lastHigh;
        let low: number | null = lastLow;

        for (const point of points) {
            if (point.avgHighPrice !== null) {
                high = point.avgHighPrice;
            }

            if (point.avgLowPrice !== null) {
                low = point.avgLowPrice;
            }
        }

        lastHigh = high;
        lastLow = low;

        result.push({
            timestamp,
            avgHighPrice: high,
            avgLowPrice: low,

            highPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.highPriceVolume,
                    0,
                ),

            lowPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.lowPriceVolume,
                    0,
                ),
        });
    }

    return result;
}

function fillFiveMinuteGaps(
    history: PricePoint[],
): PricePoint[] {
    const sorted = [...history].sort(
        (a, b) => a.timestamp - b.timestamp,
    );

    const byTimestamp = new Map(
        sorted.map((point) => [
            point.timestamp,
            point,
        ]),
    );

    const firstTimestamp =
        Math.floor(sorted[0].timestamp / FIVE_MINUTES) *
        FIVE_MINUTES;

    const lastTimestamp =
        Math.floor(
            sorted[sorted.length - 1].timestamp /
            FIVE_MINUTES,
        ) * FIVE_MINUTES;

    const result: PricePoint[] = [];

    let lastHigh: number | null = null;
    let lastLow: number | null = null;

    for (
        let timestamp = firstTimestamp;
        timestamp <= lastTimestamp;
        timestamp += FIVE_MINUTES
    ) {
        const existing =
            byTimestamp.get(timestamp);

        if (existing) {
            if (existing.avgHighPrice !== null) {
                lastHigh = existing.avgHighPrice;
            }

            if (existing.avgLowPrice !== null) {
                lastLow = existing.avgLowPrice;
            }

            result.push({
                ...existing,

                avgHighPrice:
                    existing.avgHighPrice ??
                    lastHigh,

                avgLowPrice:
                    existing.avgLowPrice ??
                    lastLow,
            });

            continue;
        }

        result.push({
            timestamp,

            avgHighPrice: lastHigh,
            avgLowPrice: lastLow,

            highPriceVolume: 0,
            lowPriceVolume: 0,
        });
    }

    return result;
}

function toHourlyPoints(
    history: PricePoint[],
): PricePoint[] {
    if (history.length === 0) {
        return [];
    }

    const ONE_HOUR = 60 * 60;

    const sorted = [...history].sort(
        (a, b) => a.timestamp - b.timestamp,
    );

    const buckets = new Map<
        number,
        PricePoint[]
    >();

    for (const point of sorted) {
        const hour =
            Math.floor(
                point.timestamp / ONE_HOUR,
            ) * ONE_HOUR;

        const bucket =
            buckets.get(hour) ?? [];

        bucket.push(point);
        buckets.set(hour, bucket);
    }

    const result: PricePoint[] = [];

    let lastHigh: number | null = null;
    let lastLow: number | null = null;

    for (const [timestamp, points] of buckets) {
        let high: number | null = lastHigh;
        let low: number | null = lastLow;

        for (const point of points) {
            if (point.avgHighPrice !== null) {
                high = point.avgHighPrice;
            }

            if (point.avgLowPrice !== null) {
                low = point.avgLowPrice;
            }
        }

        lastHigh = high;
        lastLow = low;

        result.push({
            timestamp,
            avgHighPrice: high,
            avgLowPrice: low,

            highPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.highPriceVolume,
                    0,
                ),

            lowPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.lowPriceVolume,
                    0,
                ),
        });
    }

    return result;
}

/*
function fillFiveMinuteVolumeGaps(
    history: PricePoint[],
): PricePoint[] {
    const sorted = [...history].sort(
        (a, b) => a.timestamp - b.timestamp,
    );

    const byTimestamp = new Map(
        sorted.map((point) => [
            point.timestamp,
            point,
        ]),
    );

    const firstTimestamp =
        Math.floor(
            sorted[0].timestamp / FIVE_MINUTES,
        ) * FIVE_MINUTES;

    const lastTimestamp =
        Math.floor(
            sorted[sorted.length - 1].timestamp /
            FIVE_MINUTES,
        ) * FIVE_MINUTES;

    const result: PricePoint[] = [];

    for (
        let timestamp = firstTimestamp;
        timestamp <= lastTimestamp;
        timestamp += FIVE_MINUTES
    ) {
        const existing =
            byTimestamp.get(timestamp);

        if (existing) {
            result.push(existing);
            continue;
        }

        result.push({
            timestamp,
            avgHighPrice: null,
            avgLowPrice: null,
            highPriceVolume: 0,
            lowPriceVolume: 0,
        });
    }

    return result;
}
*/

function toHourlyVolume(
    history: VolumeChartPoint[],
): VolumeChartPoint[] {
    const sorted = [...history].sort(
        (a, b) => a.timestamp - b.timestamp,
    );

    const buckets = new Map<
        number,
        VolumeChartPoint[]
    >();

    for (const point of sorted) {
        const hour =
            Math.floor(
                point.timestamp / ONE_HOUR,
            ) * ONE_HOUR;

        const bucket =
            buckets.get(hour) ?? [];

        bucket.push(point);

        buckets.set(hour, bucket);
    }

    const result: VolumeChartPoint[] = [];

    for (const [timestamp, points] of buckets) {
        result.push({
            timestamp,
            highPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.highPriceVolume,
                    0,
                ),
            lowPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.lowPriceVolume,
                    0,
                ),
        });
    }

    return result;
}

function toDailyVolume(
    history: PricePoint[],
): VolumeChartPoint[] {
    if (history.length === 0) {
        return [];
    }

    const buckets = new Map<
        number,
        VolumeChartPoint[]
    >();

    for (const point of history) {
        const day =
            Math.floor(
                point.timestamp / ONE_DAY,
            ) * ONE_DAY;

        const bucket =
            buckets.get(day) ?? [];

        bucket.push(point);
        buckets.set(day, bucket);
    }

    const result: VolumeChartPoint[] = [];

    for (const [timestamp, points] of buckets) {
        result.push({
            timestamp,
            highPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.highPriceVolume,
                    0,
                ),
            lowPriceVolume:
                points.reduce(
                    (sum, point) =>
                        sum + point.lowPriceVolume,
                    0,
                ),
        });
    }

    return result.sort(
        (a, b) => a.timestamp - b.timestamp,
    );
}

export function formatLatestUpdatedAt(
    timestamp: number | null | undefined,
    now: number
): { value: string; unit: string } | null {
    if (!timestamp) {
        return null;
    }

    const seconds = Math.max(
        0,
        Math.floor(now / 1000) - timestamp
    );

    if (seconds < 60) {
        return {
            value: seconds.toString(),
            unit: "s",
        };
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return {
            value: minutes.toString(),
            unit: "m",
        };
    }

    const hours = Math.floor(minutes / 60);

    return {
        value: hours.toString(),
        unit: "h",
    };
}

export function formatZoomRange(
    zoomRange: Exclude<ZoomRangeType, null>,
    range: PriceHistoryRange,
): string {
    const start = new Date(
        zoomRange.start * 1000,
    );

    const endTimestamp =
        range === "24H"
            ? zoomRange.end + 5 * 60
            : zoomRange.end;

    const end = new Date(
        endTimestamp * 1000,
    );

    if (range === "24H") {
        const formatTime = (date: Date) =>
            date.toLocaleTimeString(
                "en-GB",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                },
            );

        return `${formatTime(start)}–${formatTime(end)}`;
    }

    const formatDate = (date: Date) =>
        date.toLocaleDateString(
            "en-GB",
            {
                day: "numeric",
                month: "short",
            },
        );

    return `${formatDate(start)}–${formatDate(end)}`;
}