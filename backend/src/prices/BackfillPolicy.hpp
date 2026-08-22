#pragma once

#include <chrono>
#include <cstdint>
#include <string_view>

class PriceRepository;

class BackfillPolicy
{
public:
    explicit BackfillPolicy(
        PriceRepository& repository
    );

    [[nodiscard]]
    bool needsLookback(
        std::int32_t itemId,
        std::string_view lookback,
        std::chrono::seconds refreshAfter
    );

    [[nodiscard]]
    bool hasCoverage(
        std::int32_t itemId,
        std::chrono::seconds coverage
    );

private:
    PriceRepository& repository_;
};