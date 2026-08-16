#include "MappingStore.hpp"

#include <mutex>
#include <utility>

void MappingStore::replace(
    const std::vector<ItemMapping>& items
)
{
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