#include "ItemFilter.hpp"

#include <unordered_set>

bool ItemFilter::shouldInclude(std::int32_t itemId)
{
    static const std::unordered_set<std::int32_t> excludedIds{
        28220, //Crystal 2h axe
        28223, //Crystal 2h axe (inactive)
        33431, //Trinket of vengeance (1)
        33428, //Trinket of vengeance (2)
    };

    return !excludedIds.contains(itemId);
}