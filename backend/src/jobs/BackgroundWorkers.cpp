#include "BackgroundWorkers.hpp"

#include "../utils/Logger.hpp"

#include <chrono>
#include <exception>
#include <thread>

void startMappingRefreshWorker(
    MappingRefreshJob& mappingJob
)
{
    std::thread mappingThread{
        [&mappingJob]
        {
            mappingJob.execute();
        }
    };

    mappingThread.detach();

    Logger::info(
        "Mapping refresh worker launched"
    );
}

void startGapRecoveryWorker(
    GapRecoveryJob& gapRecoveryJob
)
{
    std::thread gapRecoveryThread{
        [&gapRecoveryJob]
        {
            try
            {
                gapRecoveryJob.run();
            }
            catch (const std::exception& e)
            {
                Logger::error(
                    "Gap recovery failed: ",
                    e.what()
                );
            }
        }
    };

    gapRecoveryThread.detach();

    Logger::info(
        "Gap recovery worker launched"
    );
}

void startPriceRefreshWorker(
    FiveMinutePriceRefreshJob& priceRefreshJob
)
{
    std::thread priceRefreshThread{
        [&priceRefreshJob]
        {
            using namespace std::chrono;

            while (true)
            {
                const auto now =
                    system_clock::now();

                const auto currentMinute =
                    duration_cast<minutes>(
                        now.time_since_epoch()
                    );

                const auto nextFiveMinutes =
                    ((currentMinute.count() / 5) + 1) * 5;

                const auto nextRun =
                    system_clock::time_point{
                        minutes{
                            nextFiveMinutes
                        }
                    } +
                    seconds{10};

                std::this_thread::sleep_until(
                    nextRun
                );

                try
                {
                    priceRefreshJob.execute();
                }
                catch (const std::exception& e)
                {
                    Logger::error(
                        "5m price refresh failed: ",
                        e.what()
                    );
                }
            }
        }
    };

    priceRefreshThread.detach();

    Logger::info(
        "Price refresh worker launched"
    );
}

void startPriceBackfillWorker(
    JobQueue<PriceBackfillRequest>& queue,
    PriceBackfillJob& backfillJob
)
{
    std::thread backfillThread{
        [&queue, &backfillJob]
        {
            Logger::info(
                "Price backfill worker started"
            );

            while (const auto request = queue.pop())
            {
                try
                {
                    Logger::info(
                        "Processing queued backfill: item=",
                        request->itemId,
                        " lookback=",
                        request->lookback
                    );

                    backfillJob.execute(
                        request->itemId,
                        request->lookback
                    );

                    Logger::info(
                        "Queued backfill complete: item=",
                        request->itemId,
                        " lookback=",
                        request->lookback
                    );
                }
                catch (const std::exception& e)
                {
                    Logger::error(
                        "Queued backfill failed: item=",
                        request->itemId,
                        " lookback=",
                        request->lookback,
                        " error=",
                        e.what()
                    );
                }
            }

            Logger::info(
                "Price backfill worker stopped"
            );
        }
    };

    backfillThread.detach();

    Logger::info(
        "Price backfill worker launched"
    );
}