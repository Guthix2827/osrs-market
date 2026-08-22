#include "ItemRepository.hpp"

#include "../database/Database.hpp"

#include <pqxx/pqxx>

#include <optional>

namespace
{

    std::optional<std::int64_t> getOptionalInt64(
        const pqxx::field& field
    )
    {
        if (field.is_null())
            return std::nullopt;

        return field.as<std::int64_t>();
    }

    ItemMapping rowToItemMapping(
        const pqxx::row& row
    )
    {
        ItemMapping item;

        item.id = row["item_id"].as<std::int32_t>();
        item.name = row["name"].as<std::string>();
        item.examine = row["examine"].as<std::string>();
        item.members = row["members"].as<bool>();

        item.lowAlch =
            getOptionalInt64(row["low_alch"]);

        item.highAlch =
            getOptionalInt64(row["high_alch"]);

        item.value =
            getOptionalInt64(row["value"]);

        item.buyLimit =
            getOptionalInt64(row["buy_limit"]);

        item.icon =
            row["icon_filename"].as<std::string>();

        return item;
    }

    bool sameMapping(
        const ItemMapping& a,
        const ItemMapping& b
    )
    {
        return
            a.id == b.id &&
            a.name == b.name &&
            a.examine == b.examine &&
            a.members == b.members &&
            a.lowAlch == b.lowAlch &&
            a.highAlch == b.highAlch &&
            a.value == b.value &&
            a.buyLimit == b.buyLimit &&
            a.icon == b.icon;
    }

    void ensureItemExists(
        pqxx::work& transaction,
        std::int32_t itemId
    )
    {
        transaction.exec(
            R"(
                INSERT INTO items (id)
                VALUES ($1)
                ON CONFLICT (id) DO NOTHING
            )",
            pqxx::params{itemId}
        );
    }

    std::optional<ItemMapping> findCurrentMapping(
        pqxx::work& transaction,
        std::int32_t itemId
    )
    {
        const auto result =
            transaction.exec(
                R"(
                    SELECT
                        r.item_id,
                        r.name,
                        r.examine,
                        r.members,
                        r.low_alch,
                        r.high_alch,
                        r.value,
                        r.buy_limit,
                        r.icon_filename
                    FROM items i
                    JOIN item_revisions r
                        ON r.id = i.current_revision_id
                    WHERE i.id = $1
                )",
                pqxx::params{itemId}
            );

        if (result.empty())
        {
            return std::nullopt;
        }

        return rowToItemMapping(
            result[0]
        );
    }

    std::int64_t insertRevision(
        pqxx::work& transaction,
        const ItemMapping& item
    )
    {
        const auto result =
            transaction.exec(
                R"(
                    INSERT INTO item_revisions
                    (
                        item_id,
                        name,
                        examine,
                        members,
                        low_alch,
                        high_alch,
                        value,
                        buy_limit,
                        icon_filename
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9
                    )
                    RETURNING id
                )",
                pqxx::params{
                    item.id,
                    item.name,
                    item.examine,
                    item.members,
                    item.lowAlch,
                    item.highAlch,
                    item.value,
                    item.buyLimit,
                    item.icon
                }
            );

        return result[0][0]
            .as<std::int64_t>();
    }

    void updateCurrentRevision(
        pqxx::work& transaction,
        std::int32_t itemId,
        std::int64_t revisionId
    )
    {
        transaction.exec(
            R"(
                UPDATE items
                SET
                    current_revision_id = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            )",
            pqxx::params{
                revisionId,
                itemId
            }
        );
    }

} // namespace


ItemRepository::ItemRepository(
    Database& database
)
    : database_(database)
{
}


std::optional<ItemMapping>
ItemRepository::findCurrent(
    std::int32_t itemId
)
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT
                    r.item_id,
                    r.name,
                    r.examine,
                    r.members,
                    r.low_alch,
                    r.high_alch,
                    r.value,
                    r.buy_limit,
                    r.icon_filename
                FROM items i
                JOIN item_revisions r
                    ON r.id = i.current_revision_id
                WHERE i.id = $1
            )",
            pqxx::params{itemId}
        );

    if (result.empty())
    {
        transaction.commit();
        return std::nullopt;
    }

    auto item =
        rowToItemMapping(result[0]);

    transaction.commit();

    return item;
}

std::vector<ItemMapping>
ItemRepository::findAllCurrent()
{
    pqxx::work transaction{
        database_.connection()
    };

    const auto result =
        transaction.exec(
            R"(
                SELECT
                    r.item_id,
                    r.name,
                    r.examine,
                    r.members,
                    r.low_alch,
                    r.high_alch,
                    r.value,
                    r.buy_limit,
                    r.icon_filename
                FROM items i
                JOIN item_revisions r
                    ON r.id = i.current_revision_id
                ORDER BY r.item_id
            )"
        );

    std::vector<ItemMapping> items;
    items.reserve(result.size());

    for (const auto& row : result)
    {
        items.push_back(
            rowToItemMapping(row)
        );
    }

    transaction.commit();

    return items;
}


void ItemRepository::sync(
    const ItemMapping& item
)
{
    pqxx::work transaction{
        database_.connection()
    };

    ensureItemExists(
        transaction,
        item.id
    );

    const auto current =
        findCurrentMapping(
            transaction,
            item.id
        );

    if (
        current &&
        sameMapping(*current, item)
    )
    {
        transaction.commit();
        return;
    }

    const auto revisionId =
        insertRevision(
            transaction,
            item
        );

    updateCurrentRevision(
        transaction,
        item.id,
        revisionId
    );

    transaction.commit();
}