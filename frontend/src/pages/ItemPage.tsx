import {useEffect, useMemo, useState} from 'react';
import './ItemPage.css';
import type {ItemMetadata, ItemPrice, ItemStats, PricePoint} from "../types/item.ts";
import {
    itemService,
    type LatestPrice,
    PRICE_HISTORY_RANGES,
    type PriceHistoryRange
} from "../services/itemService";
import {PriceHistoryChart, VolumeChart, type ZoomRangeType} from "../components/PriceHistoryChart.tsx";
import {MarketOverview} from "../components/MarketOverview.tsx";
import { useParams } from "react-router-dom";
import {
    formatLatestUpdatedAt,
    formatZoomRange,
    normalizePriceHistory,
    normalizeVolumeHistory
} from "../utils/priceHistory.ts";
import {calculateGeTax} from "../utils/ge.ts";
import {useWatchlist} from "../components/watchlist/WatchlistContext.tsx";
import {API_BASE_URL} from "../config/api.ts";
import {watchlistService} from "../services/watchlistService.ts";

function formatGp(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

export default function ItemPage() {

    const {
        addItem,
        removeItem,
        isWatched,
    } = useWatchlist();

    const { id } = useParams();

    const itemId = Number(id);

    const [metaItem, setMetaItem] = useState<ItemMetadata | null>(null);

    const [range, setRange] = useState<PriceHistoryRange>("24H");

    const [zoomRange, setZoomRange] = useState<ZoomRangeType>(null);

    const [latestPrice, setLatestPrice] = useState<LatestPrice | null>(null);

    //live last buy & sell
    const [now, setNow] = useState(() => Date.now());
    const [latestFetchedAt, setLatestFetchedAt] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 1_000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const [historyByRange, setHistoryByRange] =
        useState<
            Partial<
                Record<
                    PriceHistoryRange,
                    PricePoint[]
                >
            >
        >({});

    const history =
        historyByRange[range] ?? [];

    useEffect(() => {
        setHistoryByRange({});
        setZoomRange(null);
    }, [itemId]);

    // Load item metadata.
    useEffect(() => {
        if (!Number.isInteger(itemId)) {
            return;
        }
        const controller = new AbortController();
        itemService
            .getItem(itemId, controller.signal)
            .then(setMetaItem)
            .catch((error) => {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }
                console.error("Failed to load item", error);
            });
        return () => {
            controller.abort();
        };
    }, [itemId]);

    const watched = metaItem !== null && isWatched(metaItem.id);

    const isRangeLoaded = historyByRange[range] !== undefined;

    // Load price history.
    useEffect(() => {
        if (!Number.isInteger(itemId) || isRangeLoaded) {
            return;
        }

        const controller =
            new AbortController();

        const loadHistory = async () => {
            try {
                const [history, latestPrice] = await Promise.all([
                    itemService.getPriceHistory(itemId, range, controller.signal),
                    itemService.getLatestPrice(itemId, controller.signal)
                ]);

                if (controller.signal.aborted) {
                    return;
                }

                setHistoryByRange((current) => ({
                    ...current,
                    [range]: history,
                }));
                setLatestPrice(latestPrice);
                setLatestFetchedAt(Date.now());
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error(
                    "Failed to load history",
                    error,
                );
            }
        };

        loadHistory();

        return () => {
            controller.abort();
        };
    }, [
        itemId,
        range,
        isRangeLoaded,
    ]);

    useEffect(() => {
        if (!Number.isInteger(itemId)) {
            return;
        }

        const refreshHistory = async () => {
            try {
                const [history, latestPrice] = await Promise.all([
                    itemService.getPriceHistory(itemId, range),
                    itemService.getLatestPrice(itemId),
                ]);

                setHistoryByRange((current) => ({
                    ...current,
                    [range]: history,
                }));

                setLatestPrice(latestPrice);
                setLatestFetchedAt(Date.now());
            } catch (error) {
                console.error(
                    "History refresh failed",
                    error,
                );
            }
        };

        const interval =
            window.setInterval(
                refreshHistory,
                60_000,
            );

        return () => {
            window.clearInterval(interval);
        };
    }, [itemId, range]);

    const price = useMemo<ItemPrice>(() => {
        let high: number | null = null;
        let low: number | null = null;
        let highTime: number | null = null;
        let lowTime: number | null = null;

        for (let i = history.length - 1; i >= 0; i--) {
            const point = history[i];

            if (
                high === null &&
                point.avgHighPrice !== null
            ) {
                high = point.avgHighPrice;
                highTime = point.timestamp;
            }

            if (
                low === null &&
                point.avgLowPrice !== null
            ) {
                low = point.avgLowPrice;
                lowTime = point.timestamp;
            }

            if (high !== null && low !== null) {
                break;
            }
        }

        return {
            high,
            highTime,
            low,
            lowTime,
        };
    }, [history]);

    const stats = useMemo<ItemStats>(() => {
        const margin =
            price.high !== null &&
            price.low !== null
                ? price.high - price.low
                : null;

        const tax =
            price.high !== null
                ? calculateGeTax(
                    price.high,
                    metaItem?.taxFree === true
                )
                : 0;

        const netMargin =
            margin !== null
                ? margin - tax
                : null;

        const roi =
            netMargin !== null &&
            price.low !== null &&
            price.low > 0
                ? (netMargin / price.low) * 100
                : null;

        const potentialProfit =
            netMargin !== null &&
            metaItem?.buyLimit !== null &&
            metaItem?.buyLimit !== undefined
                ? netMargin * metaItem.buyLimit
                : null;

        const dailyVolume =
            history.reduce(
                (sum, point) =>
                    sum +
                    point.highPriceVolume +
                    point.lowPriceVolume,
                0,
            );

        return {
            margin,
            netMargin,
            roi,
            potentialProfit,
            dailyVolume,
        };
    }, [
        history,
        metaItem?.buyLimit,
        price.high,
        price.low,
    ]);

    const dailyVolume = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        const cutoff = now - 24 * 60 * 60;

        return history
            .filter(point => point.timestamp >= cutoff)
            .reduce(
                (total, point) =>
                    total +
                    point.highPriceVolume +
                    point.lowPriceVolume,
                0,
            );
    }, [history]);

    const pricesChartHistory = useMemo(
        () =>
            normalizePriceHistory(
                history,
                range,
            ),
        [history, range],
    );

    const visiblePriceHistory = useMemo(() => {
        if (zoomRange === null) {
            return pricesChartHistory;
        }

        return pricesChartHistory.filter(
            (point) =>
                point.timestamp >= zoomRange.start &&
                point.timestamp <= zoomRange.end,
        );
    }, [
        pricesChartHistory,
        zoomRange,
    ]);

    const volumeChartHistory = useMemo(
        () =>
            normalizeVolumeHistory(
                history,
                range,
            ),
        [history, range],
    );

    const visibleVolumeHistory = useMemo(() => {
        if (zoomRange === null) {
            return volumeChartHistory;
        }

        return volumeChartHistory.filter(
            (point) =>
                point.timestamp >= zoomRange.start &&
                point.timestamp <= zoomRange.end,
        );
    }, [
        volumeChartHistory,
        zoomRange,
    ]);

    const tradeDistribution = useMemo(() => {
        const bought = visibleVolumeHistory.reduce(
            (sum, point) =>
                sum + point.highPriceVolume,
            0,
        );

        const sold = visibleVolumeHistory.reduce(
            (sum, point) =>
                sum + point.lowPriceVolume,
            0,
        );

        const total = bought + sold;

        return {
            bought,
            sold,
            total,

            boughtPercent:
                total > 0
                    ? (bought / total) * 100
                    : 0,

            soldPercent:
                total > 0
                    ? (sold / total) * 100
                    : 0,
        };
    }, [visibleVolumeHistory]);

    const handleWatch = async () => {
        if (!metaItem) {
            return;
        }

        const currentPrice =
            latestPrice?.high ??
            latestPrice?.low ??
            null;

        try {
            const summary =
                await watchlistService.getWatchSummary(
                    metaItem.id,
                );

            addItem({
                id: metaItem.id,
                name: metaItem.name,
                icon: metaItem.icon,
                price: currentPrice,
                summary,
                changeRange: "30m",
            });
        } catch (error) {
            console.error(
                "Failed to add item to watchlist",
                error,
            );
        }
    };

    //Debug data return for performance enhance
    // useEffect(() => {
    //     console.log("Chart data:", {
    //         range,
    //         raw: history.length,
    //         price: chartHistory.length,
    //         volume: volumeHistory.length,
    //     });
    // }, [
    //     range,
    //     history,
    //     chartHistory,
    //     volumeHistory,
    // ]);

    if (!metaItem) {
        return (
            <div className="market-loading">
                Loading item...
            </div>
        );
    }

    const {
        bought,
        sold,
        total,
        boughtPercent,
        soldPercent,
    } = tradeDistribution;

    return (
        <main className="item-container">
                <section className="item-hero">
                    <div className="item-identity">
                        <div className="item-icon-frame">
                            <img
                                src={`${API_BASE_URL}${metaItem.icon}`}
                                alt={metaItem.name}
                            />
                        </div>

                        <div className="item-info">
                            <h1>{metaItem.name}</h1>

                            <p className="item-examine">
                                {metaItem.examine}
                            </p>

                            <div className="item-meta">
                                <span className="item-id">
                                    Item ID: {metaItem.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="price-block">
                        <span className="price-label price-buy">
                            Instant buy
                        </span>

                        <div className="price-value">
                            {latestPrice?.high != null
                                ? formatGp(latestPrice.high)
                                : "—"}
                            <span>gp</span>
                        </div>

                        <span className="price-updated">
                            <i className="dot green"/>
                            <div>
                                {latestPrice?.highTime ? (
                                    <>
                                        Updated{" "}
                                        <span className="updated-time">
                                            {formatLatestUpdatedAt(Math.floor(latestFetchedAt / 1000), now)?.value}
                                            {formatLatestUpdatedAt(Math.floor(latestFetchedAt / 1000), now)?.unit}
                                        </span>
                                        {" "}ago
                                    </>
                                ) : (
                                    "No recent trade"
                                )}
                            </div>
                        </span>
                    </div>

                    <div className="price-block price-sell-block">
                        <span className="price-label price-sell">
                            Instant sell
                        </span>

                        <div className="price-value">
                            {latestPrice?.low != null
                                ? formatGp(latestPrice.low)
                                : "—"}
                            <span>gp</span>
                        </div>

                        <span className="price-updated">
                            <i className="dot red"/>
                            <div>
                                {latestPrice?.lowTime ? (
                                    <>
                                        Updated{" "}
                                        <span className="updated-time">
                                            {formatLatestUpdatedAt(Math.floor(latestFetchedAt / 1000), now)?.value}
                                            {formatLatestUpdatedAt(Math.floor(latestFetchedAt / 1000), now)?.unit}
                                        </span>
                                        {" "}ago
                                    </>
                                ) : (
                                    "No recent trade"
                                )}
                            </div>
                        </span>
                    </div>

                    <div className="hero-actions">
                        <button
                            type="button"
                            className={
                                watched
                                    ? "watch-button watched"
                                    : "watch-button"
                            }
                            onClick={() => {
                                if (!metaItem) {
                                    return;
                                }

                                if (watched) {
                                    removeItem(metaItem.id);
                                    return;
                                }

                                void handleWatch();
                            }}
                        >
                            {watched
                                ? "Watched"
                                : "Watch"}
                        </button>

                        <button
                            type="button"
                            disabled
                            title="Under development"
                        >
                            Share
                        </button>
                    </div>
                </section>

                <div className="content-grid">
                    <section className="main-panel">
                        <div className="stats-strip">
                            <Stat
                                label="Margin"
                                value={
                                    stats.margin !== null
                                        ? `${formatGp(stats.margin)} gp`
                                        : "—"
                                }
                                positive={
                                    stats.margin !== null &&
                                    stats.margin > 0
                                }
                                negative={
                                    stats.margin !== null && stats.margin < 0
                                }
                            />

                            <Stat
                                label="Net Margin"
                                value={
                                    stats.netMargin !== null
                                        ? `${formatGp(stats.netMargin)} gp`
                                        : "—"
                                }
                                positive={
                                    stats.netMargin !== null && stats.netMargin > 0
                                }
                                negative={
                                    stats.netMargin !== null && stats.netMargin < 0
                                }
                            />

                            <Stat
                                label="ROI"
                                tooltip="Estimated profit or loss as a percentage of the purchase price, after Grand Exchange tax."
                                value={
                                    stats.roi !== null
                                        ? `${stats.roi.toFixed(2)}%`
                                        : "—"
                                }
                                positive={
                                    stats.roi !== null &&
                                    stats.roi > 0
                                }
                            />

                            <Stat
                                label="Limit profit"
                                value={
                                    stats.potentialProfit !== null
                                        ? `${formatGp(
                                            stats.potentialProfit,
                                        )} gp`
                                        : "—"
                                }
                                positive={
                                    stats.potentialProfit !== null &&
                                    stats.potentialProfit > 0
                                }
                            />

                            <Stat
                                label="Daily volume"
                                value={formatGp(dailyVolume)}
                            />
                        </div>

                        <div className="chart-toolbar">
                            <h2>Price history</h2>

                            {zoomRange && (
                                <button
                                    type="button"
                                    className="reset-zoom-button"
                                    onClick={() => setZoomRange(null)}
                                >
                                    Reset zoom
                                </button>
                            )}

                            <div className="range-toggle">
                                {PRICE_HISTORY_RANGES.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={range === option ? 'active' : ''}
                                        onClick={() => {
                                            setRange(option);
                                            setZoomRange(null);
                                        }}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="chart-section">
                            <PriceHistoryChart
                                data={visiblePriceHistory}
                                range={range}
                                onZoomChange={setZoomRange}
                            />
                        </div>

                        <div className="volume-section">
                            <h2>Volume</h2>

                            <VolumeChart
                                data={visibleVolumeHistory}
                                range={range}
                                zoomRange={zoomRange}
                            />
                        </div>
                    </section>

                    <aside className="sidebar">
                        <section className="side-card">
                            <div className="section-title-row">
                                <h2>
                                    Bought vs Sold ({range})
                                </h2>

                                {zoomRange && (
                                    <span className="zoom-filter-badge">
                                        <span className="zoom-filter-label">
                                            ZOOM
                                        </span>
                                        {formatZoomRange(zoomRange, range)}
                                    </span>
                                )}
                            </div>

                            <div className="trade-distribution">
                                <div
                                    className="trade-donut"
                                    style={{
                                        background: `conic-gradient(
                                        var(--positive) 0 ${boughtPercent}%,
                                        var(--negative) ${boughtPercent}% 100%
                                    )`,
                                    }}
                                >
                                    <div className="donut-hole" />
                                </div>

                                <div className="distribution-data">
                                    <DistributionRow
                                        label="Bought"
                                        amount={bought}
                                        percent={boughtPercent}
                                        type="bought"
                                    />

                                    <DistributionRow
                                        label="Sold"
                                        amount={sold}
                                        percent={soldPercent}
                                        type="sold"
                                    />
                                </div>
                            </div>

                            <div className="transactions-total">
                                <span>Total volume</span>
                                <strong>{formatGp(total)}</strong>
                            </div>
                        </section>

                        <MarketOverview
                            stats={stats}
                            history={history}
                            range={range}
                        />
                    </aside>
                </div>

                <section className="item-details">
                    <Detail
                        label="High alch"
                        value={
                            metaItem.highAlch !== null
                                ? `${formatGp(metaItem.highAlch)} gp`
                                : "—"
                        }
                    />

                    <Detail
                        label="Low alch"
                        value={
                            metaItem.lowAlch !== null
                                ? `${formatGp(metaItem.lowAlch)} gp`
                                : "—"
                        }
                    />

                    <Detail
                        label="Buy limit"
                        value={
                            metaItem.buyLimit !== null
                                ? `${metaItem.buyLimit} / 4h`
                                : "—"
                        }
                    />

                    <Detail
                        label="Daily volume"
                        value={
                            stats.dailyVolume !== null
                                ? formatGp(stats.dailyVolume)
                                : "—"
                        }
                    />

                    <Detail
                        label="Members"
                        value={metaItem.members ? "Yes" : "No"}
                    />

                    <Detail
                        label="Item ID"
                        value={String(metaItem.id)}
                    />
                </section>
            </main>
    );
}

function Stat({label, value, positive = false, negative = false, secondary, tooltip,}: {
    label: string;
    value: string;
    positive?: boolean;
    negative?: boolean;
    secondary?: string;
    tooltip?: string;
}) {
    return (
        <div className="stat">
            <span className="stat-label">
                {label}

                {tooltip && (
                    <span
                        className="stat-info"
                        title={tooltip}
                    >
                        i
                    </span>
                )}
            </span>

            <span
                className={`stat-value ${
                    positive
                        ? 'positive'
                        : negative
                            ? 'negative'
                            : ''
                }`}
            >
                {value}
            </span>

            {secondary && (
                <span className="stat-secondary">
                    {secondary}
                </span>
            )}
        </div>
    );
}

function DistributionRow({
                             label,
                             amount,
                             percent,
                             type,
                         }: {
    label: string;
    amount: number;
    percent: number;
    type: 'bought' | 'sold';
}) {
    return (
        <div className="distribution-row">
            <div className="distribution-main">
                <i
                    className={`dot ${
                        type === 'bought'
                            ? 'green'
                            : 'red'
                    }`}
                />

                <div className="distribution-label">
                    <strong>{label}</strong>
                    <span>{formatGp(amount)}</span>
                </div>
            </div>

            <b>{percent.toFixed(1)}%</b>
        </div>
    );
}
function Detail({label, value}: {
    label: string;
    value: string;
}) {
    return (
        <div className="detail">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}