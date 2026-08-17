#pragma once

#include <cstdint>
#include <string_view>

class TimeseriesClient;
class PriceRepository;

class PriceBackfillJob
{
public:
    PriceBackfillJob(
        TimeseriesClient& client,
        PriceRepository& repository
    );

    void execute(
        std::int32_t itemId,
        std::string_view lookback
    );

private:
    TimeseriesClient& client_;
    PriceRepository& repository_;
};