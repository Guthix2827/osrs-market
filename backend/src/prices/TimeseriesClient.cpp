#include "TimeseriesClient.hpp"

#include "../utils/Logger.hpp"

#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>

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
    if (!object.contains(key) ||
        object.at(key).is_null())
    {
        return std::nullopt;
    }

    if (!object.at(key).is_number_integer())
    {
        throw std::runtime_error(
            std::string{
                "Invalid timeseries point: "
            } + key + " must be an integer or null"
        );
    }

    return object.at(key).get<std::int64_t>();
}

std::int64_t getRequiredInt64(
    const nlohmann::json& object,
    const char* key
)
{
    if (!object.contains(key) ||
        !object.at(key).is_number_integer())
    {
        throw std::runtime_error(
            std::string{
                "Invalid timeseries response: missing or invalid "
            } + key
        );
    }

    return object.at(key).get<std::int64_t>();
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
        cpr::Url{
            TIMESERIES_URL
        },
        cpr::Parameters{
            {
                "id",
                std::to_string(itemId)
            },
            {
                "lookback",
                std::string{lookback}
            }
        },
        cpr::Header{
            {
                "User-Agent",
                USER_AGENT
            },
            {
                "Accept",
                "application/json"
            }
        },
        cpr::ConnectTimeout{
            5000
        },
        cpr::Timeout{
            15000
        }
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

    nlohmann::json json;

    try
    {
        json =
            nlohmann::json::parse(
                response.text
            );
    }
    catch (const nlohmann::json::exception& exception)
    {
        throw std::runtime_error(
            "Invalid timeseries JSON: " +
            std::string{
                exception.what()
            }
        );
    }

    if (!json.is_object())
    {
        throw std::runtime_error(
            "Invalid timeseries response: "
            "expected an object"
        );
    }

    if (!json.contains("data") ||
        !json.at("data").is_array())
    {
        throw std::runtime_error(
            "Invalid timeseries response: "
            "missing data array"
        );
    }

    TimeseriesResponse result;

    result.itemId =
        itemId;

    result.startTimestamp =
        getRequiredInt64(
            json,
            "startTimestamp"
        );

    result.endTimestamp =
        getRequiredInt64(
            json,
            "endTimestamp"
        );

    result.timestep =
        getRequiredInt64(
            json,
            "timestep"
        );

    if (result.startTimestamp >
        result.endTimestamp)
    {
        throw std::runtime_error(
            "Invalid timeseries response: "
            "startTimestamp is after endTimestamp"
        );
    }

    if (result.timestep <= 0)
    {
        throw std::runtime_error(
            "Invalid timeseries response: "
            "timestep must be positive"
        );
    }

    const auto& data =
        json.at("data");

    result.points.reserve(
        data.size()
    );

    for (const auto& entry : data)
    {
        if (!entry.is_object())
        {
            throw std::runtime_error(
                "Invalid timeseries response: "
                "data entry must be an object"
            );
        }

        PricePoint point;

        point.itemId =
            itemId;

        /*
         * The response is sparse. Each entry contains
         * its own timestamp and does not necessarily
         * correspond to:
         *
         * startTimestamp + index * timestep
         */
        point.timestamp =
            getRequiredInt64(
                entry,
                "timestamp"
            );

        if (point.timestamp <
                result.startTimestamp ||
            point.timestamp >
                result.endTimestamp)
        {
            throw std::runtime_error(
                "Invalid timeseries point: "
                "timestamp is outside response range"
            );
        }

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
            getOptionalInt64(
                entry,
                "highPriceVolume"
            ).value_or(0);

        point.lowPriceVolume =
            getOptionalInt64(
                entry,
                "lowPriceVolume"
            ).value_or(0);

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