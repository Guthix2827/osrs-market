import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart, ReferenceArea, ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {memo, useMemo, useState} from "react";
import type {PricePoint, VolumeChartPoint} from "../types/item.ts";
import type {PriceHistoryRange} from "../services/itemService.ts";

function getDailyTicks(data: PricePoint[] | VolumeChartPoint[]): number[] {
    return data
        .filter((point, index, points) => {
            if (index === 0) {
                return true;
            }

            const current = new Date(point.timestamp * 1000);
            const previous = new Date(points[index - 1].timestamp * 1000);

            return current.getDate() !== previous.getDate();
        })
        .map(point => point.timestamp)
        .slice(-7);
}

function VolumeTimeAxisTick({
                                x,
                                y,
                                payload,
                                range,
                            }: {
    x?: number;
    y?: number;
    payload?: {
        value: number;
    };
    range: PriceHistoryRange;
}) {
    if (
        x === undefined ||
        y === undefined ||
        !payload
    ) {
        return null;
    }

    const date =
        new Date(payload.value * 1000);

    const label =
        range === "24H"
            ? date.toLocaleTimeString(
                "en-GB",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                },
            )
            : date.toLocaleDateString(
                "en-GB",
                {
                    day: "numeric",
                    month: "short",
                },
            );

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                textAnchor="middle"
                fill="#aaa69d"
                fontSize={11}
            >
                <tspan x="0" dy="15">
                    {label}
                </tspan>
            </text>
        </g>
    );
}

const bucketSeconds = (range: PriceHistoryRange) => {
    return range === "24H"
        ? 5 * 60
        : range === "7D"
            ? 60 * 60
            : 24 * 60 * 60;
};

const formatTooltipTimestamp = (
    timestamp: number,
    range: PriceHistoryRange,
) => {
    const start =
        new Date(timestamp * 1000);

    if (range === "30D" || range === "1Y") {
        return start.toLocaleDateString(
            "en-GB",
            {
                day: "numeric",
                month: "numeric",
                year: "numeric",
            },
        );
    }

    const date =
        start.toLocaleDateString(
            "en-GB",
            {
                day: "numeric",
                month: "short",
            },
        );

    const end =
        new Date(
            (timestamp + bucketSeconds(range)) * 1000,
        );

    const startTime =
        start.toLocaleTimeString(
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            },
        );

    const endTime =
        end.toLocaleTimeString(
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            },
        );

    return `${date}, ${startTime}–${endTime}`;
};

function getVolumeRoundStep(
    volume: number,
): number {
    if (volume < 100) {
        return 10;
    }

    if (volume < 1_000) {
        return 100;
    }

    if (volume < 10_000) {
        return 500;
    }

    if (volume < 100_000) {
        return 5_000;
    }

    if (volume < 1_000_000) {
        return 50_000;
    }

    return 500_000;
}

