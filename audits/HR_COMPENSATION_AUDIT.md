# HR Compensation — Engine Audit

**Sim:** "To Pay or Not to Pay: An HR Compensation & Hiring Simulation"
**Slug:** `hr-compensation`
**Engine file:** `backend/src/services/gameEngines/HRCompensationEngine.ts`
**Tests:** `backend/src/__tests__/HRCompensationEngine.test.ts` ✅
**Date:** 2026-05-04

---

## Status: Stage-validation patch landed Session 11a (2026-05-08)

The Pattern C gap tracked since Session 2 is now formally closed under the
Phase 1 wrap-up. The engine already enforced stage guards in all three
handlers as of 2026-05-05 (see Session-2 status block below). Session 11a
audited that fix end-to-end and rounded out the test matrix to cover every
illegal stage→stage transition (3 new cases: stage-3 from
`attribute-weighting`, stage-1 from `candidate-ranking`, stage-2 from
`candidate-ranking`).

Tests: `HRCompensationEngine.test.ts` grew from 29 → 32 cases; full backend
suite went from 154 → 157, all green. No existing test depended on the
old stage-skip behaviour.

Sim isolation respected: only `HRCompensationEngine.test.ts`,
`audits/HR_COMPENSATION_AUDIT.md`, and `CLAUDE.md` were touched.

---

## Status: stage validation fixed (2026-05-05)

The Session-2 probe finding (engine routes by `action.stage` without checking
it against `state.currentStage`) is closed. Each of the three stage handlers
(`handleExpertSelection`, `handleAttributeWeighting`, `handleCandidateRanking`)
now guards against out-of-order actions at entry and returns
`{ success: false, message: 'Not in <stage> stage (current: <actual>)' }`
without mutating state. A malicious socket client can no longer skip Stage 1
to reach Spearman's ρ = 1.0.

Tests: `HRCompensationEngine.test.ts` grew from 26 to 29 cases (+4 new
stage-guard cases, –1 documented-gap test that asserted the old behaviour).
Coverage of `HRCompensationEngine.ts` is 89.55% statements / 75% branches.

Verification: `npm test HRCompensationEngine.test.ts` (29/29 green) and
`cd frontend && npm run build` (clean) both pass on 2026-05-05.

Sim isolation respected: only `HRCompensationEngine.ts` and its test file
were touched.

---

## Status: Session A complete (2026-05-04)

Backend externalisation + scenario presets + attribution fix landed. Backend
verification: 26/26 tests pass; `prisma:seed` re-runs cleanly and the
`hr-compensation` row in `simulations` now reads
`Prof. Girish Balasubramanian + Prof. Arvind Shroff`.

**Done in this session:**
- Externalised content into `backend/src/services/gameEngines/data/hrCompensation/`:
  `experts.json`, `attributes.json`, `candidates.json`, `scenarios.json`.
- Engine refactored to load via `fs/path` from a scenario keyed in
  `config.scenario` (defaults to `default`); raw `experts`/`attributes`/
  `candidates` overrides still honoured.
- Three scenario presets ship: `default` (4 experts / 4 candidates,
  balanced), `tech-startup` (5 experts / 4 candidates, leadership-weighted,
  ₹7L base), `manufacturing` (4 experts / 4 candidates,
  experience-weighted, ₹5.5L base).
- Western-default expert/candidate names replaced with mixed-origin set
  consistent with an IIM-authored sim (D2 fixed for default; new scenarios
  follow the same convention).
- `simulations-data.json` author corrected to
  `Prof. Girish Balasubramanian + Prof. Arvind Shroff`. `seed.ts` upsert
  now refreshes catalogue metadata on every run (previously
  `update: {}` meant existing rows never got fixes).
- M2 traced: socket auto-advance branch in `sockets/index.ts:240` only
  fires when `playerDecision` row count for the next round equals
  participant count. HR Compensation never writes `playerDecision`
  (state lives in `sessionStateCache`), so the branch is unreachable for
  this slug — no guard needed. Documented inline above
  `HRCompensationEngine.advanceRound`.
- Tests: 8 new (4 scenario-loading, 3 round-mechanics, 1 information-hiding),
  18 original, all 26 passing. Cleanup hardened so missing
  `game_states` table no longer blocks teardown. The pre-existing
  "wrong stage actions" test was rewritten to reflect actual behaviour
  (no stage validation; documented as a known gap for future work).

**Not done (deferred to Session B / out of scope):**
- Frontend `components/games/HRCompensation/` — Session B.
- Stage validation in the engine (out-of-order actions still advance
  state).
- `prisma migrate` for the `game_states` table — pre-existing schema/db
  drift, unrelated to HR Compensation.
- Pre-existing TypeScript errors in unrelated engines and `auth.ts`
  block `npm run build` cleanly. My changes did not add new errors
  (baseline 67 → after 66; the 1-error reduction came from removing an
  unused `result` variable in the test file).

---

## Verdict (original audit)

**Backend: ~70% complete. Frontend: 0%. Overall: ~40%.**

Recommendation: **small patch + content externalization + tests-pass verification + UI build.** No engine-level rewrite needed.

---

## Match — what's correct

