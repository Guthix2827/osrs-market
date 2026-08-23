#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <vector>
#include <nlohmann/json.hpp>

class Database;

enum class MarketMoverCategory
{
    Gainers,
    Losers,
    Volume,
    Value
};

struct MarketMoverRangeConfig
{
    std::string_view value;
    std::int64_t seconds;
};

struct MarketMoverItem
{
    std::int32_t itemId;
    std::string name;
    std::string icon;

    std::int64_t currentPrice;
    std::int64_t referencePrice;
    std::int64_t change;
    double changePercent;
    std::int64_t volume;
    std::int64_t tradedValue;
};

struct MarketMoversResult
{
    std::int64_t generatedAt;
    std::vector<MarketMoverItem> items;
};

std::optional<MarketMoverCategory>
parseMarketMoverCategory(
    std::string_view value
);

std::optional<MarketMoverRangeConfig>
parseMarketMoverRange(
    std::string_view value
);

nlohmann::json marketMoverToJson(
    const MarketMoverItem& item
);

class MarketMoversRepository
{
public:
    explicit MarketMoversRepository(
        Database& database
    );

    [[nodiscard]]
    MarketMoversResult findMovers(
        MarketMoverRangeConfig range,
        MarketMoverCategory category
    );

private:
    Database& database_;
};