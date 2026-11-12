import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './VirtualMerchHiscoresPage.css';
import {Link} from "react-router-dom";

type PlayerRanking = {
    id: number;
    name: string;
    totalProfit: number;
    portfolioValue: number;
    roi: number;
    completedTrades: number;
};

const PAGE_SIZE = 10;
const STARTING_GP = 100_000_000_000;

const names = [
    'MerchKing', 'FlipMaster', 'GE Goblin', 'SandCasino',
    'Runes4GP', 'BuyLowSellHigh', 'ZerkerMerch', 'IronFlipper',
    'GE Analyst', 'Merch BTW', 'StonkScape', 'TradeNerd',
    'AlchAndChill', 'GE Merchant', 'Price Check', 'MarketMover',
    'SupplyDemand', 'GE Slinger', 'ItemHoarder', 'FlippingLegend',
    'BulkBuyer', 'RuneInvestor', 'QuickFlip', 'GE Veteran',
    'ProfitPker',
];

const mockPlayers: PlayerRanking[] = Array.from({ length: 500 }, (_, index) => {
    const totalProfit = Math.round(
        512_430_000_000 * Math.exp(-index * 0.075),
    );

    return {
        id: index + 1,
        name: names[index] ?? `Trader${index + 1}`,
        totalProfit,
        portfolioValue: STARTING_GP + totalProfit,
        roi: (totalProfit / STARTING_GP) * 100,
        completedTrades: Math.max(1, Math.round(24781 * Math.exp(-index * 0.035))),
    };
});

const gp = (value: number) =>
    `${Math.round(value).toLocaleString('en-US')} gp`;

const signedGp = (value: number) =>
    `${value > 0 ? '+' : ''}${gp(value)}`;

const signedPercent = (value: number) =>
    `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

export default function VirtualMerchHiscoresPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const filteredPlayers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return mockPlayers;

        return mockPlayers.filter(player =>
            player.name.toLowerCase().includes(query),
        );
    }, [search]);

    const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE);

    const visiblePlayers = filteredPlayers.slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE,
    );

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(0);
    };

    return (
        <main className="vm-hiscores-page">
            <header className="vm-hiscores-hero">
                <div>
                    <h1>
                        Virtual Merch <span>Hiscores</span>
                    </h1>
                    <p>
                        The leaderboard for Virtual Merch. Compete with other
                        traders and climb the ranks by generating the highest
                        total profit.
                    </p>
                </div>
            </header>

            <div className="vm-hiscores-content">
                <div className="vm-hiscores-table-scroll">
                    <table className="vm-hiscores-table">
                        <thead>
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">Player</th>
                            <th scope="col">Total Profit</th>
                            <th scope="col">Portfolio Value</th>
                            <th scope="col">ROI</th>
                            <th scope="col">Completed Trades</th>
                        </tr>
                        </thead>
                        <tbody>
                        {visiblePlayers.map(player => (
                            <tr key={player.id}>
                                <td>{player.id}</td>
                                <td>
                                    <Link
                                        to="/merch/portfolio"
                                        className="vm-hiscores-player-link"
                                    >
                                        {player.name}
                                    </Link>
                                </td>
                                <td className="vm-hiscores-profit">
                                    {signedGp(player.totalProfit)}
                                </td>
                                <td>{gp(player.portfolioValue)}</td>
                                <td className="vm-hiscores-profit">
                                    {signedPercent(player.roi)}
                                </td>
                                <td>
                                    {player.completedTrades.toLocaleString('en-US')}
                                </td>
                            </tr>
                        ))}

                        {visiblePlayers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="vm-hiscores-empty">
                                    No players found.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="vm-hiscores-sidebar">
                    <div className="vm-hiscores-search">
                        <Search size={18} />
                        <input
                            type="search"
                            placeholder="Search player..."
                            value={search}
                            onChange={e => handleSearch(e.target.value)}
                            aria-label="Search players"
                        />
                    </div>

                    <div className="vm-hiscores-pagination">
                        {page > 0 && (
                            <button
                                type="button"
                                aria-label="Previous page"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}

                        {page + 1 < totalPages && (
                            <button
                                type="button"
                                aria-label="Next page"
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>

            </div>

        </main>
    );
}