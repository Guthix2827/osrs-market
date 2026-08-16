import type {Item, PricePoint} from "../types/item";

import { dragonAxe } from "../mocks/items";
import {
    mockHistory7d,
    mockHistory24h,
} from "../mocks/priceHistory";

export async function getItemMock(id: number): Promise<Item> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (id !== 6739) {
        throw new Error("Item not found");
    }

    return dragonAxe;
}

async function getPriceHistoryMock(
    id: number,
    range: string,
): Promise<PricePoint[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (id !== 6739) {
        throw new Error("Item not found");
    }

    switch (range) {
        case "24H":
            return mockHistory24h;

        case "7D":
            return mockHistory7d;

        default:
            return mockHistory7d;
    }
}

export const itemService = {
    getItemMock,
    getPriceHistoryMock,
};