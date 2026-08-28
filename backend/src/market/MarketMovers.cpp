#include "MarketMovers.hpp"

#include "../database/Database.hpp"

#include <pqxx/pqxx>

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <vector>
#include <mutex>

namespace
{

std::string orderByFor(
    MarketMoverCategory category
)
{
    switch (category)
    {
        case MarketMoverCategory::Gainers:
            return "change_percent DESC";

        case MarketMoverCategory::Losers:
            return "change_percent ASC";

        case MarketMoverCategory::Volume:
            return "volume DESC";

        case MarketMoverCategory::Value:
            return "traded_value DESC";
    }

    return "change_percent DESC";
}

std::string eligibilityFor(
    MarketMoverCategory category
)
{
    switch (category)
    {
        case MarketMoverCategory::Gainers:
        case MarketMoverCategory::Losers:
            return R"(
                AND cp.current_price >= 100
                AND rp.reference_price >= 100
                AND vt.volume >= 100
                AND vt.traded_value >= 100000
            )";

        case MarketMoverCategory::Volume:
        case MarketMoverCategory::Value:
            return "";
    }

    return "";
}

MarketMoverItem rowToMarketMoverItem(
    const pqxx::row& row
)
{
    return MarketMoverItem{
        .itemId = row["item_id"].as<std::int32_t>(),
        .name = row["name"].as<std::string>(),
        .icon =
            "/icons/" +
            std::to_string(row["item_id"].as<std::int32_t>()) +
            ".png",
        .currentPrice = row["current_price"].as<std::int64_t>(),
        .referencePrice = row["reference_price"].as<std::int64_t>(),
        .change = row["change"].as<std::int64_t>(),
        .changePercent = row["change_percent"].as<double>(),
        .volume = row["volume"].as<std::int64_t>(),
        .tradedValue = row["traded_value"].as<std::int64_t>(),
    };
}

} // namespace

nlohmann::json marketMoverToJson(
    const MarketMoverItem& item
)
{
    return nlohmann::json{
        {"itemId", item.itemId},
        {"name", item.name},
        {"icon", item.icon},
        {"currentPrice", item.currentPrice},
        {"referencePrice", item.referencePrice},
        {"change", item.change},
        {"changePercent", item.changePercent},
        {"volume", item.volume},
        {"tradedValue", item.tradedValue}
    };
}

std::optional<MarketMoverCategory>
parseMarketMoverCategory(
    std::string_view value
)
{
    if (value == "gainers")
        return MarketMoverCategory::Gainers;

    if (value == "losers")
        return MarketMoverCategory::Losers;

    if (value == "volume")
        return MarketMoverCategory::Volume;

    if (value == "value")
        return MarketMoverCategory::Value;

    return std::nullopt;
}

std::optional<MarketMoverRangeConfig>
parseMarketMoverRange(
    std::string_view value
)
{
    if (value == "24h")
    {
        return MarketMoverRangeConfig{
            .value = "24h",
            .seconds = 24LL * 60 * 60
        };
    }

    if (value == "7d")
    {
        return MarketMoverRangeConfig{
            .value = "7d",
            .seconds = 7LL * 24 * 60 * 60
        };
    }

    if (value == "30d")
    {
        return MarketMoverRangeConfig{
            .value = "30d",
            .seconds = 30LL * 24 * 60 * 60
        };
    }

    if (value == "90d")
    {
        return MarketMoverRangeConfig{
            .value = "90d",
            .seconds = 90LL * 24 * 60 * 60
        };
    }

    return std::nullopt;
}

MarketMoversRepository::MarketMoversRepository(
    Database& database
)
    : database_(database)
{
}

