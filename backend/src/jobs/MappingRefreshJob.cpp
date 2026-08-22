#include "MappingRefreshJob.hpp"

#include "../utils/Logger.hpp"
#include "../icons/IconDownloader.hpp"
#include "../mapping/MappingClient.hpp"
#include "../mapping/MappingStore.hpp"
#include "../items/ItemRepository.hpp"
#include "../items/ItemFilter.hpp"

#include <iostream>
#include <chrono>
#include <cstddef>
#include <vector>

namespace
{
    struct MappingRefreshStats
    {
        std::size_t syncedItems = 0;
        std::size_t queuedIcons = 0;
        std::size_t excludedItems = 0;
    };

    bool queueIconIfMissing(
        const ItemMapping& item,
        IconDownloader& iconDownloader,
        JobQueue<IconDownloadJob>& iconQueue
    )
    {
        if (item.icon.empty())
        {
            return false;
        }

        if (!iconDownloader.shouldDownload(
                item.id,
                item.icon
            ))
        {
            return false;
        }

        iconQueue.push(
            IconDownloadJob{
                .itemId = item.id,
                .filename = item.icon
            }
        );

        return true;
    }
}

MappingRefreshJob::MappingRefreshJob(
    MappingClient& client,
    MappingStore& store,
    JobQueue<IconDownloadJob>& iconQueue,
    IconDownloader& iconDownloader,
    ItemRepository& itemRepository
)
    : client_(client),
      store_(store),
      iconQueue_(iconQueue),
      iconDownloader_(iconDownloader),
      itemRepository_(itemRepository)
{
}

void MappingRefreshJob::execute()
{
    using Clock = std::chrono::steady_clock;

    const auto startedAt = Clock::now();

    try
    {
        Logger::info(
            "Refreshing OSRS item mapping..."
        );

        const auto fetchStartedAt = Clock::now();

        const auto items =
            client_.fetchAll();

        const auto fetchFinishedAt = Clock::now();

        const auto fetchDuration =
            std::chrono::duration_cast<std::chrono::milliseconds>(
                fetchFinishedAt - fetchStartedAt
            );

        Logger::info(
            "Mapping fetched: ",
            items.size(),
            " items in ",
            fetchDuration.count(),
            "ms"
        );

        std::vector<ItemMapping> filteredItems;
        filteredItems.reserve(items.size());

        MappingRefreshStats stats;

        const auto syncStartedAt = Clock::now();

        for (const auto& item : items)
        {
            if (!ItemFilter::shouldInclude(item.id))
            {
                ++stats.excludedItems;
                continue;
            }

            itemRepository_.sync(item);

            filteredItems.push_back(item);

            ++stats.syncedItems;

            if (stats.syncedItems % 500 == 0)
            {
                Logger::info(
                    "Mapping sync progress: ",
                    stats.syncedItems,
                    " items processed"
                );
            }

            if (queueIconIfMissing(item, iconDownloader_, iconQueue_))
                ++stats.queuedIcons;
        }

        const auto syncFinishedAt = Clock::now();

        const auto syncDuration =
            std::chrono::duration_cast<std::chrono::milliseconds>(
                syncFinishedAt - syncStartedAt
            );

        store_.replace(filteredItems);

        const auto finishedAt = Clock::now();

        const auto totalDuration =
            std::chrono::duration_cast<std::chrono::milliseconds>(
                finishedAt - startedAt
            );

        Logger::info(
            "Mapping refresh complete: ",
            "fetched=", items.size(),
            " included=", filteredItems.size(),
            " excluded=", stats.excludedItems,
            " iconsQueued=", stats.queuedIcons,
            " fetchTime=", fetchDuration.count(), "ms",
            " syncTime=", syncDuration.count(), "ms",
            " totalTime=", totalDuration.count(), "ms"
        );
    }
    catch (const std::exception& e)
    {
        const auto finishedAt = Clock::now();

        const auto duration =
            std::chrono::duration_cast<std::chrono::milliseconds>(
                finishedAt - startedAt
            );

        Logger::error(
            "Mapping refresh failed after ",
            duration.count(),
            "ms: ",
            e.what()
        );
    }
}