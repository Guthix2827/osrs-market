import {useMemo, useState} from 'react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {
    BarChart3,
    History,
    Percent,
    TrendingUp,
    ChartNoAxesCombined,
    Trophy,
    Clock3, Package
} from 'lucide-react';
import './PortfolioPage.css';
import OpenOffersTable, {
    type VirtualMerchOffer,
} from '../components/portfolio/OpenOffersTable';

type Range = '7d' | '30d' | '90d' | '1y' | 'All';
import HoldingsTable, {
    type HoldingSortKey,
    type HoldRowData
} from '../components/portfolio/HoldingsTable';
import TradeHistoryTable, {type TradeRowData} from '../components/portfolio/TradeHistoryTable';

type SortKey = HoldingSortKey;

const STARTING_BALANCE = 100_000_000;
const GOLD_PIECES = 42_800_000;
const MOCK_LEADERBOARD_RANK = 256;
// All amounts are illustrative mock data. The portfolio totals are derived from these holdings.
const holdings: HoldRowData[] = [
    {id: 501, itemId: 4151, name: 'Abyssal whip', quantity: 5, averageBuyPrice: 2_380_000, currentPrice: 2_400_000},
    {id: 502, itemId: 13652, name: 'Dragon claws', quantity: 1, averageBuyPrice: 110_000_000, currentPrice: 112_500_000},
    {id: 503, itemId: 385, name: 'Shark', quantity: 15000, averageBuyPrice: 980, currentPrice: 960},
    {id: 504, itemId: 892, name: 'Rune arrow', quantity: 50000, averageBuyPrice: 90, currentPrice: 94},
    {id: 505, itemId: 3000, name: 'Snapdragon', quantity: 500, averageBuyPrice: 52_000, currentPrice: 53_500},
];
const initialMockOffers: VirtualMerchOffer[] = [
    {
        id: 'offer-1',
        itemId: 13652,
        itemName: 'Dragon claws',
        type: 'Buy',
        quantity: 2,
        filledQuantity: 0,
        limitPrice: 110_000_000,
        averageFillPrice: null,
        createdAt: '2026-11-12T10:30:00',
    },
    {
        id: 'offer-2',
        itemId: 385,
        itemName: 'Shark',
        type: 'Sell',
        quantity: 10_000,
        filledQuantity: 5_000,
        limitPrice: 980,
        averageFillPrice: 985,
        createdAt: '2026-11-12T09:15:00',
    },
    {
        id: 'offer-3',
        itemId: 12934,
        itemName: 'Zulrah scales',
        type: 'Buy',
        quantity: 15_000,
        filledQuantity: 3_500,
        limitPrice: 175,
        averageFillPrice: 172,
        createdAt: '2026-11-11T18:40:00',
    },
];
const trades: TradeRowData[] = [
    {
        id: 1,
        itemId: 4151,
        date: '2026-11-11T14:26:00Z',
        type: 'Buy',
        item: 'Abyssal whip',
        quantity: 2,
        unitPrice: 2_400_000
    },
    {
        id: 2,
        itemId: 385,
        date: '2026-11-11T13:41:00Z',
        type: 'Sell',
        item: 'Shark',
        quantity: 5000,
        unitPrice: 960
    },
    {
        id: 3,
        itemId: 892,
        date: '2026-11-10T22:17:00Z',
        type: 'Buy',
        item: 'Rune arrow',
        quantity: 50000,
        unitPrice: 90
    },
    {
        id: 4,
        itemId: 3000,
        date: '2026-11-10T18:03:00Z',
        type: 'Buy',
        item: 'Snapdragon',
        quantity: 200,
        unitPrice: 52_000
    },
    {
        id: 5,
        itemId: 13652,
        date: '2026-11-09T20:55:00Z',
        type: 'Sell',
        item: 'Dragon claws',
        quantity: 1,
        unitPrice: 112_000_000
    },
];
const history: Record<Range, number[]> = {
    '7d': [100, 105, 103, 113, 110, 120, 125.45],
    '30d': [97, 99, 102, 100, 108, 105, 112, 116, 113, 121, 125.45],
    '90d': [89, 95, 92, 103, 99, 108, 113, 110, 120, 125.45],
    '1y': [80, 84, 92, 90, 97, 105, 102, 115, 125.45],
    All: [100, 96, 102, 99, 107, 103, 112, 110, 125.45],
};
const gp = (n: number) => `${Math.round(n).toLocaleString('en-US')} gp`;
const signedGp = (n: number) => `${n > 0 ? '+' : ''}${gp(n)}`;
const signedPercent = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
const tone = (n: number) => n > 0 ? 'positive' : n < 0 ? 'negative' : '';

