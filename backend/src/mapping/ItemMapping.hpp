#pragma once

#include <cstdint>
#include <optional>
#include <string>

struct ItemMapping
{
    std::int32_t id {};
    std::string name;
    std::string examine;
    std::string icon;
    bool members {};

    std::optional<std::int64_t> lowAlch;
    std::optional<std::int64_t> highAlch;
    std::optional<std::int64_t> value;
    std::optional<std::int64_t> buyLimit;
};