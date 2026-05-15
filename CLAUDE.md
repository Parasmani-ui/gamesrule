# CLAUDE.md

Working guide for Claude Code (and any AI agent) operating on this repository.
Read this first; it is the single most up-to-date source of truth for *current
state and active priorities*. The various `*_DETAILED_ANALYSIS.md` files in the
repo root are reference material, **not** ground truth — see "Known drift" below.

---

## 1. Project Overview

**Parasmani Skills (codename: gamesrule)** — an MSgames.in-inspired experiential
learning platform delivering 11 business simulations through a single web app.
Facilitator-led classroom model: instructors create sessions, students join via
code, simulations run in real time over Socket.io, decisions get captured for
debrief.

**Inspiration:** MSgames.in (IIT Bombay et al.) — 16-sim catalog. We are
shipping 11 of those 16 in v1.

**Audience:** management students, MBAs, corporate L&D programs.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io (with planned Redis adapter for scale) |
| ORM / DB | Prisma + PostgreSQL |
| Background jobs | BullMQ + ioredis (installed, not yet used) |
| Frontend | Next.js 14 (Pages Router) + React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (auth); per-game state pulled via Socket.io |
| Charts | Recharts |
| Testing | Jest (backend); frontend has none yet |

**Not yet integrated** but referenced in spec docs (`game_md.md`): Puppeteer for
PDF reports, node-canvas for chart rendering, AWS S3 for report storage,
SendGrid/SES for email. Reports system is disabled — see §10.

---

## 3. Repo Structure

```
gamesrule/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Universal schema, 11-sim ready
│   │   └── migrations/
│   └── src/
│       ├── index.ts                # Express + Socket.io entry
│       ├── app.ts, db.ts, config.ts
│       ├── controllers/            # auth, simulation, session
│       ├── routes/                 # auth, simulation, session
│       ├── services/gameEngines/   # ★ Heart of the system — 11 engines
│       │   ├── BaseGameEngine.ts   # Abstract base
│       │   ├── factory.ts          # Slug → engine instance, cached per session
│       │   ├── data/{sim}/         # Externalized scenario JSON per sim
│       │   └── {Sim}Engine.ts      # 11 of these
│       ├── sockets/index.ts        # Real-time event handlers
│       ├── middleware/auth.ts      # JWT
│       ├── seed.ts                 # Seeds simulations + test users
│       ├── types/index.ts
│       └── __tests__/              # 4 of 11 engines covered
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── sessions/[sessionId].tsx   # Lean dispatcher (~570 lines)
│       │   ├── simulations/[slug].tsx
│       │   ├── login.tsx, signup.tsx, dashboard.tsx
│       │   └── _app.tsx, _document.tsx
│       ├── components/
│       │   └── games/              # Per-sim UI folders + slug map
│       │       ├── index.ts        # slug → component map
│       │       ├── types.ts        # GameProps interface
│       │       ├── Placeholder.tsx # Fallback for unmapped slugs
│       │       └── {Sim}/          # One folder per shipped sim UI
│       ├── stores/authStore.ts
│       └── services/api.ts, socket.ts
├── audits/                         # Per-sim audit docs (Session N output)
├── docs/                           # Theory docs (some out of date)
├── assets/
├── *_DETAILED_ANALYSIS.md          # 10 large per-sim docs (use cautiously)
├── *_IMPLEMENTATION_NOTES.md       # 2 specific to EV Gambit & HR Comp
├── MSGAMES_WEBSITE_ANALYSIS.md     # Audit of msgames.in catalog
├── FULL SIMULATION LOGIC & FACILITATOR.txt   # Concise per-sim spec
├── game_md.md                      # Original platform-wide spec
└── simulations-data.json           # Sim catalog metadata
```

---

## 4. Essential Commands

From repo root unless noted.

```bash
# Setup
npm run install:all                 # Installs root + backend + frontend

# Develop
npm run dev                         # Both servers concurrently
cd backend && npm run dev           # Backend only (tsx watch)
cd frontend && npm run dev          # Frontend only (Next dev)

# Build
npm run build                       # Both
cd frontend && npm run type-check   # TS validation, no build

# Database
cd backend
npm run prisma:generate             # Run after schema edits
npm run prisma:migrate              # Create + apply migration
npm run prisma:studio               # GUI
npm run prisma:seed                 # Seed sims + test users

# Test
cd backend && npm test
cd backend && npm test -- --coverage
cd backend && npm test -- FruitBeerEngine.test.ts   # Specific file

# Lint
npm run lint                        # Both
```

Default ports: backend 4000, frontend 3000.

**Test users (after seed):**
- Student: `student@msgames.local` / `password123`
- Facilitator: `facilitator@msgames.local` / `password123`
- Admin: `admin@msgames.local` / `password123`

---

## 5. Architecture

### 5.1 Engine pattern

All simulations extend `BaseGameEngine`:

```typescript
abstract class BaseGameEngine {
  abstract initialize(config: any): Promise<void>;
  abstract applyAction(participantId: string, action: any): Promise<ActionResult>;
  abstract advanceRound(): Promise<RoundResult>;
  abstract computeMetrics(): Promise<any>;
  abstract getPublicState(): any;
  abstract getParticipantState(participantId: string): any;
}
```

