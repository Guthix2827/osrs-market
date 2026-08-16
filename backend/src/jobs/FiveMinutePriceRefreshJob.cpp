#include "FiveMinutePriceRefreshJob.hpp"

#include "../items/ItemFilter.hpp"
#include "../prices/FiveMinutePriceClient.hpp"
#include "../prices/LatestPriceStore.hpp"
#include "../prices/PriceRepository.hpp"

#include <cstddef>
#include <exception>
#include <iostream>

FiveMinutePriceRefreshJob::FiveMinutePriceRefreshJob(
    FiveMinutePriceClient& client,
    LatestPriceStore& latestPriceStore,
    PriceRepository& priceRepository
)
    : client_(client),
      latestPriceStore_(latestPriceStore),
      priceRepository_(priceRepository)
{
}

void FiveMinutePriceRefreshJob::execute()
{
    try
    {
        const auto points =
            client_.fetchAll();

        std::size_t included = 0;
        std::size_t changed = 0;
        std::size_t inserted = 0;

        for (const auto& point : points)
        {
            if (!ItemFilter::shouldInclude(
                    point.itemId
                ))
            {
                continue;
            }

            ++included;

            if (!latestPriceStore_.updateIfChanged(
                    point
                ))
            {
                continue;
            }

            ++changed;

            if (priceRepository_.insert(point))
                ++inserted;
        }

        std::cout
            << "5m refresh:"
            << " fetched=" << points.size()
            << " included=" << included
            << " changed=" << changed
            << " inserted=" << inserted
            << '\n';
    }
    catch (const std::exception& e)
    {
        std::cerr
            << "5m refresh failed: "
            << e.what()
            << '\n';
    }
}