MarketMoversResult
MarketMoversRepository::findMovers(
    MarketMoverRangeConfig range,
    MarketMoverCategory category
)
{
    std::lock_guard<std::mutex> lock{
        database_.mutex()
    };

    pqxx::work transaction{
        database_.connection()
    };

    const std::string query =
        R"(
            WITH bounds AS (
                SELECT
                    EXTRACT(
                        EPOCH FROM (
                            date_trunc(
                                'day',
                                NOW() AT TIME ZONE 'UTC'
                            ) AT TIME ZONE 'UTC'
                        )
                    )::BIGINT AS to_timestamp,

                    EXTRACT(
                        EPOCH FROM (
                            date_trunc(
                                'day',
                                NOW() AT TIME ZONE 'UTC'
                            ) AT TIME ZONE 'UTC'
                        )
                    )::BIGINT - $1 AS from_timestamp,

                    CASE
                        WHEN $1 >= 30 * 24 * 60 * 60
                            THEN 3 * 24 * 60 * 60
                        ELSE 6 * 60 * 60
                    END::BIGINT AS reference_window
            ),

            range_events AS (
                SELECT
                    p.item_id,
                    p.timestamp,
                    p.avg_high_price,
                    p.avg_low_price,
                    p.high_price_volume,
                    p.low_price_volume,
                    CASE
                        WHEN p.avg_high_price IS NOT NULL
                         AND p.avg_low_price IS NOT NULL
                         AND p.avg_high_price >= p.avg_low_price
                         AND (
                            (
                                p.avg_high_price -
                                p.avg_low_price
                            )::DOUBLE PRECISION /
                            NULLIF(
                                (
                                    p.avg_high_price +
                                    p.avg_low_price
                                ) / 2.0,
                                0
                            )
                         ) <= 0.20
                            THEN ROUND(
                                (
                                    p.avg_high_price +
                                    p.avg_low_price
                                ) / 2.0
                            )::BIGINT
                        ELSE NULL
                    END AS mid_price
                FROM price_events p
                CROSS JOIN bounds b
                WHERE p.timestamp >= b.from_timestamp
                  AND p.timestamp <= b.to_timestamp
            ),

            boundary_events AS (
                SELECT
                    p.item_id,
                    p.timestamp,
                    CASE
                        WHEN p.avg_high_price IS NOT NULL
                         AND p.avg_low_price IS NOT NULL
                         AND p.avg_high_price >= p.avg_low_price
                         AND (
                            (
                                p.avg_high_price -
                                p.avg_low_price
                            )::DOUBLE PRECISION /
                            NULLIF(
                                (
                                    p.avg_high_price +
                                    p.avg_low_price
                                ) / 2.0,
                                0
                            )
                         ) <= 0.20
                            THEN ROUND(
                                (
                                    p.avg_high_price +
                                    p.avg_low_price
                                ) / 2.0
                            )::BIGINT
                        ELSE NULL
                    END AS mid_price
                FROM price_events p
                CROSS JOIN bounds b
                WHERE (
                    p.timestamp >=
                        b.from_timestamp - b.reference_window
                    AND p.timestamp <=
                        b.from_timestamp + b.reference_window
                ) OR (
                    p.timestamp >=
                        b.to_timestamp - (6 * 60 * 60)
                    AND p.timestamp <= b.to_timestamp
                )
            ),

            reference_prices AS (
                SELECT
                    e.item_id,
                    ROUND(
                        PERCENTILE_CONT(0.5)
                        WITHIN GROUP (
                            ORDER BY e.mid_price
                        )
                    )::BIGINT AS reference_price
                FROM boundary_events e
                CROSS JOIN bounds b
                WHERE e.mid_price IS NOT NULL
                  AND e.timestamp >=
                    b.from_timestamp - b.reference_window
                  AND e.timestamp <=
                    b.from_timestamp + b.reference_window
                GROUP BY e.item_id
                HAVING COUNT(e.mid_price) >= 3
            ),

            current_prices AS (
                SELECT
                    e.item_id,
                    ROUND(
                        PERCENTILE_CONT(0.5)
                        WITHIN GROUP (
                            ORDER BY e.mid_price
                        )
                    )::BIGINT AS current_price
                FROM boundary_events e
                CROSS JOIN bounds b
                WHERE e.mid_price IS NOT NULL
                  AND e.timestamp >=
                    b.to_timestamp - (6 * 60 * 60)
                  AND e.timestamp <= b.to_timestamp
                GROUP BY e.item_id
                HAVING COUNT(e.mid_price) >= 3
            ),

            volume_totals AS (
                SELECT
                    r.item_id,
                    SUM(
                        r.high_price_volume +
                        r.low_price_volume
                    )::BIGINT AS volume,
                    COALESCE(
                        ROUND(
                            SUM(
                                r.mid_price::NUMERIC *
                                (
                                    r.high_price_volume +
                                    r.low_price_volume
                                )
                            )
                        )::BIGINT,
                        0
                    ) AS traded_value
                FROM range_events r
                WHERE r.mid_price IS NOT NULL
                GROUP BY r.item_id
            ),

            movers AS (
                SELECT
                    i.id AS item_id,
                    ir.name,
                    cp.current_price,
                    rp.reference_price,
                    (
                        cp.current_price -
                        rp.reference_price
                    )::BIGINT AS change,
                    (
                        (
                            cp.current_price -
                            rp.reference_price
                        )::DOUBLE PRECISION /
                        NULLIF(
                            rp.reference_price,
                            0
                        )::DOUBLE PRECISION
                    ) * 100.0 AS change_percent,
                    vt.volume,
                    vt.traded_value
                FROM items i
                JOIN item_revisions ir
                    ON ir.id = i.current_revision_id
                JOIN current_prices cp
                    ON cp.item_id = i.id
                JOIN reference_prices rp
                    ON rp.item_id = i.id
                JOIN volume_totals vt
                    ON vt.item_id = i.id
                WHERE cp.current_price IS NOT NULL
                  AND rp.reference_price IS NOT NULL
                  AND rp.reference_price > 0
                  AND vt.volume > 0
)" + eligibilityFor(category) + R"(
            )

            SELECT
                item_id,
                name,
                current_price,
                reference_price,
                change,
                change_percent,
                volume,
                traded_value
            FROM movers
            ORDER BY )" + orderByFor(category) + R"(
            LIMIT 30
        )";

    const auto result =
        transaction.exec(
            query,
            pqxx::params{
                range.seconds
            }
        );

    std::int64_t generatedAt =
        transaction
            .exec(
                R"(
                    SELECT
                        EXTRACT(
                            EPOCH FROM (
                                date_trunc(
                                    'day',
                                    NOW() AT TIME ZONE 'UTC'
                                ) AT TIME ZONE 'UTC'
                            )
                        )::BIGINT
                )"
            )[0][0]
            .as<std::int64_t>();

    std::vector<MarketMoverItem> items;
    items.reserve(result.size());

    for (const auto& row : result)
    {
        items.push_back(
            rowToMarketMoverItem(row)
        );
    }

    transaction.commit();

    return MarketMoversResult{
        .generatedAt = generatedAt,
        .items = std::move(items)
    };
}