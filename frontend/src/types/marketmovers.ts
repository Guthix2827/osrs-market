export type MarketMoversResponse = {
    range: MarketMoverRange;
    category: MarketMoverCategory;
    limit: number;
    generatedAt: number;
    items: MarketMoverItem[];
};

export type MarketMoversSnapshotResponse = {
    range: '24h';
    generatedAt: number;
    biggestRise: MarketMoverItem | null;
    biggestFall: MarketMoverItem | null;
    highestVolume: MarketMoverItem | null;
};

export const MARKET_MOVER_RANGES = ['24h', '7d', '30d', '90d',] as const;
export const MARKET_MOVER_CATEGORIES = ['gainers', 'losers', 'volume', 'value',] as const;

export type MarketMoverRange = typeof MARKET_MOVER_RANGES[number];
export type MarketMoverCategory = typeof MARKET_MOVER_CATEGORIES[number];

export  type MarketMoverItem = {
    itemId: number;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    volume: number;
    tradedValue: number;
};