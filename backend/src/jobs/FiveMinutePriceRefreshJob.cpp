#include "FiveMinutePriceRefreshJob.hpp"

#include "../utils/Logger.hpp"
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

        Logger::info(
            "Fetching latest 5m prices..."
        );

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

        Logger::info(
            "5m price refresh complete: ",
            "fetched=", points.size(),
            " included=", included,
            " changed=", changed,
            " inserted=", inserted
        );
    }
    catch (const std::exception& e)
    {
        Logger::error(
            "5m price refresh failed: ",
            e.what()
        );
    }
}