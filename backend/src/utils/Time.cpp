#include "Time.hpp"

#include <chrono>

namespace
{

std::int64_t currentUnixTimestamp()
{
    return std::chrono::duration_cast<
        std::chrono::seconds
    >(
        std::chrono::system_clock::now()
            .time_since_epoch()
    ).count();
}

} // namespace

std::int64_t currentUtcMidnightTimestamp()
{
    constexpr std::int64_t daySeconds =
        24LL * 60 * 60;

    const auto nowSeconds =
        currentUnixTimestamp();

    return (
        nowSeconds / daySeconds
    ) * daySeconds;
}

std::int64_t secondsUntilNextUtcMidnight()
{
    const auto nowSeconds =
        currentUnixTimestamp();

    constexpr std::int64_t daySeconds =
        24LL * 60 * 60;

    const auto nextMidnight =
        (
            (nowSeconds / daySeconds) + 1
        ) * daySeconds;

    return nextMidnight - nowSeconds;
}