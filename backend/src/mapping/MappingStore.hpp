#pragma once

#include "ItemMapping.hpp"

#include <cstdint>
#include <optional>
#include <shared_mutex>
#include <unordered_map>
#include <vector>

class MappingStore
{
public:
    void replace(
        const std::vector<ItemMapping>& items
    );

    [[nodiscard]]
    std::optional<ItemMapping> find(
        std::int32_t id
    ) const;

    [[nodiscard]]
    std::vector<ItemMapping> all() const;

    [[nodiscard]]
    std::size_t size() const;

private:
    mutable std::shared_mutex mutex_;

    std::unordered_map<
        std::int32_t,
        ItemMapping
    > items_;
};