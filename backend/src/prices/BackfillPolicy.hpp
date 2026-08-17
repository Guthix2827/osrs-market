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
        std::chrono::seconds coverage,
        std::chrono::seconds refreshAfter
    );

private:
    PriceRepository& repository_;
};