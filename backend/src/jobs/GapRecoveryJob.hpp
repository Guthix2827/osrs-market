#pragma once

#include "../mapping/MappingStore.hpp"
#include "../prices/PriceRepository.hpp"
#include "PriceBackfillJob.hpp"

class GapRecoveryJob
{
public:
    GapRecoveryJob(
        MappingStore& mappingStore,
        PriceRepository& priceRepository,
        PriceBackfillJob& backfillJob
    );

    void run();

private:
    MappingStore& mappingStore_;
    PriceRepository& priceRepository_;
    PriceBackfillJob& backfillJob_;
};