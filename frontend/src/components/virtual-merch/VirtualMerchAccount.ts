export type VirtualMerchAccount = {
    authenticated: boolean;
    hasPortfolio: boolean;
    availableGp: number;
    activeOffers: number;
    maxOffers: number;
    tradingPaused: boolean;
    holdings: Record<number, number>;
};
