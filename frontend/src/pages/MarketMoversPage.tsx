import {useEffect, useState} from 'react';
import './MarketMoversPage.css';
import {API_BASE_URL} from "../config/api.ts";
import {Link} from "react-router-dom";
import {fetchWithDailyCache} from "../services/MarketService.ts";
import type {
    MarketMoverCategory,
    MarketMoverItem,
    MarketMoverRange, MarketMoversResponse,
    MarketMoversSnapshotResponse
} from "../types/marketmovers.ts";

const ranges: Array<{
    label: string;
    value: MarketMoverRange;
}> = [
    {label: '24H', value: '24h'},
    {label: '7D', value: '7d'},
    {label: '30D', value: '30d'},
    {label: '90D', value: '90d'},
];

const categories: Array<{
    label: string;
    value: MarketMoverCategory;
}> = [
    {label: 'Top Gainers', value: 'gainers'},
    {label: 'Top Losers', value: 'losers'},
    {label: 'Most Traded', value: 'volume'},
    {label: 'Highest Value', value: 'value'},
];

const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US').format(value);

const formatSignedNumber = (value: number) => {
    const formatted =
        formatNumber(
            Math.abs(value),
        );

    return value >= 0
        ? `+${formatted}`
        : `-${formatted}`;
};

const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const getChangeClassName = (value: number) =>
    value >= 0
        ? 'market-movers-positive'
        : 'market-movers-negative';

const getIconUrl = (itemId: number) =>
    `${API_BASE_URL}/icons/${itemId}.png`;

