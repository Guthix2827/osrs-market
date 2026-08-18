#pragma once

#include <cstdint>
#include <unordered_set>

inline const std::unordered_set<std::int32_t> TAX_EXEMPT_ITEM_IDS{
    13190,  // Old school bond

    3008,   // Energy potion(4)
    3010,   // Energy potion(3)
    3012,   // Energy potion(2)
    3014,   // Energy potion(1)

    882,    // Bronze arrow
    806,    // Bronze dart
    884,    // Iron arrow
    807,    // Iron dart
    558,    // Mind rune
    886,    // Steel arrow
    808,    // Steel dart

    365,    // Bass
    2309,   // Bread
    1891,   // Cake
    2140,   // Cooked chicken
    2142,   // Cooked meat
    347,    // Herring
    379,    // Lobster
    355,    // Mackerel
    2327,   // Meat pie
    351,    // Pike
    329,    // Salmon
    315,    // Shrimps
    361,    // Tuna

    3853,   // Games necklace(8)
    2552,   // Ring of dueling(8)

    1755,   // Chisel
    5325,   // Gardening trowel
    1785,   // Glassblowing pipe
    2347,   // Hammer
    1733,   // Needle
    233,    // Pestle and mortar
    5341,   // Rake
    8794,   // Saw
    5329,   // Secateurs
    5343,   // Seed dibber
    1735,   // Shears
    952,    // Spade
    5331,   // Watering can

    28824,  // Civitas illa fortis teleport

    //poison applied on items
    883,    // Bronze arrow(p)
    5616,   // Bronze arrow(p+)
    5622,   // Bronze arrow(p++)
    812,    // Bronze dart(p)
    5628,   // Bronze dart(p+)
    5635,   // Bronze dart(p++)
    885,    // Iron arrow(p)
    5617,   // Iron arrow(p+)
    5623,   // Iron arrow(p++)
    5629,   // Iron dart(p+)
    5636,   // Iron dart(p++)
    887,    // Steel arrow(p)
    5618,   // Steel arrow(p+)
    5624,   // Steel arrow(p++)
    814,    // Steel dart(p)
    5630,   // Steel dart(p+)
    5637,   // Steel dart(p++)
};

inline bool isGeTaxFree(std::int32_t itemId)
{
    return TAX_EXEMPT_ITEM_IDS.contains(itemId);
}