# OSRS Market

OSRS Market is a full-stack Old School RuneScape market data project built as a practical exercise in modern C++ backend development.

The application collects item metadata and real-time Grand Exchange price data from the RuneScape Wiki APIs, persists historical market information, and exposes the data through its own API for a React frontend.

The goal is to build a fast, self-contained market data service that does not require the frontend to depend directly on the upstream API.

## Project Status

This project is currently under active development.

Implemented:

- C++20 backend
- Crow HTTP server
- RuneScape Wiki item mapping synchronization
- Local item icon caching
- PostgreSQL persistence
- Item metadata revision history
- In-memory item cache
- Bulk 5-minute market price collection
- In-memory latest-price cache
- Change-based price event persistence
- Background price collection
- Docker development environment

Planned:

- Historical price API
- Historical timeseries backfill
- 24-hour / 7-day / longer-range charts
- WebSocket live price updates
- Market statistics
- Price aggregation
- Frontend integration
- Production Docker image
- Reverse proxy / production deployment

---

## Stack

### Backend

- C++20
- Crow
- CPR / libcurl
- nlohmann/json
- libpqxx
- PostgreSQL
- CMake
- Ninja

### Frontend

- React
- TypeScript
- Vite
- Recharts

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- Git / GitHub

---

## Architecture

The backend acts as an intermediary between the RuneScape Wiki price APIs and the frontend.

```text
                   RuneScape Wiki APIs
                          |
             +------------+------------+
             |                         |
         Item Mapping                5m Prices
             |                         |
             v                         v
     MappingRefreshJob       FiveMinutePriceRefreshJob
             |                         |
      +------+------+            +-----+------+
      |             |            |            |
      v             v            v            v
 PostgreSQL    MappingStore  LatestPriceStore PostgreSQL
                  (RAM)          (RAM)       price_events
      |
      v
 Item revisions

                  Backend API
                       |
                       v
                 React Frontend
```

The frontend does not need to communicate directly with the RuneScape Wiki APIs.

This allows the backend to continue serving previously collected data if the upstream API is temporarily unavailable.

---

# Item Metadata

Item metadata is obtained from the RuneScape Wiki mapping API.

Examples of metadata include:

- Item ID
- Name
- Examine text
- Members status
- Store value
- High alchemy value
- Low alchemy value
- Grand Exchange buy limit
- Icon filename

Metadata is persisted in PostgreSQL.

## Item Revisions

Item metadata can change over time.

Instead of overwriting the existing item information, the backend stores revisions.

```text
items
  |
  +-- current_revision_id
          |
          v
    item_revisions
```

For example:

```text
Item 6739
Dragon axe

Revision 1
    name: Dragon axe
    examine: Old description

Revision 2
    name: Dragon axe
    examine: New description
```

Only a changed item creates a new revision.

This preserves historical metadata while allowing the application to efficiently reference the current revision.

---

# Item Icons

Item icons are downloaded from the Old School RuneScape Wiki and stored locally.

They are exposed by the backend using URLs such as:

```text
/icons/6739.png
```

The item API therefore returns:

```json
{
    "id": 6739,
    "name": "Dragon axe",
    "icon": "/icons/6739.png"
}
```

rather than requiring the frontend to know the upstream Wiki image URL.

Downloaded icons are stored in a Docker volume and survive container rebuilds.

Known missing icons are temporarily remembered to prevent repeatedly requesting the same unavailable resource.

---

# Price Collection

The backend uses the RuneScape Wiki bulk 5-minute price endpoint.

```text
/api/v2/osrs/5m
```

One request provides market information for many items.

This is significantly more efficient than requesting every item individually.

A normalized price point contains:

```text
itemId
timestamp
avgHighPrice
avgLowPrice
highPriceVolume
lowPriceVolume
```

Prices can be null when no corresponding trade occurred during the interval.

---

## Change-Based Price History

The backend does not blindly store every observation.

