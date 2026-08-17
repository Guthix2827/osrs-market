#pragma once

#include <cstdint>
#include <string>

struct PriceBackfillRequest
{
    std::int32_t itemId {};
    std::string lookback;
};