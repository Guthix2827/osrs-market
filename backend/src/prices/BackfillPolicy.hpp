#pragma once

#include <chrono>
#include <cstdint>

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
        std::chrono::seconds lookback
    );

private:
    PriceRepository& repository_;
};