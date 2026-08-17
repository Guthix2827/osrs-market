#include "utils/Logger.hpp"
#include "jobs/MappingRefreshJob.hpp"
#include "mapping/MappingClient.hpp"
#include "mapping/MappingStore.hpp"
#include "icons/IconDownloader.hpp"

#include "jobs/IconDownloadJob.hpp"
#include "jobs/IconDownloadWorker.hpp"
#include "jobs/FiveMinutePriceRefreshJob.hpp"
#include "jobs/JobQueue.hpp"
#include "jobs/PriceBackfillRequest.hpp"
#include "jobs/PriceBackfillWorker.hpp"
#include "jobs/PriceBackfillJob.hpp"

#include "database/Database.hpp"
#include "items/ItemRepository.hpp"
#include "items/ItemFilter.hpp"
#include "prices/FiveMinutePriceClient.hpp"
#include "prices/LatestPriceStore.hpp"
#include "prices/PriceRepository.hpp"
#include "prices/TimeseriesClient.hpp"
#include "prices/BackfillPolicy.hpp"
#include "prices/BackfillManager.hpp"
#include "prices/ItemActivityTracker.hpp"

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

int main()
{
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
    Database backfillDatabase{databaseUrl};

    // Repositories.
    ItemRepository itemRepository{
        itemDatabase
    };

    PriceRepository priceRepository{
        priceDatabase
    };

    PriceRepository backfillPriceRepository{
        backfillDatabase
    };


    // In-memory stores.
    LatestPriceStore latestPriceStore;
    MappingStore mappingStore;


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


    // Icon subsystem.
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


    // Live 5-minute price collection.
    FiveMinutePriceRefreshJob priceRefreshJob{
        priceClient,
        latestPriceStore,
        priceRepository
    };

    std::thread priceRefreshThread{
        [&priceRefreshJob]
        {
            using namespace std::chrono_literals;

            while (true)
            {
                priceRefreshJob.execute();

                std::this_thread::sleep_for(
                    5min
                );
            }
        }
    };

    priceRefreshThread.detach();

    Logger::info(
        "Price refresh worker launched"
    );


    // Historical backfill subsystem.
    JobQueue<PriceBackfillRequest> backfillQueue;

    PriceBackfillJob backfillJob{
        timeseriesClient,
        backfillPriceRepository
    };

    PriceBackfillWorker backfillWorker{
        backfillQueue,
        backfillJob
    };

    BackfillPolicy backfillPolicy{
        backfillPriceRepository
    };

    BackfillManager backfillManager{
        backfillPolicy,
        backfillQueue
    };

    std::thread backfillThread{
        [&backfillWorker]
        {
            backfillWorker.run();
        }
    };

    backfillThread.detach();


    //stores
    ItemActivityTracker activityTracker;

    //backfill thread
    std::thread backfillSchedulerThread{
        [&activityTracker, &backfillManager]
        {
            using namespace std::chrono_literals;

            while (true)
            {
                const auto activeItems =
                    activityTracker.recentlyViewed(
                        30min
                    );

                if (!activeItems.empty())
                {
                    Logger::info(
                        "Backfill scheduler checking ",
                        activeItems.size(),
                        " recently viewed items"
                    );
                }

                for (const auto itemId :
                    activeItems)
                {
                    backfillManager.ensureHistory(
                        itemId
                    );
                }

                std::this_thread::sleep_for(1min);
            }
        }
    };

    backfillSchedulerThread.detach();


    //init crow
    crow::App<crow::CORSHandler> app;

    auto& cors =
        app.get_middleware<crow::CORSHandler>();

    cors
        .global()
        .origin("*");

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
    ([&priceRepository, &activityTracker](
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

        std::int64_t rangeSeconds = 0;

        if (range == "24h")
        {
            rangeSeconds = 24 * 60 * 60;
        }
        else if (range == "7d")
        {
            rangeSeconds = 7 * 24 * 60 * 60;
        }
        else
        {
            return crow::response{
                400,
                "application/json",
                R"({"error":"Unsupported range"})"
            };
        }

        activityTracker.recordView(itemId);

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

        const auto points =
            priceRepository.findHistory(
                itemId,
                fromTimestamp,
                toTimestamp
            );

        nlohmann::json data =
            nlohmann::json::array();

        for (const auto& point : points)
        {
            nlohmann::json jsonPoint{
                {"timestamp", point.timestamp},
                {
                    "avgHighPrice",
                    point.avgHighPrice
                        ? nlohmann::json(*point.avgHighPrice)
                        : nlohmann::json(nullptr)
                },
                {
                    "avgLowPrice",
                    point.avgLowPrice
                        ? nlohmann::json(*point.avgLowPrice)
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
            };

            data.push_back(
                std::move(jsonPoint)
            );
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

    app
        .port(8080)
        .multithreaded()
        .run();
}