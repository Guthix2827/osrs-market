#pragma once

#include <condition_variable>
#include <mutex>
#include <optional>
#include <queue>
#include <utility>

template<typename T>
class JobQueue
{
public:
    void push(T job)
    {
        {
            std::lock_guard lock(mutex_);
            jobs_.push(std::move(job));
        }

        condition_.notify_one();
    }

    std::optional<T> pop()
    {
        std::unique_lock lock(mutex_);

        condition_.wait(lock, [this]
        {
            return stopped_ || !jobs_.empty();
        });

        if (stopped_ && jobs_.empty())
            return std::nullopt;

        T job = std::move(jobs_.front());
        jobs_.pop();

        return job;
    }

    void stop()
    {
        {
            std::lock_guard lock(mutex_);
            stopped_ = true;
        }

        condition_.notify_all();
    }

private:
    std::queue<T> jobs_;

    std::mutex mutex_;
    std::condition_variable condition_;

    bool stopped_ = false;
};