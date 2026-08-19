import type {
    ItemMetadata,
    ItemPrice,
    ItemStats,
} from "../types/item";

export const dragonAxe: ItemMetadata = {
    id: 6739,
    name: "Dragon axe",
    examine: "A very powerful axe.",
    members: true,

    icon: "https://oldschool.runescape.wiki/images/Dragon_axe.png",

    lowAlch: 22000,
    highAlch: 33000,
    buyLimit: 40,
    value: 55000,
};

export const dragonAxePrice: ItemPrice = {
    high: 78975,
    highTime: Date.now() / 1000 - 180,

    low: 72249,
    lowTime: Date.now() / 1000 - 480,
};

export const dragonAxeStats: ItemStats = {
    margin: 5147,
    netMargin: 5000,
    potentialProfit: 205880,
    roi: 7.12,
    dailyVolume: 1815,
};