#include "ItemFilter.hpp"

#include <unordered_set>

bool ItemFilter::shouldInclude(std::int32_t itemId)
{
    static const std::unordered_set<std::int32_t> excludedIds{
        4595, //Karidian disguise
        7228, //Cooked chompy (roasted)
        7466, //Cornflour
        8624, //Crystal ball (flatpack)
        8626, //Elemental sphere (flatpack)
        8628, //Crystal of power (flatpack)
        12746, //Archaic emblem (tier 1)
        12751, //Archaic emblem (tier 5)
        22610, //Vesta's spear
        22613, //Vesta's longsword
        22616, //Vesta's chainbody
        22619, //Vesta's plateskirt
        22622, //Statius's warhammer
        22625, //Statius's full helm
        22628, //Statius's platebody
        22631, //Statius's platelegs
        22634, //Morrigan's throwing axe
        22638, //Morrigan's coif
        22641, //Morrigan's leather body
        22644, //Morrigan's leather chaps
        22647, //Zuriel's staff
        22650, //Zuriel's hood
        22653, //Zuriel's robe top
        22656, //Zuriel's robe bottom
        25991, //Sigil of resilience
        25994, //Sigil of consistency
        25997, //Sigil of the formidable fighter
        26000, //Sigil of the rigorous ranger
        26003, //Sigil of the meticulous mage
        26006, //Sigil of fortification
        26009, //Sigil of barrows
        26012, //Sigil of deft strikes
        26015, //Sigil of freedom
        26018, //Sigil of enhanced harvest
        26021, //Sigil of storage
        26024, //Sigil of the smith
        26027, //Sigil of the alchemist
        26030, //Sigil of the fletcher
        26033, //Sigil of the chef
        26036, //Sigil of the craftsman
        26039, //Sigil of the abyss
        26042, //Sigil of stamina
        26045, //Sigil of the potion master
        26048, //Sigil of the eternal jeweller
        26051, //Sigil of the treasure hunter
        26054, //Sigil of mobility
        26057, //Sigil of exaggeration
        26060, //Sigil of specialised strikes
        26063, //Sigil of the porcupine
        26066, //Sigil of binding
        26069, //Sigil of escaping
        26072, //Sigil of the ruthless ranger
        26075, //Sigil of the feral fighter
        26078, //Sigil of the menacing mage
        26081, //Sigil of prosperity
        26084, //Sigil of the dwarves
        26087, //Sigil of the elves
        26090, //Sigil of the barbarians
        26093, //Sigil of the gnomes
        26096, //Sigil of nature
        26099, //Sigil of devotion
        26102, //Sigil of the forager
        26105, //Sigil of garments
        26108, //Sigil of slaughter
        26111, //Sigil of the fortune farmer
        26114, //Sigil of versatility
        26117, //Sigil of the serpent
        26120, //Sigil of supreme stamina
        26123, //Sigil of preservation
        26126, //Sigil of finality
        26129, //Sigil of pious protection
        26132, //Sigil of aggression
        26135, //Sigil of rampage
        26138, //Sigil of the skiller
        26141, //Sigil of remote storage
        26144, //Sigil of last recall
        26147, //Sigil of the guardian angel
        26602, //Osman's report
        28220, //Crystal 2h axe
        28223, //Crystal 2h axe (inactive)
        28478, //Sigil of sustenance
        28481, //Sigil of hoarding
        28484, //Sigil of the alchemaniac
        28487, //Sigil of the hunter
        28490, //Sigil of resistance
        28493, //Sigil of agile fortune
        28496, //Sigil of the food master
        28499, //Sigil of the well fed
        28502, //Sigil of the infernal chef
        28505, //Sigil of the infernal smith
        28508, //Sigil of the lightbearer
        28511, //Sigil of the bloodhound
        28514, //Sigil of precision
        28517, //Sigil of the augmented thrall
        28520, //Sigil of faith
        28523, //Sigil of titanium
        28526, //Sigil of the ninja
        28529, //Sigil of woodcraft
        28531, //Corrupted voidwaker
        28534, //Corrupted dragon claws
        28537, //Corrupted armadyl godsword
        28540, //Corrupted twisted bow
        28545, //Corrupted scythe of vitur (uncharged)
        28549, //Corrupted tumeken's shadow (uncharged)
        28561, //Trinket of vengeance
        28564, //Trinket of fairies
        28567, //Trinket of advanced weaponry
        28570, //Trinket of undead
        28839, //Wood camo top (equipped)
        28842, //Wood camo legs (equipped)
        28845, //Jungle camo top (equipped)
        28848, //Jungle camo legs (equipped)
        28851, //Desert camo top (equipped)
        28854, //Desert camo legs (equipped)
        28857, //Polar camo top (equipped)
        28860, //Polar camo legs (equipped)
        29599, //Corrupted dark bow
        29602, //Corrupted Volatile Nightmare staff
        29631, //Blighted overload (4)
        29634, //Blighted overload (3)
        29637, //Blighted overload (2)
        29640, //Blighted overload (1)
        29649, //Sigil of meticulousness
        29652, //Sigil of revoked limitation
        29655, //Sigil of the rampart
        29658, //Sigil of deception
        29661, //Sigil of litheness
        29664, //Sigil of the adroit
        29667, //Sigil of onslaught
        29670, //Sigil of restoration
        29673, //Sigil of the swashbuckler
        29676, //Sigil of the gunslinger
        29679, //Sigil of arcane swiftness
        30576, //Bounty supply crate
        30676, //Nimbleness charm
        30679, //Stockpiling charm
        30682, //Accumulation charm
        30685, //Vulnerability charm
        31454, //Ball of cotton
        31930, //Dragon chainshot cannonball
        31944, //Dragon incendiary cannonball
        33038, //The dogsword
        33041, //Thunder khopesh
        33044, //Trinket of avarice
        33047, //Trinket of fortuity (inactive)
        33050, //Trinket of fortuity (active)
        33428, //Trinket of vengeance (2)
        33431, //Trinket of vengeance (1)
        33644, //Dummy stymphike feather
        34035, //Placeholder
    };

    return !excludedIds.contains(itemId);
}