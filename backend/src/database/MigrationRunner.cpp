#include "MigrationRunner.hpp"

#include "utils/Logger.hpp"

#include <algorithm>
#include <fstream>
#include <iterator>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace
{
constexpr long long MIGRATION_LOCK_ID = 684273951;

void acquireMigrationLock(
    pqxx::connection& connection
)
{
    pqxx::nontransaction transaction{
        connection
    };

    transaction.exec(
        "SELECT pg_advisory_lock(" +
        std::to_string(MIGRATION_LOCK_ID) +
        ")"
    );
}

void validateMigrationsDirectory(
    const std::filesystem::path& directory
)
{
    if (!std::filesystem::exists(directory))
    {
        throw std::runtime_error(
            "Migrations directory does not exist: " +
            directory.string()
        );
    }

    if (!std::filesystem::is_directory(directory))
    {
        throw std::runtime_error(
            "Migrations path is not a directory: " +
            directory.string()
        );
    }
}

std::string readFile(
    const std::filesystem::path& path
)
{
    std::ifstream input{
        path
    };

    if (!input)
    {
        throw std::runtime_error(
            "Could not read migration: " +
            path.string()
        );
    }

    return {
        std::istreambuf_iterator<char>{
            input
        },
        std::istreambuf_iterator<char>{}
    };
}

void validateMigrationSql(
    const std::string& migration,
    const std::string& sql
)
{
    if (
        sql.find_first_not_of(" \t\r\n") ==
        std::string::npos
    )
    {
        throw std::runtime_error(
            "Migration is empty: " +
            migration
        );
    }
}

std::set<std::string> loadAppliedMigrations(
    pqxx::connection& connection
)
{
    std::set<std::string> migrations;

    pqxx::read_transaction transaction{
        connection
    };

    const auto result = transaction.exec(
        "SELECT migration FROM schema_migrations"
    );

    for (const auto& row : result)
    {
        migrations.insert(
            row["migration"].as<std::string>()
        );
    }

    return migrations;
}

std::vector<std::filesystem::path> loadMigrationFiles(
    const std::filesystem::path& directory
)
{
    std::vector<std::filesystem::path> migrations;

    for (
        const auto& entry :
        std::filesystem::directory_iterator{
            directory
        }
    )
    {
        if (
            entry.is_regular_file() &&
            entry.path().extension() == ".sql"
        )
        {
            migrations.push_back(
                entry.path()
            );
        }
    }

    std::sort(
        migrations.begin(),
        migrations.end(),
        [](
            const auto& left,
            const auto& right
        )
        {
            return left.filename().string() <
                   right.filename().string();
        }
    );

    return migrations;
}

void runMigration(
    pqxx::connection& connection,
    const std::filesystem::path& migrationPath
)
{
    const std::string migration =
        migrationPath.filename().string();

    Logger::info(
        "Running migration: ",
        migration
    );

    const std::string sql =
        readFile(migrationPath);

    validateMigrationSql(
        migration,
        sql
    );

    pqxx::work transaction{
        connection
    };

    transaction.exec(sql);

    transaction.exec(
        "INSERT INTO schema_migrations "
        "(migration) VALUES (" +
        transaction.quote(migration) +
        ")"
    );

    transaction.commit();

    Logger::info(
        "Migration completed: ",
        migration
    );
}
}

MigrationRunner::MigrationRunner(
    pqxx::connection& connection,
    std::filesystem::path migrationsDirectory
)
    : connection_(connection),
      migrationsDirectory_(
          std::move(migrationsDirectory)
      )
{
}

void MigrationRunner::run()
{
    validateMigrationsDirectory(
        migrationsDirectory_
    );

    acquireMigrationLock(
        connection_
    );

    const auto appliedMigrations =
        loadAppliedMigrations(
            connection_
        );

    const auto migrations =
        loadMigrationFiles(
            migrationsDirectory_
        );

    std::size_t appliedCount = 0;

    for (const auto& migrationPath : migrations)
    {
        const std::string migration =
            migrationPath.filename().string();

        if (appliedMigrations.contains(migration))
        {
            continue;
        }

        runMigration(
            connection_,
            migrationPath
        );

        ++appliedCount;
    }

    if (appliedCount == 0)
    {
        Logger::info(
            "Database migrations are up to date"
        );

        return;
    }

    Logger::info(
        "Applied ",
        appliedCount,
        appliedCount == 1
            ? " database migration"
            : " database migrations"
    );
}
