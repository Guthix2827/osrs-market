#include "GapRecoveryJob.hpp"

#include "../utils/Logger.hpp"

#include <chrono>

GapRecoveryJob::GapRecoveryJob(
    MappingStore& mappingStore,
    PriceRepository& priceRepository,
    PriceBackfillJob& backfillJob
)
    : mappingStore_{mappingStore},
      priceRepository_{priceRepository},
      backfillJob_{backfillJob}
{
}

void GapRecoveryJob::run()
{
    using namespace std::chrono;
    using namespace std::chrono_literals;

    const auto latestTimestamp =
        priceRepository_.findLatestTimestamp();

    if (!latestTimestamp)
    {
        Logger::info(
            "Gap recovery skipped: no price history exists"
        );

        return;
    }

    const auto now =
        duration_cast<seconds>(
            system_clock::now()
                .time_since_epoch()
        ).count();

    const auto gap =
        seconds{
            now - *latestTimestamp
        };

    Logger::info(
        "Latest stored market timestamp age: ",
        duration_cast<minutes>(gap).count(),
        " minutes"
    );

    //
    // Allow for normal 5-minute scheduling delay.
    //
    if (gap <= 10min)
    {
        Logger::info(
            "No market gap detected"
        );

        return;
    }

    std::string_view lookback;

    if (gap <= 24h)
    {
        lookback = "24h";
    }
    else if (gap <= 7 * 24h)
    {
        lookback = "7d";
    }
    else
    {
        lookback = "1y";
    }

    const auto items =
        mappingStore_.all();

    Logger::info(
        "Market gap detected: minutes=",
        duration_cast<minutes>(gap).count(),
        " lookback=",
        lookback,
        " items=",
        items.size()
    );

    std::size_t recovered = 0;
    std::size_t failed = 0;

    for (const auto& item : items)
    {
        try
        {
            backfillJob_.execute(
                item.id,
                lookback
            );

            ++recovered;
        }
        catch (const std::exception& e)
        {
            ++failed;

            Logger::error(
                "Gap recovery failed: item=",
                item.id,
                " error=",
                e.what()
            );
        }
    }

    Logger::info(
        "Gap recovery complete: recovered=",
        recovered,
        " failed=",
        failed
    );
}