export function MarketMoversPage() {
    const [activeCategory, setActiveCategory] =
        useState<MarketMoverCategory>('gainers');

    const [activeRange, setActiveRange] =
        useState<MarketMoverRange>('24h');

    const [rows, setRows] =
        useState<MarketMoverItem[]>([]);

    const [snapshot, setSnapshot] =
        useState<MarketMoversSnapshotResponse | null>(null);

    const [expandedItemId, setExpandedItemId] =
        useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadMarketMovers = async () => {
            try {
                const result =
                    await fetchWithDailyCache<MarketMoversResponse>({
                        key: `market-movers:${activeRange}:${activeCategory}`,
                        url: `${API_BASE_URL}/api/market/movers?range=${activeRange}&category=${activeCategory}`,
                    });

                if (!cancelled) {
                    setRows(result.items);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load market movers', error);
                }
            }
        };

        loadMarketMovers();

        return () => {
            cancelled = true;
        };
    }, [
        activeRange,
        activeCategory,
    ]);

    useEffect(() => {
        let cancelled = false;

        const loadSnapshot = async () => {
            try {
                const result =
                    await fetchWithDailyCache<MarketMoversSnapshotResponse>({
                        key: 'market-movers:snapshot',
                        url: `${API_BASE_URL}/api/market/movers/snapshot`,
                    });

                if (!cancelled) {
                    setSnapshot(result);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load market movers snapshot', error);
                }
            }
        };

        loadSnapshot();

        return () => {
            cancelled = true;
        };
    }, []);

    const riseHighlight =
        snapshot?.biggestRise ?? null;

    const fallHighlight =
        snapshot?.biggestFall ?? null;

    const volumeHighlight =
        snapshot?.highestVolume ?? null;

    return (
        <main className="market-movers-page">
            <section className="market-movers-hero">
                <div>
                    <h1>Market Movers</h1>
                    <p>
                        Discover the biggest price changes and most active items
                        across the Grand Exchange.
                    </p>
                </div>
            </section>

            <section
                aria-label="Market snapshot"
                className="market-movers-snapshot"
            >
                {riseHighlight && (
                    <MarketSnapshotCard
                        item={riseHighlight}
                        rangeLabel="24H"
                        title="Biggest rise"
                        type="change"
                    />
                )}

                {fallHighlight && (
                    <MarketSnapshotCard
                        item={fallHighlight}
                        rangeLabel="24H"
                        title="Biggest fall"
                        type="change"
                    />
                )}

                {volumeHighlight && (
                    <MarketSnapshotCard
                        item={volumeHighlight}
                        rangeLabel="24H"
                        title="Highest volume"
                        type="volume"
                    />
                )}
            </section>

            <section className="market-movers-panel">
                <div className="market-movers-toolbar">
                    <div
                        aria-label="Market mover category"
                        className="market-movers-tabs"
                        role="tablist"
                    >
                        {categories.map((category) => (
                            <button
                                aria-selected={
                                    activeCategory === category.value
                                }
                                className="market-movers-tab"
                                key={category.value}
                                onClick={() => setActiveCategory(category.value)}
                                role="tab"
                                type="button"
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>

                    <div className="market-movers-range">
                        <span>Range period</span>
                        <div
                            aria-label="Range period"
                            className="market-movers-range-buttons"
                        >
                            {ranges.map((range) => (
                                <button
                                    aria-pressed={activeRange === range.value}
                                    className="market-movers-range-button"
                                    key={range.value}
                                    onClick={() => setActiveRange(range.value)}
                                    type="button"
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="market-movers-table-wrap">
                    <table className="market-movers-table">
                        <thead>
                        <tr>
                            <th>Item</th>
                            <th>Current Price</th>
                            <th>Change</th>
                            <th>Change %</th>
                            <th>Volume</th>
                            <th>Traded Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((item) => (
                            <tr key={item.itemId}>
                                <td>
                                    <Link
                                        className="market-movers-item"
                                        to={`/items/${item.itemId}`}
                                    >
                                        <img
                                            src={`${API_BASE_URL}/icons/${item.itemId}.png`}
                                            alt={item.name}
                                            className="market-movers-item-icon"
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                </td>
                                <td>{formatNumber(item.currentPrice)}</td>
                                <td className={getChangeClassName(item.change)}>
                                    {formatSignedNumber(item.change)}
                                </td>
                                <td className={getChangeClassName(item.changePercent)}>
                                    {formatPercent(item.changePercent)}
                                </td>
                                <td>{formatNumber(item.volume)}</td>
                                <td>{formatNumber(item.tradedValue)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="market-movers-mobile-list">
                {rows.map((item) => {
                    const expanded =
                        expandedItemId === item.itemId;

                    return (
                        <article
                            className="market-movers-mobile-row"
                            key={item.itemId}
                        >
                            <button
                                aria-expanded={expanded}
                                className="market-movers-mobile-summary"
                                onClick={() =>
                                    setExpandedItemId(
                                        expanded
                                            ? null
                                            : item.itemId,
                                    )
                                }
                                type="button"
                            >
                                <span className="market-movers-mobile-item">
                                    <img
                                        alt=""
                                        className="market-movers-item-icon"
                                        src={`${API_BASE_URL}/icons/${item.itemId}.png`}
                                    />
                                    <span>{item.name}</span>
                                </span>

                                            <span className="market-movers-mobile-change">
                                    <span className={getChangeClassName(item.changePercent)}>
                                        {formatPercent(item.changePercent)}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="market-movers-mobile-chevron"
                                    >
                                        {expanded ? '-' : '+'}
                                    </span>
                                </span>
                            </button>

                            {expanded && (
                                <div className="market-movers-mobile-details">
                                    <MarketMoverMobileMetric
                                        label="Current price"
                                        value={formatNumber(item.currentPrice)}
                                    />
                                    <MarketMoverMobileMetric
                                        className={getChangeClassName(item.change)}
                                        label="Change"
                                        value={formatSignedNumber(item.change)}
                                    />
                                    <MarketMoverMobileMetric
                                        label="Volume"
                                        value={formatNumber(item.volume)}
                                    />
                                    <MarketMoverMobileMetric
                                        label="Traded value"
                                        value={formatNumber(item.tradedValue)}
                                    />
                                    <Link
                                        className="market-movers-mobile-link"
                                        to={`/items/${item.itemId}`}
                                    >
                                        View item
                                    </Link>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </main>
    );
}

function MarketMoverMobileMetric({className, label, value}: {
    className?: string;
    label: string;
    value: string;
}) {
    return (
        <div className="market-movers-mobile-metric">
            <span>{label}</span>
            <strong className={className}>{value}</strong>
        </div>
    );
}

function MarketSnapshotCard({item, rangeLabel, title, type}: {
    item: MarketMoverItem;
    rangeLabel: string;
    title: string;
    type: 'change' | 'volume';
}) {
    return (
        <article className="market-movers-snapshot-card">
            <h2>{title}</h2>
            <div className="market-movers-snapshot-body">
                <div className="market-movers-snapshot-icon-wrap">
                    <img
                        alt=""
                        className="market-movers-snapshot-icon"
                        src={getIconUrl(item.itemId)}
                    />
                </div>
                <div className="market-movers-snapshot-content">
                    <Link
                        to={`/items/${item.itemId}`}
                    >
                        <h3>{item.name}</h3>
                    </Link>
                    <dl>
                        <div>
                            <dt>Current price</dt>
                            <dd>{formatNumber(item.currentPrice)} gp</dd>
                        </div>
                        {type === 'volume'
                            ? (
                                <div>
                                    <dt>{rangeLabel} volume</dt>
                                    <dd>{formatNumber(item.volume)}</dd>
                                </div>
                            )
                            : (
                                <div>
                                    <dt>{rangeLabel} change</dt>
                                    <dd className={getChangeClassName(item.change)}>
                                        {formatSignedNumber(item.change)} gp (
                                        {formatPercent(item.changePercent)})
                                    </dd>
                                </div>
                            )}
                    </dl>
                </div>
            </div>
        </article>
    );
}