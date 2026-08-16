cmake_minimum_required(VERSION 3.25)

project(osrs_market_backend
    VERSION 0.1.0
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

FetchContent_Declare(
    cpr
    GIT_REPOSITORY https://github.com/libcpr/cpr.git
    GIT_TAG 1.14.1
)

FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.12.0
)

FetchContent_Declare(
    crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.1
)

set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(
    cpr
    json
    crow
)

add_executable(
    osrs-market-backend

    src/main.cpp

    src/mapping/MappingClient.cpp
    src/mapping/MappingStore.cpp
    
    src/icons/IconDownloader.cpp

    src/jobs/MappingRefreshJob.cpp
)

target_link_libraries(
    osrs-market-backend
    PRIVATE
        cpr::cpr
        nlohmann_json::nlohmann_json
        Crow::Crow
)