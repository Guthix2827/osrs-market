#include "utils/Logger.hpp"
#include "utils/Price.hpp"
#include "mapping/MappingClient.hpp"
#include "mapping/MappingStore.hpp"
#include "icons/IconDownloader.hpp"

#include "jobs/MappingRefreshJob.hpp"
#include "jobs/IconDownloadJob.hpp"
#include "jobs/IconDownloadWorker.hpp"
#include "jobs/FiveMinutePriceRefreshJob.hpp"
#include "jobs/JobQueue.hpp"
#include "jobs/PriceBackfillRequest.hpp"
#include "jobs/PriceBackfillJob.hpp"
#include "jobs/FullHistoryBackfillJob.hpp"
#include "jobs/GapRecoveryJob.hpp"

#include "database/Database.hpp"
#include "cache/PriceHistoryCache.hpp"
#include "items/ItemRepository.hpp"
#include "items/ItemFilter.hpp"
#include "items/WatchSummary.hpp"
#include "prices/FiveMinutePriceClient.hpp"
#include "prices/LatestPriceStore.hpp"
#include "prices/PriceRepository.hpp"
#include "prices/TimeseriesClient.hpp"
#include "prices/BackfillPolicy.hpp"
#include "prices/HistoryRange.hpp"

#include <crow.h>
#include <crow/middlewares/cors.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <filesystem>
#include <thread>
#include <fstream>
#include <iterator>
#include <iostream>
#include <cstdlib>
#include <string>

