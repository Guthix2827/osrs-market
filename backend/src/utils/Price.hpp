#pragma once

#include "prices/PricePoint.hpp"

#include <vector>

void filterPriceOutliers(
    std::vector<PricePoint>& points
);