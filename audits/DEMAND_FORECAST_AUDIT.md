# Demand Forecast Challenge — Engine Audit

**Status: Session DF-2a complete (foundation rewrite landed 2026-05-14).**

What landed in DF-2a:
- Six method helpers: Naive, MA(n), WMA(weights), ES(α), Holt's
  Double ES(α,β), Linear Regression (full-cumulative). All six
  exercised by handcrafted-input tests.
- New action contract: `{ method, params }`. Engine computes the
  forecast; client never supplies a forecast number. Closes audit
  D1, D2 (vapourware methods + decorative method label).
- Method-enum + per-param schema validation. Closes audit D4
  (Pattern B — forged method name).
- Forecast NaN/Infinity / hard-cap guards. Closes audit D5
  (Pattern B — forecast NaN/oversized poisoning).
- async/sync split (`computeMetricsSync` + async wrapper). Closes
  audit C1 (Pattern D — un-awaited Promise).
- MAPE divide-by-zero now skip-period with `mapeExcludedCount`
  tracking. Closes audit D7.
- Seeded mulberry32 RNG keyed by `sessionId:scenarioId`. Closes
  audit D8 (non-reproducibility).
- `warmupPeriods >= numPeriods` rejected at init. Closes audit
  D10 (latent crash on faculty-misconfigured short scenarios).
- Content externalised to
  `backend/src/services/gameEngines/data/demandForecast/`:
  - `scenarios.json` — 4 scenarios (default-stationary,
    trending-quarterly-retail, seasonal-quarterly with the D6 fix
    sinePeriod=4, random-noise) — exceeds the prompt's two-scenario
    minimum.
  - `methods.json` — canonical 6 methods + parameter schemas.
- 40 backend tests, all green.
- `simulations-data.json` row updated: duration 35 min,
  description rewritten to mention 6 methods + MAPE/TS, tags
  bumped with `phase-1.5`, author set to `Parasmani Skills
  Faculty Team`.

What remains for **DF-2b** (next session):
- Pattern-inference action (the audit M1 / pedagogy hole — student
  identifies pattern from data shape before forecasting begins).
- Per-participant state map (multi-tenant; D15 + audit M4).
- Hide demand pattern from `getPublicState` (Pattern A — D11/D14).
- Hide `optimalMethod` until `isComplete`.
- `optimalMethodUsed` → counter (D17 — currently sticky-true).
- Method-appropriateness scoring component (audit M9).
- Per-period "you would have scored X with method Y" benchmark
  (audit M6).

What remains for **DF-3a / DF-3b**: UI under
`frontend/src/components/games/DemandForecast/`.

The original audit body below is preserved verbatim as the
provenance trail for the rewrite. Defects already closed are
called out in the DF-2a list above; defects remaining open belong
to DF-2b scope.

---

# Original audit (Session DF-1)

**Status: Audit only.** No code modified. Session DF-1 — re-evaluating
the 2026-05-04 "drop from Phase 1" decision (CLAUDE.md §11 Q1) on the
basis that the source-of-truth is operations-management curriculum
(Stevenson / Heizer / Chase & Jacobs), not a missing msgames spec.

**Sim:** "Demand Forecast Challenge"
**Slug:** `demand-forecast-challenge`
**Engine file:** [backend/src/services/gameEngines/DemandForecastEngine.ts](../backend/src/services/gameEngines/DemandForecastEngine.ts) (412 lines)
**Tests:** none
**UI:** none
**Date:** 2026-05-11
**Session:** DF-1 (audit)

---

## 1. Verdict

**Full rewrite (option c).** Lean toward "salvage skeleton + rebuild
mechanics" rather than greenfield, but in volume it is closer to a
rewrite than a refactor.

The engine is **not** a forecasting simulation. It is a forecast-error
**reporter**: the player submits a number and a string label called
`method`; the engine compares the number to a pre-generated actual
demand and computes MAD/MSE/MAPE/Tracking-Signal on the result. The
six forecasting methods named in the docstring are essentially
vapourware:

- **3 of 6 methods are not implemented anywhere in the engine**
  — Weighted Moving Average, Holt's Double Exponential Smoothing, and
  Linear Regression have zero code (no formula, no benchmark, no
  validation).
- **The remaining 3 methods (Naive, MA, ES) are implemented only inside
  `calculateBenchmarkForecasts`** (line 360) — used to *display end-of-game
  benchmarks*, never to compute a forecast for the player.
- **The player's `method` label is never validated and never affects
  scoring.** A client can submit `{ forecast: 42, method: "QuantumOracle" }`
  and the engine will record it. The `method` field is decorative metadata.
