#include "MappingStore.hpp"

#include <mutex>
#include <utility>
#include <algorithm>
#include <cctype>

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

std::vector<ItemMapping> MappingStore::search(
    std::string_view query,
    std::size_t limit
) const
{
    std::shared_lock lock(mutex_);

    std::vector<ItemMapping> results;

    if (query.empty())
        return results;

    std::string normalizedQuery{
        query
    };

    std::transform(
        normalizedQuery.begin(),
        normalizedQuery.end(),
        normalizedQuery.begin(),
        [](unsigned char c)
        {
            return static_cast<char>(
                std::tolower(c)
            );
        }
    );

    // Exact ID match first.
    try
    {
        const auto id =
            std::stoi(
                std::string{query}
            );

        const auto it =
            items_.find(id);

        if (it != items_.end())
        {
            results.push_back(
                it->second
            );

            if (results.size() >= limit)
                return results;
        }
    }
    catch (...)
    {
        // Not an integer query.
    }

    for (const auto& [id, item] : items_)
    {
        if (results.size() >= limit)
            break;

        // Avoid duplicating exact ID result.
        if (
            !results.empty() &&
            results.front().id == item.id
        )
        {
            continue;
        }

        std::string name =
            item.name;

        std::transform(
            name.begin(),
            name.end(),
            name.begin(),
            [](unsigned char c)
            {
                return static_cast<char>(
                    std::tolower(c)
                );
            }
        );

        if (
            name.find(normalizedQuery) !=
            std::string::npos
        )
        {
            results.push_back(
                item
            );
        }
    }

    return results;
}