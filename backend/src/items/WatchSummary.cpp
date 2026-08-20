#include "WatchSummary.hpp"

#include <limits>
#include <cstdlib>

namespace
{
    std::optional<std::int64_t>
    getMidPrice(
        const PricePoint& point
    )
    {
        if (
            point.avgHighPrice.has_value() &&
            point.avgLowPrice.has_value()
        )
        {
            return (
                *point.avgHighPrice +
                *point.avgLowPrice
            ) / 2;
        }

        if (point.avgHighPrice.has_value())
        {
            return point.avgHighPrice;
        }

        if (point.avgLowPrice.has_value())
        {
            return point.avgLowPrice;
        }

        return std::nullopt;
    }

    std::optional<std::int64_t>
    findPriceClosestTo(
        const std::vector<PricePoint>& history,
        std::int64_t targetTimestamp
    )
    {
        const PricePoint* closest = nullptr;
        std::int64_t closestDistance =
            std::numeric_limits<std::int64_t>::max();

        for (const auto& point : history)
        {
            const auto price =
                getMidPrice(point);

            if (!price)
            {
                continue;
            }

            const auto distance =
                std::llabs(
                    point.timestamp -
                    targetTimestamp
                );

            if (distance < closestDistance)
            {
                closest = &point;
                closestDistance = distance;
            }
        }

        if (!closest)
        {
            return std::nullopt;
        }

        return getMidPrice(*closest);
    }
}


WatchSummary buildWatchSummary(
    std::int32_t itemId,
    const std::vector<PricePoint>& history,
    std::int64_t now
)
{
    constexpr std::int64_t minute = 60;
    constexpr std::int64_t hour =
        60 * minute;

    return WatchSummary{
        .itemId = itemId,

        .references = {
            .price30m =
                findPriceClosestTo(
                    history,
                    now - 30 * minute
                ),

            .price1h =
                findPriceClosestTo(
                    history,
                    now - 1 * hour
                ),

            .price6h =
                findPriceClosestTo(
                    history,
                    now - 6 * hour
                ),

            .price12h =
                findPriceClosestTo(
                    history,
                    now - 12 * hour
                ),

            .price24h =
                findPriceClosestTo(
                    history,
                    now - 24 * hour
                ),
        },

        .generatedAt = now,
    };
}