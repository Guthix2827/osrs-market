#include "DatabaseMigrator.hpp"

#include "Database.hpp"
#include "MigrationRunner.hpp"

void DatabaseMigrator::run(
    const std::string& connectionString,
    const std::string& migrationsDirectory
)
{
    Database database{
        connectionString
    };

    MigrationRunner migrationRunner{
        database.connection(),
        migrationsDirectory
    };

    migrationRunner.run();
}