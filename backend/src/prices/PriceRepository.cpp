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