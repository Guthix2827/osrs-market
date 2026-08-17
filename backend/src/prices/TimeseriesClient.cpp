#include "TimeseriesClient.hpp"

#include "../utils/Logger.hpp"

#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>

namespace
{

constexpr auto TIMESERIES_URL =
    "https://prices.runescape.wiki/api/v2/osrs/timeseries";

constexpr auto USER_AGENT =
    "osrs-market/0.1 (github.com/Guthix2827/osrs-market)";

std::optional<std::int64_t> getOptionalInt64(
    const nlohmann::json& object,
    const char* key
)
{
    if (!object.contains(key) || object[key].is_null())
        return std::nullopt;

    return object[key].get<std::int64_t>();
}

bool supportedLookback(
    std::string_view lookback
)
{
    return lookback == "24h" ||
           lookback == "7d" ||
           lookback == "1y";
}

} // namespace


TimeseriesResponse TimeseriesClient::fetch(
    std::int32_t itemId,
    std::string_view lookback
) const
{
    if (!supportedLookback(lookback))
    {
        throw std::invalid_argument(
            "Unsupported timeseries lookback"
        );
    }

    Logger::info(
        "Requesting timeseries: item=",
        itemId,
        " lookback=",
        lookback
    );

    const auto startedAt =
        std::chrono::steady_clock::now();

    const auto response = cpr::Get(
        cpr::Url{TIMESERIES_URL},
        cpr::Parameters{
            {"id", std::to_string(itemId)},
            {"lookback", std::string(lookback)}
        },
        cpr::Header{
            {"User-Agent", USER_AGENT},
            {"Accept", "application/json"}
        },
        cpr::ConnectTimeout{5000},
        cpr::Timeout{15000}
    );

    const auto finishedAt =
        std::chrono::steady_clock::now();

    const auto duration =
        std::chrono::duration_cast<
            std::chrono::milliseconds
        >(
            finishedAt - startedAt
        );

    if (response.error)
    {
        throw std::runtime_error(
            "Timeseries request failed: " +
            response.error.message
        );
    }

    if (response.status_code != 200)
    {
        throw std::runtime_error(
            "Timeseries request returned HTTP " +
            std::to_string(response.status_code)
        );
    }

    const auto json =
        nlohmann::json::parse(response.text);

    if (!json.contains("data") ||
        !json["data"].is_array())
    {
        throw std::runtime_error(
            "Invalid timeseries response: missing data array"
        );
    }

    TimeseriesResponse result;

    result.itemId = itemId;
    result.startTimestamp =
        json.at("startTimestamp").get<std::int64_t>();

    result.endTimestamp =
        json.at("endTimestamp").get<std::int64_t>();

    result.timestep =
        json.at("timestep").get<std::int64_t>();

    const auto& data =
        json["data"];

    result.points.reserve(
        data.size()
    );

    for (std::size_t i = 0;
         i < data.size();
         ++i)
    {
        const auto& entry =
            data[i];

        PricePoint point;

        point.itemId =
            itemId;

        point.timestamp =
            result.startTimestamp +
            static_cast<std::int64_t>(i) *
            result.timestep;

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

        result.points.push_back(
            std::move(point)
        );
    }

    Logger::info(
        "Timeseries received: item=",
        itemId,
        " lookback=",
        lookback,
        " points=",
        result.points.size(),
        " timestep=",
        result.timestep,
        " time=",
        duration.count(),
        "ms"
    );

    return result;
}