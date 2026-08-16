#include "LatestPriceStore.hpp"

#include <mutex>
#include <utility>

namespace
{

bool sameMarketData(
    const PricePoint& a,
    const PricePoint& b
)
{
    return
        a.avgHighPrice == b.avgHighPrice &&
        a.avgLowPrice == b.avgLowPrice &&
        a.highPriceVolume == b.highPriceVolume &&
        a.lowPriceVolume == b.lowPriceVolume;
}

} // namespace


bool LatestPriceStore::updateIfChanged(
    const PricePoint& point
)
{
    std::unique_lock lock(mutex_);

    const auto it =
        prices_.find(point.itemId);

    // First observation.
    if (it == prices_.end())
    {
        prices_.emplace(
            point.itemId,
            point
        );

        return true;
    }

    const bool changed =
        !sameMarketData(
            it->second,
            point
        );

    // Even if market data stayed identical,
    // keep the latest API timestamp in memory.
    it->second = point;

    return changed;
}


std::optional<PricePoint>
LatestPriceStore::find(
    std::int32_t itemId
) const
{
    std::shared_lock lock(mutex_);

    const auto it =
        prices_.find(itemId);

    if (it == prices_.end())
        return std::nullopt;

    return it->second;
}


std::vector<PricePoint>
LatestPriceStore::all() const
{
    std::shared_lock lock(mutex_);

    std::vector<PricePoint> points;
    points.reserve(prices_.size());

    for (const auto& [id, point] : prices_)
    {
        points.push_back(point);
    }

    return points;
}


std::size_t LatestPriceStore::size() const
{
    std::shared_lock lock(mutex_);

    return prices_.size();
}