- Engines are instantiated per-session and cached in-memory by
  `GameEngineFactory` (`services/gameEngines/factory.ts`)
- Cache key is `${slug}:${sessionId}`
- Cache busts on `simulationSlug` mismatch (prevents wrong engine on slug
  collision after server restart)
- **Engines lose state on server restart.** Lazy reconstruction is wired in
  `sockets/index.ts` around line 180; check `isInitialized` before any state
  access.

**Content-as-data pattern (established Session 1; used by HR Comp + EV Gambit
+ Defect Detectives):** scenario content lives in
`backend/src/services/gameEngines/data/{sim}/*.json` and is loaded via
`fs/path` in `initialize()`. Engine code stays focused on mechanics; faculty-
editable content stays in JSON. Use this pattern for any new engine that has
events, options, candidates, questions, or other discrete content.

### 5.2 Real-time flow

```
Player → frontend Socket client → backend socket handler → engine call
       → engine state mutation → broadcast to room
```

**Key events** (all in `backend/src/sockets/index.ts`):

| Direction | Event |
|---|---|
| C→S | `join_session`, `player_action`, `facilitator_advance_round`, `facilitator_get_participants` |
| S→C | `session_update`, `action_result`, `round_complete`, `game_complete`, `participant_joined` |

JWT passed in `socket.handshake.auth.token`; same auth middleware as REST.

**Local socket subscriptions in game UI components.** `[sessionId].tsx`
subscribes to `session_update` only. Per-sim UI components that depend on
`action_result` or `round_complete` (e.g., per-action feedback that shouldn't
wait for parent reload) must subscribe locally inside their `index.tsx`.
Pattern established by Fruit Beer (Session 3) and replicated in Customer In
Store + EV Gambit.

**Canonical action contract (HS-1, 2026-05-14).** The action object delivered
to `engine.applyAction(participantId, action)` MUST have the shape:

```
{ actionType: string, ...payloadFields }
```

