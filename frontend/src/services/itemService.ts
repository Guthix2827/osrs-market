import type { Item } from "../types/item";
import { dragonAxe } from "../mocks/items";

export async function getItem(id: number): Promise<Item> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (id !== 6739) {
        throw new Error("Item not found");
    }

    return dragonAxe;
}

/*
export async function getItem(id: number): Promise<Item> {
    const response = await fetch(`/api/items/${id}`);

    if (!response.ok) {
        throw new Error("Failed to load item");
    }

    return response.json();
}
 */