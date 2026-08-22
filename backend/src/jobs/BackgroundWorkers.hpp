#pragma once

#include "PriceBackfillJob.hpp"
#include "PriceBackfillRequest.hpp"
#include "JobQueue.hpp"
#include "FiveMinutePriceRefreshJob.hpp"
#include "GapRecoveryJob.hpp"
#include "IconDownloadWorker.hpp"
#include "MappingRefreshJob.hpp"

void startMappingRefreshWorker(
    MappingRefreshJob& mappingJob
);

void startGapRecoveryWorker(
    GapRecoveryJob& gapRecoveryJob
);

void startPriceRefreshWorker(
    FiveMinutePriceRefreshJob& priceRefreshJob
);

void startPriceBackfillWorker(
    JobQueue<PriceBackfillRequest>& backfillQueue,
    PriceBackfillJob& backfillJob
);