— `actionType` lives at the top level alongside the payload's fields. There
is NO nested `data` wrapper. The bridge that produces this shape is
[backend/src/sockets/index.ts:225-228](backend/src/sockets/index.ts#L225-L228):
the socket handler calls `engine.applyAction(participantId, { actionType,
...actionPayload })` after receiving `{ sessionId, participantId, actionType,
payload }` from `socketService.sendAction`. The UI calls
`onAction(actionType, payload)` with the **flat** payload.

Engines destructure either fields directly (`const { x, y } = action`) or via
spread-rest (`const { actionType, ...payload } = action;
this.handler(payload)`). Both are canonical; pick whichever keeps the
existing handler API surface intact. The discriminator field is normally
`actionType` but a sim may use its own top-level field (HRComp uses
`stage`, DemandForecast uses `phase` / `method`) — the rule is only that
the discriminator sits at the top level of the action object, never under
`data`.

Frontend type narrowing lives in
[frontend/src/components/games/types.ts](frontend/src/components/games/types.ts):
each sim's `index.tsx` declares a discriminated `*Action` union and
parameterises `GameProps<MySimAction>`, turning wrong-shape onAction calls
into compile errors. See
[audits/HANDSHAKE_STANDARDIZATION.md](audits/HANDSHAKE_STANDARDIZATION.md)
for the full before/after.

### 5.3 Schema philosophy

Universal schema (one set of tables for all 11 sims). Sim-specific data lives
in JSON columns:

- `GameSession.configuration` (Json) — facilitator-set config
- `PlayerDecision.decision_payload` (Json) — every decision serialized
- `SessionStateCache` — optional full-state backup
- `Simulation.config_schema` (Json) — JSON Schema for validation

Game-specific tables are allowed but discouraged. Use one only when JSON
querying becomes painful (e.g., dense seed data the legacy Fruit Beer Game
needs).

### 5.4 Session lifecycle

`SETUP` → (participants join) `WAITING` → (facilitator starts) `IN_PROGRESS`
→ (engine runs rounds) `COMPLETED`. Round advancement is auto when all
non-bot participants submit, with a `facilitator_advance_round` manual override.

---

## 6. Current Implementation State

**Engine status as of 2026-05-08:**

| # | Simulation | Slug | Lines | Tests | UI | Status |
|---|---|---|---:|:---:|:---:|---|
| 1 | Fruit Beer Game | `fruit-beer-game` | 524 | ✅ (15) | ✅ | **Phase 1 complete** (2026-05-06). Bullwhip metric + weeklyStats + author corrections shipped Session 3; UI under `components/games/FruitBeer/` (7 files). |
| 2 | EV Gambit | `ev-gambit` | 979 | ✅ (43) | ✅ | **Phase 1 complete** (2026-05-08). Refactored 1,739 → 979 (Session 6); 9 UI files under `components/games/EVGambit/` (Session 7). 5 integrity defects fixed. |
| 3 | HR Compensation | `hr-compensation` | 516 | ✅ (32) | ✅ | Phase 1 fully complete — engine + UI + stage validation shipped 2026-05-05 + 2026-05-08 (Session 11a). Content externalized to JSON (3 scenarios), 5 UI files under `components/games/HRCompensation/`. All three stage handlers reject out-of-order actions (Pattern C); test matrix covers every illegal stage→stage transition. |
| 4 | Sustainable Select | `sustainable-select` | 605 | ❌ | ❌ | Built, not in Phase 1. |
| 5 | Defect Detectives | `defect-detectives` | 967 | ✅ (36) | ✅ | **Phase 1 complete — engine + UI shipped 2026-05-08.** Session 9 backend Option B + Session 10 UI landed same day. 14 UI files under `components/games/DefectDetectives/`: scenario header, dataset explorer, 7 QC tool panel, 7 typed chart components (Pareto/Histogram/Control Chart/Scatter/Check Sheet/Fishbone/Flowchart), inspection decision UI, four-bucket cost-of-quality panel, and bias-reveal final screen. Pattern E enforced — `ToolDescriptor` omits `reduction` to match the engine's stripped publicTools(); each tool result is individually typed (no `any`). Bias narrative hidden until GameComplete. |
| 6 | Order Ops | `order-ops` | 501 | ❌ | ❌ | Built, not in Phase 1. Likely duration/phase drift. |
| 7 | Dual Source Dilemma | `dual-source-dilemma` | 477 | ❌ | ❌ | Built, not in Phase 1. Generic vs Surat/Bangladesh framing. |
| 8 | Demand Forecast Challenge | `demand-forecast-challenge` | 1129 | ✅ (67) | ✅ | **Phase 1.5 COMPLETE — engine + UI + 67 tests shipped 2026-05-15.** DF-2a/DF-2b shipped six method helpers, seeded RNG, pattern-inference action (Pattern A — pattern hidden from publicState), three-component scoring (inference + methodAppropriateness + accuracy), per-participant state map. **DF-3a (2026-05-14)** shipped the UI input side: `types.ts` (Pattern E — narrowed `DemandForecastPublicState` omits `truePattern`/`optimalMethod`/`recommendedMethods`/`fullDemandData`; reveals gated on `isComplete`), `index.tsx`, `ScenarioHeader`, `DemandHistoryChart`, `PatternInference`, `MethodPicker`, `MethodHelpText`. **DF-3b (2026-05-15)** shipped the UI feedback side: `PeriodFeedback` (per-period card with engine-computed forecast/actual/error + cumulative MAD/MSE/MAPE/TS; never displays `usedRecommendedMethod` mid-game — that flag is stripped server-side by sanitizedForecasts), `MetricsChart` (Recharts line charts for cumulative MAPE + Tracking Signal over forecast number, with ±4 out-of-control reference lines), `Scorecard` (post-isComplete reveal — three-component score breakdown with raw / weight / weighted-contribution per component, true-pattern-vs-guess verdict, pattern rationale, recommended methods, full demand series, per-period table with the now-revealed recommended-method flag); plus `index.tsx` (Scorecard replaces the DF-3a placeholder; PeriodFeedback + MetricsChart wired into the forecasting view after first submission) and `types.ts` (added `METHOD_LABEL` / `PATTERN_LABEL` maps). 10 UI files total. Client never computes a forecast number — engine computes from `{method, params}`. |
| 9 | Customer In A Store | `customer-in-store` | 636 | ✅ (31) | ✅ | **Phase 1 complete** (2026-05-07). 7 substantive defects fixed (intervention modes were stubs, off-by-one in correctAnswer, integrity gates added, question generator de-degenerated). 6 UI files under `components/games/CustomerInStore/`. |
| 10 | Onion Dilemma | `onion-dilemma` | 135 | ❌ | ❌ | **Skeleton.** Not in Phase 1. |
| 11 | TOC Factory | `toc-factory` | 124 | ❌ | ❌ | **Skeleton.** Not in Phase 1. |

**Progress: 6 simulations fully shipped (Phase 1 5/5 + Demand Forecast as
Phase 1.5).** Phase 1's five sims (Fruit Beer, EV Gambit, HR Comp, Defect
Detectives, Customer In Store) all landed engine + UI by 2026-05-08.
Demand Forecast Challenge shipped as Phase 1.5 (DF-2a/2b backend + DF-3a/3b
UI) by 2026-05-15. Session 11 wrap-up still pending (manual smoke tests +
HR Comp stage-validation patch; now covers all 6 shipped sims). Total
backend tests: **233 passing** (227 prior + 6 new HandshakeContract
integration tests from HS-1).

