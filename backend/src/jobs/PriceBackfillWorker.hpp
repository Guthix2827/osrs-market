#pragma once

#include "JobQueue.hpp"
#include "PriceBackfillJob.hpp"
#include "PriceBackfillRequest.hpp"

#include "../utils/Logger.hpp"

class PriceBackfillWorker
{
public:
    PriceBackfillWorker(
        JobQueue<PriceBackfillRequest>& queue,
        PriceBackfillJob& job
    )
        : queue_(queue),
          job_(job)
    {
    }

    void run()
    {
        Logger::info(
            "Price backfill worker started"
        );

        while (true)
        {
            auto request =
                queue_.pop();

            if (!request)
            {
                Logger::info(
                    "Price backfill worker stopped"
                );

                break;
            }

            job_.execute(
                request->itemId,
                request->lookback
            );
        }
    }

private:
    JobQueue<PriceBackfillRequest>& queue_;
    PriceBackfillJob& job_;
};