#include "Database.hpp"

#include <stdexcept>
#include <utility>

Database::Database(std::string connectionString)
    : connection_(std::move(connectionString))
{
    if (!connection_.is_open())
    {
        throw std::runtime_error(
            "Could not connect to PostgreSQL"
        );
    }
}

std::mutex& Database::mutex()
{
    return mutex_;
}

pqxx::connection& Database::connection()
{
    return connection_;
}