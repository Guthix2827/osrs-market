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
    std::string_view lookback,
    std::chrono::seconds coverage,
    std::chrono::seconds refreshAfter
)
{
    //
    // First: do we have enough historical coverage?
    //
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
        nowTimestamp - coverage.count();

    if (*oldest > requiredStart)
        return true;


    //
    // Second: has this range been refreshed recently?
    //
    const auto lastBackfill =
        repository_.findLastBackfill(
            itemId,
            lookback
        );

    if (!lastBackfill)
        return true;

    return now - *lastBackfill >= refreshAfter;
}

bool BackfillPolicy::hasCoverage(
    std::int32_t itemId,
    std::chrono::seconds coverage
)
{
    const auto oldest =
        repository_.findOldestTimestamp(
            itemId
        );

    if (!oldest)
        return false;

    const auto now =
        std::chrono::system_clock::now();

    const auto nowTimestamp =
        std::chrono::duration_cast<
            std::chrono::seconds
        >(
            now.time_since_epoch()
        ).count();

    const auto requiredStart =
        nowTimestamp - coverage.count();

    return *oldest <= requiredStart;
}