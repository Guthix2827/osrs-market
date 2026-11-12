# OSRS Market — Virtual Merch Engine

> **Status:** Planned / not yet implemented. This README is a proposed design, not a description of running functionality.

## Overview

The Virtual Merch Engine is a standalone service for a continuous, virtual Old School RuneScape (OSRS) merching game. Registered users receive an equal starting balance of virtual GP, buy and sell simulated items using real OSRS market price observations, build portfolios, and compete on global hiscores. No real GP, real-money purchases, or RuneScape account integration are involved.

The game operates continuously, with no scheduled competitions, seasonal resets, or automatic account wipes. However, **virtual trading is temporarily suspended whenever Old School RuneScape is offline for maintenance, game updates, or other service interruptions that prevent Grand Exchange trading**.

During these periods, the simulator enters **read-only mode**. Players can still access their portfolios, holdings, trade history, and leaderboards, but buying, selling, placing offers, and executing pending orders are suspended. Existing offers remain pending and resume processing once Grand Exchange activity and reliable market data are restored.

Trading availability is controlled by the backend, using reliable game-status signals and market-data freshness checks. Trading must not automatically resume solely because the game servers are online; valid market activity must also be confirmed.

Bot traders follow the same restrictions as human players and must never receive privileged prices or future market data. All bots must be clearly identified as bots.

**Trading model:** OSRS items remain items, **not stocks or shares**. Virtual players do not exchange items with one another or affect real GE prices. Each player has an independent portfolio and simulated liquidity allowance, while all players are constrained by the same observed OSRS market activity and official GE buy-limit rules. Buying and selling can involve immediate attempts, custom-priced offers, waiting, and partial fills.

## Architecture decision

**Recommended initially: one existing PostgreSQL server, two separate databases.**

- `osrs_market`: existing item mapping, latest prices, history, backfill, and analytics.
- `virtual_merch`: balances, holdings, orders, executed fills, per-player liquidity usage, leaderboard snapshots, and bot state.
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

1. Fair, continuous virtual trading using real OSRS market price **and volume** observations, with no imaginary unlimited liquidity.
2. A clear portfolio showing available/reserved GP, holdings, open offers, total equity, and realized/unrealized profit.
3. Global hiscores for registered users and visibly labeled bots.
4. Server-authoritative, auditable order placement, partial fills, cancellation, and liquidity/GE-limit enforcement.
5. Bots that seek modest profit but remain beatable by skilled players.
6. Minimal personal information: store only stable internal identity references and game-related data.

### Non-goals for the first release

- Real GP transactions, real RuneScape accounts, or cash prizes.
- RuneLite plugin tracking or verification of actual GE trades.
- Seasons, matchmaking, leveraged trading, short selling, or derivatives.
- A stock exchange, player-to-player order matching, player-driven item prices, high-frequency market simulation, or an invented live order book.

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
| Trading model | **Volume-limited OSRS trading**, not stocks or an exchange between players |
| Trade choices | **Instant** market-price attempt or **custom-priced limit offer**, for both buying and selling |
| Instant buy price | Latest valid **instant-buy/high** observation |
| Instant sell price | Latest valid **instant-sell/low** observation |
| Limit order price | Player specifies maximum GP per item when buying or minimum GP per item when selling |
| Execution | Server-authoritative; orders may remain open and fill partially over multiple market observations |
| GE tax | **None** in the virtual game |
| Positions | Long-only; no negative holdings or short selling |
| Cash and inventory | No negative cash or inventory; reserve resources for open offers |
| Official GE buy limits | **Enforce the item's rolling 4-hour buy limit** on filled purchases; do not apply it to sales |
| Hourly/daily liquidity | Rolling **1-hour and 24-hour** volume checks and a per-player/per-item consumption ledger |
| Maximum market participation | Permit up to **100% of eligible observed market volume per player**, subject to all other rules; this is a ceiling, not an instant-fill guarantee |
| Shared item supply | **None** between players: one player's fills do not reduce another player's virtual market allocation |
| Market freshness | No execution against missing, stale, or invalid price/volume observations |
| Trading hours | Continuous while usable observations are available |
| Account resets | None automatically |

The names of instant-buy and instant-sell prices must be checked against the existing backend's convention before implementation. The buyer pays the higher observed executable price; the seller receives the lower. This spread makes immediate round trips unprofitable by default.

