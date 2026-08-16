#pragma once

#include "PricePoint.hpp"

#include <vector>

class Database;

class PriceRepository
{
public:
    explicit PriceRepository(Database& database);

    [[nodiscard]]
    bool insert(const PricePoint& point);

    [[nodiscard]]
    std::vector<PricePoint> findLatestPerItem();

private:
    Database& database_;
};