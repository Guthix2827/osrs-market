#pragma once

#include "PricePoint.hpp"

#include <cstdint>
#include <cstddef>
#include <vector>
#include <optional>
#include <chrono>
#include <string_view>

class Database;

class PriceRepository
{
public:
    explicit PriceRepository(Database& database);

    [[nodiscard]]
    bool insert(const PricePoint& point);

    [[nodiscard]]
    std::vector<PricePoint> findLatestPerItem();

    [[nodiscard]]
    std::vector<PricePoint> findHistory(
        std::int32_t itemId,
        std::int64_t fromTimestamp,
        std::int64_t toTimestamp
    );

    [[nodiscard]]
    std::size_t insertMany(
        const std::vector<PricePoint>& points
    );

    [[nodiscard]]
    std::optional<std::int64_t> findOldestTimestamp(
        std::int32_t itemId
    );

    [[nodiscard]]
    std::optional<std::int64_t> findNewestTimestamp(
        std::int32_t itemId
    );

    [[nodiscard]]
    std::optional<std::chrono::system_clock::time_point>
    findLastBackfill(
        std::int32_t itemId,
        std::string_view lookback
    );

    void markBackfillComplete(
        std::int32_t itemId,
        std::string_view lookback
    );

private:
    Database& database_;
};