### Trading model: independent portfolios, real-market liquidity

**Do not build a stock exchange.** There are no synthetic shares, user-to-user transfers, or player-controlled market quotes. The public OSRS price and volume feed provides the external reference market. Every player has their **own** GP, item inventory, pending offers, and volume usage.

- An observed **24-hour traded volume** is a measure of activity, **not** 24-hour inventory ready for instant purchase. Do not award the full trailing 24-hour volume as a fresh, reusable pool each time the player opens the drawer.
- For each player, item, and trade side, account for volume already consumed by that player's fills. Consume eligible **new market-volume observations** at most once per player, even if the engine polls or retries them multiple times.
- Apply both **rolling 1-hour and rolling 24-hour** participation ceilings. A proposed maximum participation factor of **100%** allows a player to eventually simulate up to the eligible observed activity, never more; the implementation must also respect the observed incremental volume, item direction, funds/inventory, and GE restrictions.
- Model the source's high-price/low-price volume series with their respective market sides. Verify their documented meaning before using them as side-specific execution capacity; never count one observation twice or assume that volume proves an exact order-book depth.
- **Buy and sell liquidity** are each constrained by relevant observed activity. A player may not buy and immediately sell unlimited quantities to recycle a historical volume allowance.
- Different players may consume their **independent simulated allowances** from the same real-world observation. There is no global virtual item stock or cross-player contention, but every player obeys the same algorithm.
- **Buy limit:** count the player's actually filled buys over the preceding four hours, by item. Placing, cancelling, or splitting orders must not reset the official GE buy-limit budget. Selling does not restore it.
- Use price-validity, cash/inventory, and sensible anti-abuse/max-open-order rules in addition to volume and buy limits. Large requested orders may be accepted as pending (subject to reservations and a bounded maximum), not filled immediately.

**Illustrative scenario:** Assume 600 Abyssal whips were traded in the preceding 24 hours, the player requests 1,000, and the item's official GE buy limit is 8 per four hours. The player's order can remain pending for the excess, but **600 does not fill instantly** merely because 600 traded historically. Even with sufficient new qualifying volume, no more than 8 can fill during the relevant rolling four-hour buy-limit window. Further fills wait for new eligible activity and the limit to permit them. The player is competing on timing and price, not for a shared stock of 600 virtual whips.

### Instant trades and custom-priced offers

- **Instant buy/sell:** attempt an immediate fill at the latest valid side-specific market price, limited by eligible liquidity and other constraints. Any unfilled remainder should become pending or be cancelled according to an explicit, documented order policy; never silently pretend the full quantity filled.
- **Custom buy offer (bid):** set a **maximum** price and quantity. It becomes eligible only when a usable observed instant-buy/high price is **at or below** the player's limit, and market-volume/buy-limit checks allow filling.
- **Custom sell offer (ask):** set a **minimum** price and quantity. It becomes eligible only when a usable observed instant-sell/low price is **at or above** the player's limit, and sufficient inventory and market volume exist.
- **Partial fills:** each successful execution has its own quantity, execution price, price observation timestamp, and execution timestamp. Remaining quantity stays open until filled, cancelled, or expired by a future policy.
- **Price improvements:** execute at the valid observed price, not automatically at the player's less favorable limit price; release unused reserved GP from completed buy fills.
- **No invented order book:** Wiki high/low values and volumes are observations, not a guaranteed best bid/ask with available depth. Filling at these prices is a **documented simulation**, not a representation of an actual GE matching engine.
- **No market manipulation via virtual trades:** virtual orders and fills do not move OSRS prices and must not directly affect another player's prices or order eligibility.

**Open question — instant-fill responsiveness:** decide whether v1 consumes **only newly observed eligible volume** (strict and reproducible, but a new order may wait for the next feed update), or uses a **small, configurable immediate-fill allowance derived from recent activity**, with deduplication and anti-recycling safeguards. Do **not** turn the entire trailing 24-hour volume into a guaranteed instant fill. The same liquidity accounting must be used for bots and humans.

### Order lifecycle and reservations

