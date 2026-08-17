#pragma once

#include "PricePoint.hpp"

#include <cstdint>
#include <vector>

struct TimeseriesResponse
{
    std::int32_t itemId {};
    std::int64_t startTimestamp {};
    std::int64_t endTimestamp {};
    std::int64_t timestep {};

    std::vector<PricePoint> points;
};