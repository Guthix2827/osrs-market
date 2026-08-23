#include "MarketMoversRefreshJob.hpp"

#include "../market/MarketMoversService.hpp"
#include "../utils/Logger.hpp"

#include <exception>

MarketMoversRefreshJob::MarketMoversRefreshJob(
    MarketMoversService& service
)
    : service_(service)
{
}

void MarketMoversRefreshJob::execute()
{
    try
    {
        service_.refreshAll();
    }
    catch (const std::exception& e)
    {
        Logger::error(
            "Market movers refresh failed: ",
            e.what()
        );
    }
}