export const VolumeChart =
    memo(function VolumeChart({data, range, zoomRange}: {
        data: VolumeChartPoint[];
        range: PriceHistoryRange;
        zoomRange: ZoomRangeType;
    }) {

        const chartData = useMemo(
            () =>
                data.map((point) => ({
                    ...point,
                    lowPriceVolume:
                        -point.lowPriceVolume,
                })),
            [data],
        );

        const maxVolume = useMemo(
            () =>
                data.reduce(
                    (max, point) =>
                        Math.max(
                            max,
                            point.highPriceVolume,
                            point.lowPriceVolume,
                        ),
                    0,
                ),
            [data],
        );

        const volumeStep =
            getVolumeRoundStep(maxVolume);

        const volumeDomain =
            Math.ceil(
                (maxVolume * 1.1) /
                volumeStep,
            ) * volumeStep;

        const dailyTicks = useMemo(
            () => getDailyTicks(data),
            [data],
        );

        const hourlyTicks = useMemo(
            () =>
                range === "24H"
                    ? data
                        .filter(
                            (_, index) =>
                                index % 4 === 0,
                        )
                        .map(
                            (point) =>
                                point.timestamp,
                        )
                    : [],
            [data, range],
        );

        function VolumeTooltip({active, payload, label,}: any) {
            if (!active || !payload?.length) {
                return null;
            }

            const buy =
                Number(
                    payload.find(
                        (item: any) =>
                            item.dataKey === "highPriceVolume",
                    )?.value ?? 0,
                );

            const sell =
                Math.abs(
                    Number(
                        payload.find(
                            (item: any) =>
                                item.dataKey === "lowPriceVolume",
                        )?.value ?? 0,
                    ),
                );

            return (
                <div className="volume-tooltip">
                    <div>
                        {new Date(
                            Number(label) * 1000,
                        ).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>

                    <div className="volume-tooltip-buy">
                        Buy: {buy.toLocaleString()}
                    </div>

                    <div className="volume-tooltip-sell">
                        Sell: {sell.toLocaleString()}
                    </div>

                    <div className="volume-tooltip-total">
                        Total: {(buy + sell).toLocaleString()}
                    </div>
                </div>
            );
        }

        return (
            <div className="volume-chart-real">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <BarChart
                        data={chartData}
                        stackOffset="sign"
                        responsive
                        margin={{
                            top: 15,
                            right: 10,
                            bottom: 20,
                            left: 0,
                        }}
                    >
                        <CartesianGrid
                            stroke="rgba(255,255,255,0.055)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            padding={{
                                left: 12,
                                right: 12,
                            }}
                            ticks={
                                range === '7D'
                                    ? dailyTicks
                                    : hourlyTicks
                            }
                            domain={
                                zoomRange
                                    ? [zoomRange.start, zoomRange.end]
                                    : ["dataMin", "dataMax"]
                            }
                            tick={
                                <VolumeTimeAxisTick
                                    range={range}
                                />
                            }
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                        />

                        <YAxis
                            domain={[-volumeDomain, volumeDomain]}
                            width={55}
                            tick={{
                                fill: "#aaa69d",
                                fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                                Math.abs(Number(value)).toLocaleString()
                            }
                        />

                        <Tooltip
                            cursor={{
                                fill: "rgba(255, 255, 255, 0.04)",
                                stroke: "none",
                            }}
                            content={<VolumeTooltip />}
                        />

                        <ReferenceLine y={0} />

                        <Bar
                            dataKey="highPriceVolume"
                            name="Buy"
                            stackId="stack"
                            fill="var(--positive)"
                            isAnimationActive={false}
                        />

                        <Bar
                            dataKey="lowPriceVolume"
                            name="Sell"
                            stackId="stack"
                            fill="var(--negative)"
                            isAnimationActive={false}
                        />

                    </BarChart>
                </ResponsiveContainer>
            </div>
        );

    });

function getPriceRoundStep(price: number): number {
    if (price < 1_000) {
        return 100;
    }

    if (price < 10_000) {
        return 500;
    }

    if (price < 100_000) {
        return 5_000;
    }

    if (price < 1_000_000) {
        return 10_000;
    }

    if (price < 10_000_000) {
        return 100_000;
    }

    if (price < 100_000_000) {
        return 1_000_000;
    }

    if (price < 1_000_000_000) {
        return 10_000_000;
    }

    return 100_000_000;
}

export type ZoomRangeType = {
    start: number;
    end: number;
} | null;

