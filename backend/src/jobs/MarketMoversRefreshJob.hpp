#pragma once

class MarketMoversService;

class MarketMoversRefreshJob
{
public:
    explicit MarketMoversRefreshJob(
        MarketMoversService& service
    );

    void execute();

private:
    MarketMoversService& service_;
};