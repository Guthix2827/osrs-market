#include "PriceBackfillJob.hpp"

#include "../prices/PriceRepository.hpp"
#include "../prices/TimeseriesClient.hpp"
#include "../cache/PriceHistoryCache.hpp"
#include "../utils/Logger.hpp"

#include <exception>

PriceBackfillJob::PriceBackfillJob(
    TimeseriesClient& client,
    PriceRepository& repository,
    PriceHistoryCache& historyCache
)
    : client_(client),
      repository_(repository),
      historyCache_(historyCache)
{
}

void PriceBackfillJob::execute(
    std::int32_t itemId,
    std::string_view lookback
)
{
    try
    {
        Logger::info(
            "Starting price backfill: item=",
            itemId,
            " lookback=",
            lookback
        );

        const auto timeseries =
            client_.fetch(
                itemId,
                lookback
            );

        const auto inserted =
            repository_.insertMany(
                timeseries.points
            );
        
        repository_.markBackfillComplete(
            itemId,
            lookback
        );

        Logger::info(
            "Price backfill complete: item=",
            itemId,
            " lookback=",
            lookback,
            " received=",
            timeseries.points.size(),
            " inserted=",
            inserted
        );
    }
    catch (const std::exception& e)
    {
        Logger::error(
            "Price backfill failed: item=",
            itemId,
            " lookback=",
            lookback,
            " error=",
            e.what()
        );
    }
}