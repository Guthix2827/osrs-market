#include "jobs/MappingRefreshJob.hpp"
#include "mapping/MappingClient.hpp"
#include "mapping/MappingStore.hpp"
#include "icons/IconDownloader.hpp"
#include "jobs/IconDownloadJob.hpp"
#include "jobs/IconDownloadWorker.hpp"
#include "jobs/JobQueue.hpp"
#include "database/Database.hpp"
#include "items/ItemRepository.hpp"

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

    Database database{databaseUrl};

    std::cout
        << "Connected to Database: "
        << database.connection().dbname()
        << '\n';

    ItemRepository itemRepository{
        database
    };

    MappingStore store;

    try
    {
        const auto cachedItems =
            itemRepository.findAllCurrent();

        store.replace(cachedItems);

        std::cout
            << "Loaded "
            << store.size()
            << " items from Database\n";
    }
    catch (const std::exception& e)
    {
        std::cerr
            << "Failed to load items from Database: "
            << e.what()
            << '\n';
    }

    MappingClient client;

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


    MappingRefreshJob mappingJob{
        client,
        store,
        iconQueue,
        iconDownloader,
        itemRepository
    };

    // Run upstream refresh outside the HTTP thread.
    std::thread refreshThread{
        [&mappingJob]
        {
            mappingJob.execute();
        }
    };

    refreshThread.detach();

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