int main(
    int argc,
    char* argv[]
)
{
    const std::string command =
        argc >= 2
            ? argv[1]
            : "serve";

    // Database connection
    const char* databaseUrl =
        std::getenv("DATABASE_URL");

    if (!databaseUrl)
    {
        throw std::runtime_error(
            "DATABASE_URL is not set"
        );
    }

    Database itemDatabase{databaseUrl};
    Database priceDatabase{databaseUrl};
    Database historyDatabase{databaseUrl};
    Database backfillDatabase{databaseUrl};
    Database coverageDatabase{databaseUrl};

    // Repositories.
    ItemRepository itemRepository{
        itemDatabase
    };

    // Dedicated to live 5m collector.
    PriceRepository priceRepository{
        priceDatabase
    };

    // Dedicated to HTTP history reads.
    PriceRepository historyRepository{
        historyDatabase
    };

    // Dedicated to backfill writes.
    PriceRepository backfillPriceRepository{
        backfillDatabase
    };

    // Dedicated to coverage checks.
    PriceRepository coverageRepository{
        coverageDatabase
    };


    // In-memory stores.
    LatestPriceStore latestPriceStore;
    MappingStore mappingStore;
    PriceHistoryCache historyCache;


    // Hydrate latest prices from PostgreSQL.
    {
        const auto persistedPrices =
            priceRepository.findLatestPerItem();

        for (const auto& point : persistedPrices)
        {
            latestPriceStore.updateIfChanged(
                point
            );
        }

        Logger::info(
            "Loaded ",
            latestPriceStore.size(),
            " latest price states from Database"
        );
    }


    // Hydrate current item metadata from PostgreSQL.
    {
        const auto cachedItems =
            itemRepository.findAllCurrent();

        mappingStore.replace(
            cachedItems
        );

        Logger::info(
            "Loaded ",
            mappingStore.size(),
            " items from Database"
        );
    }


    // Clients.
    FiveMinutePriceClient priceClient;
    MappingClient mappingClient;
    TimeseriesClient timeseriesClient;


    // Icon subsystem. - required for mapping job
    JobQueue<IconDownloadJob> iconQueue;

    IconDownloader iconDownloader{
        "/app/data/icons"
    };

    IconDownloadWorker iconWorker{
        iconQueue,
        iconDownloader
    };

    std::thread iconThread{
        [&iconWorker]
        {
            iconWorker.run();
        }
    };

    iconThread.detach();


    // Mapping job.
    MappingRefreshJob mappingJob{
        mappingClient,
        mappingStore,
        iconQueue,
        iconDownloader,
        itemRepository
    };


    // Initial mapping refresh.
    mappingJob.execute();


    // Historical backfill subsystem.
    JobQueue<PriceBackfillRequest> backfillQueue;

    PriceBackfillJob backfillJob{
        timeseriesClient,
        backfillPriceRepository,
        historyCache
    };

    BackfillPolicy backfillPolicy{
        coverageRepository
    };


    //backfill commands  
    if (command == "backfill-all")
    {
        FullHistoryBackfillJob fullBackfill{
            mappingStore,
            backfillJob,
            backfillPolicy
        };

        fullBackfill.run();

        return 0;
    }

    if (command != "serve")
    {
        Logger::error(
            "Unknown command: ",
            command
        );

        return 1;
    }

    // --------------------------------------------------
    // Everything below this point belongs to serve mode.
    // --------------------------------------------------

    //backfill missing data in case downtime
    GapRecoveryJob gapRecoveryJob{
        mappingStore,
        backfillPriceRepository,
        backfillJob
    };

    //run in the background
    std::thread gapRecoveryThread{
        [&gapRecoveryJob]
        {
            try
            {
                gapRecoveryJob.run();
            }
            catch (const std::exception& e)
            {
                Logger::error(
                    "Gap recovery failed: ",
                    e.what()
                );
            }
        }
    };

    gapRecoveryThread.detach();


    // Live 5-minute price collection.
    FiveMinutePriceRefreshJob priceRefreshJob{
        priceClient,
        latestPriceStore,
        priceRepository,
        historyCache
    };

    std::thread priceRefreshThread{
        [&priceRefreshJob]
        {
            using namespace std::chrono;

            while (true)
            {
                const auto now =
                    system_clock::now();

                const auto currentMinute =
                    duration_cast<minutes>(
                        now.time_since_epoch()
                    );

                const auto nextFiveMinutes =
                    ((currentMinute.count() / 5) + 1) * 5;

                const auto nextRun =
                    system_clock::time_point{
                        minutes{
                            nextFiveMinutes
                        }
                    } +
                    seconds{10};

                std::this_thread::sleep_until(
                    nextRun
                );

                try
                {
                    priceRefreshJob.execute();
                }
                catch (const std::exception& e)
                {
                    Logger::error(
                        "5m price refresh failed: ",
                        e.what()
                    );
                }
            }
        }
    };

    priceRefreshThread.detach();

    Logger::info(
        "Price refresh worker launched"
    );


    //init crow
    crow::App<crow::CORSHandler> app;

    auto& cors =
        app.get_middleware<crow::CORSHandler>();

    cors
        .global()
        .origin("*");

    //silent log
    app.loglevel(crow::LogLevel::Warning);

    CROW_ROUTE(app, "/api/health")
    ([] {
        return crow::response{
            200,
            "application/json",
            R"({"status":"ok"})"
        };
    });

    CROW_ROUTE(app, "/api/items/<int>")
    ([&mappingStore](int id)
    {
        const auto item = mappingStore.find(id);

        if (!item)
        {
            return crow::response{
                404,
                "application/json",
                R"({"error":"Item not found"})"
            };
        }

        nlohmann::json json{
            {"id", item->id},
            {"name", item->name},
            {"examine", item->examine},
            {
                "icon",
                "/icons/" +
                    std::to_string(item->id) +
                    ".png"
            },
            {"members", item->members}
        };

        json["lowAlch"] =
            item->lowAlch
                ? nlohmann::json(*item->lowAlch)
                : nlohmann::json(nullptr);

        json["highAlch"] =
            item->highAlch
                ? nlohmann::json(*item->highAlch)
                : nlohmann::json(nullptr);

        json["value"] =
            item->value
                ? nlohmann::json(*item->value)
                : nlohmann::json(nullptr);

        json["buyLimit"] =
            item->buyLimit
                ? nlohmann::json(*item->buyLimit)
                : nlohmann::json(nullptr);

        return crow::response{
            200,
            "application/json",
            json.dump()
        };
    });

    CROW_ROUTE(app, "/icons/<int>.png")
    ([&iconDownloader](int id)
    {
        const auto path =
            std::filesystem::path{"/app/data/icons"} /
            (std::to_string(id) + ".png");

        if (!std::filesystem::exists(path))
        {
            return crow::response{
                404,
                "application/json",
                R"({"error":"Icon not found"})"
            };
        }

        std::ifstream file(
            path,
            std::ios::binary
        );

        if (!file)
        {
            return crow::response{
                500,
                "application/json",
                R"({"error":"Could not read icon"})"
            };
        }

        std::string body{
            std::istreambuf_iterator<char>{file},
            std::istreambuf_iterator<char>{}
        };

        crow::response response;

        response.code = 200;
        response.set_header(
            "Content-Type",
            "image/png"
        );

        response.set_header(
            "Cache-Control",
            "public, max-age=86400"
        );

        response.body = std::move(body);

        return response;
    });

    CROW_ROUTE(app, "/api/items/<int>/history")
    ([&historyRepository,
    &historyCache,
    &backfillPolicy](
        const crow::request& req,
        int itemId
    )
    {
        const char* rangeParam =
            req.url_params.get("range");

        if (!rangeParam)
        {
            return crow::response{
                400,
                "application/json",
                R"({"error":"Missing range parameter"})"
            };
        }

        const std::string range{
            rangeParam
        };
        const auto rangeConfig = parseHistoryRange(range);
        if (!rangeConfig)
        {
            return crow::response{
                400,
                "application/json",
                R"({"error":"Invalid range parameter"})"
            };
        }

        const auto rangeSeconds =
            rangeConfig->seconds;

        const auto historyRange =
            rangeConfig->range;


        //
        // Try RAM cache first.
        //
        const auto cached =
            historyCache.get(
                itemId,
                range
            );

        if (cached)
        {
            Logger::info(
                "History cache hit: item=",
                itemId,
                " range=",
                range
            );

            nlohmann::json data =
                nlohmann::json::array();

            for (const auto& point : *cached)
            {
                data.push_back({
                    {"timestamp", point.timestamp},

                    {
                        "avgHighPrice",
                        point.avgHighPrice
                            ? nlohmann::json(
                                *point.avgHighPrice
                            )
                            : nlohmann::json(nullptr)
                    },

                    {
                        "avgLowPrice",
                        point.avgLowPrice
                            ? nlohmann::json(
                                *point.avgLowPrice
                            )
                            : nlohmann::json(nullptr)
                    },

                    {
                        "highPriceVolume",
                        point.highPriceVolume
                    },

                    {
                        "lowPriceVolume",
                        point.lowPriceVolume
                    }
                });
            }

            nlohmann::json response{
                {"itemId", itemId},
                {"range", range},
                {"data", std::move(data)}
            };

            return crow::response{
                200,
                "application/json",
                response.dump()
            };
        }


        //
        // Cache miss: query PostgreSQL.
        //
        Logger::info(
            "History cache miss: item=",
            itemId,
            " range=",
            range
        );

        const auto now =
            std::chrono::system_clock::now();

        const auto toTimestamp =
            std::chrono::duration_cast<
                std::chrono::seconds
            >(
                now.time_since_epoch()
            ).count();

        const auto fromTimestamp =
            toTimestamp - rangeSeconds;

        std::vector<PricePoint> points =
            historyRepository.findHistory(
                itemId,
                fromTimestamp,
                toTimestamp,
                historyRange
            );
        
        const bool hasCoverage =
            backfillPolicy.hasCoverage(
                itemId,
                std::chrono::seconds{
                    rangeSeconds
                }
            );

        if (hasCoverage)
        {
            filterPriceOutliers(points);
            historyCache.set(
                itemId,
                range,
                points
            );
        }
        else
        {
            Logger::info(
                "History not cached because coverage is incomplete: item=",
                itemId,
                " range=",
                range
            );
        }

        //
        // Build response.
        //
        nlohmann::json data =
            nlohmann::json::array();

        for (const auto& point : points)
        {
            data.push_back({
                {"timestamp", point.timestamp},

                {
                    "avgHighPrice",
                    point.avgHighPrice
                        ? nlohmann::json(
                            *point.avgHighPrice
                        )
                        : nlohmann::json(nullptr)
                },

                {
                    "avgLowPrice",
                    point.avgLowPrice
                        ? nlohmann::json(
                            *point.avgLowPrice
                        )
                        : nlohmann::json(nullptr)
                },

                {
                    "highPriceVolume",
                    point.highPriceVolume
                },

                {
                    "lowPriceVolume",
                    point.lowPriceVolume
                }
            });
        }

        nlohmann::json response{
            {"itemId", itemId},
            {"range", range},
            {"data", std::move(data)}
        };

        return crow::response{
            200,
            "application/json",
            response.dump()
        };
    });

    CROW_ROUTE(app, "/api/items/search")
    ([&mappingStore](const crow::request& req)
    {
        const char* queryParam =
            req.url_params.get("q");

        if (!queryParam)
        {
            return crow::response{
                400,
                "application/json",
                R"({"error":"Missing query parameter"})"
            };
        }

        const std::string query{
            queryParam
        };

        if (query.empty())
        {
            return crow::response{
                200,
                "application/json",
                R"({"data":[]})"
            };
        }

        const auto results =
            mappingStore.search(
                query,
                15
            );

        nlohmann::json data =
            nlohmann::json::array();

        for (const auto& item : results)
        {
            data.push_back({
                {"id", item.id},
                {"name", item.name},
                {"members", item.members},
                {"icon", "/icons/" + std::to_string(item.id) + ".png"}
            });
        }

        nlohmann::json response{
            {"data", std::move(data)}
        };

        return crow::response{
            200,
            "application/json",
            response.dump()
        };
    });

    CROW_ROUTE(app, "/api/items/<int>/watch-summary")
    ([&historyRepository,
    &historyCache,
    &backfillPolicy](
        int itemId
    )
    {
        constexpr std::string_view range{
            "24h"
        };

        const auto rangeConfig =
            parseHistoryRange(
                std::string{range}
            );

        if (!rangeConfig)
        {
            return crow::response{
                500,
                "application/json",
                R"({"error":"Failed to configure watch history range"})"
            };
        }

        const auto now =
            std::chrono::system_clock::now();

        const auto toTimestamp =
            std::chrono::duration_cast<
                std::chrono::seconds
            >(
                now.time_since_epoch()
            ).count();

        std::vector<PricePoint> points;

        const auto cached =
            historyCache.get(
                itemId,
                range
            );

        if (cached)
        {
            Logger::info(
                "Watch summary cache hit: item=",
                itemId
            );

            points = *cached;
        }
        else
        {
            Logger::info(
                "Watch summary cache miss: item=",
                itemId
            );

            const auto fromTimestamp =
                toTimestamp -
                rangeConfig->seconds;

            points =
                historyRepository.findHistory(
                    itemId,
                    fromTimestamp,
                    toTimestamp,
                    rangeConfig->range
                );

            const bool hasCoverage =
                backfillPolicy.hasCoverage(
                    itemId,
                    std::chrono::seconds{
                        rangeConfig->seconds
                    }
                );

            if (hasCoverage)
            {
                filterPriceOutliers(points);

                historyCache.set(
                    itemId,
                    std::string{range},
                    points
                );
            }
        }

        const auto summary =
            buildWatchSummary(
                itemId,
                points,
                toTimestamp
            );

        std::optional<std::int64_t> currentMidPrice;

        for (auto it = points.rbegin();
            it != points.rend();
            ++it)
        {
            if (
                it->avgHighPrice &&
                it->avgLowPrice
            )
            {
                currentMidPrice =
                    (
                        *it->avgHighPrice +
                        *it->avgLowPrice
                    ) / 2;

                break;
            }
        }

        nlohmann::json response;

        response["itemId"] =
            summary.itemId;

        response["generatedAt"] =
            summary.generatedAt;

        response["currentMidPrice"] =
            currentMidPrice
                ? nlohmann::json(*currentMidPrice)
                : nlohmann::json(nullptr);

        response["references"] =
            nlohmann::json::object();

        auto& references =
            response["references"];

        references["30m"] =
            summary.references.price30m
                ? nlohmann::json(*summary.references.price30m)
                : nlohmann::json(nullptr);

        references["1h"] =
            summary.references.price1h
                ? nlohmann::json(*summary.references.price1h)
                : nlohmann::json(nullptr);

        references["6h"] =
            summary.references.price6h
                ? nlohmann::json(*summary.references.price6h)
                : nlohmann::json(nullptr);

        references["12h"] =
            summary.references.price12h
                ? nlohmann::json(*summary.references.price12h)
                : nlohmann::json(nullptr);

        references["24h"] =
            summary.references.price24h
                ? nlohmann::json(*summary.references.price24h)
                : nlohmann::json(nullptr);

        return crow::response{
            200,
            "application/json",
            response.dump()
        };
    });
    
    app
        .port(8080)
        .multithreaded()
        .run();
}