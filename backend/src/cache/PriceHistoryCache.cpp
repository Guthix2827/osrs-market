#include "PriceHistoryCache.hpp"

#include <chrono>

std::optional<std::vector<PricePoint>>
PriceHistoryCache::get(
    std::int32_t itemId,
    std::string_view range
)
{
    std::lock_guard lock(mutex_);

    const auto itemIt =
        cache_.find(itemId);

    if (itemIt == cache_.end())
        return std::nullopt;

    const auto rangeIt =
        itemIt->second.ranges.find(
            std::string{range}
        );

    if (rangeIt ==
        itemIt->second.ranges.end())
    {
        return std::nullopt;
    }

    const auto now =
        Clock::now();

    if (now >= rangeIt->second.expiresAt)
    {
        itemIt->second.ranges.erase(
            rangeIt
        );

        if (itemIt->second.ranges.empty())
        {
            cache_.erase(
                itemIt
            );
        }

        return std::nullopt;
    }

    return rangeIt->second.points;
}


void PriceHistoryCache::set(
    std::int32_t itemId,
    std::string range,
    std::vector<PricePoint> points
)
{
    std::lock_guard lock(mutex_);

    const auto expiresAt =
        Clock::now() +
        ttlForRange(range);

    cache_[itemId].ranges[
        std::move(range)
    ] = CacheEntry{
        .points = std::move(points),
        .expiresAt = expiresAt
    };
}


void PriceHistoryCache::invalidate(
    std::int32_t itemId
)
{
    std::lock_guard lock(mutex_);

    cache_.erase(
        itemId
    );
}


void PriceHistoryCache::clear()
{
    std::lock_guard lock(mutex_);

    cache_.clear();
}


std::chrono::seconds
PriceHistoryCache::ttlForRange(
    std::string_view range
)
{
    using namespace std::chrono_literals;

    if (range == "24h")
        return 5min;

    if (range == "7d")
        return 5min;

    if (range == "30d")
        return 10min;

    if (range == "1y")
        return 30min;

    return 30s;
}