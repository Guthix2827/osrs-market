#pragma once

#include <cstdint>
#include <optional>
#include <string_view>

enum class HistoryRange
{
    Hours24,
    Days7,
    Month1,
    Year1
};

struct HistoryRangeConfig
{
    HistoryRange range;
    std::int64_t seconds;
};

inline std::optional<HistoryRangeConfig>
parseHistoryRange(std::string_view value)
{
    if (value == "24h")
    {
        return HistoryRangeConfig{
            HistoryRange::Hours24,
            24LL * 60 * 60
        };
    }

    if (value == "7d")
    {
        return HistoryRangeConfig{
            HistoryRange::Days7,
            7LL * 24 * 60 * 60
        };
    }

    if (value == "30d")
    {
        return HistoryRangeConfig{
            HistoryRange::Month1,
            30LL * 24 * 60 * 60
        };
    }

    if (value == "1y")
    {
        return HistoryRangeConfig{
            HistoryRange::Year1,
            365LL * 24 * 60 * 60
        };
    }

    return std::nullopt;
}