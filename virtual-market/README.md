# OSRS Market — Virtual Merch Engine

> **Status:** Planned / not yet implemented. This README is a proposed design, not a description of running functionality.

## Overview

The Virtual Merch Engine is a standalone service for a continuous, virtual Old School RuneScape (OSRS) merching game. Registered users receive an equal starting balance of virtual GP, buy and sell simulated items using real OSRS market price observations, build portfolios, and compete on global hiscores. No real GP, real-money purchases, or RuneScape account integration are involved.

The game is **always available**: no scheduled competitions, seasonal resets, or automatic account wipes are required. Bot traders populate the game initially, but must be clearly marked as bots and must never receive privileged prices or future market data.

## Architecture decision

**Recommended initially: one existing PostgreSQL server, two separate databases.**

- `osrs_market`: existing item mapping, latest prices, history, backfill, and analytics.
- `virtual_merch`: balances, holdings, trades, orders (if implemented), leaderboard snapshots, and bot state.
- Use **separate database roles, credentials, migrations, and connection pools** for each service. Do not share a single application DB connection between services.
- The trading engine should access market prices through a narrowly defined internal price API or a read-only price feed published by the market backend. Avoid granting the engine write access to `osrs_market`.
- PostgreSQL databases on the same server share CPU, memory, disk, and availability. They are logically isolated, **not** infrastructure-isolated. A separate PostgreSQL instance may be appropriate later for scaling, maintenance, or stronger fault isolation.
- PostgreSQL does not support ordinary foreign keys or joins across separate databases. Copy only necessary immutable item metadata or reference item IDs; do not design cross-database foreign keys.

```text
Browser / React frontend
          |
          v
Nginx Proxy Manager / application reverse proxy
          |                         |
          v                         v
Existing market backend       Virtual Merch Engine (C++20 / Crow)
  - item metadata              - trading rules and execution
  - latest prices              - portfolios and balances
  - price history              - global hiscores
  - price feed/API             - bot scheduler
          |                         |
          v                         v
    PostgreSQL server (existing instance)
       osrs_market DB       virtual_merch DB

Existing auth/session service -> trusted identity verification for engine
```

Suggested routes: `/api/merch/*` proxied to the trading engine. Internal service-to-service traffic should remain on a private Docker network. Choose the final route prefix to avoid collisions with existing APIs.

## Goals

1. Fair, continuous virtual trading using OSRS market prices.
2. A clear portfolio showing cash, holdings, total equity, and realized/unrealized P&L.
3. Global hiscores for registered users and visibly labeled bots.
4. Server-authoritative, auditable trade execution.
5. Bots that seek modest profit but remain beatable by skilled players.
6. Minimal personal information: store only stable internal identity references and game-related data.

### Non-goals for the first release

- Real GP transactions, real RuneScape accounts, or cash prizes.
- RuneLite plugin tracking or verification of actual GE trades.
- Seasons, matchmaking, leveraged trading, short selling, or derivatives.
- High-frequency market simulation or an artificial order book.

## Authentication and player identity

- Reuse the existing FusionAuth/Node auth flow where possible.
- **Never trust a user ID provided in a request body or query string.** Resolve identity from a verified session or access token using a documented trust boundary (for example, an authenticated gateway or direct JWT verification).
- Verify token issuer, audience, signature, expiry, and applicable authorization. Do not trust identity headers from the public internet.
- Create a `players` record on first authenticated use, with a unique stable `auth_subject` identifier.
- Public leaderboard display names should be distinct from authentication identifiers; enforce uniqueness or use a disambiguator.
- Bots are internal `players` with `is_bot = true` and cannot authenticate as human accounts.

## Initial game rules (proposed defaults)

