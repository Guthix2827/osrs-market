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

pqxx::connection& Database::connection()
{
    return connection_;
}