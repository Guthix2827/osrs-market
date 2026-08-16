#pragma once

#include "ItemMapping.hpp"

#include <vector>

class MappingClient
{
public:
    [[nodiscard]]
    std::vector<ItemMapping> fetchAll() const;
};