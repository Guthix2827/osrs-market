#pragma once

#include "PricePoint.hpp"

#include <vector>

class FiveMinutePriceClient
{
public:
    [[nodiscard]]
    std::vector<PricePoint> fetchAll() const;
};