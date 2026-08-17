#pragma once

#include "../mapping/MappingStore.hpp"
#include "../prices/BackfillPolicy.hpp"
#include "PriceBackfillJob.hpp"

#include <chrono>
#include <cstddef>

class FullHistoryBackfillJob
{
public:
    FullHistoryBackfillJob(
        MappingStore& mappingStore,
        PriceBackfillJob& backfillJob,
        BackfillPolicy& backfillPolicy
    );

    void run();

private:
    MappingStore& mappingStore_;
    PriceBackfillJob& backfillJob_;
    BackfillPolicy& backfillPolicy_;
};