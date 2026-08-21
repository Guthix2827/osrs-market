#include "utils/Price.hpp"

#include <cmath>
#include <vector>

void filterPriceOutliers(
    std::vector<PricePoint>& points
)
{
    constexpr double MAX_DEVIATION = 0.5;

    std::vector<bool> highOutliers(
        points.size(),
        false
    );

    std::vector<bool> lowOutliers(
        points.size(),
        false
    );

    for (
        std::size_t i = 1;
        i + 1 < points.size();
        ++i
    )
    {
        const auto& current = points[i];
        const auto& previous = points[i - 1];
        const auto& next = points[i + 1];

        if (
            current.avgHighPrice &&
            previous.avgHighPrice &&
            next.avgHighPrice
        )
        {
            const double reference =
                (
                    static_cast<double>(
                        *previous.avgHighPrice
                    ) +
                    static_cast<double>(
                        *next.avgHighPrice
                    )
                ) / 2.0;

            if (reference > 0.0)
            {
                const double deviation =
                    std::abs(
                        static_cast<double>(
                            *current.avgHighPrice
                        ) - reference
                    ) / reference;

                highOutliers[i] =
                    deviation > MAX_DEVIATION;
            }
        }

        if (
            current.avgLowPrice &&
            previous.avgLowPrice &&
            next.avgLowPrice
        )
        {
            const double reference =
                (
                    static_cast<double>(
                        *previous.avgLowPrice
                    ) +
                    static_cast<double>(
                        *next.avgLowPrice
                    )
                ) / 2.0;

            if (reference > 0.0)
            {
                const double deviation =
                    std::abs(
                        static_cast<double>(
                            *current.avgLowPrice
                        ) - reference
                    ) / reference;

                lowOutliers[i] =
                    deviation > MAX_DEVIATION;
            }
        }
    }

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