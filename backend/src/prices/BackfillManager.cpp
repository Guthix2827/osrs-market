#include "BackfillManager.hpp"

#include "BackfillPolicy.hpp"

#include "../jobs/JobQueue.hpp"
#include "../jobs/PriceBackfillRequest.hpp"
#include "../utils/Logger.hpp"

#include <chrono>

BackfillManager::BackfillManager(
    BackfillPolicy& policy,
    JobQueue<PriceBackfillRequest>& queue
)
    : policy_(policy),
      queue_(queue)
{
}

void BackfillManager::ensureHistory(
    std::int32_t itemId
)
{
    //mutex
    std::lock_guard lock(mutex_);

    const auto now =
        Clock::now();

    const auto it =
        lastChecked_.find(itemId);

    if (it != lastChecked_.end())
    {
        const auto elapsed =
            now - it->second;

        if (elapsed < std::chrono::minutes{10})
        {
            return;
        }
    }

    lastChecked_[itemId] = now;


    using namespace std::chrono_literals;

    if (policy_.needsLookback(
            itemId,
            "24h",
            24h,
            30min
        ))
    {
        Logger::info(
            "Queueing 24h history refresh for item ",
            itemId
        );

        queue_.push(
            PriceBackfillRequest{
                .itemId = itemId,
                .lookback = "24h"
            }
        );
    }

    if (policy_.needsLookback(
            itemId,
            "7d",
            7 * 24h,
            6h
        ))
    {
        Logger::info(
            "Queueing 7d history refresh for item ",
            itemId
        );

        queue_.push(
            PriceBackfillRequest{
                .itemId = itemId,
                .lookback = "7d"
            }
        );
    }

    if (policy_.needsLookback(
            itemId,
            "1y",
            365 * 24h,
            24h
        ))
    {
        Logger::info(
            "Queueing 1y history refresh for item ",
            itemId
        );

        queue_.push(
            PriceBackfillRequest{
                .itemId = itemId,
                .lookback = "1y"
            }
        );
    }
}