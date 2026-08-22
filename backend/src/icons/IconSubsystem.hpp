#pragma once

#include "IconDownloader.hpp"

#include "../jobs/IconDownloadJob.hpp"
#include "../jobs/IconDownloadWorker.hpp"
#include "../jobs/JobQueue.hpp"

#include <filesystem>

class IconSubsystem
{
public:
    explicit IconSubsystem(
        std::filesystem::path iconDirectory
    );

    void start();

    [[nodiscard]]
    JobQueue<IconDownloadJob>& queue();

    [[nodiscard]]
    IconDownloader& downloader();

private:
    JobQueue<IconDownloadJob> queue_;
    IconDownloader downloader_;
    IconDownloadWorker worker_;
};