| Rule | Proposed behavior |
| --- | --- |
| Starting balance | 100,000,000 virtual GP per account; configurable before launch |
| Trading mode | Instant, server-executed virtual buy/sell |
| Buy price | Latest valid **instant-buy/high** observation |
| Sell price | Latest valid **instant-sell/low** observation |
| GE tax | **None** in the virtual game |
| Positions | Long-only; no negative item balances |
| Cash | No negative cash balance |
| Trade quantities | Positive integers, bounded by available cash/inventory and per-trade limits |
| Buy limits | Decide explicitly whether to enforce OSRS 4-hour buy limits; recommended for fairness, but not required for a prototype |
| Trading hours | Continuous, when valid market prices are available |
| Account resets | None automatically |

The naming of instant-buy and instant-sell prices must be checked against the existing backend's convention before implementation. The buyer pays the higher executable price; the seller receives the lower executable price. The spread therefore makes repeated buy/sell loops unprofitable by default.

### Price validation

At execution time, the server must:

1. Retrieve the authoritative latest item price and its source timestamp.
2. Reject unknown, removed, invalid, or otherwise non-tradable items.
3. Reject missing, zero, negative, inverted, or stale prices (choose a configurable freshness threshold, initially e.g. 10 minutes).
4. Apply a documented outlier/stale-feed policy. Do not let the client choose a historical price for a current trade.
5. Persist the **exact observed price and observation timestamp** used for the fill, along with execution time.
6. Reject or defer trades when the feed is unavailable rather than silently filling at arbitrary fallback prices.

For launch, use market-observation prices as a **simulation**, not a claim that those quantities would have filled on the actual Grand Exchange. Large virtual orders should be bounded by quantity/value limits; optional future liquidity or slippage rules can improve realism.

### Atomic execution

A trade is one database transaction: lock the player's wallet/position as needed, validate funds or inventory, update balances, insert the immutable trade record, and commit. Concurrent requests must not overspend cash or oversell inventory.

Use a client-generated idempotency key scoped to the player to prevent accidental duplicate fills on retries. Store integer GP amounts and integer item quantities; use checked arithmetic or PostgreSQL `NUMERIC` for potentially large multiplication and aggregates. Never use floating-point arithmetic for GP balances.

## Portfolio accounting

- **Cash:** available virtual GP.
- **Holdings:** quantity of each item and cost basis.
- **Portfolio market value:** value of holdings at a documented valuation price, preferably current executable sell/low price for conservative liquidation value.
- **Net worth / equity:** `cash + sum(quantity × current valuation price)`.
- **Total ROI:** `(equity - starting_balance) / starting_balance × 100`.
- **Realized P&L:** from completed sells using a documented cost basis method (recommend weighted-average cost initially).
- **Unrealized P&L:** current liquidation value of holdings minus their remaining cost basis.

Display the leaderboard's valuation basis and last price refresh time. If a held item has no valid price, mark the valuation stale and define a conservative, consistent policy rather than silently dropping its value or assigning an invented price.

## Global hiscores

### Primary ranking

Rank by **current net worth**, descending, with deterministic tie-breakers (e.g. earliest time reaching the score, then player ID). Also show ROI, cash, holdings value, and rank. A separate ROI view is optional; net worth and ROI are equivalent rankings when all accounts start with the same balance and no deposits or resets exist.

### Recommended views

- **Overall:** all eligible participants, including clearly labeled bots.
- **Players only:** human accounts, for meaningful competition as the user base grows.
- **Bots:** optional separate listing or filter.
- **My rank:** authenticated player's rank and nearby competitors.

Bot accounts must always carry a visible **BOT** label. Never present bot trades or accounts as real people. Do not manipulate bot profits or leaderboard ordering to make the game appear busier.

### Performance and integrity

- Compute portfolio valuations from a consistent price snapshot or batch, then persist leaderboard snapshots periodically (e.g. every 5 minutes).
- Use a stable snapshot ID and `calculated_at` timestamp so pagination does not reorder between requests.
- Support cursor pagination for larger leaderboards; index ranking/snapshot fields.
- Avoid recalculating every holding for every visitor request.
- Define eligibility for inactive users, banned accounts, and invalid item valuations before launch.

## Bot traders

Bots are internal game participants used to make the early leaderboard feel active. Their purpose is to model plausible, imperfect merching strategies—not to defeat human players.

