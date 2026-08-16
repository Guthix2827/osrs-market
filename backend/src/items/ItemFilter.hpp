#pragma once

#include <cstdint>

class ItemFilter
{
public:
    [[nodiscard]]
    static bool shouldInclude(std::int32_t itemId);
};