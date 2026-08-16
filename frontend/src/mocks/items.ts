import type { Item } from "../types/item";

export const dragonAxe: Item = {
    id: 6739,
    name: "Dragon axe",
    examine: "A very powerful axe.",
    members: true,

    icon: "https://oldschool.runescape.wiki/images/Dragon_axe.png",

    lowAlch: 22000,
    highAlch: 33000,
    buyLimit: 40,

    price: {
        high: 78975,
        highTime: Date.now() / 1000 - 180,
        low: 72249,
        lowTime: Date.now() / 1000 - 480,
    },

    stats: {
        margin: 5147,
        potentialProfit: 205880,
        roi: 7.12,
        dailyVolume: 1815,
    },
};