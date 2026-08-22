#include "IconSubsystem.hpp"

#include "../utils/Logger.hpp"

#include <thread>
#include <utility>

IconSubsystem::IconSubsystem(
    std::filesystem::path iconDirectory
)
    : downloader_{
          std::move(iconDirectory)
      },
      worker_{
          queue_,
          downloader_
      }
{
}

void IconSubsystem::start()
{
    std::thread iconThread{
        [this]
        {
            worker_.run();
        }
    };

    iconThread.detach();

    Logger::info(
        "Icon download worker launched"
    );
}

JobQueue<IconDownloadJob>& IconSubsystem::queue()
{
    return queue_;
}

IconDownloader& IconSubsystem::downloader()
{
    return downloader_;
}