export const PriceHistoryChart =
    memo(function PriceHistoryChart({data, range, onZoomChange}: {
        data: PricePoint[];
        range: PriceHistoryRange;
        onZoomChange: React.Dispatch<
            React.SetStateAction<ZoomRangeType>
        >;
    }) {
        const formatXAxis = (timestamp: number) => {
            const date = new Date(timestamp * 1000);

            if (range === '24H') {
                return date.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }

            return date.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        const prices = useMemo(
            () =>
                data
                    .flatMap((point) => [
                        point.avgHighPrice,
                        point.avgLowPrice,
                    ])
                    .filter(
                        (value): value is number =>
                            typeof value === "number" &&
                            Number.isFinite(value),
                    ),
            [data],
        );

        const dailyTicks = useMemo(
            () => getDailyTicks(data),
            [data],
        );

        const [selection, setSelection] = useState<{
            left: number | null;
            right: number | null;
        }>({
            left: null,
            right: null,
        });

        const { minPrice, maxPrice } =
            useMemo(() => {
                if (prices.length === 0) {
                    return {
                        minPrice: 0,
                        maxPrice: 0,
                    };
                }

                return {
                    minPrice: Math.min(...prices),
                    maxPrice: Math.max(...prices),
                };
            }, [prices]);

        if (prices.length === 0) {
            return (
                <div style={{ width: '100%', height: 300 }}>
                    No price data
                </div>
            );
        }

        const step = getPriceRoundStep(maxPrice);

        let yMin =
            Math.floor((minPrice * 0.95) / step) * step;

        let yMax =
            Math.ceil((maxPrice * 1.05) / step) * step;

        if (yMin === yMax) {
            yMin -= step;
            yMax += step;
        }

        function TimeAxisTick({x, y, payload,}: {
            x?: number;
            y?: number;
            payload?: {
                value: number;
            };
        }) {
            if (
                x === undefined ||
                y === undefined ||
                !payload
            ) {
                return null;
            }

            const date = new Date(payload.value * 1000);

            const day = date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
            });

            return (
                <g transform={`translate(${x},${y})`}>
                    <text
                        textAnchor="middle"
                        fill="#aaa69d"
                        fontSize={11}
                    >
                        <tspan x="0" dy="15">
                            {day}
                        </tspan>
                    </text>
                </g>
            );
        }

        const handleZoom = () => {
            if (
                selection.left === null ||
                selection.right === null ||
                selection.left === selection.right
            ) {
                setSelection({
                    left: null,
                    right: null,
                });

                return;
            }

            onZoomChange({
                start: Math.min(
                    selection.left,
                    selection.right,
                ),
                end: Math.max(
                    selection.left,
                    selection.right,
                ),
            });

            setSelection({
                left: null,
                right: null,
            });
        };
        return (
            <div
                style={{ width: '100%', height: 300 }}
                onContextMenu={(event) => {
                    event.preventDefault();
                    onZoomChange(null);
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        onMouseDown={(event) => {
                            if (event?.activeLabel !== undefined) {
                                setSelection({
                                    left: Number(event.activeLabel),
                                    right: null,
                                });
                            }
                        }}
                        onMouseMove={(event) => {
                            if (
                                selection.left !== null &&
                                event?.activeLabel !== undefined
                            ) {
                                setSelection((current) => ({
                                    ...current,
                                    right: Number(event.activeLabel),
                                }));
                            }
                        }}
                        onMouseUp={handleZoom}
                        margin={{
                            top: 10,
                            right: 10,
                            bottom: 20,
                            left: 5,
                        }}
                    >

                        {selection.left !== null &&
                            selection.right !== null && (
                                <ReferenceArea
                                    x1={selection.left}
                                    x2={selection.right}
                                />
                            )}

                        <CartesianGrid
                            stroke="rgba(255,255,255,0.055)"
                            vertical={true}
                        />

                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={formatXAxis}
                            tickCount={range === '24H' ? 7 : 8}
                            minTickGap={30}
                            tick={<TimeAxisTick />}
                            ticks={range === '7D' ? dailyTicks : undefined}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                        />

                        <YAxis
                            domain={[yMin, yMax]}
                            tickFormatter={(value) =>
                                Number(value).toLocaleString()
                            }
                            tick={{
                                fill: '#aaa69d',
                                fontSize: 12,
                            }}
                            tickLine={false}
                            axisLine={false}
                        />

                        <Tooltip
                            contentStyle={{
                                background: '#141714',
                                border: '1px solid #35342d',
                                borderRadius: '4px',
                                color: '#e9e2d5',
                            }}
                            labelFormatter={(timestamp) =>
                                formatTooltipTimestamp(Number(timestamp), range)
                            }
                            formatter={(value, name) => [
                                `${Number(value).toLocaleString()} gp`,
                                name === 'avgHighPrice'
                                    ? 'Instant buy'
                                    : 'Instant sell',
                            ]}
                        />

                        <Line
                            type="linear"
                            dataKey="avgHighPrice"
                            stroke="#5fc653"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />

                        <Line
                            type="linear"
                            dataKey="avgLowPrice"
                            stroke="var(--negative)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
});