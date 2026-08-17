import type {ItemMetadata, ItemPrice, ItemSearchResult, ItemStats, PricePoint} from "../types/item";

import {dragonAxe, dragonAxePrice, dragonAxeStats} from "../mocks/items";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8081";

export const PRICE_HISTORY_RANGES = [
    "24H",
    "7D",
    "30D",
    "1Y",
] as const;

export type PriceHistoryRange =
    typeof PRICE_HISTORY_RANGES[number];

interface PriceHistoryResponse {
    itemId: number;
    range: string;
    data: PricePoint[];
}


/**
 * Temporary.
 *
 * Item metadata is still mocked until the backend API
 * provides everything required by the frontend Item type.
 */
export async function getItemMock(
    id: number,
): Promise<ItemMetadata> {
    if (id !== 6739) {
        throw new Error("Item not found");
    }

    return dragonAxe;
}

export async function getPriceMock(
    id: number,
): Promise<ItemPrice> {
    if (id !== 6739) {
        throw new Error("Item not found");
    }

    return dragonAxePrice;
}

export async function getStatsMock(
    id: number,
): Promise<ItemStats> {
    if (id !== 6739) {
        throw new Error("Item not found");
    }

    return dragonAxeStats;
}

export async function getItem(
    id: number,
): Promise<ItemMetadata> {
    const response = await fetch(
        `${API_BASE_URL}/api/items/${id}`,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch item (${response.status})`,
        );
    }

    return await response.json() as ItemMetadata;
}


export async function getPriceHistory(
    id: number,
    range: PriceHistoryRange,
): Promise<PricePoint[]> {
    const backendRange = {
        "24H": "24h",
        "7D": "7d",
        "30D": "30d",
        "1Y": "1y",
    }[range];

    const response = await fetch(
        `${API_BASE_URL}/api/items/${id}/history?range=${backendRange}`,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch price history (${response.status})`,
        );
    }

    const json =
        await response.json() as PriceHistoryResponse;

    return json.data;
}

interface ItemSearchResponse {
    data: ItemSearchResult[];
}

export async function searchItems(
    query: string,
): Promise<ItemSearchResult[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/items/search?q=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to search items (${response.status})`,
        );
    }

    const json =
        await response.json() as ItemSearchResponse;

    return json.data;
}


export const itemService = {
    getItem,
    getItemMock,
    getPriceHistory,
    searchItems
};