Instead, the latest known market state for each item is held in memory.

```text
Wiki /5m
    |
    v
LatestPriceStore
    |
    +-- unchanged --> ignore
    |
    +-- changed ----> price_events
```

A price event is considered changed when one or more of these values changes:

```text
avgHighPrice
avgLowPrice
highPriceVolume
lowPriceVolume
```

This avoids storing unnecessary duplicate observations for inactive items.

PostgreSQL additionally enforces uniqueness on:

```text
(item_id, timestamp)
```

so the same 5-minute event cannot accidentally be inserted twice.

---

# Database

The application currently uses PostgreSQL for persistent storage.

Main tables:

```text
items
item_revisions
price_events
```

## `items`

Stores stable item identities and points to the current metadata revision.

## `item_revisions`

Stores historical versions of item metadata.

## `price_events`

Stores historical market changes.

The primary history access pattern is:

```sql
WHERE item_id = ?
AND timestamp >= ?
ORDER BY timestamp
```

The table therefore has an index based on:

```text
(item_id, timestamp)
```

Historical storage may later be partitioned or aggregated as the dataset grows.

---

# In-Memory Stores

PostgreSQL is the durable source of data, but frequently accessed current state is also kept in memory.

There are currently two major in-memory stores.

## MappingStore

Contains the current item metadata.

Conceptually:

```cpp
std::unordered_map<ItemId, ItemMapping>
```

This allows item API requests to avoid querying PostgreSQL for every request.

## LatestPriceStore

Contains the newest known price state for each item.

Conceptually:

```cpp
std::unordered_map<ItemId, PricePoint>
```

It is used to detect market changes before writing historical events.

This store will also eventually provide the current state for WebSocket updates.

---

# Backend Startup Flow

The backend intentionally restores persistent state before starting its background collectors.

The startup process is approximately:

```text
main()
 |
 +--> Read DATABASE_URL
 |
 +--> Connect to PostgreSQL
 |      |
 |      +--> item database connection
 |      |
 |      +--> price database connection
 |
 +--> Create repositories
 |      |
 |      +--> ItemRepository
 |      |
 |      +--> PriceRepository
 |
 +--> Hydrate LatestPriceStore
 |      |
 |      +--> Load latest price event for each item
 |      |
 |      +--> Store latest states in RAM
 |
 +--> Hydrate MappingStore
 |      |
 |      +--> Load current item revisions
 |      |
 |      +--> Store current item metadata in RAM
 |
 +--> Create background services/jobs
 |      |
 |      +--> IconDownloadWorker
 |      |
 |      +--> MappingRefreshJob
 |      |
 |      +--> FiveMinutePriceRefreshJob
 |
 +--> Start icon worker thread
 |
 +--> Start mapping refresh thread
 |
 +--> Start price refresh thread
 |
 +--> Start Crow HTTP server
```

---

## Why Price State Is Hydrated First

`LatestPriceStore` is an in-memory cache.

Without restoring it from PostgreSQL, every backend restart would make the first `/5m` response appear to contain completely new data.

For example:

```text
Backend stops

RAM:
    empty

Backend starts

GET /5m
    |
    v
1882 items appear "new"
```

The database uniqueness constraint would prevent duplicate rows, but this would still cause thousands of unnecessary insert attempts.

Instead:

```text
Backend starts
    |
    v
PostgreSQL
    |
    v
load latest event per item
    |
    v
LatestPriceStore
    |
    v
GET /5m
    |
    v
compare against known state
```

Only genuinely changed market states are then written.

---

# Runtime Price Flow

Once startup is complete, price collection runs independently in the background.

```text
FiveMinutePriceRefreshJob
          |
          v
 GET RuneScape Wiki /5m
          |
          v
      parse JSON
          |
          v
     ItemFilter
          |
          v
  LatestPriceStore
          |
     +----+----+
     |         |
 unchanged   changed
     |         |
   ignore      v
          PriceRepository
                |
                v
           PostgreSQL
           price_events
```

