#include "MappingRefreshJob.hpp"

#include "../icons/IconDownloader.hpp"
#include "../mapping/MappingClient.hpp"
#include "../mapping/MappingStore.hpp"
#include "../items/ItemRepository.hpp"
#include "../items/ItemFilter.hpp"

#include <iostream>

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
    try
    {
        std::cout
            << "Refreshing OSRS item mapping...\n";

        const auto items =
            client_.fetchAll();

        std::size_t queuedIcons = 0;

        std::vector<ItemMapping> filteredItems;
        filteredItems.reserve(items.size());

        for (const auto& item : items)
        {
            if (!ItemFilter::shouldInclude(item.id))
                continue;
            
            itemRepository_.sync(item);
            filteredItems.push_back(item);

            if (item.icon.empty())
                continue;

            if (!iconDownloader_.shouldDownload(
                    item.id,
                    item.icon
                ))
            {
                continue;
            }

            iconQueue_.push(
                IconDownloadJob{
                    .itemId = item.id,
                    .filename = item.icon
                }
            );

            ++queuedIcons;
        }

        store_.replace(filteredItems);

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