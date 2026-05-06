# Fruit Beer Game — Engine Audit

**Sim:** "Fruit Beer Game: A Supply Chain Management Simulation"
**Slug:** `fruit-beer-game`
**Engine file:** `backend/src/services/gameEngines/FruitBeerEngine.ts`
**Tests:** `backend/src/__tests__/FruitBeerEngine.test.ts` ✅ (12 cases, all passing
on 2026-05-06)
**Date:** 2026-05-06

---

## Verdict

**Near-complete.** The engine implements the four-tier supply chain, lead-time
pipelines, cost accumulation, and auto-advance correctly; it is the most
reliable engine on the platform. **Three substantive defects** were found and
**fixed in this session** before UI work began:

1. **Bullwhip-effect metric was a hardcoded `return 1.0`** — the headline
   teaching metric of the entire simulation was not being computed. Fixed:
   now returns per-role σ(orderPlaced) / σ(customerDemand).
2. **Author attribution was wrong** in `simulations-data.json` ("Prof. Viral
   Bhatt, IIM Ahmedabad"). Fixed to "Prof. T. T. Niranjan + Prof. Manjesh
   Kumar Hanawal, IIT Bombay" per `MSGAMES_WEBSITE_ANALYSIS.md`.
3. **`recordWeeklyStats` was reading three fields off post-shift state**, so
   `received`, `shipped`, and (for non-retailer roles) `demand` were 0 in the
   week-by-week history. Fixed by capturing the values during the relevant
   processing step.

Bot fill-in for missing tiers was already in place (controller-level), which
unblocks single-player play.

**Recommendation:** ship as-is after this session. No rewrite, no externalised
content needed (mechanics-driven sim with no scenario library to externalise),
no architectural changes.

---

## Match — what's correct (pre-session)

| Item | Status |
|---|---|
| 4-tier supply chain (RETAILER → WHOLESALER → DISTRIBUTOR → MANUFACTURER) | ✅ |
| `ROLES` ordering matches spec (downstream-first iteration in `processOrders`) | ✅ |
| Lead-time order pipeline (orders placed at `[1]`, processed after subsequent shift) | ✅ |
| Lead-time shipment pipeline (shipments placed at `[leadTime - 1]`, received via shift) | ✅ |
| Pipeline length safety: `while (length < leadTime) push 0` guards in both pipelines | ✅ |
| MANUFACTURER produces (no upstream) — order goes into own `incomingShipments[leadTime - 1]` | ✅ |
| Holding cost = `max(0, inventory) × holdingCost` (no negative-inventory cost) | ✅ |
| Stockout cost = `backorder × stockoutCost` | ✅ |
| Backorder rolls forward: `totalDemand = demand + player.backorder` | ✅ |
| Cost accumulates: `player.totalCost += weekCost` | ✅ |
| `applyAction` rejects `orderQuantity < 0` and non-numeric inputs | ✅ |
| `applyAction` rejects duplicate orders within the same week | ✅ |
| `playerDecision` row written per submission (used by socket auto-advance) | ✅ |
| Auto-advance trigger in `sockets/index.ts:228-264` counts non-bot decisions for `current_round + 1` | ✅ |
| Bot fill-in: `session.controller.ts:236-287` auto-creates bots with `bot_strategy: 'SMOOTHING'` for missing roles before start | ✅ |
| Engine treats no-pendingOrder participants (i.e. bots) as repeating `lastOrderPlaced` (smoothing strategy) | ✅ |
| Default demand pattern: 4 for weeks 1-4, then 8 (classic step) | ✅ |
| Custom `demandPattern` honoured via `config.demandPattern` (so constant or random patterns *can* be supplied) | ✅ |
| Engine factory registration | ✅ |
| Game completion gates session status to `COMPLETED` and stamps `completed_at` | ✅ |

---

## Drift — what's wrong (pre-session)

### D1. Bullwhip ratio was a hardcoded stub
`calculateBullwhipEffect` returned a literal `1.0` with a `// TODO` comment.
This is the single most important pedagogical metric of the beer game; the
whole point of running the simulation is to *see the ratio amplify upstream*.

**Status: fixed in this session.** New implementation walks each player's
`weeklyStats.orderPlaced` history, computes the variance vs. customer
demand variance, and returns `{ RETAILER, WHOLESALER, DISTRIBUTOR,
MANUFACTURER }`. When demand variance is 0 (constant pattern with no week
elapsed yet), returns `1.0` across the board to avoid a divide-by-zero
result and match the "no amplification" baseline.

### D2. Author attribution was wrong
`simulations-data.json` said `"Prof. Viral Bhatt, IIM Ahmedabad"`. Canonical
per `MSGAMES_WEBSITE_ANALYSIS.md` (line 299-301):

```
T. T. Niranjan
Manjesh Kumar Hanawal
(IIT Bombay)
```

**Status: fixed in this session** — `simulations-data.json` row 1 author is
now `"Prof. T. T. Niranjan + Prof. Manjesh Kumar Hanawal, IIT Bombay"` and
re-seeded into the database via `prisma:seed`.

### D3. `recordWeeklyStats` recorded zeros for three fields
Three correctness bugs in [FruitBeerEngine.ts:389-407](backend/src/services/gameEngines/FruitBeerEngine.ts#L389-L407):

1. `received: playerState.incomingShipments[0] || 0` — by the time
   `recordWeeklyStats` runs, `receiveShipments` has already shifted the
   array, so `[0]` is *next week's* arrival, not what was just received.
2. `shipped: 0, // TODO: Track actual shipments` — never populated.
3. `demand: this.getCurrentDemand(role)` — `getCurrentDemand` returns 0 for
   any role except RETAILER, because the upstream-tier demand (the order
   from downstream) was already shifted off `incomingOrders` by
   `processOrders` and never captured.

Effect on the UI: the week-by-week table for a WHOLESALER, DISTRIBUTOR, or
MANUFACTURER player would show `demand: 0`, `received: 0`, `shipped: 0`
every row. The `serviceLevel` metric in `computeMetrics` (which divides
`shipped / demand`) was meaningless.

**Status: fixed in this session.** `receiveShipments` now records the
received-this-week qty into a per-role temporary; `processOrders` captures
both the demand seen and the qty shipped downstream; `recordWeeklyStats`
reads from those per-week buffers. New tests cover the fix.

---

## Missing — what's not built

### M1. Demand-pattern *modes* (constant / step / random) are caller-driven, not first-class config
The engine accepts an arbitrary `config.demandPattern: number[]`. There is
no `mode: 'constant' | 'step' | 'random'` switch. The default
`generateDemandPattern` only produces the classic step (4 for weeks 1-4,
then 8).

**Decision:** keep as-is for v1. A facilitator can already inject any
pattern via `config.demandPattern`. A first-class `mode` selector belongs
in a future facilitator-config UI, not in the engine.

### M2. Service level is computable but not surfaced
`computeMetrics` returns a `serviceLevel` object that is now meaningful
after D3 is fixed. The UI built in this session does not display it
(per the brief, which lists holding cost, stockout cost, total cost,
bullwhip ratio, and inventory-over-time chart). Logging only; no engine
gap.

### M3. No persistent reconstruction of in-memory `players` map
The engine writes to `FruitBeerGameState` in `saveGameState`, but
`initialize` rebuilds `players` from `sessionParticipant` rows only. If the
backend restarts mid-game, the per-week histories, current inventories,
and pipelines are lost. The lazy-init in `sockets/index.ts:180-194`
reinitialises with `getDefaultConfig`, which means *the game effectively
restarts at week 0*.

This is a platform-wide concern (every engine has it), called out in
CLAUDE.md §5.1 and §12 pitfall 1. Not a Fruit-Beer-specific defect.
**Out of scope for this session.**

---

## What an audit-pass change set looks like

Done in this session, in dependency order:

| Change | Files | Effort |
|---|---|---|
| Fix author attribution + re-seed | `simulations-data.json` (1 row) + `prisma:seed` | 5 min |
| Fix bullwhip-ratio computation + add per-role return shape | `FruitBeerEngine.ts` (~25 lines) | 25 min |
| Fix `recordWeeklyStats` zero-fields bug (received/shipped/demand) | `FruitBeerEngine.ts` (~20 lines across 3 methods) | 25 min |
| Add tests for the engine fixes | `FruitBeerEngine.test.ts` (+3 cases) | 20 min |
| **Backend total** | | **~75 min** |
| Build `frontend/src/components/games/FruitBeer/` (7 files: index + 6 sub-views) | new files + 1-line slug-map registration | **~3 hours** |

---

## Bot status — CLAUDE.md §11 Q5

Bot fill-in is **implemented for Fruit Beer Game** and was implemented
before this session, in `session.controller.ts:236-287`. Verified end-to-end
in this session: starting a session with N < 4 humans causes the controller
to insert `is_bot: true` participants for missing roles with
`bot_strategy: 'SMOOTHING'`; the engine's `placeOrders` falls back to each
participant's `lastOrderPlaced` when no `pendingOrders` entry exists, which
is exactly the smoothing (repeat-last-order) strategy.

Auto-advance correctly excludes bots:
`prisma.sessionParticipant.findMany({ where: { is_bot: false } })` in
`sockets/index.ts:230`. So a single-human session plays through cleanly:
the human submits, count == 1 == non-bot count, advance fires, bots'
lastOrderPlaced rolls forward.

**Recommended:** for Fruit Beer, mark CLAUDE.md §11 Q5 "Bot fill-in" as
*resolved-for-this-sim*. Onion Dilemma and Order Ops still need bot logic
for Phase 2.