const portfolioTabs = [
    {id: 'holdings', label: 'Holdings', icon: Package},
    {id: 'offers', label: 'Open Offers', icon: Clock3},
    {id: 'trades', label: 'Trade History', icon: History},
] as const;

export default function PortfolioPage() {
    const [range, setRange] = useState<Range>('7d');
    type PortfolioTab = 'holdings' | 'offers' | 'trades';
    const [tab, setTab] = useState<PortfolioTab>('holdings');
    const [openOffers, setOpenOffers] =
        useState<VirtualMerchOffer[]>(initialMockOffers);

    const handleCancelOffer = (offerId: string) => {
        setOpenOffers((current) =>
            current.filter((offer) => offer.id !== offerId),
        );
    };
    const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({key: 'value', desc: true});
    const rows = useMemo(() => holdings.map(h => {
        const value = h.quantity * h.currentPrice;
        const pnl = h.quantity * (h.currentPrice - h.averageBuyPrice);
        const roi = (h.currentPrice / h.averageBuyPrice - 1) * 100;
        return {...h, value, pnl, roi};
    }), []);
    const holdingsValue = rows.reduce((sum, h) => sum + h.value, 0);
    const portfolioValue = holdingsValue + GOLD_PIECES;
    const profit = portfolioValue - STARTING_BALANCE;
    const roi = profit / STARTING_BALANCE * 100;
    const holding_profit = rows.reduce((sum, h) => sum + h.pnl, 0);
    const sorted = useMemo(() => [...rows].sort((a, b) => {
        const result = sort.key === 'name' ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key];
        return sort.desc ? -result : result;
    }), [rows, sort]);
    const series = history[range].map((value, i, arr) => ({
        label: range === '7d' ? `Nov ${5 + i}` : `${Math.round(i / (arr.length - 1) * 100)}%`,
        value: i === arr.length - 1 ? portfolioValue : value * 1_000_000
    }));
    const best = Math.max(...series.slice(1).map((v, i) => v.value - series[i].value));
    const worst = Math.min(...series.slice(1).map((v, i) => v.value - series[i].value));
    const changeSort = (key: SortKey) => setSort(current => ({
        key,
        desc: current.key === key ? !current.desc : key !== 'name'
    }));

    return <main className="vm-portfolio">

        <header className="vm-heading">
            <span className="vm-heading-label">Virtual Merch</span>
            <h1>Demo Merch Portfolio</h1>
            <p>
                A sample portfolio showcasing virtual trading on OSRS Market.
            </p>
        </header>

        <section className="vm-kpis" aria-label="Portfolio summary">
            <div className="vm-kpi">
                <ChartNoAxesCombined/>
                <div>
                    <span>Portfolio Value</span><strong>{gp(portfolioValue)}</strong>
                </div>
            </div>
            <div className="vm-kpi"><Trophy/>
                <div><span>Leaderboard Rank</span><strong>#{MOCK_LEADERBOARD_RANK.toLocaleString('en-US')}</strong>
                </div>
            </div>
            <div className="vm-kpi"><TrendingUp/>
                <div><span>Holding Profit</span><strong
                    className={tone(holding_profit)}>{signedGp(holding_profit)}</strong>
                </div>
            </div>
            <div className="vm-kpi"><Percent/>
                <div><span>ROI</span><strong className={tone(roi)}>{signedPercent(roi)}</strong></div>
            </div>
        </section>
        <section className="vm-chart-layout">
            <div className="vm-panel vm-chart-panel">
                <div className="vm-panel-heading"><h2><BarChart3/> Total Portfolio Value</h2>
                    <div className="vm-ranges"
                         aria-label="Chart range">{(['7d', '30d', '90d', '1y', 'All'] as Range[]).map(r => <button
                        key={r} type="button" className={range === r ? 'active' : ''} aria-pressed={range === r}
                        onClick={() => setRange(r)}>{r}</button>)}</div>
                </div>
                <div className="vm-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{top: 18, right: 14, left: 0, bottom: 0}}>
                            <defs>
                                <linearGradient id="vm-area-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#50dc77" stopOpacity={0.28}/>
                                    <stop offset="100%" stopColor="#50dc77" stopOpacity={0.04}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#27302b" vertical={false}/>
                            <XAxis dataKey="label" tick={{fill: '#a9ada8', fontSize: 12}} axisLine={false} tickLine={false}/>
                            <YAxis
                                domain={['auto', 'auto']} tickFormatter={n => `${Math.round(n / 1_000_000)}M`}
                                tick={{fill: '#a9ada8', fontSize: 12}} axisLine={false} tickLine={false}
                                width={45}/><Tooltip
                                contentStyle={{background: '#151a17', border: '1px solid #414a42', borderRadius: 6}}
                                formatter={(value) => gp(Number(value))}/>
                            <Area type="monotone" dataKey="value"
                                name="Portfolio value" stroke="#55dc79"
                                strokeWidth={2.5} fill="url(#vm-area-fill)"
                                dot={{r: 3, fill: '#55dc79'}}
                                activeDot={{r: 5}}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <aside className="vm-panel vm-performance"><h2>Performance ({range})</h2>
                <dl>
                    <div>
                        <dt>Starting Value</dt>
                        <dd>{gp(STARTING_BALANCE)}</dd>
                    </div>
                    <div>
                        <dt>Current Value</dt>
                        <dd>{gp(portfolioValue)}</dd>
                    </div>
                    <div>
                        <dt>Total Profit</dt>
                        <dd className={tone(profit)}>{signedGp(profit)}</dd>
                    </div>
                    <div>
                        <dt>ROI</dt>
                        <dd className={tone(roi)}>{signedPercent(roi)}</dd>
                    </div>
                    <div>
                        <dt>Best Interval</dt>
                        <dd className="positive">{signedGp(best)}</dd>
                    </div>
                    <div>
                        <dt>Worst Interval</dt>
                        <dd className={tone(worst)}>{signedGp(worst)}</dd>
                    </div>
                    <div>
                        <dt>Trades Shown</dt>
                        <dd>{trades.length}</dd>
                    </div>
                </dl>
                <p className="vm-footnote">Performance history is illustrative; interval statistics reflect chart
                    samples.</p></aside>
        </section>
        <section className="vm-panel vm-table-panel">
            <div className="vm-table-toolbar">
                <div className="vm-tabs">
                    <div
                        className="vm-tab-indicator"
                        style={{
                            transform: `translateX(${
                                portfolioTabs.findIndex(t => t.id === tab) * 100
                            }%)`,
                        }}
                    />

                    {portfolioTabs.map(({id, label, icon: Icon}) => (
                        <button
                            key={id}
                            type="button"
                            className={tab === id ? 'active' : ''}
                            onClick={() => setTab(id)}
                            aria-selected={tab === id}
                            role="tab"
                        >
                            <Icon size={17}/>

                            {label}
                            {id === 'holdings' && ` (${rows.length})`}
                            {id === 'offers' && ` (${openOffers.length})`}
                        </button>
                    ))}
                </div>

                {tab === 'holdings' && (
                    <div className="vm-holdings-total">
                        Holdings Value: <strong>{gp(holdingsValue)}</strong>
                    </div>
                )}
            </div>

            <div className="vm-table-scroll">
                {tab === 'holdings' && (
                    <HoldingsTable rows={sorted} sort={sort} onSort={changeSort}/>
                )}
                {tab === 'offers' && (
                    <OpenOffersTable offers={openOffers} onCancel={handleCancelOffer}/>
                )}
                {tab === 'trades' && (
                    <TradeHistoryTable trades={trades}/>
                )}
            </div>
        </section>
    </main>;
}