### Strategies

| Strategy | Behavior | Intentional weaknesses |
| --- | --- | --- |
| Conservative flipper | Trades liquid items when spreads and short-term conditions look favorable | Low trade frequency; small position sizes; often misses opportunities |
| Trend follower | Buys after sustained positive momentum and exits on weakness | Enters late; suffers reversals and spread costs |
| Value / mean-reversion | Buys after unusually large declines relative to recent history | Can catch falling prices; holds losing positions too long |
| Diversified casual | Spreads funds over a few familiar items | Slow to react; sometimes chooses mediocre opportunities |

### Fairness requirements

- Bots and humans use the **same price feed, fees (none), quantity rules, execution path, and freshness checks**.
- No future candles, hidden market information, direct balance edits, guaranteed profitable trades, or privileged fills.
- Randomness may affect decisions, but not execution prices. Seed random generators for reproducible tests.
- Enforce maximum position size, cash reserve, cooldowns, daily trade caps, and stop/exit heuristics.
- Run bots at modest, varied intervals; do not continuously react faster than humans can reasonably access the data.
- Aim for modest, variable results; **do not guarantee profitability**. Some bots should lose money during unfavorable markets.
- Keep bot strategies and performance observable in admin logs, with a switch to disable all bots.
- Clearly disclose bot presence in the game UI and documentation.

### Bot execution

Prefer a scheduler/worker inside the engine (or a dedicated worker container using the same engine library). Bot decisions call the **same trade execution service** as human requests; they must not update balances directly.

## Proposed database schema

These are conceptual tables; refine constraints and indexes in migrations.

| Table | Key fields | Purpose |
| --- | --- | --- |
| `players` | `id`, `auth_subject` unique nullable for bots, `display_name`, `is_bot`, `created_at`, `status` | Human and bot identities |
| `wallets` | `player_id` PK/FK, `cash_gp`, `starting_gp`, `updated_at` | Virtual cash |
| `holdings` | `player_id`, `item_id`, `quantity`, `cost_basis_gp`, `updated_at` | Current positions; unique `(player_id,item_id)` |
| `trades` | `id`, `player_id`, `item_id`, `side`, `quantity`, `unit_price_gp`, `total_gp`, `price_observed_at`, `executed_at`, `idempotency_key` | Immutable audit log |
| `leaderboard_snapshots` | `id`, `calculated_at`, `price_snapshot_at`, `status` | Consistent ranking batches |
| `leaderboard_entries` | `snapshot_id`, `player_id`, `rank`, `equity_gp`, `cash_gp`, `holdings_value_gp`, `roi_basis_points` | Precomputed hiscores |
| `bot_profiles` | `player_id`, `strategy`, `config_json`, `enabled`, `next_run_at`, `rng_seed` | Bot behavior and scheduling |
| `schema_migrations` | `migration`, `executed_at` | Independent migration tracking |

Suggested constraints: nonnegative wallet cash, nonnegative holdings quantities, positive trade quantity/price, enum/check for trade side, unique `(player_id,idempotency_key)`, and foreign keys within `virtual_merch`. Avoid storing email addresses or external account secrets in this database.

If introducing **pending orders** later, add an `orders` table and explicit order lifecycle; the initial instant-trade design does not need it.

## Suggested HTTP API (draft)

