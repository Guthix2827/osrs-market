#pragma once

#include "IconDownloadJob.hpp"
#include "JobQueue.hpp"

#include "../icons/IconDownloader.hpp"

#include <iostream>

class IconDownloadWorker
{
public:
    IconDownloadWorker(
        JobQueue<IconDownloadJob>& queue,
        IconDownloader& downloader
    )
        : queue_(queue),
          downloader_(downloader)
    {
    }

    void run()
    {
        while (true)
        {
            auto job = queue_.pop();

            if (!job)
                break;

            try
            {
                downloader_.download(*job);
            }
            catch (const std::exception& e)
            {
                std::cerr
                    << "Icon worker error for item "
                    << job->itemId
                    << ": "
                    << e.what()
                    << '\n';
            }
        }
    }

private:
    JobQueue<IconDownloadJob>& queue_;
    IconDownloader& downloader_;
};