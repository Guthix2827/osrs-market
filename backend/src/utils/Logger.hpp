#pragma once

#include <chrono>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string_view>

class Logger
{
public:
    template<typename... Args>
    static void info(Args&&... args)
    {
        log(
            std::cout,
            "INFO",
            std::forward<Args>(args)...
        );
    }

    template<typename... Args>
    static void error(Args&&... args)
    {
        log(
            std::cerr,
            "ERROR",
            std::forward<Args>(args)...
        );
    }

private:
    inline static std::mutex mutex_;

    static std::string timestamp()
    {
        const auto now =
            std::chrono::system_clock::now();

        const std::time_t time =
            std::chrono::system_clock::to_time_t(now);

        std::tm tm {};

        localtime_r(&time, &tm);

        std::ostringstream stream;

        stream
            << std::put_time(
                &tm,
                "%Y-%m-%d %H:%M:%S"
            );

        return stream.str();
    }

    template<typename... Args>
    static void log(
        std::ostream& output,
        std::string_view level,
        Args&&... args
    )
    {
        std::lock_guard lock(mutex_);

        output
            << '[' << timestamp() << "] "
            << '[' << level << "] ";

        (output << ... << std::forward<Args>(args));

        output << '\n';
    }
};