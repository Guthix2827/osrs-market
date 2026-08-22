#pragma once

#include <pqxx/pqxx>

#include <filesystem>

class MigrationRunner
{
public:
    MigrationRunner(
        pqxx::connection& connection,
        std::filesystem::path migrationsDirectory
    );

    void run();

private:
    pqxx::connection& connection_;
    std::filesystem::path migrationsDirectory_;
};