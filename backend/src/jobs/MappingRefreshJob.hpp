#pragma once

#include "IconDownloadJob.hpp"
#include "JobQueue.hpp"

class MappingClient;
class MappingStore;
class IconDownloader;

class MappingRefreshJob
{
public:
    MappingRefreshJob(
        MappingClient& client,
        MappingStore& store,
        JobQueue<IconDownloadJob>& iconQueue,
        IconDownloader& iconDownloader
    );

    void execute();

private:
    MappingClient& client_;
    MappingStore& store_;

    JobQueue<IconDownloadJob>& iconQueue_;
    IconDownloader& iconDownloader_;
};