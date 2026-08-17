#include "ItemActivityTracker.hpp"

void ItemActivityTracker::recordView(
    std::int32_t itemId
)
{
    std::lock_guard lock(mutex_);

    lastViewed_[itemId] =
        Clock::now();
}


std::vector<std::int32_t>
ItemActivityTracker::recentlyViewed(
    std::chrono::seconds maxAge
) const
{
    const auto now =
        Clock::now();

    std::vector<std::int32_t> result;

    std::lock_guard lock(mutex_);

    result.reserve(
        lastViewed_.size()
    );

    for (const auto& [itemId, viewedAt] :
         lastViewed_)
    {
        if (now - viewedAt <= maxAge)
        {
            result.push_back(
                itemId
            );
        }
    }

    return result;
}