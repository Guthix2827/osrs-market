import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart, ReferenceArea,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {memo, useMemo, useState} from "react";

interface PricePoint {
    timestamp: number;
    avgHighPrice: number | null;
    avgLowPrice: number | null;
    highPriceVolume: number;
    lowPriceVolume: number;
}

function getDailyTicks(data: PricePoint[]): number[] {
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

const bucketSeconds = (range: string) => {
    return range === "24H"
        ? 5 * 60
        : range === "7D"
            ? 60 * 60
            : 24 * 60 * 60;
};

const formatTooltipTimestamp = (
    timestamp: number,
    range: string,
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

export const VolumeChart =
    memo(function VolumeChart({data, range,}: {
        data: PricePoint[];
        range: string;
    }) {

        const chartData = useMemo(
            () =>
                data.map((point) => ({
                    ...point,
                    totalVolume:
                        point.highPriceVolume +
                        point.lowPriceVolume,
                })),
            [data],
        );

        const maxVolume = useMemo(
            () =>
                Math.max(
                    ...chartData.map(
                        (point) =>
                            point.totalVolume,
                    ),
                    0,
                ),
            [chartData],
        );

        const dailyTicks = useMemo(
            () => getDailyTicks(data),
            [data],
        );

        const hourlyTicks = useMemo(
            () =>
                range === "24H"
                    ? chartData
                        .filter(
                            (_, index) =>
                                index % 4 === 0,
                        )
                        .map(
                            (point) =>
                                point.timestamp,
                        )
                    : [],
            [chartData, range],
        );

        // Give the tallest bar some breathing room.
        const volumeStep =
            maxVolume <= 100
                ? 50
                : maxVolume <= 500
                    ? 100
                    : maxVolume <= 2_000
                        ? 500
                        : 1_000;

        const volumeCeiling =
            Math.ceil((maxVolume * 1.2) / volumeStep) *
            volumeStep;

        return (
            <div className="volume-chart-real">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 15,
                            right: 10,
                            bottom: 10,
                            left: 5,
                        }}
                        barCategoryGap={1}
                    >
                        <CartesianGrid
                            stroke="rgba(255,255,255,0.055)"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="timestamp"
                            type="category"
                            ticks={
                                range === '7D'
                                    ? dailyTicks
                                    : hourlyTicks
                            }
                            tickFormatter={(timestamp) => {
                                const date = new Date(
                                    Number(timestamp) * 1000,
                                );

                                if (range === '24H') {
                                    return date.toLocaleTimeString(
                                        'en-GB',
                                        {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        },
                                    );
                                }

                                return date.toLocaleDateString(
                                    'en-GB',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                    },
                                );
                            }}
                            tick={{
                                fill: '#aaa69d',
                                fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                        />

                        <YAxis
                            domain={[0, volumeCeiling]}
                            width={55}
                            allowDecimals={false}
                            tick={{
                                fill: '#aaa69d',
                                fontSize: 11,
                            }}
                            tickLine={false}
                            axisLine={false}
                        />

                        <Tooltip
                            cursor={{
                                fill: 'rgba(255,255,255,0.035)',
                            }}
                            contentStyle={{
                                background: '#141714',
                                border: '1px solid #35342d',
                                borderRadius: '4px',
                                color: '#e9e2d5',
                            }}
                            labelFormatter={(timestamp) =>
                                new Date(
                                    Number(timestamp) * 1000,
                                ).toLocaleString(
                                    'en-GB',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                )
                            }
                            formatter={(value) => [
                                Number(value).toLocaleString(),
                                'Volume',
                            ]}
                        />

                        <Bar
                            dataKey="totalVolume"
                            fill="#476aa0"
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

export const PriceHistoryChart =
    memo(function PriceHistoryChart({data, range, onZoomChange, onResetZoom}: {
        data: PricePoint[];
        range: string;
        onZoomChange: (
            start: number,
            end: number,
        ) => void;
        onResetZoom: () => void;
    }) {

        const [selectionStart, setSelectionStart] =
            useState<number | null>(null);

        const [selectionEnd, setSelectionEnd] =
            useState<number | null>(null);

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

        return (
            <div
                style={{ width: '100%', height: 300 }}
                onContextMenu={(event) => {
                    event.preventDefault();
                    onResetZoom();
                }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        onMouseDown={(state) => {
                            if (
                                typeof state?.activeLabel ===
                                "number"
                            ) {
                                setSelectionStart(
                                    state.activeLabel,
                                );

                                setSelectionEnd(
                                    state.activeLabel,
                                );
                            }
                        }}
                        onMouseMove={(state) => {
                            if (
                                selectionStart !== null &&
                                typeof state?.activeLabel ===
                                "number"
                            ) {
                                setSelectionEnd(
                                    state.activeLabel,
                                );
                            }
                        }}
                        onMouseUp={() => {
                            if (
                                selectionStart !== null &&
                                selectionEnd !== null &&
                                selectionStart !== selectionEnd
                            ) {
                                onZoomChange(
                                    selectionStart,
                                    selectionEnd,
                                );
                            }

                            setSelectionStart(null);
                            setSelectionEnd(null);
                        }}
                        margin={{
                            top: 10,
                            right: 10,
                            bottom: 20,
                            left: 5,
                        }}
                    >
                        {selectionStart !== null &&
                            selectionEnd !== null && (
                                <ReferenceArea
                                    x1={selectionStart}
                                    x2={selectionEnd}
                                    strokeOpacity={0.3}
                                    fillOpacity={0.12}
                                />
                            )}

                        <CartesianGrid
                            stroke="rgba(255,255,255,0.055)"
                            vertical={true}
                        />

                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['dataMin', 'dataMax']}
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