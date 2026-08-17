#pragma once

#include "TimeseriesResponse.hpp"

#include <cstdint>
#include <string_view>

class TimeseriesClient
{
public:
    [[nodiscard]]
    TimeseriesResponse fetch(
        std::int32_t itemId,
        std::string_view lookback
    ) const;
};