1. Accept an authenticated and idempotent order request; validate the item, side, price, quantity, and limits.
2. For a buy offer, reserve sufficient GP at the order's maximum limit price (or a conservative quoted maximum for an instant order). For a sell offer, reserve the requested quantity already owned. Reject offers that cannot be funded/reserved.
3. Store the order as `open`; evaluate it against trusted price/volume updates using a background worker. A market-price order may attempt immediate execution first.
4. In a single atomic database transaction per fill, recheck order state, price eligibility, observed-volume usage, rolling windows, GE buy-limit capacity, and available reserved resources; then update order quantities, wallet/inventory, consumed-liquidity accounting, and the immutable fill record.
5. Mark the order `partially_filled` or `filled`; keep the unfilled remainder open under the selected order policy. On cancellation or expiry, release unused GP or inventory **without undoing completed fills**.
6. Supported states should include `open`, `partially_filled`, `filled`, `cancelled`, `expired`, and `rejected`. The client receives quantities `requested`, `filled`, and `remaining` rather than a false yes/no completion.

Concurrent fills, cancellations, retries, and multiple open offers must not double-spend GP, oversell items, exceed GE limits, or consume one observation twice. Order placement must not produce GP or inventory changes other than reservations until a fill actually executes.

### Price and volume validation

At order evaluation/fill time, the server must:

1. Retrieve authoritative market prices, high/low volume deltas, observation identifiers/timestamps, and current item eligibility.
2. Reject unknown, removed, invalid, or otherwise non-tradable items.
3. Reject or defer missing, zero, negative, inverted, or stale price observations (choose a configurable freshness threshold, initially e.g. 10 minutes). Handle absent or unreliable volume data conservatively; never interpret missing volume as unlimited.
4. Apply a documented outlier/stale-feed policy. The client cannot choose a historical market price to execute a current order.
5. Deduplicate observations using a stable source key such as `(item_id, interval_start, side, source_revision)` or a verified monotonically increasing observation identifier; do not refill from the same volume after restarts or poll retries.
6. Store the **exact observed execution price and source observation timestamp** on every fill, as well as actual execution time and order ID.
7. Defer fills safely during market-feed outages rather than using an invented fallback price or quantity.

### Atomic execution and timestamps

Use PostgreSQL transactions and row-level locking (or equivalent serialization) over the affected order, wallet, holdings, item-specific GE limit, and player-specific consumed-liquidity state. Idempotency applies to **order creation** and to **individual fill processing** so repeated jobs cannot duplicate executions.

Store integer GP amounts and integer item quantities; use checked arithmetic or PostgreSQL `NUMERIC` for potentially large multiplication and aggregates. Never use floating-point arithmetic for GP balances.

Use `TIMESTAMPTZ` consistently and return timestamps in **UTC (GMT+0)** ISO 8601 format, with `Z` or an explicit offset. The frontend renders dates in the viewer's browser timezone using **`DD-MM-YYYY HH:mm`**. Both offer placement and fill execution times should be available for histories and debugging.

## Portfolio accounting

- **Available GP:** virtual cash not reserved for open buy orders.
- **Reserved GP:** GP committed to pending buy orders; still owned by the player until a fill executes.
- **Holdings:** total owned item quantities with cost basis, distinguishing freely sellable from quantities reserved in open sell orders.
- **Holdings market value:** value **all currently owned items, including sell-reserved items**, using a documented price, preferably current executable sell/low for conservative liquidation value.
- **Net worth / equity:** `available GP + reserved GP + sum(all owned quantity × current valuation price)`. Avoid counting reserved item value or cash twice.
- **Total ROI:** `(equity - starting_balance) / starting_balance × 100` where no other cash flows exist.
- **Trading Profit (realized P&L):** from completed sells using a documented cost basis (recommend weighted average initially).
- **Holdings Profit (unrealized P&L):** value of unsold items at the valuation price minus their remaining cost basis.
- **Total Profit:** `equity - starting_balance` under the current no-deposit/no-withdrawal rules.

Prefer approachable frontend labels such as **Holdings Profit**, **Trading Profit**, and **Total Profit**, while preserving precise accounting field names internally. Use the same conservative valuation basis for all leaderboard participants. Orders themselves do not create profit; only actual fills affect cost basis, cash spending/proceeds, and holdings.

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

