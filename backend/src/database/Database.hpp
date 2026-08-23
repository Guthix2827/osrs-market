#pragma once

#include <pqxx/pqxx>

#include <mutex>
#include <string>

class Database
{
public:
    explicit Database(std::string connectionString);

    [[nodiscard]]
    pqxx::connection& connection();

    [[nodiscard]]
    std::mutex& mutex();

private:
    pqxx::connection connection_;
    std::mutex mutex_;
};