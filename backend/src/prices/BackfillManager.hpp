#pragma once

#include <chrono>
#include <cstdint>
#include <mutex>
#include <unordered_map>

class BackfillPolicy;
class PriceBackfillRequest;

template<typename T>
class JobQueue;

class BackfillManager
{
public:
    BackfillManager(
        BackfillPolicy& policy,
        JobQueue<PriceBackfillRequest>& queue
    );

    void ensureHistory(
        std::int32_t itemId
    );

    void ensureAllAvailableHistory(
        std::int32_t itemId
    );

private:
    BackfillPolicy& policy_;
    JobQueue<PriceBackfillRequest>& queue_;

    using Clock =
        std::chrono::steady_clock;

    std::mutex mutex_;

    std::unordered_map<
        std::int32_t,
        Clock::time_point
    > lastChecked_;
};