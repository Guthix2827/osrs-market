#pragma once

#include <cstdint>
#include <optional>

struct PricePoint
{
    std::int32_t itemId;
    std::int64_t timestamp;

    std::optional<std::int64_t> avgHighPrice;
    std::optional<std::int64_t> avgLowPrice;

    std::int64_t highPriceVolume {};
    std::int64_t lowPriceVolume {};
};