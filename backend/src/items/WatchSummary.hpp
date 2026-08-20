#pragma once

#include <cstdint>
#include <optional>
#include <vector>

#include "prices/PricePoint.hpp"

struct WatchPriceReferences
{
    std::optional<std::int64_t> price30m;
    std::optional<std::int64_t> price1h;
    std::optional<std::int64_t> price6h;
    std::optional<std::int64_t> price12h;
    std::optional<std::int64_t> price24h;
};

struct WatchSummary
{
    std::int32_t itemId;

    WatchPriceReferences references;

    std::int64_t generatedAt;
};

WatchSummary buildWatchSummary(
    std::int32_t itemId,
    const std::vector<PricePoint>& history,
    std::int64_t now
);