#include "MappingRefreshJob.hpp"

#include "../icons/IconDownloader.hpp"
#include "../mapping/MappingClient.hpp"
#include "../mapping/MappingStore.hpp"

#include <iostream>

MappingRefreshJob::MappingRefreshJob(
    MappingClient& client,
    MappingStore& store,
    JobQueue<IconDownloadJob>& iconQueue,
    IconDownloader& iconDownloader
)
    : client_(client),
      store_(store),
      iconQueue_(iconQueue),
      iconDownloader_(iconDownloader)
{
}

void MappingRefreshJob::execute()
{
    try
    {
        std::cout
            << "Refreshing OSRS item mapping...\n";

        const auto items =
            client_.fetchAll();

        store_.replace(items);

        std::size_t queuedIcons = 0;

        for (const auto& item : items)
        {
            if (item.icon.empty())
                continue;

            if (iconDownloader_.exists(item.id))
                continue;

            iconQueue_.push(
                IconDownloadJob{
                    .itemId = item.id,
                    .filename = item.icon
                }
            );

            ++queuedIcons;
        }

        std::cout
            << "Mapping refreshed: "
            << items.size()
            << " items\n";

        std::cout
            << "Queued "
            << queuedIcons
            << " missing icons\n";
    }
    catch (const std::exception& e)
    {
        std::cerr
            << "Mapping refresh failed: "
            << e.what()
            << '\n';
    }
}