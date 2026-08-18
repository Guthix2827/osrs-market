export interface ItemMetadata {
    id: number;
    name: string;
    examine: string;
    members: boolean;

    icon: string;

    lowAlch: number | null;
    highAlch: number | null;
    buyLimit: number | null;
    value: number | null;

    taxFree?: boolean;
}

export interface ItemPrice {
    high: number | null;
    highTime: number | null;

    low: number | null;
    lowTime: number | null;
}

export interface ItemStats {
    margin: number | null;
    netMargin: number | null;
    potentialProfit: number | null;
    roi: number | null;
    dailyVolume: number | null;
}

export interface PricePoint {
    timestamp: number;

    avgHighPrice: number | null;
    avgLowPrice: number | null;

    highPriceVolume: number;
    lowPriceVolume: number;
}

export interface ItemSearchResult {
    id: number;
    name: string;
    members: boolean;
    icon: string;
}