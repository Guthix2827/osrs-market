#include "BackfillPolicy.hpp"

#include "PriceRepository.hpp"

BackfillPolicy::BackfillPolicy(
    PriceRepository& repository
)
    : repository_(repository)
{
}

bool BackfillPolicy::needsLookback(
    std::int32_t itemId,
    std::chrono::seconds lookback
)
{
    const auto oldest =
        repository_.findOldestTimestamp(
            itemId
        );

    if (!oldest)
        return true;

    const auto now =
        std::chrono::system_clock::now();

    const auto nowTimestamp =
        std::chrono::duration_cast<
            std::chrono::seconds
        >(
            now.time_since_epoch()
        ).count();

    const auto requiredStart =
        nowTimestamp - lookback.count();

    return *oldest > requiredStart;
}