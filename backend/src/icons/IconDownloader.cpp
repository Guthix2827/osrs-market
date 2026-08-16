#include "IconDownloader.hpp"

#include <algorithm>
#include <cpr/cpr.h>
#include <fstream>
#include <iostream>
#include <stdexcept>

namespace
{
constexpr auto WIKI_IMAGE_BASE_URL =
    "https://oldschool.runescape.wiki/images/";

constexpr auto USER_AGENT =
    "osrs-market/0.1";
}

IconDownloader::IconDownloader(
    std::filesystem::path iconDirectory
)
    : iconDirectory_(std::move(iconDirectory))
{
    std::filesystem::create_directories(
        iconDirectory_
    );
}


bool IconDownloader::exists(
    std::int32_t itemId
) const
{
    return std::filesystem::exists(
        pathFor(itemId)
    );
}


std::filesystem::path IconDownloader::pathFor(
    std::int32_t itemId
) const
{
    return iconDirectory_ /
        (std::to_string(itemId) + ".png");
}


std::string IconDownloader::buildWikiUrl(
    std::string filename
)
{
    std::replace(
        filename.begin(),
        filename.end(),
        ' ',
        '_'
    );

    return std::string(WIKI_IMAGE_BASE_URL)
        + filename;
}


bool IconDownloader::download(
    const IconDownloadJob& job
) const
{
    if (exists(job.itemId))
        return true;

    const auto url =
        buildWikiUrl(job.filename);

    const auto response = cpr::Get(
        cpr::Url{url},
        cpr::Header{
            {"User-Agent", USER_AGENT},
            {"Accept", "image/*"}
        },
        cpr::Timeout{15000}
    );

    if (response.error)
    {
        std::cerr
            << "Icon download failed for item "
            << job.itemId
            << ": "
            << response.error.message
            << '\n';

        return false;
    }

    if (response.status_code != 200)
    {
        std::cerr
            << "Icon download returned HTTP "
            << response.status_code
            << " for item "
            << job.itemId
            << '\n';

        return false;
    }

    const auto finalPath =
        pathFor(job.itemId);

    const auto tempPath =
        std::filesystem::path{
            finalPath.string() + ".tmp"
        };

    {
        std::ofstream file(
            tempPath,
            std::ios::binary
        );

        if (!file)
            return false;

        file.write(
            response.text.data(),
            static_cast<std::streamsize>(
                response.text.size()
            )
        );

        if (!file)
            return false;
    }

    std::filesystem::rename(
        tempPath,
        finalPath
    );

    std::cout
        << "Downloaded icon "
        << job.itemId
        << " from "
        << url
        << '\n';

    return true;
}