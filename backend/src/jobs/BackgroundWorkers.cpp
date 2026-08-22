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