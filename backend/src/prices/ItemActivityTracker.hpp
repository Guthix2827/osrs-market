#pragma once

#include <chrono>
#include <cstdint>
#include <mutex>
#include <unordered_map>
#include <vector>

class ItemActivityTracker
{
public:
    void recordView(
        std::int32_t itemId
    );

    [[nodiscard]]
    std::vector<std::int32_t> recentlyViewed(
        std::chrono::seconds maxAge
    ) const;

private:
    using Clock =
        std::chrono::steady_clock;

    mutable std::mutex mutex_;

    std::unordered_map<
        std::int32_t,
        Clock::time_point
    > lastViewed_;
};