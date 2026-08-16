#include "jobs/MappingRefreshJob.hpp"
#include "mapping/MappingClient.hpp"
#include "mapping/MappingStore.hpp"
#include "icons/IconDownloader.hpp"
#include "jobs/IconDownloadJob.hpp"
#include "jobs/IconDownloadWorker.hpp"
#include "jobs/FiveMinutePriceRefreshJob.hpp"
#include "jobs/JobQueue.hpp"
#include "database/Database.hpp"
#include "items/ItemRepository.hpp"
#include "items/ItemFilter.hpp"
#include "prices/FiveMinutePriceClient.hpp"
#include "prices/LatestPriceStore.hpp"
#include "prices/PriceRepository.hpp"

#include <crow.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <filesystem>
#include <thread>
#include <fstream>
#include <iterator>
#include <iostream>
#include <cstdlib>

int main()
{
    //database connection
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

    ItemRepository itemRepository{
        itemDatabase
    };

    PriceRepository priceRepository{
        priceDatabase
    };

    LatestPriceStore latestPriceStore;

    // hydrate prices
    {
        const auto persistedPrices =
            priceRepository.findLatestPerItem();

        for (const auto& point : persistedPrices)
            latestPriceStore.updateIfChanged(point);
    }

    MappingStore store;

    // hydrate items
    {
        const auto cachedItems =
            itemRepository.findAllCurrent();

        store.replace(cachedItems);
    }


    // Create clients/jobs after hydration.

    FiveMinutePriceClient priceClient;

    FiveMinutePriceRefreshJob priceRefreshJob{
        priceClient,
        latestPriceStore,
        priceRepository
    };

    MappingClient mappingClient;

    //icon job
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

    //
    MappingRefreshJob mappingJob{
        mappingClient,
        store,
        iconQueue,
        iconDownloader,
        itemRepository
    };

    // Run upstream refresh outside the HTTP thread.
    std::thread priceRefreshThread{
        [&priceRefreshJob]
        {
            using namespace std::chrono_literals;

            while (true)
            {
                priceRefreshJob.execute();
                std::this_thread::sleep_for(5min);
            }
        }
    };

    priceRefreshThread.detach();

    std::thread mappingRefreshThread{
        [&mappingJob]
        {
            mappingJob.execute();
        }
    };

    mappingRefreshThread.detach();


    //init crow
    crow::SimpleApp app;

    CROW_ROUTE(app, "/api/health")
    ([] {
        return crow::response{
            200,
            "application/json",
            R"({"status":"ok"})"
        };
    });

    CROW_ROUTE(app, "/api/items/<int>")
    ([&store](int id)
    {
        const auto item = store.find(id);

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

    app
        .port(8080)
        .multithreaded()
        .run();
}