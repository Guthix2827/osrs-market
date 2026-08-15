export interface ItemPrice {
    high: number;
    highTime: number;
    low: number;
    lowTime: number;
}

export interface ItemStats {
    margin: number;
    potentialProfit: number;
    roi: number;
    dailyVolume: number;
}

export interface Item {
    id: number;
    name: string;
    examine: string;
    members: boolean;

    icon: string;

    lowAlch: number;
    highAlch: number;
    buyLimit: number;

    price: ItemPrice;
    stats: ItemStats;
}

export interface PricePoint {
    timestamp: number;

    avgHighPrice: number | null;
    avgLowPrice: number | null;

    highPriceVolume: number;
    lowPriceVolume: number;
}