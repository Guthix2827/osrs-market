#pragma once

#include <string>

class DatabaseMigrator
{
public:
    static void run(
        const std::string& connectionString,
        const std::string& migrationsDirectory
    );
};