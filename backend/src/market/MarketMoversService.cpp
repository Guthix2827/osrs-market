#include "MarketMoversService.hpp"

#include "../utils/Logger.hpp"
#include "../utils/Time.hpp"

#include <array>
#include <optional>
#include <string>
#include <utility>

namespace
{

std::string categoryValue(
    MarketMoverCategory category
)
{
    switch (category)
    {
        case MarketMoverCategory::Gainers:
            return "gainers";

        case MarketMoverCategory::Losers:
            return "losers";

        case MarketMoverCategory::Volume:
            return "volume";

        case MarketMoverCategory::Value:
            return "value";
    }

    return "gainers";
}

std::optional<MarketMoverItem> firstItem(
    const MarketMoversResult& result
)
{
    if (result.items.empty())
    {
        return std::nullopt;
    }

    return result.items.front();
}

} // namespace

MarketMoversService::MarketMoversService(
    MarketMoversRepository& repository
)
    : repository_(repository)
{
}

MarketMoversResult
MarketMoversService::findMovers(
    MarketMoverRangeConfig range,
    MarketMoverCategory category
)
{
    const auto key =
        cacheKey(
            range,
            category
        );

    {
        std::lock_guard<std::mutex> lock{
            mutex_
        };

        const auto cached =
            moversCache_.find(key);

        if (
            cached != moversCache_.end() &&
            isFresh(cached->second)
        )
        {
            return cached->second;
        }
    }

    auto result =
        repository_.findMovers(
            range,
            category
        );

    std::lock_guard<std::mutex> lock{
        mutex_
    };

    moversCache_[key] =
        result;

    return result;
}

MarketMoversSnapshot
MarketMoversService::findSnapshot()
{
    {
        std::lock_guard<std::mutex> lock{
            mutex_
        };

        if (
            snapshotCache_ &&
            snapshotCache_->generatedAt ==
                currentUtcMidnightTimestamp()
        )
        {
            return *snapshotCache_;
        }
    }

    const auto range =
        *parseMarketMoverRange("24h");

    const auto gainers =
        findMovers(
            range,
            MarketMoverCategory::Gainers
        );

    const auto losers =
        findMovers(
            range,
            MarketMoverCategory::Losers
        );

    const auto volume =
        findMovers(
            range,
            MarketMoverCategory::Volume
        );

    MarketMoversSnapshot snapshot{
        .generatedAt = currentUtcMidnightTimestamp(),
        .biggestRise = firstItem(gainers),
        .biggestFall = firstItem(losers),
        .highestVolume = firstItem(volume)
    };

    std::lock_guard<std::mutex> lock{
        mutex_
    };

    snapshotCache_ =
        snapshot;

    return snapshot;
}

void MarketMoversService::refreshAll()
{
    Logger::info(
        "Refreshing market movers cache..."
    );

    constexpr std::array ranges{
        "24h",
        "7d",
        "30d",
        "90d"
    };

    constexpr std::array categories{
        MarketMoverCategory::Gainers,
        MarketMoverCategory::Losers,
        MarketMoverCategory::Volume,
        MarketMoverCategory::Value
    };

    for (const auto rangeValue : ranges)
    {
        const auto range =
            parseMarketMoverRange(
                rangeValue
            );

        if (!range)
        {
            continue;
        }

        for (const auto category : categories)
        {
            auto result =
                repository_.findMovers(
                    *range,
                    category
                );

            std::lock_guard<std::mutex> lock{
                mutex_
            };

            moversCache_[
                cacheKey(
                    *range,
                    category
                )
            ] = std::move(result);
        }
    }

    {
        std::lock_guard<std::mutex> lock{
            mutex_
        };

        snapshotCache_.reset();
    }

    (void)findSnapshot();

    Logger::info(
        "Market movers cache refresh complete"
    );
}

std::string
MarketMoversService::cacheKey(
    MarketMoverRangeConfig range,
    MarketMoverCategory category
) const
{
    return
        std::string{range.value} +
        ":" +
        categoryValue(category);
}

bool MarketMoversService::isFresh(
    const MarketMoversResult& result
) const
{
    return
        result.generatedAt ==
        currentUtcMidnightTimestamp();
}