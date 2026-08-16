#include "MappingStore.hpp"

#include <fstream>
#include <mutex>
#include <nlohmann/json.hpp>
#include <stdexcept>
#include <utility>

namespace
{

nlohmann::json toJson(const ItemMapping& item)
{
    nlohmann::json json{
        {"id", item.id},
        {"name", item.name},
        {"examine", item.examine},
        {"icon", item.icon},
        {"members", item.members}
    };

    json["lowalch"] = item.lowAlch
        ? nlohmann::json(*item.lowAlch)
        : nlohmann::json(nullptr);

    json["highalch"] = item.highAlch
        ? nlohmann::json(*item.highAlch)
        : nlohmann::json(nullptr);

    json["value"] = item.value
        ? nlohmann::json(*item.value)
        : nlohmann::json(nullptr);

    json["limit"] = item.buyLimit
        ? nlohmann::json(*item.buyLimit)
        : nlohmann::json(nullptr);

    return json;
}

ItemMapping fromJson(const nlohmann::json& json)
{
    ItemMapping item;

    item.id = json.at("id").get<std::int32_t>();
    item.name = json.at("name").get<std::string>();
    item.examine = json.value("examine", "");
    item.icon = json.value("icon", "");
    item.members = json.value("members", false);

    if (json.contains("lowalch") && !json["lowalch"].is_null())
        item.lowAlch = json["lowalch"].get<std::int64_t>();

    if (json.contains("highalch") && !json["highalch"].is_null())
        item.highAlch = json["highalch"].get<std::int64_t>();

    if (json.contains("value") && !json["value"].is_null())
        item.value = json["value"].get<std::int64_t>();

    if (json.contains("limit") && !json["limit"].is_null())
        item.buyLimit = json["limit"].get<std::int64_t>();

    return item;
}

} // namespace


MappingStore::MappingStore(std::filesystem::path filePath)
    : filePath_(std::move(filePath))
{
}


void MappingStore::load()
{
    if (!std::filesystem::exists(filePath_))
        return;

    std::ifstream file(filePath_);

    if (!file)
        throw std::runtime_error(
            "Could not open mapping cache"
        );

    const auto json = nlohmann::json::parse(file);

    std::unordered_map<std::int32_t, ItemMapping> loaded;
    loaded.reserve(json.size());

    for (const auto& entry : json)
    {
        auto item = fromJson(entry);
        loaded.emplace(item.id, std::move(item));
    }

    std::unique_lock lock(mutex_);
    items_ = std::move(loaded);
}


void MappingStore::replace(
    const std::vector<ItemMapping>& items
)
{
    // Persist first. If writing fails, we keep the old
    // in-memory mapping rather than replacing it.
    persist(items);

    std::unordered_map<std::int32_t, ItemMapping> newItems;
    newItems.reserve(items.size());

    for (const auto& item : items)
        newItems.emplace(item.id, item);

    std::unique_lock lock(mutex_);
    items_ = std::move(newItems);
}


std::optional<ItemMapping> MappingStore::find(
    std::int32_t id
) const
{
    std::shared_lock lock(mutex_);

    const auto it = items_.find(id);

    if (it == items_.end())
        return std::nullopt;

    return it->second;
}


std::vector<ItemMapping> MappingStore::all() const
{
    std::shared_lock lock(mutex_);

    std::vector<ItemMapping> result;
    result.reserve(items_.size());

    for (const auto& [id, item] : items_)
        result.push_back(item);

    return result;
}


std::size_t MappingStore::size() const
{
    std::shared_lock lock(mutex_);
    return items_.size();
}


void MappingStore::persist(
    const std::vector<ItemMapping>& items
) const
{
    nlohmann::json json = nlohmann::json::array();

    for (const auto& item : items)
        json.push_back(toJson(item));

    std::filesystem::create_directories(
        filePath_.parent_path()
    );

    const auto tempPath =
        std::filesystem::path{
            filePath_.string() + ".tmp"
        };

    {
        std::ofstream file(tempPath);

        if (!file)
            throw std::runtime_error(
                "Could not write mapping cache"
            );

        file << json.dump();

        if (!file)
            throw std::runtime_error(
                "Failed while writing mapping cache"
            );
    }

    std::filesystem::rename(
        tempPath,
        filePath_
    );
}