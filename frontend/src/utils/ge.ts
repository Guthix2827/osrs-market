export function calculateGeTax(
    sellPrice: number,
    taxFree = false
): number {
    if (taxFree || sellPrice < 100) {
        return 0;
    }

    return Math.min(
        Math.floor(sellPrice * 0.02),
        5_000_000
    );
}