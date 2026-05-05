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
| Testing | Jest (backend only; frontend has none) |

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
│       │   └── {Sim}Engine.ts      # 11 of these
│       ├── sockets/index.ts        # Real-time event handlers
│       ├── middleware/auth.ts      # JWT
│       ├── seed.ts                 # Seeds simulations + test users
│       ├── types/index.ts
│       └── __tests__/              # Only 2 engines have tests
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── sessions/[sessionId].tsx   # ⚠️ 2,324 lines — monolith
│       │   ├── simulations/[slug].tsx
│       │   ├── login.tsx, signup.tsx, dashboard.tsx
│       │   └── _app.tsx, _document.tsx
│       ├── components/             # ⚠️ No games/ subfolder yet
│       ├── stores/authStore.ts
│       └── services/api.ts, socket.ts
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

**Engine status as of 2026-05:**

| # | Simulation | Slug | Lines | Tests | Status |
|---|---|---|---:|:---:|---|
| 1 | Fruit Beer Game | `fruit-beer-game` | 518 | ✅ | **Full** — reference implementation |
| 2 | EV Gambit | `ev-gambit` | 1,739 | ❌ | Built, needs audit (size suggests bloat or thoroughness — TBD) |
| 3 | HR Compensation | `hr-compensation` | 516 | ✅ | Built, **suspected wrong-mechanic** (see §8) |
| 4 | Sustainable Select | `sustainable-select` | 605 | ❌ | Built |
| 5 | Defect Detectives | `defect-detectives` | 503 | ❌ | Built, likely needs branding refit |
| 6 | Order Ops | `order-ops` | 501 | ❌ | Built, likely duration/phase drift |
| 7 | Dual Source Dilemma | `dual-source-dilemma` | 477 | ❌ | Built, generic vs Surat/Bangladesh framing |
| 8 | Demand Forecast Challenge | `demand-forecast-challenge` | 412 | ❌ | Built, **no spec exists** (see §11) |
| 9 | Customer In A Store | `customer-in-store` | 364 | ❌ | Built |
| 10 | Onion Dilemma | `onion-dilemma` | 135 | ❌ | **Skeleton** |
| 11 | TOC Factory | `toc-factory` | 124 | ❌ | **Skeleton** |

**Frontend:**
- 0 of 11 sims have dedicated UI components.
- `pages/sessions/[sessionId].tsx` is a 2,324-line monolith switching on
  simulation slug. **Must be decomposed** into `components/games/{Sim}/`
  before UI work scales.

**Reports / S3 / certificates:** disabled. `Report` model commented out in
schema. Re-enabling requires Puppeteer install, route uncomment,
`reportService.ts` implementation, and S3 wiring.

---

## 7. Phase 1 Priority and Workflow

### 7.1 Six priority simulations (in build order)

Confirmed scope for the current phase:

1. **HR Compensation** — canary (largest suspected drift; sets audit format)
2. **Fruit Beer Game** — confirms audit format on a known-good engine
3. **Customer In A Store** — small, simple engine, quick win
4. **EV Gambit** — large engine; verify 5-event vs 12-round question
5. **Defect Detectives** — likely needs Zenith-Engine-Works reframe
6. **Demand Forecast Challenge** — needs spec authored first (§11)

The remaining five (Sustainable Select, Order Ops, Dual Source, Onion Dilemma,
TOC Factory) are out of phase 1.

### 7.2 Per-sim workflow

For each of the six, follow this loop. Do not skip steps.

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
   - Recommendation: small patch / config fix / partial refactor / full rewrite

**2. Fix** — Apply audit decisions. Keep changes minimal. Update seed config
   if branding changed.

**3. Test** — Add `__tests__/{Sim}Engine.test.ts`. Pattern off
   `FruitBeerEngine.test.ts` and `HRCompensationEngine.test.ts`. Cover:
   initialize, applyAction with valid + invalid input, advanceRound,
   computeMetrics, edge cases for that sim's mechanics.

**4. UI** — Decompose the slug branch out of `[sessionId].tsx` into
   `components/games/{Sim}/index.tsx`. Game-specific subcomponents go in the
   same folder. Mount via:
   ```tsx
   const GameUI = gameComponents[simulation.slug];
   return <GameUI sessionId={...} state={...} onAction={...} />;
   ```