- Bots and humans use the **same price/volume feed, no-tax rules, GE buy limits, per-player liquidity accounting, reservations, order lifecycle, and fill execution path**.
- No future candles, hidden market information, direct balance edits, guaranteed profitable trades, or privileged fills.
- Randomness may affect decisions, but not execution prices. Seed random generators for reproducible tests.
- Enforce maximum position size, cash reserve, cooldowns, daily trade caps, and stop/exit heuristics.
- Run bots at modest, varied intervals; do not continuously react faster than humans can reasonably access the data.
- Aim for modest, variable results; **do not guarantee profitability**. Some bots should lose money during unfavorable markets.
- Keep bot strategies and performance observable in admin logs, with a switch to disable all bots.
- Clearly disclose bot presence in the game UI and documentation.

### Bot execution

Prefer a scheduler/worker inside the engine (or a dedicated worker container using the same engine library). Bots place/cancel **orders through the same order service** as humans, and all fills pass through the same evaluator; bots must not directly update balances, item positions, liquidity usage, or prices.

## Proposed database schema

These are conceptual tables; refine constraints, indexes, and cleanup/partitioning policies in migrations. **Keep market price and volume history in the existing `osrs_market` database**; the virtual service records only references/checkpoints and actual player activity rather than copying market observations for every player.

| Table | Key fields | Purpose |
| --- | --- | --- |
| `players` | `id`, `auth_subject` unique nullable for bots, `display_name`, `is_bot`, `created_at`, `status` | Human and bot identities |
| `wallets` | `player_id` PK/FK, `available_gp`, `reserved_gp`, `starting_gp`, `updated_at` | Virtual cash and order reservations |
| `holdings` | `player_id`, `item_id`, `quantity`, `reserved_quantity`, `cost_basis_gp`, `updated_at` | Owned positions and sell reservations; unique `(player_id,item_id)` |
| `orders` | `id`, `player_id`, `item_id`, `side`, `order_type`, `limit_price_gp`, `requested_quantity`, `filled_quantity`, `status`, `reserved_gp`, `created_at`, `updated_at`, `closed_at`, `idempotency_key` | Active/completed instant and custom offers, their reservations, and lifecycle |
| `fills` | `id`, `order_id`, `player_id`, `item_id`, `side`, `quantity`, `unit_price_gp`, `total_gp`, `source_observation_key`, `price_observed_at`, `executed_at` | Immutable execution records; may be multiple per order |
| `volume_usage` | `player_id`, `item_id`, `side`, `source_observation_key`, `consumed_quantity` | Sparse per-player consumption of eligible source volume; unique key avoids reusing the same observation |
| `leaderboard_snapshots` | `id`, `calculated_at`, `price_snapshot_at`, `status` | Consistent ranking batches |
| `leaderboard_entries` | `snapshot_id`, `player_id`, `rank`, `equity_gp`, `cash_gp`, `holdings_value_gp`, `roi_basis_points` | Precomputed hiscores |
| `bot_profiles` | `player_id`, `strategy`, `config_json`, `enabled`, `next_run_at`, `rng_seed` | Bot behavior and scheduling |
| `schema_migrations` | `migration`, `executed_at` | Independent migration tracking |

Additional implementation notes:

- Enforce nonnegative wallet cash, available item quantities, reservations, and fill counts; check `filled_quantity <= requested_quantity` and `reserved_quantity <= quantity`. Do not allow an order to reserve more money or stock than exists.
- Use unique `(player_id,idempotency_key)` for orders, and a separate unique worker/observation execution identifier for fills. Use foreign keys inside `virtual_merch` only.
- Index active orders by `(item_id, side, status)`, fills by `(player_id, item_id, executed_at)`, and observed-volume usage by `(player_id, item_id, side, source_observation_key)`; choose the precise structure based on worker query plans.
- Derive rolling 4-hour purchased quantity from indexed fills or maintain a **transactionally consistent** rolling counter. A counter cannot be updated separately from its fills.
- `volume_usage` should be **sparse**: create rows only when a player actually consumes an observation. Use compact, deduplicated observation IDs and aggregate safe same-interval fills where appropriate. Retention/compaction must preserve the ability to enforce current rolling limits and audit filled trades.
- Over time, archive/partition old fill data if needed; do not create a synthetic market tick per user per item per poll. Market observations remain shared, not per-user copies.
- Avoid storing email addresses or external account secrets in this database.

**Storage principle:** Complexity and growth come primarily from orders and actual fills, not from treating items like shares. A player with one order and ten partial fills needs one order row and ten execution records, not a duplicate historical market dataset.

## Suggested HTTP API (draft)

