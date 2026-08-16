#include "FiveMinutePriceClient.hpp"

#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

namespace
{

constexpr auto FIVE_MINUTE_URL =
    "https://prices.runescape.wiki/api/v2/osrs/5m";

constexpr auto USER_AGENT =
    "osrs-market-alpha/0.1";

std::optional<std::int64_t> getOptionalInt64(
    const nlohmann::json& object,
    const char* key
)
{
    if (!object.contains(key) || object[key].is_null())
        return std::nullopt;

    return object[key].get<std::int64_t>();
}

} // namespace


std::vector<PricePoint>
FiveMinutePriceClient::fetchAll() const
{
    const auto response = cpr::Get(
        cpr::Url{FIVE_MINUTE_URL},
        cpr::Header{
            {"User-Agent", USER_AGENT},
            {"Accept", "application/json"}
        },
        cpr::Timeout{15000}
    );

    if (response.error)
    {
        throw std::runtime_error(
            "5m price request failed: " +
            response.error.message
        );
    }

    if (response.status_code != 200)
    {
        throw std::runtime_error(
            "5m price request returned HTTP " +
            std::to_string(response.status_code)
        );
    }

    const auto json =
        nlohmann::json::parse(response.text);

    if (!json.contains("data") ||
        !json["data"].is_object())
    {
        throw std::runtime_error(
            "Invalid 5m API response: missing data object"
        );
    }

    if (!json.contains("timestamp"))
    {
        throw std::runtime_error(
            "Invalid 5m API response: missing timestamp"
        );
    }

    const auto timestamp =
        json["timestamp"].get<std::int64_t>();

    const auto& data = json["data"];

    std::vector<PricePoint> points;
    points.reserve(data.size());

    for (auto it = data.begin();
         it != data.end();
         ++it)
    {
        const auto itemId =
            std::stoi(it.key());

        const auto& entry =
            it.value();

        PricePoint point;

        point.itemId = itemId;
        point.timestamp = timestamp;

        point.avgHighPrice =
            getOptionalInt64(
                entry,
                "avgHighPrice"
            );

        point.avgLowPrice =
            getOptionalInt64(
                entry,
                "avgLowPrice"
            );

        point.highPriceVolume =
            entry.value(
                "highPriceVolume",
                std::int64_t{0}
            );

        point.lowPriceVolume =
            entry.value(
                "lowPriceVolume",
                std::int64_t{0}
            );

        points.push_back(
            std::move(point)
        );
    }

    return points;
}