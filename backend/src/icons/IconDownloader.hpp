#pragma once

#include "../jobs/IconDownloadJob.hpp"

#include <filesystem>
#include <string>

class IconDownloader
{
public:
    explicit IconDownloader(
        std::filesystem::path iconDirectory
    );

    [[nodiscard]]
    bool exists(std::int32_t itemId) const;

    bool download(const IconDownloadJob& job) const;

private:
    [[nodiscard]]
    std::filesystem::path pathFor(
        std::int32_t itemId
    ) const;

    [[nodiscard]]
    static std::string buildWikiUrl(
        std::string filename
    );

    std::filesystem::path iconDirectory_;
};