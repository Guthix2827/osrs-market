#include "MappingClient.hpp"

#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

#include <stdexcept>

namespace
{
constexpr auto MAPPING_URL =
    "https://prices.runescape.wiki/api/v2/osrs/mapping";

constexpr auto USER_AGENT =
    "osrs-market-alpha/0.1";
}

std::vector<ItemMapping> MappingClient::fetchAll() const
{
    const auto response = cpr::Get(
        cpr::Url{MAPPING_URL},
        cpr::Header{
            {"User-Agent", USER_AGENT},
            {"Accept", "application/json"}
        },
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

    const auto json = nlohmann::json::parse(response.text);

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