- **`getOptimalMethod()` recommends a 7th method ("Seasonal
  Decomposition") for seasonal patterns** that isn't even listed in the
  engine's docstring of supported methods (line 326).

The metrics math (MAD, MSE, MAPE, Tracking Signal) is largely
textbook-correct, which is salvageable. The persistence shape, the
single-participant skeleton, and the period-progression loop are also
salvageable. Everything else needs new code.

**Curriculum classification:** the engine maps to standard OM
forecasting curriculum (Stevenson Ch. 3, Heizer Ch. 4, Chase Ch. 18)
*by intent*, but **does not implement the curriculum**. The headline
metrics are correctly defined; the methods that are supposed to teach
"which forecasting technique to apply" are absent.

Twenty substantive defects below (§4–§8). Per CLAUDE.md §8
audit-undercount rule, expect 30–40 to surface during a rebuild.

---

## 2. Curriculum classification

The engine claims (in its docstring at lines 14–27) to teach six
forecasting methods plus four error metrics — the canonical OM
curriculum found in any Stevenson / Heizer / Chase textbook chapter
on time-series forecasting. Holding the engine against the canonical
formulas:

### 2.1 Method-by-method audit

| # | Method | Canonical formula | Engine implementation | Status |
|---|---|---|---|---|
| 1 | Naive | F(t+1) = A(t) | Line 369: `forecast = this.state.historicalDemand[t - 1]` (inside benchmark only) | ✅ correct, but **only inside benchmarks**, never for the player |
| 2 | Moving Average | F(t+1) = (A(t) + A(t-1) + … + A(t-n+1)) / n | Line 374: `slice(t - n, t).reduce(sum)/n` (benchmark only, n hardcoded to 3) | ✅ formula correct; **player-facing path: not implemented**; n not configurable |
| 3 | Weighted Moving Average | F(t+1) = Σ wᵢ · A(t-i),  Σwᵢ = 1 | **Not implemented anywhere** — no helper, no benchmark, no weight schema | ❌ absent |
| 4 | Exponential Smoothing | F(t+1) = α·A(t) + (1−α)·F(t) | Line 380: `alpha * historicalDemand[t-1] + (1-alpha) * (forecasts[last] \|\| historicalDemand[t-1])` (benchmark only, α hardcoded to 0.3) | ✅ formula correct; α not configurable; initialization F(0) = A(0) is a defensible textbook convention |
| 5 | Holt's Double Exponential Smoothing | L(t) = α·A(t) + (1−α)·(L(t−1) + T(t−1)); T(t) = β·(L(t) − L(t−1)) + (1−β)·T(t−1); F(t+1) = L(t) + T(t) | **Not implemented anywhere** — no level/trend state, no β | ❌ absent |
| 6 | Linear Regression | F(t+1) = a + b·(t+1); b = Σ(t−t̄)(A−Ā) / Σ(t−t̄)²; a = Ā − b·t̄ | **Not implemented anywhere** — no slope/intercept helper, no benchmark | ❌ absent |
| 7 | "Seasonal Decomposition" | not listed in engine docstring | Line 326: `return 'Seasonal Decomposition'` for seasonal pattern | ❌ recommended as optimal, but never implemented and not in the canonical 6 |

**Takeaway:** of the six methods the engine claims to teach, **only
three have any implementation, and even those exist only inside
`calculateBenchmarkForecasts`** (a function that runs once at the end
to display "what each method would have achieved"). The player's
forecast is **never** computed by the engine — the player submits a
number, the engine grades it. The method-label field is metadata.

### 2.2 Metric-by-metric audit

| Metric | Canonical formula | Engine | Line | Status |
|---|---|---|---:|---|
| MAD | (1/n) · Σ \|A(t) − F(t)\| | `sumAbsoluteErrors / n` | 301–302 | ✅ |
| MSE | (1/n) · Σ (A(t) − F(t))² | `sumSquaredErrors / n` | 305–306 | ✅ |
| MAPE | (100/n) · Σ \|A(t) − F(t)\| / \|A(t)\| | `(absoluteError / actualDemand) * 100` per period, then averaged | 135, 309–310 | ✅ formula; ⚠ divisor is *actual* (canonical) — see §8 for divide-by-zero handling |
| Tracking Signal | Σ (A(t) − F(t)) / MAD | `sumErrors / mad` | 313–316 | ✅ formula correct (cumulative bias / MAD); textbook-canonical |

The four headline metrics are textbook-canonical. This is the **one
genuinely correct piece of the engine**.

### 2.3 Verdict on classification

**Textbook-divergent.** The metrics layer is canonical; the methods
layer is missing in the parts that matter. A student running this
sim will compute their own forecast in their head (or on paper, or
on a calculator), enter a number, and watch the engine grade it.
The pedagogy of "apply moving average to this data" never happens
inside the simulator — it happens in the student's head. The sim is
a glorified calculator-and-checker.

---

## 3. Match — what is textbook-correct

| Item | Source | Engine | Status |
|---|---|---|---|
| MAD formula | Stevenson Ch. 3 / Heizer Ch. 4 | line 301–302 | ✅ |
| MSE formula | Stevenson Ch. 3 / Heizer Ch. 4 | line 305–306 | ✅ |
| MAPE formula (uses actual as divisor) | Stevenson Ch. 3 / Heizer Ch. 4 | line 135, 309–310 | ✅ canonical |
| Tracking Signal = sum(errors) / MAD | Stevenson Ch. 3 / Heizer Ch. 4 | line 313–316 | ✅ |
| Tracking-signal divide-by-zero handler | (not specced; defensive) | line 314 (`mad !== 0 ? … : 0`) | ✅ |
| Naive formula F(t+1) = A(t) | Stevenson | line 369 (benchmark only) | ✅ |
| Moving Average n=3 | Stevenson Ch. 3 example | line 372–376 (benchmark only) | ✅ |
| Exponential Smoothing α=0.3 | Stevenson Ch. 3 example | line 378–381 (benchmark only) | ✅ formula |
| ES initialization F(start) = A(start − 1) | Heizer Ch. 4 (one of two accepted conventions; the other is F(0) = average-of-history) | line 380 fallback `\|\| this.state.historicalDemand[t-1]` | ✅ defensible |
| Cumulative-rather-than-windowed metrics | Stevenson Ch. 3 (cumulative MAD/MAPE/TS) | reduce over all `playerForecasts` | ✅ canonical for SPC-style monitoring |
| Period progression strictly +1 (no skip) | (sound state mgmt) | `currentPeriod++` on each action | ✅ |
| Warm-up history (5 prior periods before forecasting) | (defensible textbook example) | line 91 `currentPeriod: 5` | ✅ acceptable convention |
| isComplete gate after totalPeriods | (sound state mgmt) | line 164 | ✅ |
| Single-participant single-player sim | matches `simulations-data.json` `max_players: 1` | line 76–80 | ✅ consistent with seed |

The skeleton (period loop, persistence, error-metric math) is sound.
**That's the genuinely useful content of the engine.**

---

## 4. Drift — what diverges from textbook canonical

### D1. Three of six methods are not implemented at all

The engine docstring (lines 14–27) lists six methods. Only three
appear anywhere in code (Naive line 369, Moving Average line 374,
Exponential Smoothing line 380), and only inside
`calculateBenchmarkForecasts`. **Weighted Moving Average, Holt's
Double Exponential Smoothing, and Linear Regression have zero
implementation.** No formula, no benchmark, no `method` validation.

This is the headline drift. It is also a violation of the engine's
own self-description.

### D2. The player's `method` label has no semantic effect

[DemandForecastEngine.ts:113](../backend/src/services/gameEngines/DemandForecastEngine.ts#L113):
`applyAction` accepts `{ forecast, method }`. The engine:

- Stores `method` on the `playerForecasts` entry (line 142).
- Tallies method usage in `getMethodDistribution` (line 334–342) for
  end-of-game display.
- Compares against `getOptimalMethod()` for the `optimalMethodUsed`
  flag (line 156–158).

**The engine never validates the `forecast` value matches what `method`
would have produced.** A player can submit `{ forecast: 42, method:
"Linear Regression" }` after looking at data that should yield a regression
forecast of ~110, and the engine will gladly grade 42 as a "Linear
Regression forecast." The method label is **decorative**.

This is the inverse of the lesson the sim is supposed to teach.

### D3. `getOptimalMethod` returns a method that isn't in the canonical 6

[DemandForecastEngine.ts:319–332](../backend/src/services/gameEngines/DemandForecastEngine.ts#L319-L332):

```ts
case 'seasonal':  return 'Seasonal Decomposition';
```

"Seasonal Decomposition" is a real textbook method (Stevenson Ch. 3.6;
Heizer Ch. 4.6) but it is **not in the engine's own list of six**
(lines 14–27). A player who picks the canonical seasonal method
(usually Holt-Winters in textbooks, or a seasonal index method) will
be told they didn't pick the optimal one — because the optimal one
isn't even in the menu. The mapping is also unprincipled for `random`
(returns "Naive" — defensible, since random data favours minimum-effort
methods) and missing entirely for `trending` returning "Double
Exponential Smoothing" (correct in spirit, but the engine doesn't
implement Holt's, so it can't actually compute that benchmark).

### D4. `method` not validated against any canonical list

[DemandForecastEngine.ts:122–127](../backend/src/services/gameEngines/DemandForecastEngine.ts#L122-L127):
the only validation on `applyAction` is `typeof forecast === 'number'`
and `forecast >= 0`. The `method` string is not validated. Submitting
`method: ""`, `method: null`, `method: 12345`, or
`method: "<script>alert(1)</script>"` all pass through and get
serialized to `playerForecasts[].method` — and to the database via
`saveGameState`. Subsequent `getMethodDistribution` (line 337–339) will
happily key the result object by the forged string.

This is **Pattern B (forged input) — critical**.

### D5. `forecast` has no upper bound

Line 122: `if (typeof forecast !== 'number' || forecast < 0)`. Accepts
`forecast: 1e308` (overflow when squared in MSE), `forecast: NaN`
(passes `typeof === 'number'`; poisons all downstream metrics),
`forecast: Infinity`, `forecast: 0.1` (fine), `forecast: -0` (treated
as 0). For a sim where actual demand is O(100), a 1e10 forecast yields
absoluteError ≈ 1e10 → MSE ≈ 1e20 → MAPE ≈ 1e10 → score floored to 0.
Probably not exploitable, but **`NaN` poisoning is a real bug** —
`absoluteError = |NaN − actual| = NaN`, `cumulativeMetrics.mad = NaN`,
score = `Math.max(0, 100 - NaN) = NaN`, and `NaN.toFixed(2) = "NaN"`
gets emitted to the client and stored in the DB.

This is **Pattern B (forged input) — moderate**.

### D6. Sine period is 12, comment says "quarterly"

[DemandForecastEngine.ts:268–272](../backend/src/services/gameEngines/DemandForecastEngine.ts#L268-L272):

```ts
case 'seasonal':
  // Seasonal pattern (quarterly)
  for (let t = 0; t < periods; t++) {
    const seasonalFactor = Math.sin((t * Math.PI) / 6) * 20;
```

`sin(t·π/6)` has period 12 (since `2π / (π/6) = 12`). The comment
claims "quarterly" — quarterly is period 4. With `numPeriods = 20`
default, the player sees **1.67 cycles** of a 12-period seasonality,
not 5 cycles of quarterly. Either the comment is wrong (more likely)
or the intent was `Math.sin((t * Math.PI) / 2)` (period 4). For
forecasting pedagogy, this matters: a 12-period sine over 20 periods
gives the player less than two cycles to detect a pattern, which is
borderline detectable; a quarterly sine over 20 periods gives 5 clean
cycles, which is the canonical Stevenson Ch. 3.7 example.

### D7. MAPE divide-by-zero handler returns 0%, not skip-period

[DemandForecastEngine.ts:135](../backend/src/services/gameEngines/DemandForecastEngine.ts#L135):

```ts
const percentageError = actualDemand !== 0 ? (absoluteError / actualDemand) * 100 : 0;
```

If actual demand is 0, the engine treats the percentage error as **0%**
regardless of the player's forecast. A player who forecasts 50 against
a true demand of 0 has a perfect 0% MAPE for that period. This is
silently incorrect. Canonical handling per Stevenson is either (a)
exclude zero-actual periods from MAPE entirely, (b) substitute symmetric
MAPE (sMAPE), or (c) flag the period and report MAPE as "undefined for
this series." The `generateDemandPattern` does floor at 0
(`Math.max(0, …)` line 289) so this case can be triggered when noise
amplitude exceeds baseLevel — possible for `random` pattern (amplitude
30 vs baseLevel 100, so the floor kicks in only at noise = -100 which
won't happen in practice; but for a faculty-configured low-baseline
scenario it would). Latent edge case.

### D8. Demand pattern generation is non-seeded `Math.random()`

[DemandForecastEngine.ts:292–294](../backend/src/services/gameEngines/DemandForecastEngine.ts#L292-L294):
`randomNoise(amplitude)` calls `Math.random()` directly. Every session
gets a different demand series. Two students given the same scenario
config will see different data. **Cannot replay; cannot test
deterministically.** Same anti-pattern as the Defect Detectives D9 and
the pre-Session-3 Fruit Beer demand. Forecasting pedagogy specifically
*needs* reproducibility — comparing student A's MAPE-with-MA-3 to
student B's MAPE-with-ES-0.3 only makes sense if both saw the same
series.

### D9. Demand pattern is faculty-config-keyed but the four series are
hardcoded at the formula level

`config.demandPattern` accepts `'stationary' | 'trending' | 'seasonal' |
'random'` (line 30). The faculty cannot tweak baseLevel, slope, sine
amplitude, sine period, or noise amplitude — those are wired into the
generator directly (line 250–286). For classroom rotation, faculty
need a pattern library (akin to HR Comp's three scenarios, or Customer
In Store's procedural generation), not four code-locked formulas.

### D10. `numPeriods < 6` not gated; engine crashes silently

Line 81: `const totalPeriods = config.numPeriods || 20`. If faculty
config provides `numPeriods: 4`, `currentPeriod` (= 5) immediately
exceeds `totalPeriods` (= 4), and the very first `applyAction` call
finds `historicalDemand[5]` is `undefined` (since the demand array has
length 4). `actualDemand = undefined`, `error = undefined - forecast =
NaN`, and the same NaN-poisoning chain as D5 follows. The warm-up
period count (5) is hardcoded; faculty can't reduce it; and providing
`numPeriods <= 5` breaks the engine in non-obvious ways.

### D11. `revealMethod: false` doesn't actually hide pattern → optimal method

The flag is checked only on line 182, which controls whether the
`applyAction` *response* includes `optimalMethod`. But
`getPublicState` (line 217) **always** returns
`demandPattern: this.state.config.demandPattern` (line 231). The
mapping pattern → optimal method is a static switch (`getOptimalMethod`,
line 319). A player who can read `demandPattern` from publicState can
trivially compute the optimal method. The flag provides
illusory-only privacy.

This is borderline **Pattern A (state leak)** — see §6.

### D12. `α` for ES and `n` for MA are hardcoded

`calculateBenchmarkForecasts` (line 344–358) hardcodes `n = 3` for MA
and `α = 0.3` for ES. The textbook curriculum tests *which* α and *which*
n are best — that is the entire pedagogical point of those methods.
Engine ships with one "right answer" per method, so any sensitivity
study is impossible.

### D13. Linear regression coefficients: not computed at all (§D1) — no
windowing question to answer

For completeness: the user's audit prompt asks whether linear regression
coefficients are computed from all prior data vs. windowed. The answer
is **neither — they aren't computed at all**.

### D14. Demand pattern is exposed to the player without semantic
gating

The player learns the demand pattern label (`stationary` / `trending` /
`seasonal` / `random`) on first call to `getPublicState`. In a real
forecasting exercise the student is supposed to **infer** the pattern
from the data — that's half the lesson. Telling the student "this is
trending data" up front collapses the pedagogy. Combined with D11, the
player has both the pattern label and the implicit recipe for the
optimal method before they make any forecast.

This is **Pattern A — moderate**.

### D15. `applyAction` ignores `participantId`

Line 110 signature: `applyAction(participantId: string, action: any)`.
The parameter is unused (line 110–185). Single-player sim, so
practically harmless, but not defense-in-depth: any participant in the
session (if more than one ever joined — which the engine doesn't enforce
at session level) can act on the single shared state. Same defect class
as Defect Detectives C10.

### D16. `saveGameState` writes a fresh `gameState` row per action

[DemandForecastEngine.ts:402–410](../backend/src/services/gameEngines/DemandForecastEngine.ts#L402-L410):
`prisma.gameState.create` is called on every applyAction → 15 rows per
game (totalPeriods 20 − warmup 5). Storage growth, not correctness.
Same shape as Defect Detectives C9.

### D17. `optimalMethodUsed` is sticky-true once set

Line 156–158: `if (method === optimalMethod) this.state.optimalMethodUsed
= true`. Once true, never reset. A player who used the optimal method on
period 5 and then switched away gets the badge for the whole game. The
flag should either be per-period (counted) or "always used the optimal
method" (cumulative AND). Currently it's "ever once used the optimal
method" — a bar so low it's meaningless.

---

## 5. Missing — what's specced (or expected by curriculum) but absent

### M1. Pattern detection (auto-recommend method based on data shape)

Standard OM curriculum teaches a student to look at a time-series
plot and **decide** which method fits — flat data → naive/MA/ES;
trending → Holt's or regression; seasonal → seasonal decomposition or
Holt-Winters; random → naive. The engine has no detector. It hands
the player the pattern label up front (D14) and asks them to pick a
method, but the picker is purely cosmetic (D2). A real implementation
would (a) hide the pattern, (b) accept the player's pattern guess as
an action, (c) score that guess, and (d) score the method choice
against the inferred pattern.

### M2. Optimal-method comparison — does the engine know which method
SHOULD have been used for the given pattern?

`getOptimalMethod` returns a hardcoded string per pattern (line 319).
The engine does not run all six methods on the player's data and
report "method X yielded MAPE Y, method Z yielded MAPE W, optimal
was Z." `calculateBenchmarkForecasts` runs three of the six on the
player's data, but for end-of-game display only, and the "optimal
method" label is decided by config (the pattern type) rather than by
which benchmark won. **Comparison and recommendation are
disconnected** — a player whose data, due to noise, happens to favour
ES could be told the "optimal method was Moving Average" because the
config said `stationary`. Pedagogy bug.

### M3. Faculty-configurable demand patterns

§D9 above. No pattern library, no JSON externalization, no config for
slope/amplitude/period/noise.

### M4. Multiple participants

Hardcoded single-participant (line 76–80). The platform's
"one session, multiple students each running solo" pattern (used by
EV Gambit and Customer In Store) is not supported. For a 35-minute
forecasting drill in a 40-student class, the platform should allow 40
students to run the sim concurrently in one session. Engine would need
to be reshaped per-participant (state per `participantId`) similar to
EV Gambit.

### M5. Test file

No `backend/src/__tests__/DemandForecastEngine.test.ts` exists.
Required by Phase 1 workflow per CLAUDE.md §7.2.

### M6. Per-period UI feedback / structured benchmark output

End-of-game `computeMetrics` returns a `benchmarkComparison` (line
210), but per-period there is no "compare your forecast to what each
method would have produced for *this* period." Without that, the
student gets no incremental signal and can't course-correct.

### M7. Method-specific input forms

The player UI doesn't exist (no Phase-1 UI). When it ships, the input
should let the player **specify the method's parameters** (e.g., for MA
choose n; for ES choose α; for Holt's choose α and β) and *the engine
should compute the forecast from that*. Currently the input is a
free-form `forecast: number`. This is the single biggest delta from a
real OM forecasting drill.

### M8. Server-side method computation helpers

To support M1, M2, M6, M7, the engine needs helpers that, given history
[A(0)…A(t)] and a method+params, return F(t+1). None exist for any
method. This is the foundational building block missing.

### M9. Score that distinguishes "got the right answer" from "picked the right method for the data"

Score formula on line 152 is `Math.max(0, 100 - MAPE)`. It rewards
accurate forecasts only. There is no component for **method
appropriateness** (which is what the sim is meant to teach). A student
who guesses cleverly but picks the wrong method scores higher than a
student who applies the right method and gets unlucky with noise.
Pedagogically inverted.

### M10. Configurable warm-up period

`currentPeriod` starts at 5 (hardcoded line 91). Faculty cannot say
"give them 12 periods of history" or "only 3 periods, force ES with
weak initialization."

---

## 6. Integrity audit (per CLAUDE.md §15 Patterns A–E)

### Pattern A — state leak via publicState

| Check | Status | Detail |
|---|---|---|
| Future actuals (`historicalDemand[currentPeriod..end]`) leaked in `getPublicState`? | ✅ | Line 221: `slice(0, currentPeriod)` returns history only. ✅ |
| Optimal-method label leaked in `getPublicState`? | ⚠ partial | Line 217 doesn't directly emit `getOptimalMethod()`; **but** line 231 emits `demandPattern`, and `getOptimalMethod` is a static switch on `demandPattern`. A player who reads the pattern label trivially derives the optimal method. **Effective leak.** |
| `revealMethod: false` actually hides the optimal method? | ❌ | D11. `revealMethod` only gates the per-action response (line 182), not `getPublicState`. Pattern label always exposed. |
| Hidden full demand series (`historicalDemand`) leaked via state object? | ⚠ | `saveGameState` (line 402) writes the full state including `historicalDemand: number[]` (entire 20-period array, including future periods) to `prisma.gameState.state_data`. If the DB row is queryable from the client (it shouldn't be — Prisma doesn't auto-expose, and the socket layer only emits `getPublicState`), this is fine. **Engine surface OK; storage surface contains the answer.** No code path queries `gameState` for the player's view, so this is latent. |
| `getParticipantState` exposes full demand mid-game? | ✅ | Line 242: `fullDemandData: this.state.isComplete ? this.state.historicalDemand : undefined`. Gated. ✅ |

**Pattern A status: 1 effective leak (D11/D14 — pattern label + recipe).**
**Borderline; closes with a one-line publicState change.**

### Pattern B — forged input via socket client

| Check | Status | Detail |
|---|---|---|
| `applyAction` validates `forecast` is a number? | ⚠ partial | Line 122: `typeof forecast !== 'number' \|\| forecast < 0`. Accepts `NaN`, `Infinity`, and unbounded large values. **NaN poisons all downstream metrics and the score.** |
| `applyAction` validates `forecast` is in a sane range? | ❌ | No upper bound. Accepts 1e308. Score floors at 0, but DB stores the giant value. |
| `applyAction` validates `method` is from the canonical 6? | ❌ **Critical.** | Line 113 destructures `method`, line 142 stores it. **Never validated.** Client can submit `method: "MagicForecast"` or `method: 42` or `method: ""`. The forged string is stored in `playerForecasts[].method` and keys `getMethodDistribution`. |
| `applyAction` validates `method !== optimalMethod` cheating? | n/a | `optimalMethod` is computed server-side from config (line 319), not client-supplied, so the player can't forge "I used the optimal method" directly — **but** they can submit `method: "Moving Average"` (or whatever the pattern's optimal is) without applying it. The optimalMethodUsed flag is set on label-match, not on forecast-correctness (D2 + D17). Trivial cheat. |
| `applyAction` ignores `participantId`? | ⚠ | D15. Single-player sim — practically OK; not defense-in-depth. |
| `numPeriods` config validated to a sane range? | ❌ | Line 81: `config.numPeriods \|\| 20`. Accepts 0, 1, 4 (breaks engine — D10), -5 (causes empty array), 1e9 (huge memory). |
| `demandPattern` config validated against the four cases? | ⚠ | Line 252: `switch(pattern)` with `default` falls through to stationary. Accepts arbitrary strings; default-case is silent. Not a security defect, but a config bug — faculty typo silently runs stationary. |

**Pattern B status: 3 critical defects.** Method label not validated;
forecast NaN-poisoning possible; numPeriods unbounded.

### Pattern C — state progression bypass

| Check | Status | Detail |
|---|---|---|
| Can the player skip ahead (forecast for period 10 while engine is on 5)? | ✅ | Line 130 reads `historicalDemand[currentPeriod]`; line 161 increments. The player has no influence on which period is being forecasted; the engine drives the index. No skip path. ✅ |
| Can the player replay (re-submit forecast for period 5 after engine moved to 6)? | ✅ | Each `applyAction` advances `currentPeriod`; the prior period's forecast is in `playerForecasts` and not re-graded. No replay path. ✅ |
| Can the player submit after `isComplete`? | ✅ | Line 115–119 rejects. ✅ |
| Faculty `numPeriods` sets currentPeriod ≥ totalPeriods at init? | ❌ | D10. If numPeriods < 6, currentPeriod (5) ≥ totalPeriods immediately, but `isComplete` is **not** set at init (only in `applyAction` line 164). First `applyAction` reads undefined → NaN. |

**Pattern C status: 1 latent defect (D10).** No active bypass.

### Pattern D — async/sync type leak

| Check | Status | Detail |
|---|---|---|
| `getParticipantState` (sync) calls `computeMetrics` (async) un-awaited? | ❌ **Critical.** | Line 241: `metrics: this.computeMetrics()`. `computeMetrics` is `async` (line 197). Returns `Promise<any>`, not the resolved object. UI receives `metrics: {}` (an empty serialized Promise) or worse, depending on the JSON serializer. **Same defect as every audited engine to date** (Customer In Store D6, EV Gambit C1, Defect Detectives C1, HR Comp pre-fix). Fifth confirmation of platform-wide pattern. |
| `applyAction` properly awaits sub-operations? | ✅ | Line 168: `await this.saveGameState()`. ✅ |
| `advanceRound` returns a Promise as declared? | ✅ | Line 187: `async`. ✅ |

**Pattern D status: 1 critical defect (matches platform-wide pattern).**

### Pattern E — type narrowing as second-line defense

n/a until UI exists. To be enforced in Session DF-3: the client's
`PublicState` type must omit the demand pattern label (after D11 fix)
and `historicalDemand` future entries (already omitted at runtime —
narrow the type to match).

---

## 7. Pedagogy audit

| Check | Status | Detail |
|---|---|---|
| Headline metric (MAPE / score) computed from real forecasts vs. stubbed? | ✅ formula | Score = `100 - MAPE`. Formula is real. **But:** the metric grades *forecast accuracy*, not *method appropriateness* (M9). A student who eyeballs a great number scores higher than a student who applies the canonically-correct method. |
| Different methods produce different forecast values? | ❌ | **The engine doesn't compute forecasts.** The player submits a number; the method label is metadata. Different methods produce *whatever the player types*. |
| Different demand patterns favour different methods (canonical: stationary → MA/ES; trending → Holt's; seasonal → Holt-Winters/seasonal-decomp; random → Naive)? | ❌ | Engine claims so via `getOptimalMethod` (line 319), but (a) doesn't implement Holt's, (b) doesn't implement seasonal decomposition, (c) doesn't grade the player's forecast against the method's prediction. The mapping is a static switch with no consequence. |
| Demand pattern is procedural with seed (per Customer In Store)? | ❌ | D8. Non-seeded `Math.random()`. Two students get different series. Cannot replay. |
| Demand pattern set is parameterised (faculty can tune slope, amplitude, period, noise)? | ❌ | D9. Four code-locked patterns; no JSON config. |
| Off-by-one on period indexing? | ⚠ | The engine starts at `currentPeriod = 5` (0-indexed), so the "first forecast" is for what humans would call "period 6" if 1-indexed or "period 5" if 0-indexed. Not a bug, but the response message at line 172 says `period ${currentPeriod - 1}` — i.e. mixed conventions. The display will say "Forecast recorded for period 5" while a student reading the chart calls it "period 6." Cosmetic. |
| Sine seasonality matches its comment ("quarterly")? | ❌ | D6. Sine has period 12, comment says quarterly (period 4). |
| MAPE divisor is canonical (actual demand)? | ✅ | Line 135 + line 393. ✅ canonical. |
| MAPE divide-by-zero handled correctly (skip, not zero)? | ❌ | D7. Returns 0% — gives the player a free 100-score on zero-demand periods. |
| Tracking signal computed cumulative (not rolling)? | ✅ canonical | Line 313: `sumErrors / mad` — cumulative. Stevenson Ch. 3 and Heizer Ch. 4 both use cumulative. **But** for an SPC-style "is the forecast biased?" check, a rolling TS (last n periods) is more sensitive. Engine uses cumulative; defensible but the sim should be explicit about which it's using. |
| Linear regression coefficients computed on all data vs. windowed? | n/a | D1/D13. Linear regression isn't implemented. |
| ES initialization (F(0))? | ⚠ defensible | Line 380: when the prior forecast doesn't exist, fall back to `historicalDemand[t-1]`. Equivalent to F(start) = A(start − 1), which is one of two textbook conventions. Acceptable. |
| Score linearly maps MAPE → 0–100? | ✅ formula; ⚠ pedagogy | `100 - MAPE`. A 50% MAPE yields score 50 (passable). A 30% MAPE yields 70 (good). A 10% MAPE yields 90 (great). For a sim where a competent forecaster's MAPE on stationary data should be 5–10%, this gives generous scoring. Acceptable; can be tuned. |
| Pattern detection / inference component? | ❌ | M1. Sim asks the player to pick a method but never asks them to identify the pattern, which is the actual cognitive task in OM. |

**Pedagogy issues, ordered:**

1. **D1/D2** — methods are vapourware; player's number is graded
   regardless of claimed method. **The simulator does not simulate
   forecasting.**
2. **M9** — score grades accuracy only, not method appropriateness.
3. **M1** — pattern detection (the lesson) is skipped; pattern is
   handed to the player.
4. **D6** — sine period mislabelled; player sees < 2 cycles, can't
   detect.
5. **D8/D9** — non-seeded, non-parameterised generation; no replay,
   no faculty knobs.

---

## 8. Correctness audit specific to forecasting math

| Check | Status | Detail |
|---|---|---|
| ES initialisation: F(start) defined? | ✅ defensible | D1 / line 380 — falls back to `A(start − 1)`. |
| MAD divide-by-zero in early periods? | ✅ | Line 298 `if (n === 0) return`. ✅ |
| MAPE divide-by-zero (zero actual)? | ❌ | D7. Returns 0% silently. Should skip the period or use sMAPE. |
| Tracking signal divide-by-zero (MAD = 0)? | ✅ | Line 314 guards. ✅ |
| MSE numeric stability for large demand values (>10000)? | ⚠ | `Math.pow(error, 2)` — for error = 1e10, result = 1e20, fits in `Number` but precision degrades around 1e15. Practical demand values won't trigger; faculty-configurable amplitudes might. |
| MSE displayed in the same units as MAD? | ❌ pedagogy | MSE has units of demand², MAD has units of demand. Engine displays both with `.toFixed(2)` at lines 204 + 205 with no unit annotation. A student comparing "MAD 12.40, MSE 198.50" will confuse the two. Display bug, not correctness. |
| Edge case: period 1 (no prior data)? | n/a | Engine starts at currentPeriod 5; period 1 isn't reachable. |
| Edge case: period N = totalPeriods (terminal)? | ✅ | Line 164 sets `isComplete`. ✅ |
| Edge case: `numPeriods <= 5` (warmup ≥ totalPeriods)? | ❌ | D10. `currentPeriod` starts at 5, `historicalDemand[5]` is undefined when totalPeriods is e.g. 4. NaN-poisons. |
| Edge case: all-zero demand (with MAPE divide handling)? | ⚠ | If all 20 actuals are 0, MAPE = 0 always (D7), MAD ≥ 0, score = 100. Trivially "perfect" sim. |
| Edge case: monotonic trending demand (Holt's optimal)? | n/a | Holt's not implemented (D1). The benchmark won't include it; the player's MA-3 or ES-0.3 forecast lags the trend, MAPE rises into double digits, score falls. The "optimal method = Double Exponential Smoothing" string is shown but no actual Holt's benchmark is computed for comparison. |
| Edge case: very large demand (>10⁵)? | ✅ within Number precision | `baseLevel = 100` is hardcoded, so faculty would need to tune `randomNoise` amplitude > 10⁵ to trigger; cannot via current config schema. |
| Edge case: negative forecast? | ✅ | Line 122 rejects. ✅ |
| Edge case: forecast = NaN (passes typeof === 'number')? | ❌ | D5. Poisons the metrics chain. |
| Edge case: forecast = Infinity? | ⚠ | `error = actual - Infinity = -Infinity`, `Math.abs = Infinity`, `Math.pow(error, 2) = Infinity`, `MAPE = Infinity`, score = `Math.max(0, 100 - Infinity) = -Infinity`... actually wait: `100 - Infinity = -Infinity`; `Math.max(0, -Infinity) = 0`. So score gracefully floors. **But** `cumulativeMetrics.mse = Infinity`, `mad = Infinity` → DB stores Infinity. JSON serializes as `null`. Latent. |

**Off-by-one summary (audit-undercount pattern):** the audit catches
**D6** (sine period mislabel), **D10** (numPeriods < 6 latent crash),
**D17** (sticky `optimalMethodUsed`), and the cosmetic "period N vs
N+1" indexing. Per the audit-undercount rule, expect 1–2 more
indexing/units bugs to surface during a rebuild.

---

## 9. Recommendation

The metrics are correct. Nothing else is. The integrity, pedagogy,
and correctness defects are inseparable from the missing-mechanics
problem (D1) — you can't validate a `method` field that doesn't
correspond to any computed forecast.

### The four options

#### Option A — Small patch + content externalization + tests + UI
**Not recommended.** A small patch can fix Pattern B/D defects (validate
method against the canonical 6, validate forecast bounds, fix
async/sync, fix `optimalMethodUsed` to be cumulative-AND, seed RNG)
and externalize patterns to JSON. It cannot fix D1 (three methods
vapourware) without writing the methods, which is no longer a small
patch. Result: a hardened version of a sim that still doesn't simulate
forecasting.

#### Option B — Partial refactor: methods stay, scoring rewritten
**Not viable.** The methods don't "stay" — three of six are nonexistent.
You cannot rewrite scoring around methods you haven't implemented.

#### Option C — Full rewrite (recommended)
Salvage the skeleton (period loop, persistence, cumulative metrics,
single-participant scaffolding); rebuild the methods layer from
scratch. Specifically:

- **New helpers:** `computeNaive`, `computeMA(n)`, `computeWMA(weights)`,
  `computeES(α)`, `computeHolt(α, β)`, `computeLinearRegression(window?)`
  — pure functions, each returning F(t+1) given history and params.
- **New action shape:** `{ method: enum, params: { n? \| α? \| β? \| weights? } }`
  — the engine **computes the forecast** from the player's method
  choice and parameters. The player no longer types a number.
- **New score:** weighted blend of (a) accuracy (current MAPE-based)
  and (b) method-appropriateness (did they pick a sensible method for
  the inferred pattern?). Both components computed.
- **Pattern inference action:** before forecasting begins, the player
  classifies the data shape (4-way choice). Scored separately.
- **Hide pattern label** in publicState (D11/D14 fix).
- **Procedural seeded data generation** with faculty-tunable
  parameters (slope, amplitude, period, noise, baseLevel) externalised
  to JSON.
- **Multi-participant** per-participant state (mirror EV Gambit
  pattern), since this is a 35-min single-player drill that 40
  students will run concurrently in one session.
- **All Pattern B/D defects from §6 fixed in passing.**

**This is a Session DF-2 (engine) of substantial size, not a quick fix.**

#### Option D — Drop again
**Not recommended.** The textbook curriculum is canonical, stable, and
a real classroom asset. The drop-from-Phase-1 decision (CLAUDE.md §11
Q1) was justified by "no source-of-truth in MSgames canonical sources,"
but the OM curriculum *is* the source of truth and was overlooked.
Dropping a second time would be wrong.

### Recommendation summary

**Option C — full rewrite, deferred to Phase 1.5 (post-Phase-1-tag,
pre-Phase-2).**

The engine should be rewritten as if greenfield, salvaging only the
skeleton (~30% of current code: imports, state shape, period loop,
metrics math, persistence). The new engine will be larger than the
current 412 lines (estimate 600–750 lines) because it must implement
six method helpers (not three benchmarks of three of them) and a
pattern-inference action.

### Audit-undercount correction applied

Audit found 17 substantive defects (D1–D17) plus 8 missing items
(M1–M9, with M8 omitted as duplicative — call it 8). 17 + 8 = 25
items. Per CLAUDE.md §8 audit-undercount rule (multiply by 1.5–2×):
**expect 38–50 items to surface during the rebuild.** The effort
estimate in §10 is padded with this multiplier.

---

## 10. Effort estimate — Sessions DF-2 (backend) and DF-3 (UI)

Per CLAUDE.md "audit-undercounts-defects" rule: predicted defects ×
1.5–2×. The breakdown below uses 1.5× padding per task and notes
where 2× would be more honest given the rebuild's scope.

### Session DF-2 — backend rebuild

| Task | Files | Naive | Padded (×1.5) |
|---|---|---:|---:|
| Update `simulations-data.json` row (description, learning objectives, duration, tags) | `simulations-data.json` | 5 min | 10 min |
| New state shape: per-participant state map (mirror EV Gambit), `phase` discriminator (`infer-pattern` → `forecast-loop` → `complete`), method-params shape | `DemandForecastEngine.ts` (~80 lines new state) | 60 min | 90 min |
| Six method helpers: Naive, MA(n), WMA(weights), ES(α), Holt(α,β), LinearRegression(window?) — pure functions, fully tested-via-engine | `DemandForecastEngine.ts` (~ +180 lines) | 120 min | 180 min |
| Pattern-inference action: classify data shape, score the guess | `DemandForecastEngine.ts` (~ +40 lines) | 45 min | 70 min |
| Method-appropriateness scoring component | `DemandForecastEngine.ts` (~ +30 lines) | 30 min | 45 min |
| Run all 6 methods on player's data per period; emit per-period benchmark for live "you would have scored X with method Y" feedback | `DemandForecastEngine.ts` (~ +50 lines) | 45 min | 70 min |
| Externalize demand patterns to JSON (`data/demandForecast/patterns.json`): per-pattern slope, amplitude, period, noise, baseLevel; load via fs at init | new JSON + ~30-line loader | 60 min | 90 min |
| Seed the RNG (deterministic per session) | `DemandForecastEngine.ts` (~25 lines, mirror Defect Detectives' seedrandom usage) | 30 min | 45 min |
| Validate `method` against canonical-6 enum (Pattern B fix) | `DemandForecastEngine.ts` (~10 lines) | 15 min | 25 min |
| Validate `forecast` is finite + bounded (Pattern B fix; rejects NaN/Infinity/oversized) | `DemandForecastEngine.ts` (~10 lines) | 15 min | 25 min |
| Validate `numPeriods >= warmup + 1` and other config bounds | `DemandForecastEngine.ts` (~10 lines) | 15 min | 25 min |
| MAPE divide-by-zero: skip period or sMAPE (D7 fix) | `DemandForecastEngine.ts` (~5 lines) | 10 min | 15 min |
| Hide demand pattern from publicState; reveal only the visible series; gate `optimalMethod` behind `isComplete` (D11/D14 fix) | `DemandForecastEngine.ts` (~10 lines) | 15 min | 25 min |
| `optimalMethodUsed` → `optimalMethodChoiceCount` (counter, not sticky); per-period flag (D17 fix) | `DemandForecastEngine.ts` (~10 lines) | 15 min | 25 min |
| Fix `computeMetrics` async-not-awaited via `computeMetricsSync` helper (Pattern D fix) | `DemandForecastEngine.ts` (~25 lines) | 25 min | 40 min |
| Per-participant state (single session, multiple students each running solo); rework `applyAction` to honor `participantId` | `DemandForecastEngine.ts` (~80 lines reshape) | 75 min | 110 min |
| Tests covering: each of 6 methods individually + edge cases; method-validation reject; forecast-bounds reject; pattern-inference scoring; per-period benchmarks; all-zero / monotonic / seasonal / large-demand cases; Pattern B/C/D coverage | `__tests__/DemandForecastEngine.test.ts` (new, ~400 lines, ~40 tests) | 150 min | 225 min |
| **DF-2 backend total** | | **~12.0 h** | **~18.0 h** ⚠ |

The **18h padded total exceeds a single session window** (4–6 h). Two
backend sessions are realistic:

- **DF-2a:** state shape, six method helpers, MAPE/divide-by-zero,
  validation, async/sync fix, RNG seed (~9–10 h padded)
- **DF-2b:** per-participant rework, pattern-inference action,
  method-appropriateness scoring, JSON externalisation, full test
  suite (~8–9 h padded)

Honest 2× padding (instead of 1.5×) puts the estimate at 24h, three
sessions: **DF-2a, DF-2b, DF-2c.** Recommend planning for two,
budgeting for three.

### Session DF-3 — UI

| Task | Files | Naive | Padded (×1.5) |
|---|---|---:|---:|
| `frontend/src/components/games/DemandForecast/index.tsx` + slug-map registration | new | 30 min | 45 min |
| Demand-history line chart (Recharts) showing visible periods only | DemandForecast/HistoryChart.tsx | 60 min | 90 min |
| Pattern-inference panel (4-button MCQ: stationary / trending / seasonal / random) — the first-phase action | DemandForecast/PatternInference.tsx | 45 min | 70 min |
| Method-picker form: select method from 6, dynamic params input (n / α / β / weights) | DemandForecast/MethodPicker.tsx (~150 lines) | 90 min | 135 min |
| Per-period feedback panel: actual revealed, error breakdown, cumulative MAD/MSE/MAPE/TS, "vs each method" mini-table | DemandForecast/FeedbackPanel.tsx | 75 min | 110 min |
| Cumulative metrics chart (MAD/MAPE over time) — Recharts | DemandForecast/MetricsChart.tsx | 45 min | 70 min |
| Final scorecard: accuracy score + method-appropriateness score + pattern-inference score, per-method benchmark comparison | DemandForecast/Scorecard.tsx | 60 min | 90 min |
| Pattern-E type narrowing: client `PublicState` type narrows to omit demand pattern label and future periods | DemandForecast/types.ts | 20 min | 30 min |
| Local socket subscription for `action_result` (per-period feedback that shouldn't wait for parent reload — mirror Fruit Beer pattern) | DemandForecast/index.tsx | 30 min | 45 min |
| **DF-3 UI total** | | **~7.6 h** | **~11.5 h** ⚠ |

The **11.5h padded UI also exceeds a single session.** Likely **DF-3a**
(scaffolding + history chart + method-picker + pattern-inference) and
**DF-3b** (feedback panel + metrics chart + scorecard + type narrowing).

### Total estimate

| Phase | Padded (1.5×) | Honest (2×) | Sessions |
|---|---:|---:|---|
| Backend (DF-2) | 18 h | 24 h | DF-2a, DF-2b (DF-2c if scope expands) |
| UI (DF-3) | 11.5 h | 15.5 h | DF-3a, DF-3b |
| **Total** | **29.5 h** | **39.5 h** | **4 sessions, possibly 5** |

For comparison: Defect Detectives was ~22 h padded across 3 sessions.
Demand Forecast is bigger because it needs six method implementations
written from scratch + a pattern-inference action + per-participant
multi-tenancy. Estimate it at **the largest single-sim build of the
project to date**.

---

## 11. Phase classification

CLAUDE.md §11 Q1 records the 2026-05-04 decision to drop from Phase
1 with a footnote "Reconsider in Phase 2." The audit prompt now
proposes a **Phase 1.5** (standalone, post-tag) build.

### What Phase 1 wrap-up looks like (per §6 / §7.1 of CLAUDE.md)

Phase 1 = 5 sims (Fruit Beer, EV Gambit, HR Comp, Defect Detectives,
Customer In Store). Engine + UI complete for all five. Session 11 =
smoke tests + HR Comp stage-validation patch. **Phase 1 ships
without Demand Forecast.**

### Phase 1.5 vs Phase 1 vs Phase 2 — the three options

#### Place into Phase 1 (pre-tag)
**Not recommended.** Adding 4–5 sessions of work (29–40 h padded) before
the Phase 1 tag delays the tag by ~2 weeks of session capacity. Phase 1
is functionally complete; pulling the tag back to slot in this rebuild
breaks the "5 sims shipped" milestone that the project has been driving
toward.

#### Place into Phase 1.5 (post-tag, before Phase 2 work begins) — **recommended**
Phase 1 ships clean with 5 sims. Phase 1.5 is a single
self-contained track: rebuild Demand Forecast across DF-2a/b + DF-3a/b
(potentially DF-2c). No cross-cutting changes, no schema migrations.
The engine is single-sim-isolated per CLAUDE.md §14 working-style rule;
nothing else depends on it. Risk is contained.

This honours the audit prompt's premise that the textbook curriculum
**is** the source of truth — i.e., the original drop reason ("no
source-of-truth in MSgames canonical") is now resolved. There is no
reason to wait until Phase 2 (which is targeted at 11→16 sim
expansion, payment gating, reports, deployment per CLAUDE.md §13) to
do this; it doesn't belong in that scope.

#### Place into Phase 2 (defer)
**Not recommended.** Phase 2's scope is explicitly platform-level
(billing, subdomain routing, reports, frontend tests, prod deploy per
CLAUDE.md §11/§13). Bundling a sim rebuild into a platform-expansion
phase would muddy the phase boundary and re-create the "no clean
finishing line for forecasting" problem.

### Recommended phasing

- **Phase 1** ships at 5 sims (no change from current plan).
- **Phase 1.5** = Demand Forecast rebuild, 4–5 sessions. Single-sim
  scope. CLAUDE.md §11 Q1 updated to: "**Resolved 2026-05-11:** rebuild
  approved as Phase 1.5 (post-Phase-1-tag) standalone track. Scope:
  full rewrite per audit `audits/DEMAND_FORECAST_AUDIT.md`. Sessions:
  DF-2a, DF-2b, [DF-2c if needed], DF-3a, DF-3b. Phase 2 is
  unaffected."
- **Phase 2** unchanged (platform expansion).

### What Phase 1.5 does **not** include

- Reports / PDF generation (still Phase 2 per §11 Q3).
- Frontend test infrastructure (still Phase 2 per §11 Q4).
- Other deferred sims (Sustainable Select, Order Ops, Dual Source,
  Onion Dilemma, TOC Factory) — these stay in Phase 2 / 11→16 scope
  per §13.
- Any cross-cutting schema or middleware change (per CLAUDE.md §14
  sim-isolation rule; if a schema change emerges from the rebuild,
  it goes in its own commit, not bundled).

---

*Audit by Session DF-1. No code modified. No tests written. No UI
touched. Per CLAUDE.md §11 Q1 footnote, this audit re-opens the
2026-05-04 drop decision; pending user confirmation, the
recommendation is full rewrite (Option C) as Phase 1.5, ~4–5 sessions
total. Sessions DF-2 / DF-3 to begin only after user reviews this
document and confirms.*