**Do not start UI work until at least 3 engines have completed Audit + Fix +
Test.** UI rebuild is expensive; doing it once on solid engines is cheaper than
rebuilding it as engines change.

---

## 8. Known Drift in Analysis MDs

The 10 large `*_DETAILED_ANALYSIS.md` files at repo root were generated
en-masse and have systematic problems. **Mechanics descriptions are mostly
sound; branding/authorship/scenarios drift heavily.** Use them for engine math
and state shape, not for naming or industry context.

| Drift | Symptom | Use instead |
|---|---|---|
| Author attribution | Most MDs credit "Dr. Arvind Shroff, Dr. Soumyadeep Kundu" — only correct for Order Ops | `MSGAMES_WEBSITE_ANALYSIS.md` |
| Onion Dilemma payoffs | MD uses abstract 5/5–2/2–8/0; sim is ₹-denominated (₹30K retail, 200t coop / 100t defect) | Session text + `MSGAMES_WEBSITE_ANALYSIS.md` |
| Dual Source framing | Generic suppliers; canonical is Surat (fast/expensive) vs Bangladesh (slow/cheap) | `MSGAMES_WEBSITE_ANALYSIS.md` |
| HR Compensation mechanic | MD describes MCDM (Expert Selection → Attribute Weighting → Ranking) — likely a degraded copy of Sustainable Select. True spec is progressive comp packages (dev → AI specialist → marketing leader, base/bonus/stock/benefits) | `FULL SIMULATION LOGIC & FACILITATOR.txt` + `MSGAMES_WEBSITE_ANALYSIS.md`. **Audit may reveal full rewrite is needed.** |
| Defect Detectives | MD: abstract "20 batches × 1000 units, 8% → 2% defect rate". Real sim: Zenith Engine Works, 6 months × 2 shifts × 3 lines × 6 defect types, flowchart-construction phase, Excel export | Session text |
| TOC Factory | MD describes continuous-time sim; other sources say 3 stages × 10 rounds | Resolve at audit; lean toward 3×10 rounds |
| Order Ops duration | MD: 30 min; session: ~80 min phased; MS-GAME: 60 min | Session text wins (Negotiation 15 + Day 1 30 + Day 2 30) |
| EV Gambit rounds | Build summary claims 12 rounds; spec is 5 scripted events | Verify in audit |

**Rule of thumb:** when sources disagree, ranking is:
`MSGAMES_WEBSITE_ANALYSIS.md` (branding) > session text (mechanics)
> `FULL SIMULATION LOGIC` (state shape) > `*_DETAILED_ANALYSIS.md` (math only).

---

## 9. Per-Sim Canonical Sources

For each Phase-1 sim, when something is unclear, consult these in order:

| Sim | Primary | Secondary | Tertiary |
|---|---|---|---|
| HR Compensation | `HR_COMPENSATION_IMPLEMENTATION_SUMMARY.md` | `MSGAMES_WEBSITE_ANALYSIS.md` | `FULL SIMULATION LOGIC` |
| Fruit Beer | `FRUIT_BEER_GAME_DETAILED_ANALYSIS.md` (this one is reliable) | existing `FruitBeerEngine.ts` + tests | — |
| Customer In Store | session text in the upload bundle | `CUSTOMER_IN_A_STORE_DETAILED_ANALYSIS.md` | — |
| EV Gambit | `EV_GAMBIT_IMPLEMENTATION_NOTES.md` | `ev gambit Game workflow.txt` | `THE_EV_GAMBIT_DETAILED_ANALYSIS.md` |
| Defect Detectives | session text (Zenith Engine Works) | `MSGAMES_WEBSITE_ANALYSIS.md` | `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` (mechanics only) |
| Demand Forecast | **no source exists** | — | — |

---

## 10. Adding a New Simulation

If you ever need to (out-of-Phase-1, or for the eventual extension to 16 sims):

1. Create `backend/src/services/gameEngines/{Sim}Engine.ts` extending
   `BaseGameEngine`, implementing all six abstract methods.