**No Phase-1 sim was ACTUALLY BROKEN before HS-1.** The handshake-contract
audit (Session HS-1, 2026-05-14) found that all 6 Phase-1 sim UIs happened
to match their engines' destructure shape, so every sim routed correctly at
runtime. The drift was a latent contract failure (4 engines used a nested
`data` wrapper inconsistently with the platform's flat default) — HS-1
standardised it before it caught anyone. See
[audits/HANDSHAKE_STANDARDIZATION.md](audits/HANDSHAKE_STANDARDIZATION.md).

**Frontend:** dispatcher pattern landed Session 2 (2026-05-05).
`pages/sessions/[sessionId].tsx` shrank from 2,324 → ~570 lines and now does
only auth, session load, lobby UI, socket lifecycle, and renders
`<GameUI {...gameProps} />`. Slug→component map at
`frontend/src/components/games/index.ts`; shared `GameProps` interface at
`frontend/src/components/games/types.ts`; unmapped slugs fall through to
`Placeholder.tsx` which dumps raw JSON state. **Adding a new sim's UI is
strictly: drop a folder + register one slug in the map.** No edits to
`[sessionId].tsx` needed.

**Reports / S3 / certificates:** disabled. `Report` model commented out in
schema. Re-enabling requires Puppeteer install, route uncomment,
`reportService.ts` implementation, and S3 wiring.

---

## 7. Phase 1 Priority and Workflow

### 7.1 Sequence

Original scope was 6 sims; Demand Forecast was dropped (§11 Q1). Final
sequence with session map:

| Session | Sim | Phase | Status |
|---|---|---|---|
| 1 | HR Compensation | Backend | ✅ |
| 2 | HR Compensation + monolith decomp | UI + scaffolding | ✅ |
| 3 | Fruit Beer | Audit + UI | ✅ |
| 4 | Customer In Store | Full cycle | ✅ |
| 5 | EV Gambit | Audit (Opus) | ✅ |
| 6 | EV Gambit | Backend refactor | ✅ |
| 7 | EV Gambit | UI | ✅ |
| 8 | Defect Detectives | Audit (Opus) | ✅ |
| 9 | Defect Detectives | Backend (Option B) | ✅ |
| 10 | Defect Detectives | UI | ✅ |
| 11 | Phase 1 wrap-up | Smoke tests + HR Comp stage-validation patch | ⏳ next |

**Phase 1.5 (Demand Forecast Challenge — full rewrite per audit Option C):**

| Session | Sim | Phase | Status |
|---|---|---|---|
| DF-1 | Demand Forecast | Audit (Opus) | ✅ 2026-05-11 |
| DF-2a | Demand Forecast | Backend foundation (6 method helpers, seeded RNG, validation, async/sync) | ✅ 2026-05-14 |
| DF-2b | Demand Forecast | Backend pedagogy layer (pattern-inference, per-participant state, Pattern A, 3-component scoring) | ✅ 2026-05-14 |
| DF-3a | Demand Forecast | UI input side (7 components) | ✅ 2026-05-14 |
| DF-3b | Demand Forecast | UI feedback side (PeriodFeedback, MetricsChart, Scorecard) | ✅ 2026-05-15 |

### 7.2 Per-sim workflow

For each sim, follow this loop. Do not skip steps.

```
AUDIT  →  FIX  →  TEST  →  UI
```

**1. Audit** — Read in this order:
   1. Engine source (`backend/src/services/gameEngines/{Sim}Engine.ts`)
   2. Repo's implementation note (if one exists, e.g.
      `EV_GAMBIT_IMPLEMENTATION_NOTES.md`, `HR_COMPENSATION_IMPLEMENTATION_SUMMARY.md`)
   3. `MSGAMES_WEBSITE_ANALYSIS.md` for canonical branding/authorship
   4. `FULL SIMULATION LOGIC & FACILITATOR.txt` for state shape and turn loop
   5. The matching `*_DETAILED_ANALYSIS.md` (treat with caution — see §8)

   Output: an audit doc at `audits/{SIM}_AUDIT.md` with:
   - Match: what is correct
   - Drift: what disagrees with canonical sources
   - Missing: what's specced but unbuilt
   - **Integrity audit:** check every Pattern in §15
   - **Pedagogy audit:** headline metric computed (not stubbed); modes
     differ in behavior; off-by-one check
   - Recommendation: small patch / config fix / partial refactor / full
     rewrite / architectural decision needed

**2. Fix** — Apply audit decisions. Keep changes minimal. Update seed config
   if branding changed.

**3. Test** — Add `__tests__/{Sim}Engine.test.ts`. Pattern off the existing
   green test files. Cover: initialize, applyAction with valid + invalid
   input, advanceRound, computeMetrics, every §15 Pattern that applies, and
   edge cases for that sim's mechanics.

**4. UI** — Add a folder under `frontend/src/components/games/{Sim}/` and
   register the slug in `frontend/src/components/games/index.ts`. **No edits
   to `[sessionId].tsx`.** All components conform to the `GameProps`
   interface in `components/games/types.ts`.

---

## 8. Known Drift in Reference Material

The 10 large `*_DETAILED_ANALYSIS.md` files at repo root were generated
en-masse and have systematic problems. **Mechanics descriptions are mostly
sound; branding/authorship/scenarios drift heavily.** Use them for engine math
and state shape, not for naming or industry context.

