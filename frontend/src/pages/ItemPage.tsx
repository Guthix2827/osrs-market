import {useEffect, useMemo, useState} from 'react';
import './ItemPage.css';
import type {ItemMetadata, ItemPrice, ItemStats, PricePoint} from "../types/item.ts";
import {itemService, PRICE_HISTORY_RANGES, type PriceHistoryRange} from "../services/itemService";
import {PriceHistoryChart, VolumeChart} from "../components/PriceHistoryChart.tsx";
import {MarketOverview} from "../components/MarketOverview.tsx";
import { useParams } from "react-router-dom";
import {normalizePriceHistory, normalizeVolumeHistory} from "../utils/priceHistory.ts";

function formatGp(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
}

export default function ItemPage() {
    const { id } = useParams();

    const itemId = Number(id);

    const [metaItem, setMetaItem] =
        useState<ItemMetadata | null>(null);

    const [history, setHistory] =
        useState<PricePoint[]>([]);

    const [range, setRange] =
        useState<PriceHistoryRange>("24H");


    // Load item metadata.
    useEffect(() => {
        if (!Number.isInteger(itemId)) {
            return;
        }

        itemService
            .getItem(itemId)
            .then(setMetaItem)
            .catch(console.error);
    }, [itemId]);


    // Load price history.
    useEffect(() => {
        if (!Number.isInteger(itemId)) {
            return;
        }

        const loadHistory = async () => {
            try {
                const data =
                    await itemService.getPriceHistory(
                        itemId,
                        range,
                    );

                setHistory(data);
            } catch (error) {
                console.error(
                    "Failed to load price history",
                    error,
                );
            }
        };

        loadHistory();

        const interval =
            window.setInterval(
                loadHistory,
                5 * 60_000,
            );

        return () =>
            window.clearInterval(interval);
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

        const roi =
            margin !== null &&
            price.low !== null &&
            price.low > 0
                ? (margin / price.low) * 100
                : null;

        const potentialProfit =
            margin !== null &&
            metaItem?.buyLimit !== null &&
            metaItem?.buyLimit !== undefined
                ? margin * metaItem.buyLimit
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

    const tradeDistribution = useMemo(() => {
        const bought = history.reduce(
            (sum, point) =>
                sum + point.highPriceVolume,
            0,
        );

        const sold = history.reduce(
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
    }, [history]);

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

    const chartHistory = useMemo(
        () =>
            normalizePriceHistory(
                history,
                range,
            ),
        [history, range],
    );

    const volumeHistory = useMemo(
        () =>
            normalizeVolumeHistory(
                history,
                range,
            ),
        [history, range],
    );

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
                                src={`${import.meta.env.VITE_API_URL}${metaItem.icon}`}
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
                            {price.high !== null
                                ? formatGp(price.high)
                                : "—"}
                            <span>gp</span>
                        </div>

                        <span className="price-updated">
                            <i className="dot green"/>
                            Updated 12s ago
                        </span>
                    </div>

                    <div className="price-block price-sell-block">
                        <span className="price-label price-sell">
                            Instant sell
                        </span>

                        <div className="price-value">
                            {price.low !== null
                                ? formatGp(price.low)
                                : "—"}
                            <span>gp</span>
                        </div>

                        <span className="price-updated">
                            <i className="dot red"/>
                            Updated 18s ago
                        </span>
                    </div>

                    <div className="hero-actions">
                        <button
                            type="button"
                            disabled
                            title="Watchlists will be available with user accounts"
                        >
                            Watch
                        </button>

                        <button type="button">
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
                            />

                            <Stat
                                label="ROI"
                                tooltip="Return of Investment"
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

                            <div className="range-toggle">
                                {PRICE_HISTORY_RANGES.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={range === option ? 'active' : ''}
                                        onClick={() => setRange(option)}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="chart-section">
                            <PriceHistoryChart data={chartHistory} range={range}/>
                        </div>

                        <div className="volume-section">
                            <h2>Volume</h2>

                            <VolumeChart
                                data={volumeHistory}
                                range={range}
                            />
                        </div>
                    </section>

                    <aside className="sidebar">
                        <section className="side-card">
                            <h2>Bought vs Sold ({range})</h2>

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

function Stat({
                  label,
                  value,
                  positive = false,
                  secondary,
                  tooltip,
              }: {
    label: string;
    value: string;
    positive?: boolean;
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
                    positive ? 'positive' : ''
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
function Detail({
                    label,
                    value,
                }: {
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