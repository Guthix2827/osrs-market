#include "utils/Price.hpp"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <optional>
#include <vector>

namespace
{
    constexpr double MAX_DEVIATION = 0.5;
    constexpr std::size_t WINDOW_RADIUS = 48;
    constexpr std::size_t MIN_NEIGHBOURS = 6;

    template <typename PriceGetter>
    std::vector<bool> findOutliers(
        const std::vector<PricePoint>& points,
        PriceGetter getPrice
    )
    {
        std::vector<bool> outliers( points.size(), false );

        for (std::size_t i = 0; i < points.size(); ++i)
        {
            const auto current = getPrice(points[i]);

            if (!current || *current <= 0) continue;

            const auto begin = i > WINDOW_RADIUS ? i - WINDOW_RADIUS : 0;
            const auto end = std::min( points.size(), i + WINDOW_RADIUS + 1 );

            std::vector<std::int64_t> neighbours;
            neighbours.reserve(end - begin - 1);

            for (std::size_t j = begin; j < end; ++j)
            {
                if (j == i) continue;
                const auto price = getPrice(points[j]);
                if (price && *price > 0){
                    neighbours.push_back(*price);
                }
            }

            if (neighbours.size() < MIN_NEIGHBOURS) continue;

            const auto middle = neighbours.begin() + static_cast<std::ptrdiff_t>( neighbours.size() / 2 );
            std::nth_element(neighbours.begin(), middle, neighbours.end());
            double median = static_cast<double>(*middle);

            if (neighbours.size() % 2 == 0)
            {
                const auto lower = std::max_element( neighbours.begin(), middle );
                median = ( static_cast<double>(*lower) + median ) / 2.0;
            }
            const double deviation = std::abs( static_cast<double>(*current) - median ) / median;
            outliers[i] = median > 0.0 && deviation > MAX_DEVIATION;
        }

        return outliers;
    }
}

void filterPriceOutliers( std::vector<PricePoint>& points )
{
    const auto highOutliers = findOutliers(
        points,
        [](const PricePoint& point)
        {
            return point.avgHighPrice;
        }
    );

    const auto lowOutliers = findOutliers(
        points,
        [](const PricePoint& point)
        {
            return point.avgLowPrice;
        }
    );

    for (
        std::size_t i = 0;
        i < points.size();
        ++i
    )
    {
        if (highOutliers[i])
        {
            points[i].avgHighPrice =
                std::nullopt;
        }

        if (lowOutliers[i])
        {
            points[i].avgLowPrice =
                std::nullopt;
        }
    }
}