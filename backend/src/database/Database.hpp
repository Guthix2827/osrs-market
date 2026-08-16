#pragma once

#include <pqxx/pqxx>

#include <string>

class Database
{
public:
    explicit Database(std::string connectionString);

    [[nodiscard]]
    pqxx::connection& connection();

private:
    pqxx::connection connection_;
};