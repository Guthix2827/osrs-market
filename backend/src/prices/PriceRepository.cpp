#include "PriceRepository.hpp"

#include "../database/Database.hpp"

#include <pqxx/pqxx>
#include <optional>
#include <vector>

PriceRepository::PriceRepository(
    Database& database
)
    : database_(database)
{
}

namespace
{

std::optional<std::int64_t> getOptionalInt64(
    const pqxx::field& field
)
{
    if (field.is_null())
        return std::nullopt;

    return field.as<std::int64_t>();
}

PricePoint rowToPricePoint(
    const pqxx::row& row
)
{
    PricePoint point;

    point.itemId =
        row["item_id"].as<std::int32_t>();

    point.timestamp =
        row["timestamp"].as<std::int64_t>();

    point.avgHighPrice =
        getOptionalInt64(
            row["avg_high_price"]
        );

    point.avgLowPrice =
        getOptionalInt64(
            row["avg_low_price"]
        );

    point.highPriceVolume =
        row["high_price_volume"]
            .as<std::int64_t>();

    point.lowPriceVolume =
        row["low_price_volume"]
            .as<std::int64_t>();

    return point;
}

} // namespace

std::vector<PricePoint>
PriceRepository::findLatestPerItem()
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT DISTINCT ON (item_id)
                    item_id,
                    timestamp,
                    avg_high_price,
                    avg_low_price,
                    high_price_volume,
                    low_price_volume
                FROM price_events
                ORDER BY
                    item_id,
                    timestamp DESC
            )"
        );

    std::vector<PricePoint> points;
    points.reserve(result.size());

    for (const auto& row : result)
    {
        points.push_back(
            rowToPricePoint(row)
        );
    }

    transaction.commit();

    return points;
}

bool PriceRepository::insert(
    const PricePoint& point
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                INSERT INTO price_events
                (
                    item_id,
                    timestamp,
                    avg_high_price,
                    avg_low_price,
                    high_price_volume,
                    low_price_volume
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
                ON CONFLICT (item_id, timestamp)
                DO NOTHING
                RETURNING id
            )",
            pqxx::params{
                point.itemId,
                point.timestamp,
                point.avgHighPrice,
                point.avgLowPrice,
                point.highPriceVolume,
                point.lowPriceVolume
            }
        );

    transaction.commit();

    return !result.empty();
}

std::vector<PricePoint>
PriceRepository::findHistory(
    std::int32_t itemId,
    std::int64_t fromTimestamp,
    std::int64_t toTimestamp
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT
                    item_id,
                    timestamp,
                    avg_high_price,
                    avg_low_price,
                    high_price_volume,
                    low_price_volume
                FROM price_events
                WHERE item_id = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                ORDER BY timestamp ASC
            )",
            pqxx::params{
                itemId,
                fromTimestamp,
                toTimestamp
            }
        );

    std::vector<PricePoint> points;
    points.reserve(result.size());

    for (const auto& row : result)
    {
        points.push_back(
            rowToPricePoint(row)
        );
    }

    transaction.commit();

    return points;
}

std::size_t PriceRepository::insertMany(
    const std::vector<PricePoint>& points
)
{
    if (points.empty())
        return 0;

    pqxx::work transaction{
        database_.connection()
    };

    std::size_t inserted = 0;

    for (const auto& point : points)
    {
        const auto result =
            transaction.exec(
                R"(
                    INSERT INTO price_events
                    (
                        item_id,
                        timestamp,
                        avg_high_price,
                        avg_low_price,
                        high_price_volume,
                        low_price_volume
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6
                    )
                    ON CONFLICT (item_id, timestamp)
                    DO NOTHING
                    RETURNING id
                )",
                pqxx::params{
                    point.itemId,
                    point.timestamp,
                    point.avgHighPrice,
                    point.avgLowPrice,
                    point.highPriceVolume,
                    point.lowPriceVolume
                }
            );

        if (!result.empty())
            ++inserted;
    }

    transaction.commit();

    return inserted;
}

std::optional<std::int64_t>
PriceRepository::findOldestTimestamp(
    std::int32_t itemId
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT MIN(timestamp)
                FROM price_events
                WHERE item_id = $1
            )",
            pqxx::params{
                itemId
            }
        );

    transaction.commit();

    if (
        result.empty() ||
        result[0][0].is_null()
    )
    {
        return std::nullopt;
    }

    return result[0][0]
        .as<std::int64_t>();
}


std::optional<std::int64_t>
PriceRepository::findNewestTimestamp(
    std::int32_t itemId
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT MAX(timestamp)
                FROM price_events
                WHERE item_id = $1
            )",
            pqxx::params{
                itemId
            }
        );

    transaction.commit();

    if (
        result.empty() ||
        result[0][0].is_null()
    )
    {
        return std::nullopt;
    }

    return result[0][0]
        .as<std::int64_t>();
}

std::optional<std::chrono::system_clock::time_point>
PriceRepository::findLastBackfill(
    std::int32_t itemId,
    std::string_view lookback
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT
                    EXTRACT(
                        EPOCH FROM last_completed_at
                    )::BIGINT AS timestamp
                FROM price_backfill_state
                WHERE item_id = $1
                  AND lookback = $2
            )",
            pqxx::params{
                itemId,
                std::string{lookback}
            }
        );

    transaction.commit();

    if (result.empty())
        return std::nullopt;

    const auto timestamp =
        result[0]["timestamp"]
            .as<std::int64_t>();

    return std::chrono::system_clock::time_point{
        std::chrono::seconds{
            timestamp
        }
    };
}


void PriceRepository::markBackfillComplete(
    std::int32_t itemId,
    std::string_view lookback
)
{
    pqxx::work transaction{
        database_.connection()
    };

    transaction.exec(
        R"(
            INSERT INTO price_backfill_state
            (
                item_id,
                lookback,
                last_completed_at
            )
            VALUES
            (
                $1,
                $2,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (item_id, lookback)
            DO UPDATE SET
                last_completed_at =
                    CURRENT_TIMESTAMP
        )",
        pqxx::params{
            itemId,
            std::string{lookback}
        }
    );

    transaction.commit();
}