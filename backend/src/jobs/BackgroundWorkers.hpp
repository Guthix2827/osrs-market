#pragma once

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