| Drift | Symptom | Use instead |
|---|---|---|
| Author attribution | Most MDs credit "Dr. Arvind Shroff, Dr. Soumyadeep Kundu" — only correct for Order Ops | `MSGAMES_WEBSITE_ANALYSIS.md` |
| Onion Dilemma payoffs | MD uses abstract 5/5–2/2–8/0; sim is ₹-denominated (₹30K retail, 200t coop / 100t defect) | Session text + `MSGAMES_WEBSITE_ANALYSIS.md` |
| Dual Source framing | Generic suppliers; canonical is Surat (fast/expensive) vs Bangladesh (slow/cheap) | `MSGAMES_WEBSITE_ANALYSIS.md` |
| HR Compensation mechanic | Was suspected wrong-mechanic; **Session 1 audit confirmed MCDM IS the canonical msgames sim.** No reframe needed. | `HR_COMPENSATION_IMPLEMENTATION_SUMMARY.md` + audit |
| **Defect Detectives "Zenith Engine Works"** | This doc previously claimed Zenith was canonical based on a single upload-bundle session text. **Session 8 audit confirmed Zenith is NOT in any canonical msgames source** (MS-GAME.txt, MSGAMES_WEBSITE_ANALYSIS.md, FULL SIMULATION LOGIC, game_md.md, the analysis MD — none reference it). Treat as uncertain provenance — possibly a separate prototype, not msgames canonical. **Decision: ship generic SQC reskinned to consumer-goods + quick-commerce per Option B.** | `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` for mechanics; `MSGAMES_WEBSITE_ANALYSIS.md` for branding |
| TOC Factory | MD describes continuous-time sim; other sources say 3 stages × 10 rounds | Resolve at audit; lean toward 3×10 rounds |
| Order Ops duration | MD: 30 min; session: ~80 min phased; MS-GAME: 60 min | Session text wins (Negotiation 15 + Day 1 30 + Day 2 30) |
| **EV Gambit rounds** | Build summary claimed 12 rounds; **Session 5 audit confirmed engine is canonical 5-event scripted simulation.** `SIMULATION_IMPLEMENTATION_SUMMARY.md` is stale; the engine and msgames spec agree on 5 rounds + 5% start. | Engine source + `MSGAMES_WEBSITE_ANALYSIS.md` |
| **Audit doc reliability vs engine reality** | Every audit so far has under-predicted defect count by 50–100%. Customer In Store: predicted 3, found 7. EV Gambit: predicted 5, found 11. | When sizing fix sessions, multiply audit's defect count by 1.5–2× |
| **`SIMULATION_IMPLEMENTATION_SUMMARY.md` is unreliable** | Wrong about EV Gambit round count (claims 12, actual 5). May be wrong about other sims' round/metric details. | Use engine source + MSgames analysis instead |

**Rule of thumb:** when sources disagree, ranking is:
`MSGAMES_WEBSITE_ANALYSIS.md` (branding) > engine source (mechanics) >
session text (scenarios) > `FULL SIMULATION LOGIC` (state shape) >
`*_DETAILED_ANALYSIS.md` (math only) > `SIMULATION_IMPLEMENTATION_SUMMARY.md`
(treat as deprecated).

---

## 9. Per-Sim Canonical Sources

For each Phase-1 sim, when something is unclear, consult these in order:

| Sim | Primary | Secondary | Tertiary |
|---|---|---|---|
| HR Compensation | `audits/HR_COMPENSATION_AUDIT.md` | `HR_COMPENSATION_IMPLEMENTATION_SUMMARY.md` | `MSGAMES_WEBSITE_ANALYSIS.md` |
| Fruit Beer | `audits/FRUIT_BEER_AUDIT.md` | `FRUIT_BEER_GAME_DETAILED_ANALYSIS.md` (reliable) | engine source + tests |
| Customer In Store | `audits/CUSTOMER_IN_STORE_AUDIT.md` | `CUSTOMER_IN_A_STORE_DETAILED_ANALYSIS.md` | session text |
| EV Gambit | `audits/EV_GAMBIT_AUDIT.md` | `EV_GAMBIT_IMPLEMENTATION_NOTES.md` | engine source |
| Defect Detectives | `audits/DEFECT_DETECTIVES_AUDIT.md` | `MSGAMES_WEBSITE_ANALYSIS.md` | `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` (mechanics only) |

---

## 10. Adding a New Simulation

If you ever need to (out-of-Phase-1, or for the eventual extension to 16 sims):

1. Create `backend/src/services/gameEngines/{Sim}Engine.ts` extending
   `BaseGameEngine`, implementing all six abstract methods.
2. Externalize content to `backend/src/services/gameEngines/data/{sim}/*.json`
   (mirror HR Comp / EV Gambit structure).
3. Register the slug in `factory.ts` (the switch statement).
4. Add a row in `simulations-data.json` and re-run `npm run prisma:seed`.
5. Add `frontend/src/components/games/{Sim}/index.tsx` and register the slug
   in `frontend/src/components/games/index.ts`. Components must conform to
   the `GameProps` interface.
6. Add tests at `backend/src/__tests__/{Sim}Engine.test.ts` covering every
   §15 Pattern.

Don't add anything to the schema unless you've exhausted JSON-column options.

---

## 11. Open Questions and Outstanding Decisions

1. **Demand Forecast Challenge has no source-of-truth.** Not in MS-GAME's
   16-sim catalog; no analysis MD; not a known MSgames sim. Likely an
   internal-only addition built from the `FULL SIMULATION LOGIC` doc.
   ✅ **Resolved 2026-05-04: dropped from Phase 1.** Engine remains in repo;
   no audit, no UI, no tests in Phase 1. Reconsider in Phase 2 (either
   reverse-engineer to spec or replace with a MSgames-canonical sim).
   ✅ **Fully resolved 2026-05-15:** Phase 1.5 complete; Demand Forecast
   shipped as the 6th simulation via the audit-confirmed full rewrite.
   Full-rewrite verdict per `audits/DEMAND_FORECAST_AUDIT.md` — the audit
   established that the source-of-truth is operations-management
   curriculum (Stevenson Ch. 3 / Heizer Ch. 4 / Chase & Jacobs Ch. 17–18),
   not a missing msgames spec. Session arc:
   **DF-1 audit (2026-05-11)** → **DF-2a/DF-2b backend (2026-05-14;
   foundation + pedagogy layer; 67 tests)** → **DF-3a UI input side
   (2026-05-14; 7 components)** → **DF-3b UI feedback side (2026-05-15;
   PeriodFeedback + MetricsChart + Scorecard, 10 UI files total)**. The
   auto-advance dormancy in `sockets/index.ts` was verified for
   per-participant DF-2b — no cross-cutting socket change required.
