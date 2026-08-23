#pragma once

#include "MarketMovers.hpp"

#include <cstdint>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>

struct MarketMoversSnapshot
{
    std::int64_t generatedAt;
    std::optional<MarketMoverItem> biggestRise;
    std::optional<MarketMoverItem> biggestFall;
    std::optional<MarketMoverItem> highestVolume;
};

class MarketMoversService
{
public:
    explicit MarketMoversService(
        MarketMoversRepository& repository
    );

    [[nodiscard]]
    MarketMoversResult findMovers(
        MarketMoverRangeConfig range,
        MarketMoverCategory category
    );

    [[nodiscard]]
    MarketMoversSnapshot findSnapshot();

    void refreshAll();

private:
    [[nodiscard]]
    std::string cacheKey(
        MarketMoverRangeConfig range,
        MarketMoverCategory category
    ) const;

    [[nodiscard]]
    bool isFresh(
        const MarketMoversResult& result
    ) const;

    MarketMoversRepository& repository_;
    std::mutex mutex_;
    std::unordered_map<std::string, MarketMoversResult> moversCache_;
    std::optional<MarketMoversSnapshot> snapshotCache_;
};