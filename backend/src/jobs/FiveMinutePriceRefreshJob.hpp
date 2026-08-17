#pragma once

class FiveMinutePriceClient;
class LatestPriceStore;
class PriceRepository;
class PriceHistoryCache;

class FiveMinutePriceRefreshJob
{
public:
    FiveMinutePriceRefreshJob(
        FiveMinutePriceClient& client,
        LatestPriceStore& latestPriceStore,
        PriceRepository& priceRepository,
        PriceHistoryCache& historyCache
    );

    void execute();

private:
    FiveMinutePriceClient& client_;
    LatestPriceStore& latestPriceStore_;
    PriceRepository& priceRepository_;
    PriceHistoryCache& historyCache_;
};