All responses should be JSON. Exact shapes and naming are subject to implementation.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/merch/config` | Public | Rules, starting balance, enabled features |
| `GET` | `/api/merch/leaderboard?scope=all&limit=50` | Public | Current hiscores, snapshot timestamp |
| `GET` | `/api/merch/players/{id}` | Public | Public profile and game stats (privacy-filtered) |
| `GET` | `/api/merch/me` | Required | Wallet, holdings, equity, P&L, rank |
| `GET` | `/api/merch/me/trades` | Required | Paginated personal trade history |
| `POST` | `/api/merch/trades` | Required | Execute a virtual buy/sell |
| `GET` | `/api/merch/items/{id}/quote` | Public | Latest executable virtual buy/sell quote and timestamp |
| `GET` | `/api/merch/health` | Internal/ops | Health status |

Example trade request:

```json
{
  "item_id": 4151,
  "side": "buy",
  "quantity": 2,
  "idempotency_key": "client-generated-unique-request-id"
}
```

The server determines the user, execution price, total cost, and trade timestamp. Return the completed fill or a structured error (`INSUFFICIENT_FUNDS`, `INSUFFICIENT_ITEMS`, `STALE_PRICE`, `INVALID_ITEM`, `LIMIT_EXCEEDED`, etc.). Apply request rate limiting and authorization to write endpoints.

## Project structure (suggested)

```text
virtual-merch-engine/
├── CMakeLists.txt
├── README.md
├── Dockerfile
├── src/
│   ├── main.cpp
│   ├── api/
│   ├── auth/
│   ├── trading/
│   ├── portfolio/
│   ├── leaderboard/
│   ├── bots/
│   ├── marketdata/
│   └── db/
├── migrations/
├── tests/
└── config/
```

Use C++20, Crow, libpqxx, nlohmann/json, CMake, and Ninja where useful to match the existing project. The engine may live in the same monorepo as a separate deployable service, or in its own repository. A monorepo simplifies coordinated changes early on; deployment and database ownership should remain separate either way.

## Docker / deployment

1. Create database `virtual_merch` and a dedicated least-privilege database role.
2. Add an engine service to Docker Compose, with its own DB connection string, secrets, health check, and restart policy.
3. Route `/api/merch/` to the engine via the existing reverse-proxy arrangement; ensure path handling matches Crow routes.
4. Keep database access and internal price-feed endpoints private to the Docker network.
5. Run migrations on deployment with the same discipline as the existing backend (versioned, idempotent, locked against concurrent migration runners).
6. Back up both databases independently and test restores. A single PostgreSQL server remains a shared failure domain.
7. Add structured logs, metrics for rejected trades, bot decisions, price freshness, and leaderboard refresh latency.

## Testing priorities

- Atomic concurrent buys/sells cannot overspend or oversell.
- Duplicate idempotency keys do not create duplicate fills.
- Stale, missing, invalid, or manipulated prices cannot execute.
- Valuation, cost basis, P&L, and leaderboard ties are deterministic.
- Bot trading obeys exactly the same execution constraints as player trading.
- Unauthenticated users cannot trade or access private portfolios.
- Server restarts preserve all balances and trade history.
- A price-feed outage blocks new trades safely without corrupting existing holdings.

## Implementation roadmap

### Phase 1 — Foundation
- New service, database, migrations, auth verification, price-feed client, health endpoint.
- Register players with a starting virtual balance.

### Phase 2 — Trading and portfolio
- Buy/sell execution, transaction ledger, positions, portfolio valuation, trade history.
- Test concurrency, idempotency, and stale-price behavior.

### Phase 3 — Hiscores
- Periodic leaderboard snapshots, public overall/human/bot views, player rank and profiles.
- Add frontend portfolio and hiscores screens.

### Phase 4 — Bots
- Add a small number of clearly labeled bots with varied strategies.
- Tune only from observed historical data, with no future-data leakage or guaranteed returns.

### Phase 5 — Polish
- Better price freshness indicators, optional trade/buy limits, abuse prevention, observability, performance tuning, and deployment automation.

## Decisions to finalize before coding

1. Starting balance (proposed: **100M virtual GP**).
2. Enforce actual OSRS buy limits or simpler per-trade caps in v1.
3. Exact market price freshness threshold and item eligibility rules.
4. Portfolio valuation during missing/stale prices.
5. Public display name policy and inactive account ranking.
6. Bot count, trade cadence, and strategy parameters.
7. Whether the service is a new repository or an independent service inside the existing monorepo.

---

**Disclaimer:** This is a fan-made virtual game and analytics project, not affiliated with Jagex. All trades and balances are simulated; they do not affect the real Old School RuneScape Grand Exchange.
