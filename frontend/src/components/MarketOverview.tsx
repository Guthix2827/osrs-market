import type {ItemStats, PricePoint} from '../types/item';
import type {PriceHistoryRange} from "../services/itemService.ts";

interface MarketOverviewProps {
    stats: ItemStats;
    history: PricePoint[];
    range: PriceHistoryRange;
}

export function MarketOverview({
                   stats,
                   history,
                   range,
               }: MarketOverviewProps) {
    const prices = history
        .flatMap((point) => [
            point.avgHighPrice,
            point.avgLowPrice,
        ])
        .filter((value): value is number => value !== null);

    const firstPoint = history[0];
    const lastPoint = history[history.length - 1];

    const firstAverage =
        firstPoint &&
        firstPoint.avgHighPrice !== null &&
        firstPoint.avgLowPrice !== null
            ? (firstPoint.avgHighPrice + firstPoint.avgLowPrice) / 2
            : null;

    const lastAverage =
        lastPoint &&
        lastPoint.avgHighPrice !== null &&
        lastPoint.avgLowPrice !== null
            ? (lastPoint.avgHighPrice + lastPoint.avgLowPrice) / 2
            : null;

    const priceChange =
        firstAverage !== null &&
        lastAverage !== null &&
        firstAverage !== 0
            ? ((lastAverage - firstAverage) / firstAverage) * 100
            : null;

    const rangeHigh =
        prices.length > 0
            ? Math.max(...prices)
            : null;

    const rangeLow =
        prices.length > 0
            ? Math.min(...prices)
            : null;

    const averagePrice =
        prices.length > 0
            ? prices.reduce((sum, value) => sum + value, 0) /
            prices.length
            : null;

    const totalVolume = history.reduce(
        (sum, point) =>
            sum +
            point.highPriceVolume +
            point.lowPriceVolume,
        0,
    );

    const half = Math.floor(history.length / 2);

    const firstHalfVolume = history
        .slice(0, half)
        .reduce(
            (sum, point) =>
                sum +
                point.highPriceVolume +
                point.lowPriceVolume,
            0,
        );

    const secondHalfVolume = history
        .slice(half)
        .reduce(
            (sum, point) =>
                sum +
                point.highPriceVolume +
                point.lowPriceVolume,
            0,
        );

    const volumeChange =
        firstHalfVolume > 0
            ? ((secondHalfVolume - firstHalfVolume) /
                firstHalfVolume) *
            100
            : null;

    const spreads = history
        .filter(
            (point) =>
                point.avgHighPrice !== null &&
                point.avgLowPrice !== null,
        )
        .map(
            (point) =>
                point.avgHighPrice! -
                point.avgLowPrice!,
        );

    const typicalSpread =
        spreads.length > 0
            ? spreads.reduce((sum, value) => sum + value, 0) /
            spreads.length
            : null;

    const spreadVsAverage =
        stats.margin !== null &&
        typicalSpread !== null &&
        typicalSpread !== 0
            ? ((stats.margin - typicalSpread) /
                typicalSpread) *
            100
            : null;

    //liquidity calculation
    const averageDailyVolume =
        history.length > 0
            ? (totalVolume / history.length) * 24
            : 0;

    const liquidity =
        averageDailyVolume >= 10_000
            ? 'High'
            : averageDailyVolume >= 2_000
                ? 'Medium'
                : 'Low';

    return (
        <section className="side-card market-overview">
            <h2>Market overview ({range})</h2>

            <OverviewRow
                label="Price change"
                value={formatPercent(priceChange)}
                positive={
                    priceChange !== null &&
                    priceChange > 0
                }
                negative={
                    priceChange !== null &&
                    priceChange < 0
                }
            />

            <OverviewRow
                label={`${range.toLowerCase()} high`}
                value={
                    rangeHigh !== null
                        ? `${formatGp(rangeHigh)} gp`
                        : '-'
                }
            />

            <OverviewRow
                label={`${range.toLowerCase()} low`}
                value={
                    rangeLow !== null
                        ? `${formatGp(rangeLow)} gp`
                        : '-'
                }
            />

            <OverviewRow
                label="Average price"
                value={
                    averagePrice !== null
                        ? `${formatGp(averagePrice)} gp`
                        : '-'
                }
            />

            <OverviewRow
                label="Volume change"
                value={formatPercent(volumeChange)}
                positive={
                    volumeChange !== null &&
                    volumeChange > 0
                }
                negative={
                    volumeChange !== null &&
                    volumeChange < 0
                }
            />

            <OverviewRow
                label="Typical spread"
                value={
                    typicalSpread !== null
                        ? `${formatGp(typicalSpread)} gp`
                        : '-'
                }
            />

            <OverviewRow
                label={`Spread vs ${range.toLowerCase()} avg`}
                value={formatPercent(spreadVsAverage)}
                positive={
                    spreadVsAverage !== null &&
                    spreadVsAverage > 0
                }
                negative={
                    spreadVsAverage !== null &&
                    spreadVsAverage < 0
                }
            />

            <OverviewRow
                label="Liquidity"
                value={liquidity}
                positive={liquidity === 'High'}
            />
        </section>
    );
}

function OverviewRow({
                         label,
                         value,
                         positive = false,
                         negative = false,
                     }: {
    label: string;
    value: string;
    positive?: boolean;
    negative?: boolean;
}) {
    return (
        <div className="overview-row">
            <span>{label}</span>

            <strong
                className={
                    positive
                        ? 'positive'
                        : negative
                            ? 'negative'
                            : ''
                }
            >
                {value}
            </strong>
        </div>
    );
}

function formatGp(value: number) {
    return Math.round(value).toLocaleString('en-US');
}

function formatPercent(value: number | null) {
    if (value === null || !Number.isFinite(value)) {
        return '-';
    }

    const sign = value > 0 ? '+' : '';

    return `${sign}${value.toFixed(1)}%`;
}