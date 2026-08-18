#include "MappingClient.hpp"
#include "../utils/Logger.hpp"
#include "../items/TaxExemptItems.hpp"

#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include <stdexcept>
#include <chrono>

namespace
{
constexpr auto MAPPING_URL =
    "https://prices.runescape.wiki/api/v2/osrs/mapping";

constexpr auto USER_AGENT =
    "osrs-market/0.1 (github.com/Guthix2827/osrs-market)";
}

std::vector<ItemMapping> MappingClient::fetchAll() const
{
    using Clock = std::chrono::steady_clock;

    const auto requestStartedAt = Clock::now();

    Logger::info(
        "Requesting mapping from RuneScape Wiki..."
    );

    const auto response = cpr::Get(
        cpr::Url{MAPPING_URL},
        cpr::Header{
            {"User-Agent", USER_AGENT},
            {"Accept", "application/json"}
        },
        cpr::ConnectTimeout{5000},
        cpr::Timeout{15000}
    );

    if (response.error)
    {
        throw std::runtime_error(
            "Mapping request failed: " +
            response.error.message
        );
    }

    if (response.status_code != 200)
    {
        throw std::runtime_error(
            "Mapping request returned HTTP " +
            std::to_string(response.status_code)
        );
    }


    const auto requestFinishedAt = Clock::now();

    Logger::info(
        "Mapping HTTP response: status=",
        response.status_code,
        " bytes=",
        response.text.size(),
        " time=",
        std::chrono::duration_cast<std::chrono::milliseconds>(
            requestFinishedAt - requestStartedAt
        ).count(),
        "ms"
    );

    const auto parseStartedAt = Clock::now();

    const auto json =
        nlohmann::json::parse(response.text);

    const auto parseFinishedAt = Clock::now();

    Logger::info(
        "Mapping JSON parsed in ",
        std::chrono::duration_cast<std::chrono::milliseconds>(
            parseFinishedAt - parseStartedAt
        ).count(),
        "ms"
    );

    std::vector<ItemMapping> items;
    items.reserve(json.size());

    for (const auto& entry : json)
    {
        ItemMapping item;

        item.id = entry.at("id").get<std::int32_t>();
        item.name = entry.at("name").get<std::string>();
        item.examine = entry.value("examine", "");
        item.icon = entry.value("icon", "");
        item.members = entry.value("members", false);

        if(isGeTaxFree(item.id)){
            item.taxFree = true;
        }

        if (entry.contains("lowalch") && !entry["lowalch"].is_null())
            item.lowAlch = entry["lowalch"].get<std::int64_t>();

        if (entry.contains("highalch") && !entry["highalch"].is_null())
            item.highAlch = entry["highalch"].get<std::int64_t>();

        if (entry.contains("value") && !entry["value"].is_null())
            item.value = entry["value"].get<std::int64_t>();

        if (entry.contains("limit") && !entry["limit"].is_null())
            item.buyLimit = entry["limit"].get<std::int64_t>();

        items.push_back(std::move(item));
    }

    return items;
}