The refresh job currently runs periodically in its own thread.

The HTTP server therefore does not need to wait for upstream RuneScape Wiki requests when serving normal requests.

---

# Runtime Mapping Flow

Item metadata synchronization is handled separately.

```text
MappingRefreshJob
       |
       v
RuneScape Wiki /mapping
       |
       v
    ItemFilter
       |
       +--------------------+
       |                    |
       v                    v
ItemRepository         Icon queue
       |                    |
       v                    v
 PostgreSQL       IconDownloadWorker
       |
       v
revision detection
       |
       v
 MappingStore
     (RAM)
```

If metadata has not changed, no new revision is created.

If metadata changes, a new revision is inserted and the item's `current_revision_id` is updated.

---

# Database Connections and Concurrency

Background jobs execute concurrently.

A PostgreSQL connection cannot have multiple active transactions simultaneously, so independent workers do not share the same libpqxx connection.

Conceptually:

```text
Mapping worker
      |
      v
ItemRepository
      |
      v
PostgreSQL connection #1


Price worker
      |
      v
PriceRepository
      |
      v
PostgreSQL connection #2
```

A connection pool may replace this arrangement later as the number of concurrent database workloads grows.

---

# Planned Historical Data Flow

The bulk `/5m` endpoint is used for ongoing market collection.

Individual timeseries endpoints will be used primarily for historical backfilling.

For example:

```text
User requests Dragon axe history
             |
             v
Do we have sufficient local history?
        |               |
       yes              no
        |               |
        v               v
 PostgreSQL      Wiki timeseries API
                        |
                        v
                  historical backfill
                        |
                        v
                    PostgreSQL
```

After an item has been backfilled, the continuous `/5m` collector extends its history.

Eventually:

```text
historical Wiki data
        +
locally collected data
        |
        v
long-term local market history
```

---

# Planned Live Updates

Live frontend updates will eventually use WebSockets.

The browser will subscribe to an item rather than repeatedly downloading the entire chart.

```text
Browser
   |
   | subscribe: 6739
   v
WebSocket
   |
   v
Backend
   |
   v
LatestPriceStore
```

When the collector detects a new market state:

```text
/5m update
    |
    v
LatestPriceStore
    |
    +--> PostgreSQL
    |
    +--> WebSocket subscribers
```

The existing historical chart remains loaded while only new points are pushed to the browser.

---

# Development

Start the development environment:

```bash
docker compose up
```

Build the C++ backend inside the development container:

```bash
docker compose exec backend cmake --build build
```

Restart the backend:

```bash
docker compose restart backend
```

Follow backend logs:

```bash
docker compose logs -f backend
```

Recent logs only:

```bash
docker compose logs --since=30s backend
```

---

# API

Current example item endpoint:

```text
GET /api/items/6739
```

Example response:

```json
{
    "buyLimit": 40,
    "examine": "A very powerful axe.",
    "highAlch": 33000,
    "icon": "/icons/6739.png",
    "id": 6739,
    "lowAlch": 22000,
    "members": true,
    "name": "Dragon axe",
    "value": 55000
}
```

Item icons:

```text
GET /icons/6739.png
```

Additional market and historical endpoints are under development.

---

# Data Source

Market and item data are sourced from the RuneScape Wiki / RuneLite real-time price APIs.

This project is not affiliated with Jagex, RuneScape, RuneLite, or the RuneScape Wiki.

Old School RuneScape and RuneScape are trademarks of Jagex Ltd.

---

# Project Goals

This project is primarily being developed to explore and practice:

- Modern C++ application architecture
- HTTP services in C++
- Concurrent background workers
- Producer/consumer job queues
- PostgreSQL from C++
- Time-series market data
- In-memory caching
- REST API design
- WebSockets
- Dockerized C++ development
- Production deployment
- React/C++ integration