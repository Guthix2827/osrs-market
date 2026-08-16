#pragma once

class FiveMinutePriceClient;
class LatestPriceStore;
class PriceRepository;

class FiveMinutePriceRefreshJob
{
public:
    FiveMinutePriceRefreshJob(
        FiveMinutePriceClient& client,
        LatestPriceStore& latestPriceStore,
        PriceRepository& priceRepository
    );

    void execute();

private:
    FiveMinutePriceClient& client_;
    LatestPriceStore& latestPriceStore_;
    PriceRepository& priceRepository_;
};