| Item | Status |
|---|---|
| Three-stage flow (Expert Selection → Attribute Weighting → Candidate Ranking) | ✅ |
| Score model (₹500K base + ₹50K + ₹100K + ₹300K → ₹950K max) | ✅ |
| Spearman's ρ rank correlation math | ✅ correct, formula at line 491 |
| State hidden correctly until completion (credibility, optimalWeight, optimalRank) | ✅ |
| Optimal values revealed in `getParticipantState` only after `isComplete` | ✅ |
| Factory registration in `factory.ts` | ✅ |
| Socket handler integration | ✅ (per summary doc) |
| Default config in `getDefaultConfig()` | ✅ (per summary doc) |
| Database seeding row in `simulations-data.json` | ✅ |
| Single-player design (correct for this sim) | ✅ |
| Test suite (18 cases per summary doc) | ✅ exists; **needs to be re-run to confirm passing** |

---

## Drift — what's wrong

### D1. Author misattribution
`simulations-data.json` row id 4 says:
```json
"author": "Prof. Vasanthi Srinivasan, IIM Bangalore"
```
Canonical attribution per `MSGAMES_WEBSITE_ANALYSIS.md`:
```
Prof. Girish Balasubramanian + Prof. Arvind Shroff
```
**Fix:** update seed data, re-run `prisma:seed`.

### D2. Western-default names in content
Hardcoded experts: "Dr. Sarah Johnson", "Ms. Emily Chen", "Mr. David Brown". Hardcoded candidates: "Alice Kumar", "Bob Martinez", "Carol Lee", "Dan Wilson".

For an Indian B-school sim authored by IIM faculty, this should be culturally consistent: Indian-context candidate names, mixed-origin experts is fine but the proportion is off. Low-priority but reads as AI-generated.

**Fix:** rewrite `generateExperts()` and `generateCandidates()` content. Engine logic untouched.

### D3. Static optimal values across sessions
Every game uses the same `optimalWeight` (0.35 / 0.25 / 0.20 / 0.10 / 0.10) and the same `optimalRank` (1, 2, 3, 4). A student who plays twice can perfectly score on round 2 because the right answers don't change.

This isn't a "wrong implementation" — it matches the summary doc — but it's a pedagogical weakness. Defensible for v1; flag as future enhancement.

**Decision needed:** keep static for v1, or randomize via scenario sets? **Recommended: keep static, add 3-4 scenario presets in config so facilitator can pick one.**

---

## Missing — what's not built

### M1. Content not externalized
All experts, attributes, candidates live inside the engine class as hardcoded methods. There's no JSON/seed file that a facilitator can edit. Per the wider platform design (`Simulation.config_schema` + `GameSession.configuration` JSON), this should be data-driven.

**Fix:** create `backend/src/services/gameEngines/data/hrCompensation/` with:
- `experts.json` (4 experts, with credibilities)
- `attributes.json` (5 attributes, with optimalWeights)
- `candidates.json` (4 candidates, with optimal ranking)
- `scenarios.json` (3-4 named scenarios pointing at different content sets)

Engine reads these in `initialize()` from `config` if provided, else falls back to default scenario file.

### M2. `advanceRound()` is a no-op
Returns `{ roundNumber: 0, isComplete: this.state.isComplete }`. The auto-advance pipeline in `sockets/index.ts` may call this and behave oddly for a stage-based sim. Need to trace.

**Fix:** verify socket layer doesn't accidentally advance rounds for `hr-compensation` slug. If it does, either gate by simulation type or make `advanceRound` explicitly inert with a flag.

### M3. No frontend UI
`pages/sessions/[sessionId].tsx` is a 2,324-line monolith. HR Comp UI is either absent or buried. Must:

1. Create `frontend/src/components/games/HRCompensation/` folder
2. Build `index.tsx` (top-level container) plus stage components:
   - `ExpertSelection.tsx`
   - `AttributeWeighting.tsx` (with slider UI; weights must sum to 1.0)
   - `CandidateRanking.tsx` (drag-and-drop or up/down arrows)
   - `Results.tsx` (compensation reveal + optimal answer comparison)
3. Add a slug→component map in `[sessionId].tsx` and route `hr-compensation` through it

### M4. No facilitator monitoring view
Facilitator dashboard should show, for each participant: current stage, time per stage, in-progress decisions. Currently there's no path to display this. Out of scope for HR Comp specifically; address in the cross-sim facilitator dashboard work later.

### M5. Tests not verified passing on current main
Summary doc claims 18 tests pass. With seed data and content changes (D1, D2), tests may break. Must re-run.

**Fix:** `cd backend && npm test HRCompensationEngine.test.ts` after changes.

---

## What an audit-pass change set looks like

Roughly:

| Change | Files | Est. effort |
|---|---|---|
| Externalize content to JSON | 4 new JSON files + ~30 lines engine refactor | 30 min |
| Fix author attribution | `simulations-data.json`, re-seed | 5 min |
| Replace western-default names | content JSON | 15 min |
| Add 3 scenario presets | content JSON + `getDefaultConfig` socket handler | 20 min |
| Verify `advanceRound` doesn't break | trace `sockets/index.ts`, possibly add guard | 20 min |
| Re-run tests, fix breakage | tests file | 30 min |
| **Backend total** | | **~2 hours** |
| Frontend `components/games/HRCompensation/` 5 files | new files + slug router in `[sessionId].tsx` | **~3-4 hours** |

---

## Recommendation

Two sessions:

**Session A (backend):** Externalize content, fix attribution, add scenarios, verify tests pass, verify advanceRound. End state: backend HR Comp is fully data-driven and tested.

**Session B (frontend):** Build `components/games/HRCompensation/` UI, set up the slug→component dispatcher pattern for `[sessionId].tsx` (this is reused by every subsequent sim). End state: HR Comp is end-to-end playable in the browser.

Do not skip Session A. Building UI on hardcoded content means re-doing UI when content changes.
