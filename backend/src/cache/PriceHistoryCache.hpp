#pragma once

#include "prices/PricePoint.hpp"

#include <chrono>
#include <cstdint>
#include <mutex>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

class PriceHistoryCache
{
public:
    [[nodiscard]]
    std::optional<std::vector<PricePoint>> get(
        std::int32_t itemId,
        std::string_view range
    );

    void set(
        std::int32_t itemId,
        std::string range,
        std::vector<PricePoint> points
    );

    void invalidate(
        std::int32_t itemId
    );

    void clear();

private:
    using Clock =
        std::chrono::steady_clock;

    struct CacheEntry
    {
        std::vector<PricePoint> points;
        Clock::time_point expiresAt;
    };

    struct ItemCache
    {
        std::unordered_map<
            std::string,
            CacheEntry
        > ranges;
    };

    [[nodiscard]]
    static std::chrono::seconds ttlForRange(
        std::string_view range
    );

    std::mutex mutex_;

    std::unordered_map<
        std::int32_t,
        ItemCache
    > cache_;
};