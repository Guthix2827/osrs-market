#pragma once

#include "../mapping/ItemMapping.hpp"

#include <cstdint>
#include <optional>

class Database;

class ItemRepository
{
public:
    explicit ItemRepository(Database& database);

    void sync(const ItemMapping& item);

    [[nodiscard]]
    std::optional<ItemMapping> findCurrent(
        std::int32_t itemId
    );

private:
    Database& database_;
};