2. **`pages/sessions/[sessionId].tsx` decomposition strategy.** ✅ **Resolved
   2026-05-05.** Decomposed upfront into a slug→component dispatcher. The page
   now keeps only auth, session load/join, socket lifecycle, and lobby UI; all
   game-specific JSX lives under `frontend/src/components/games/{Sim}/`.
   Registration happens in `frontend/src/components/games/index.ts`; unmapped
   slugs render the shared `Placeholder` (raw JSON state) until their dedicated
   UI ships. `GameProps` is defined in
   `frontend/src/components/games/types.ts`. New sim UIs are added by dropping
   a folder + registering one slug in the map — no edits to `[sessionId].tsx`.
3. **Reports system re-enable timing.** Currently disabled. **Decision
   needed:** re-enable in Phase 2 or Phase 3. Not blocking Phase 1.
4. **Frontend testing.** Zero frontend tests today. **Decision needed:**
   add Vitest + React Testing Library setup before or during UI phase?
   Recommendation: defer to Phase 2; get the 5 sims shipping first.
5. **Bot fill-in for multiplayer sims.** `SessionParticipant.is_bot` and
   `bot_strategy` exist in schema. **Resolved for Fruit Beer (2026-05-06):**
   `session.controller.ts:236-287` auto-creates bots with
   `bot_strategy: 'SMOOTHING'` for missing tier roles when the facilitator
   starts the session; the engine's `placeOrders` falls back to each
   participant's `lastOrderPlaced` when no pending order exists, which is
   the smoothing strategy. Auto-advance correctly excludes bots. Order Ops
   and Onion Dilemma still need bot logic for Phase 2.
6. **Scenario diversity for classroom rotation.** Most engines ship with 1–2
   scenarios. A class of 40 students playing the same scenario means
   student #2 can game-score from student #1's leak (especially when
   optimal values are static). HR Comp has 3, EV Gambit has 2, Customer In
   Store now has procedural generation (best). **Decision needed for Phase
   2:** add 3–5 scenarios per sim for faculty rotation, OR document as a
   known limitation and ask faculty to rotate cohorts manually.
7. **Backend pre-existing TS errors.** `npm run build` reports ~56 baseline
   errors across non-engine files (controllers, middleware, seed.ts) — all
   unused-vars / "not all paths return a value" / pre-existing tsc
   strictness consequences. They don't affect runtime; tests pass; dev
   server starts. **Decision needed for Phase 2:** dedicated tsc-strict
   cleanup session, or ride them indefinitely.

8. **Phase-2 sims with handshake-contract-aligned engines but no UI.**
   `dual-source-dilemma`, `order-ops`, and `sustainable-select` had their
   engines flattened to the canonical action contract in Session HS-1
   (2026-05-14) — the `{ actionType, data }` → `{ actionType, ...payload }`
   change. Engine tests don't exist for these sims, so the change is
   regression-tested only by the new HandshakeContract integration suite
   indirectly via inheritance. When their UIs ship (Phase 2), send flat
   payloads — `{ data: { ... } }` is no longer valid. Onion Dilemma and
   TOC Factory are still skeletons and must adopt the canonical contract
   when their engines are written.

---

## 12. Common Pitfalls

1. **Engine Not Initialized.** Engine state lost on server restart. Always
   check `isInitialized` before reading state; lazy-init in socket handlers
   if needed.
2. **Prisma client out of sync.** After every `schema.prisma` edit:
   `npm run prisma:generate` then `npm run prisma:migrate`. Skip either and
   types/runtime drift.
3. **Slug mismatches.** Slugs must match across `factory.ts` switch,
   `simulations-data.json`, the `Simulation.slug` DB row, and
   `frontend/src/components/games/index.ts`. The factory will throw on
   unknown slugs; the dispatcher will fall through to Placeholder.
4. **CORS errors.** Backend `FRONTEND_URL` must equal frontend origin
   exactly. Update `.env` per environment.
5. **Stale Socket auth token.** JWT expiry breaks Socket.io reconnects;
   client must refresh and rejoin the session room.
6. **Trusting an analysis MD blindly.** They drift (§8). Always cross-check
   branding against `MSGAMES_WEBSITE_ANALYSIS.md`.
7. **Trusting "the engine has tests, so it works."** Pre-Phase-1 tests
   covered structure, not semantics. Sessions 3, 4, 6 each found
   severity-critical defects (Fruit Beer's bullwhip = 1.0 hardcoded;
   Customer In Store's off-by-one in correctAnswer; EV Gambit's force
   double-count). Audit before trusting.