2. Register the slug in `factory.ts` (the switch statement).
3. Add a row in `simulations-data.json` and re-run `npm run prisma:seed`.
4. Add `frontend/src/components/games/{Sim}/index.tsx` and wire it into
   `[sessionId].tsx` via the slug→component map.
5. Add tests at `backend/src/__tests__/{Sim}Engine.test.ts`.

Don't add anything to the schema unless you've exhausted JSON-column options.

---

## 11. Open Questions and Outstanding Decisions

These need resolution before or during the work they affect:

1. **Demand Forecast Challenge has no source-of-truth.** Not in MS-GAME's
   16-sim catalog; no analysis MD; not a known MSgames sim. Likely an
   internal-only addition built from the `FULL SIMULATION LOGIC` doc.
   **Decision needed:** (a) reverse-engineer current engine into a spec doc
   for sign-off, (b) drop from Phase 1, or (c) replace with a
   MSgames-canonical sim (e.g., Time Trap).
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
   needed:** re-enable in Phase 1 (so each sim gets a working PDF on
   completion) or defer to Phase 2.
4. **Frontend testing.** Zero frontend tests today. **Decision needed:**
   add Vitest + React Testing Library setup before or during UI phase?
5. **Bot fill-in for multiplayer sims.** `SessionParticipant.is_bot` and
   `bot_strategy` exist in schema but no bot logic implemented. Affects
   Fruit Beer, Order Ops, Onion Dilemma. **Decision needed:** stub bots
   (random valid actions) for Phase 1 demo, or full strategies (Tit-for-Tat
   etc.) deferred?

---

## 12. Common Pitfalls

1. **Engine Not Initialized.** Engine state lost on server restart. Always
   check `isInitialized` before reading state; lazy-init in socket handlers
   if needed.
2. **Prisma client out of sync.** After every `schema.prisma` edit:
   `npm run prisma:generate` then `npm run prisma:migrate`. Skip either and
   types/runtime drift.
3. **Slug mismatches.** Slugs must match across `factory.ts` switch,
   `simulations-data.json`, the `Simulation.slug` DB row, and any frontend
   slug→component map. The factory will throw on unknown slugs.
4. **CORS errors.** Backend `FRONTEND_URL` must equal frontend origin
   exactly. Update `.env` per environment.
5. **Stale Socket auth token.** JWT expiry breaks Socket.io reconnects;
   client must refresh and rejoin the session room.
6. **Trusting an analysis MD blindly.** They drift (§8). Always cross-check
   branding against `MSGAMES_WEBSITE_ANALYSIS.md`.

---

## 13. Out of Scope for Phase 1

Explicitly deferred. Don't build these now:

- Extending roster from 11 → 16 sims (Time Trap, Pricing Paradox, Bottom of
  Pyramid, Segment Wars, Macroniti, Portfolio Gambit)
- Razorpay/Stripe billing or `SimulationAccess` expiry-based gating
- Subdomain-per-game routing (msgames.in style)
- Email notifications via SES/SendGrid
- ZIP bulk export, certificates with QR codes
- Production deploy (Vercel + Render/Railway + managed Postgres)

---

## 14. Working Style Notes

- For any non-trivial change to an engine, write or update a test in the same
  PR. The two existing test files (`FruitBeerEngine.test.ts`,
  `HRCompensationEngine.test.ts`) are the patterns to mirror.
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
    * simulations-data.json — only the row for the active sim
    * factory.ts — only the new sim's case
    * sockets/index.ts — only with a sim-scoped guard, never blanket
    * BaseGameEngine.ts — only if every other engine has been
      reviewed for the breaking change
  Anything else cross-cutting (middleware, schema, controllers)
  belongs in its own commit, not bundled with sim work.
- **Per-sim test isolation.** Run a single sim's tests with
  `npm test -- {SimName}Engine.test.ts`. CI should run all engine
  test files in isolation, not as one combined suite, so a failure
  in one sim doesn't mask others.
---

*Last updated: 2026-05-04. When making non-trivial structural changes to
engine architecture, schema, or workflow, update this file in the same commit.*
