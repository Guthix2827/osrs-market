import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

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

function formatTooltipTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function VolumeChart({
                                data,
                                range,
                            }: {
    data: PricePoint[];
    range: string;
}) {
    const chartData = data.map((point) => ({
        ...point,
        totalVolume:
            point.highPriceVolume +
            point.lowPriceVolume,
    }));

    const maxVolume = Math.max(
        ...chartData.map((point) => point.totalVolume),
        0,
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

    const dailyTicks = chartData
        .filter((point) => {
            const date = new Date(
                point.timestamp * 1000,
            );

            return date.getHours() === 0;
        })
        .map((point) => point.timestamp)
        .slice(-7);

    const hourlyTicks =
        range === '24H'
            ? chartData
                .filter((_, index) => index % 4 === 0)
                .map((point) => point.timestamp)
            : [];

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
}

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

export function PriceHistoryChart({data, range}: {
    data: PricePoint[];
    range: string;
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

    const prices = data
        .flatMap((point) => [
            point.avgHighPrice,
            point.avgLowPrice,
        ])
        .filter(
            (value): value is number =>
                typeof value === 'number' &&
                Number.isFinite(value),
        );

    if (prices.length === 0) {
        return (
            <div style={{ width: '100%', height: 300 }}>
                No price data
            </div>
        );
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const dailyTicks = getDailyTicks(data);

    const step = getPriceRoundStep(maxPrice);

    let yMin =
        Math.floor((minPrice * 0.95) / step) * step;

    let yMax =
        Math.ceil((maxPrice * 1.05) / step) * step;

    if (yMin === yMax) {
        yMin -= step;
        yMax += step;
    }

    function TimeAxisTick({
                              x,
                              y,
                              payload,
                          }: {
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
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        bottom: 20,
                        left: 5,
                    }}
                >
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
                            formatTooltipTimestamp(Number(timestamp))
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
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />

                    <Line
                        type="linear"
                        dataKey="avgLowPrice"
                        stroke="#e14332"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}