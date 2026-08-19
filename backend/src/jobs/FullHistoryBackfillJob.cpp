#include "FullHistoryBackfillJob.hpp"

#include "../utils/Logger.hpp"

#include <chrono>
#include <thread>

FullHistoryBackfillJob::FullHistoryBackfillJob(
    MappingStore& mappingStore,
    PriceBackfillJob& backfillJob,
    BackfillPolicy& backfillPolicy
)
    : mappingStore_{mappingStore},
      backfillJob_{backfillJob},
      backfillPolicy_{backfillPolicy}
{
}

void FullHistoryBackfillJob::run()
{
    using namespace std::chrono_literals;

    const auto items =
        mappingStore_.all();

    const auto total =
        items.size();

    Logger::info(
        "Starting full history backfill: items=",
        total
    );

    std::size_t processed = 0;

    for (const auto& item : items)
    {
        //temporary fill item
        //if (item.id != 31406)
        //    continue;

        try
        {
            if (backfillPolicy_.needsLookback(
                    item.id,
                    "24h",
                    24h,
                    30min
                ))
            {
                backfillJob_.execute(
                    item.id,
                    "24h"
                );
            }

            if (backfillPolicy_.needsLookback(
                    item.id,
                    "7d",
                    7 * 24h,
                    6h
                ))
            {
                backfillJob_.execute(
                    item.id,
                    "7d"
                );
            }

            if (backfillPolicy_.needsLookback(
                    item.id,
                    "1y",
                    365 * 24h,
                    24h
                ))
            {
                backfillJob_.execute(
                    item.id,
                    "1y"
                );
            }

            ++processed;

            if (
                processed % 50 == 0 ||
                processed == total
            )
            {
                Logger::info(
                    "Full history backfill progress: ",
                    processed,
                    "/",
                    total
                );
            }
        }
        catch (const std::exception& e)
        {
            Logger::error(
                "Full history backfill failed: item=",
                item.id,
                " error=",
                e.what()
            );
        }

        std::this_thread::sleep_for(
            250ms
        );
    }

    Logger::info(
        "Full history backfill complete: items=",
        processed
    );
}