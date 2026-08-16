#pragma once

#include "ItemMapping.hpp"

#include <cstdint>
#include <filesystem>
#include <optional>
#include <shared_mutex>
#include <unordered_map>
#include <vector>

class MappingStore
{
public:
    explicit MappingStore(std::filesystem::path filePath);

    void load();

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
    void persist(
        const std::vector<ItemMapping>& items
    ) const;

    std::filesystem::path filePath_;

    mutable std::shared_mutex mutex_;

    std::unordered_map<
        std::int32_t,
        ItemMapping
    > items_;
};