8. **`audits/` is in `.gitignore` but individual files inside are
   tracked.** Surfaced DF-2a (2026-05-14): adding a new audit doc with
   `git add audits/NEW_AUDIT.md` fails silently (no error; the file
   just doesn't stage) because the directory is gitignored. Already-
   tracked audit files still show as modified via `git status` and
   `git diff`, but creating a new one requires `git add -f
   audits/NEW_AUDIT.md`. **Always check `git status` after staging an
   audit doc** — if it doesn't appear under "Changes to be committed,"
   re-run with `-f`.

---

## 13. Out of Scope for Phase 1

Explicitly deferred. Don't build these now:

- Extending roster from 11 → 16 sims (Time Trap, Pricing Paradox, Bottom of
  Pyramid, Segment Wars, Macroniti, Portfolio Gambit)
- Razorpay/Stripe billing or `SimulationAccess` expiry-based gating
- Subdomain-per-game routing (msgames.in style)
- Email notifications via SES/SendGrid
- ZIP bulk export, certificates with QR codes
- Reports/PDF generation (re-enable timing per §11 Q3)
- Frontend testing infrastructure (per §11 Q4)
- Production deploy (Vercel + Render/Railway + managed Postgres)

---

## 14. Working Style Notes

- For any non-trivial change to an engine, write or update a test in the same
  PR. The four green test files
  (`FruitBeerEngine.test.ts`, `HRCompensationEngine.test.ts`,
  `CustomerInStoreEngine.test.ts`, `EVGambitEngine.test.ts`) are the patterns
  to mirror.
- Audit docs go in `audits/`. Implementation notes go in repo root only when
  the implementation is finalized.
- When in doubt about branding (company names, currency, scenario), default
  to MSgames.in's actual sim, not the analysis MD's interpretation.
- Don't expand `[sessionId].tsx` further. Any new game UI work should land
  as a separate component file under `components/games/{Sim}/`.
- Use `@filename` notation for file references in PR descriptions and audit
  docs.
- **Sim-isolation rule.** Changes to one simulation must not modify
  another simulation's engine, tests, data, or UI components. Files
  that may be touched cross-sim:
    * `simulations-data.json` — only the row for the active sim
    * `factory.ts` — only the new sim's case
    * `sockets/index.ts` — only with a sim-scoped guard, never blanket
    * `BaseGameEngine.ts` — only if every other engine has been
      reviewed for the breaking change
    * `frontend/src/components/games/index.ts` — only the new sim's
      slug-map entry
  Anything else cross-cutting (middleware, schema, controllers)
  belongs in its own commit, not bundled with sim work.
- **Per-sim test isolation.** Run a single sim's tests with
  `npm test -- {SimName}Engine.test.ts`. CI should run all engine
  test files in isolation, not as one combined suite, so a failure
  in one sim doesn't mask others.
- **Manual smoke testing is deferred to Session 11 wrap-up.** Per the
  Phase 1 process, sessions ship engine-and-UI as a code artifact; manual
  end-to-end browser testing happens once at the end across all 5 sims.
  Sandboxed Claude Code sessions cannot run interactive browsers; do not
  block on this.

---

## 15. Integrity Audit Checklist

Every engine audit must check for these patterns. Sessions 2–6 each caught
at least one — they are systematic, not one-off.

**Pattern A: State leak via publicState**
- Correct quiz answers / optimal weights / hidden values exposed in
  `getPublicState` before the player has acted.
- Examples: EV Gambit `currentQuiz.questions[*].correctAnswer` (Session 5);
  HR Comp `optimalWeight` / `optimalRank` (pre-Session-1).
- **Fix pattern:** strip via a sanitizer (`stripQuiz()`,
  `publicDecisions()`); reveal in `getParticipantState` only after the
  relevant action.

**Pattern B: Forged input via socket client**
- Out-of-range numeric input, unbounded values, or client-supplied
  cost/impact/effects fields trusted.
- Examples: Customer In Store out-of-range answer (pre-Session-4);
  Fruit Beer order = 999,999 (no upper cap); EV Gambit forged decision
  payload (Session 5); Defect Detectives `MagicWand1` infinite-stack
  (predicted Session 8).
- **Fix pattern:** validate every numeric range; fields like cost / effect
  come from server-side content (JSON), never from the client; client
  submits IDs only; tool/option names validated against a canonical list.

**Pattern C: State progression bypass**
- Skip-ahead: action for round/stage/question N while engine is on
  earlier round.
- Replay: actions for closed rounds accepted.
- Examples: HR Comp `applyAction` (fixed Session 11a); Customer In Store
  skip-ahead (pre-S4); EV Gambit (S5).
- **Fix pattern:** every handler asserts `state.currentX === expectedX`
  at the top.

**Pattern D: Async/sync type leak**
- `getParticipantState` (sync) returns a `Promise` field where the caller
  expects a value.
- Examples: Customer In Store `metrics` (pre-S4); EV Gambit
  `computeMetricsForParticipant` un-awaited (S5); Defect Detectives
  predicted for S9.
- **Fix pattern:** split into `computeMetricsSync` (used by
  `getParticipantState`) and async `computeMetrics` (external callers).
  Match the EV Gambit / Customer In Store implementation.

**Pattern E: Type narrowing as second-line defense (defense-in-depth)**
- When the engine strips fields from `publicState` (Pattern A defense),
  the corresponding TypeScript type on the client should narrow to match.
- Example: EV Gambit's `publicDecisions()` omits `expectedImpact`,
  `roundModifiers`, `effects`; the client's `DecisionOption` type also
  omits them. Result: a future engineer who tries to send omitted fields
  gets a compile error rather than a runtime bug.
- **Confirmed working pattern:** EV Gambit Session 7.
- **When to use:** every UI session for a sim that strips publicState
  fields. Match the engine's stripped shape in your client TS types.

**Pattern F: Source-of-truth verification before architectural decisions**
- Before committing to a reframe based on a single source file, cross-check
  against `MS-GAME.txt`, `MSGAMES_WEBSITE_ANALYSIS.md`,
  `FULL SIMULATION LOGIC`, and `game_md.md`.
- Surfaced by Session 8: a "Zenith Engine Works" reframe for Defect
  Detectives was nearly green-lit based on a file that didn't appear in
  any of the five corroborating sources.
- **When to apply:** every audit phase. Single-source claims masquerading
  as canonical are how architectural mistakes happen.

**Pattern H: Contract drift across sessions**
- Multi-session builds let each session guess an unenforced cross-cutting
  contract; nothing in the type system prevents UIs and engines from
  drifting apart in the parts they each only see one side of. Eventually
  someone follows a non-representative case and writes a new sim that
  routes through the bridge but lands in a destructure shape its engine
  doesn't expect — the action is delivered with the right `actionType`
  but `undefined` payload fields, and the engine rejects with a generic
  validation error that doesn't reveal the cause.
- Surfaced by Session HS-1 (2026-05-14): the onAction → socket → engine
  pipeline had no enforced contract. Three different engine destructure
  shapes (flat / hybrid / nested `data`) and two different UI payload
  shapes (flat / nested `data`) coexisted; the system worked only because
  each UI happened to match its engine.
- **The fix is a typed contract, not discipline.** HS-1 narrowed
  `GameProps.onAction` to a discriminated-union-aware signature; each
  sim's `index.tsx` declares its action shapes at the top and a
  wrong-shape dispatch becomes a compile error. The wire contract is
  documented in §5.2 and exercised by
  `__tests__/HandshakeContract.test.ts` (one per Phase-1 sim) — that
  suite builds the action object exactly the way the production bridge
  builds it, catching future drift between any UI's payload and its
  engine's destructure.
- **When to apply:** any cross-cutting platform contract (action input,
  ActionResult, publicState shape, websocket events, ...) that
  multiple sessions touch independently. Make it a type, document the
  bridge in CLAUDE.md, and add an integration test that exercises the
  edge the unit tests skip.

**Pedagogy audit checklist (run alongside the integrity patterns):**
- Headline teaching metric is computed, not stubbed (caught: Fruit Beer
  bullwhip = 1.0; Defect Detectives hardcoded "Scratch and Misalignment
  dominate" insights).
- Modes/variants/scenarios that claim to differ actually differ in
  behavior, not just labels (caught: Customer In Store identical
  intervention modes).
- Content is procedurally generated or seeded, not 3 hardcoded cases on
  rotation (caught: Customer In Store question generator).
- Off-by-one / units / coordinate-system audit on any indexed data —
  minutes, weeks, ranks, batch indices, force IDs (caught: Customer In
  Store correctAnswer indexing; Defect Detectives `perBatch / 20` instead
  of `/ actual_processed_batches`).

---

*Last updated: 2026-05-15 (post-Session-DF-3b: Demand Forecast Phase 1.5
COMPLETE — UI feedback side shipped as PeriodFeedback + MetricsChart +
Scorecard under `frontend/src/components/games/DemandForecast/`. 10 UI
files total. Scorecard renders the three-component score breakdown
(inference / methodAppropriateness / accuracy) with raw / weight /
weighted-contribution per component as the pedagogical headline, plus
true-pattern reveal, recommended methods, pattern rationale, full demand
series, and a per-period table with the now-revealed
usedRecommendedMethod flag. PeriodFeedback + MetricsChart show only
player-known facts mid-game (Pattern A: no truePattern, no
optimalMethod, no usedRecommendedMethod). No forecast math in the UI —
all forecasts and errors come from the engine. Demand Forecast is now
the 6th fully-shipped simulation. 233 backend tests green; frontend
type-check + production build pass clean.)

*Earlier: 2026-05-14 (post-Session-HS-1: handshake-contract
standardization — canonical action contract `{ actionType, ...payload }`
documented in §5.2; 4 engines (HRComp, DefectDetectives, OrderOps,
SustainableSelect) and 2 UIs (HRComp, DefectDetectives) aligned to the
flat shape; all 6 Phase-1 sims declare typed `*Action` discriminated
unions at the top of their `index.tsx` and parameterise `GameProps<MyAction>`,
turning wrong-shape onAction calls into compile errors; new
`__tests__/HandshakeContract.test.ts` adds 6 integration-style tests
(one per Phase-1 sim) that build the action object the way the
production bridge does. 233 backend tests green; frontend type-check +
production build pass clean. NO Phase-1 sim was actually broken before
HS-1 — the drift was latent and would have surfaced when Phase-2 UIs
were added). When making non-trivial structural changes to engine
architecture, schema, or workflow, update this file in the same commit.*