All responses should be JSON. Exact shapes and naming are subject to implementation. Use the same authenticated, server-authoritative order service for humans and bots.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/merch/config` | Public | Rules, starting balance, enabled features and volume/GE restrictions |
| `GET` | `/api/merch/leaderboard?scope=all&limit=50` | Public | Current hiscores and snapshot timestamp |
| `GET` | `/api/merch/players/{id}` | Public | Public profile/game stats (privacy-filtered) |
| `GET` | `/api/merch/me` | Required | Available/reserved GP, holdings, equity, profit, rank |
| `GET` | `/api/merch/me/orders?status=open` | Required | Open, partially filled, and historic orders with remaining quantities |
| `POST` | `/api/merch/orders` | Required | Place an instant or custom-priced buy/sell offer |
| `POST` | `/api/merch/orders/{id}/cancel` | Required | Cancel outstanding quantity and release unused reservations |
| `GET` | `/api/merch/me/trades` | Required | Paginated personal fill/trade history |
| `GET` | `/api/merch/items/{id}/quote` | Public | Observed buy/sell prices, source timestamp, and indicative volume/buy-limit information |
| `GET` | `/api/merch/health` | Internal/ops | Health and feed/worker status |

Example **custom buy offer**:

```json
{
  "item_id": 13387,
  "side": "buy",
  "order_type": "limit",
  "quantity": 8,
  "limit_price_gp": 2100,
  "idempotency_key": "client-generated-unique-request-id"
}
```

For an instant offer use `"order_type": "instant"` and omit `limit_price_gp`. The server determines the authenticated player, observed prices, actual fill quantity, eligible liquidity, execution timestamps, and status. Responses should include `order_id`, `status`, `requested_quantity`, `filled_quantity`, `remaining_quantity`, and any successful fills or next-step explanation.

Structured errors may include `INSUFFICIENT_FUNDS`, `INSUFFICIENT_ITEMS`, `STALE_PRICE`, `STALE_VOLUME`, `INVALID_ITEM`, `INVALID_LIMIT_PRICE`, `GE_BUY_LIMIT_REACHED`, `VOLUME_LIMIT_REACHED`, `ORDER_NOT_CANCELLABLE`, etc. Hitting a fill limit on an otherwise valid pending order is generally a **waiting state**, not a reason to falsely mark it completed. Apply authorization, idempotency, and request rate limiting to write endpoints.

## Frontend — compact item-page Trade drawer

- **Reuse the existing Item Page** for charts, high/low prices, bought-vs-sold volume, and market statistics. Do not duplicate those features in a standalone trading dashboard.
- Add an explicit **Trade** action to the item page without changing the existing Watch or Share functionality.
- Open a **separate right-side overlay drawer**, independent of the existing left-side Watchlist drawer; darken the background, keep the page layout unchanged, and close on X, outside click, or Escape. Approximately 440–480 px wide on desktop, responsive on mobile.
- Keep controls compact: item/icon/title, Buy/Sell switch, Instant/Custom-price choice, unit price (editable for limit offers), quantity and shortcuts, estimated total, available GP, owned quantity, and a **Place Offer** action.
- Show concise feedback for **eligible now**, **waiting for price/volume**, partial fills, and the GE buy limit. Avoid guaranteeing an execution time or showing an invented order book/market depth.
- **Do not add Recent Trades to the drawer.** The Portfolio screen contains **Holdings**, **Trade History**, and **Open Offers**, including filled/remaining quantities, status, and cancellation.
- Frontend mock data may demonstrate this layout before backend integration; do not present mock fills or prices as live executions.

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
7. Add structured logs and metrics for order/fill status, partially filled orders, liquidity/GE-limit blocks, observation deduplication, bot decisions, price/volume freshness, and leaderboard refresh latency.

## Testing priorities

- Atomic concurrent order placements, fills, cancellations, and reservation releases cannot overspend or oversell.
- Duplicate order idempotency keys and retried worker jobs never create duplicate fills.
- Open orders only fill after **eligible observed prices and newly available deduplicated volume**, including custom bids/asks that cross their price limits.
- Re-polling the same volume observation, restarting the engine, or flipping buy/sell repeatedly cannot create extra virtual liquidity.
- Rolling 1-hour/24-hour usage is calculated correctly across clock-hour/day boundaries and daylight saving changes; historical 24h volume is **not** a reusable instant stockpile.
- Four-hour GE buy limits are enforced per player/item across partial fills, cancellations, multiple orders, and rolling-window boundaries; selling never resets them.
- One player's consumption of a market observation **does not** reduce another player's separate simulated allowance, but both remain subject to identical per-player rules.
- Valid large orders may remain pending/partially filled rather than filling 100% immediately; remaining quantity and reserved resources reconcile on expiry/cancellation.
- Missing, stale, invalid, or manipulated price/volume data cannot execute a trade.
- Valuation includes reserved GP and reserved-for-sale items exactly once; cost basis, profit, and leaderboard ties are deterministic.
- Bot trading obeys the same price, volume, order, and GE rules as human trading.
- Unauthenticated users cannot trade or access private portfolios.
- Server restarts preserve orders, reservations, fill history, and consumed-liquidity accounting.
- A price/volume-feed outage safely defers new fills without corrupting existing holdings.
- All stored timestamps remain UTC; the frontend formats them in the user's local timezone as `DD-MM-YYYY HH:mm`.

## Implementation roadmap

### Phase 0 — Trading UX and rules (mock frontend)
- Reuse the existing item page and implement a compact, **independent** right-side Trade overlay drawer (not a second full trading screen or a combined Watchlist drawer).
- Mock Buy/Sell, Instant/Custom offer, quantity, estimated cost, open/partial-fill feedback, and portfolio Open Offers alongside existing Holdings and Trade History.
- Finalize source volume semantics, rolling-limit behavior, and the instant-fill policy before implementing real fills.

### Phase 1 — Foundation
- New service, database, migrations, auth verification, trusted price/**volume** feed, and health endpoint.
- Register players with a starting virtual balance; establish UTC timestamp conventions and feed observation identities.

### Phase 2 — Orders, liquidity engine, and portfolio
- Implement orders, GP/item reservations, partial fills, cancellation, and immutable execution records.
- Enforce official rolling four-hour buy limits, side-aware observed-volume availability, per-player rolling one-hour/24-hour usage, deduplication, and item/price freshness.
- Implement portfolio valuation, available/reserved balances, open offers, and trade history.
- Test concurrency, idempotency, no-liquidity waiting, source outages, and accurate accounting.

### Phase 3 — Hiscores
- Periodic leaderboard snapshots, public overall/human/bot views, player rank, and profiles.
- Integrate the frontend portfolio/trade drawer and hiscores screens with the real API.

### Phase 4 — Bots
- Add a small number of clearly labeled bots with varied strategies.
- Bots submit and cancel orders via the exact same market/limit execution path as humans; no future-data leakage or guaranteed returns.

### Phase 5 — Polish and scalability
- Refine liquidity policies, status explanations, optional order expiry, abuse controls, observability, database indexes/retention, worker performance, and deployment automation.

## Decisions to finalize before coding

1. Starting balance (proposed: **100M virtual GP**).
2. **Instant order liquidity policy:** strictly new observations vs a **small pre-funded immediate allowance** derived from recent activity; 24-hour volume is never a guaranteed fill pool.
3. Verify the source feed's high/low volume semantics and choose **exact observation keys, eligible side-specific fill quantities, and anti-recycling rules**.
4. Choose precise rolling **1-hour/24-hour** capacity formulas and whether to cap single-order size beyond resources and official GE limits. Proposed maximum participation: **100% per player** of eligible observed volume (not shared stock).
5. Handling of items with missing/unreliable volume or missing official four-hour GE limits; default should be conservative rather than unlimited.
6. Exact price/volume freshness threshold, item eligibility, optional order expiry, and whether an unfilled instant-order remainder stays pending or is cancelled.
7. Portfolio valuation during missing/stale prices and reservation accounting presentation.
8. Public display-name policy, inactive account ranking, and bot count/cadence/strategies.
9. New repository vs independent service in the existing monorepo.

**Agreed direction:** OSRS items, **not stocks**; independent player portfolios; real price and volume observations; official four-hour GE purchase limits; instant and custom orders; possible partial fills; no GE tax; leaderboard competition without player-to-player market impact. All dates stored as UTC and displayed locally.

---

**Disclaimer:** This is a fan-made virtual game and analytics project, not affiliated with Jagex. All trades and balances are simulated; they do not affect the real Old School RuneScape Grand Exchange.