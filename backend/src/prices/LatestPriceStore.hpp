#pragma once

#include "PricePoint.hpp"

#include <cstdint>
#include <optional>
#include <shared_mutex>
#include <unordered_map>
#include <vector>

class LatestPriceStore
{
public:
    // Returns true if market values changed.
    // The timestamp is updated even when values stayed the same.
    bool updateIfChanged(
        const PricePoint& point
    );

    [[nodiscard]]
    std::optional<PricePoint> find(
        std::int32_t itemId
    ) const;

    [[nodiscard]]
    std::vector<PricePoint> all() const;

    [[nodiscard]]
    std::size_t size() const;

private:
    mutable std::shared_mutex mutex_;

    std::unordered_map<
        std::int32_t,
        PricePoint
    > prices_;
};