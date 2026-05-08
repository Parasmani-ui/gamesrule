# Defect Detectives — Engine Audit

**Sim:** "Defect Detectives: A Quality Control Simulation"
**Slug:** `defect-detectives` *(canonical msgames slug is `defect-detective` — singular; see D8)*
**Engine file:** [backend/src/services/gameEngines/DefectDetectivesEngine.ts](../backend/src/services/gameEngines/DefectDetectivesEngine.ts) (503 lines)
**Tests:** none
**Date:** 2026-05-08
**Session:** 8 (audit)

---

## 1. Verdict

**Architectural decision needed (option d).**

The engine implements a fully **generic SQC drill** that mirrors the
`DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` spec almost line-for-line: 20
batches × 1000 units, 8% → 2% target, 5-defect-type random data
generator, hardcoded per-tool defect-reduction constants, hardcoded
"insight" strings that do not analyze the actual dataset. This is
mechanically functional and pedagogically thin.

Three plausible canonicals exist, and the audit cannot pick on its own:

- **(a)** **MS-GAME.txt:198** (the most authoritative source per CLAUDE.md
  §8 ranking) — two contexts: "consumer goods manufacturing" and
  "quick-commerce dark store"; 60 minutes; Single Player Quality Control
  Manager; 7 QC Tools incl. UCL/LCL bounds. Light reskin of current
  engine fits this; no flowchart-construction phase implied.
- **(b)** **CLAUDE.md §8 narrative** (Zenith Engine Works) — automotive
  bolts manufacturer, 6 months × 2 shifts (Morning/Evening) × 3 lines
  (A/B/C) × 6 defect types, flowchart-construction phase, Excel export.
  This is a far richer simulation. **The Zenith narrative does not
  appear anywhere else in the repo** — not in MS-GAME.txt, not in
  MSGAMES_WEBSITE_ANALYSIS.md, not in `FULL SIMULATION LOGIC &
  FACILITATOR.txt`, not in `game_md.md`, not in
  `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md`. The only on-repo reference
  is CLAUDE.md §8 itself, which says "session text in the upload
  bundle" — i.e. external to the repo.
- **(c)** **DEFECT_DETECTIVES_DETAILED_ANALYSIS.md** (generic SQC) — the
  current engine matches this spec. Per CLAUDE.md §8 the analysis MDs
  are the lowest-ranked source, but here the engine matches the lowest
  source and contradicts the highest.

The architectural call is: **which canonical do we hold the engine to?**
The answer drives whether this is a small patch + content rewrite
(option (a) reskin to MS-GAME's two contexts), a partial refactor with
significant added scope (option (b) full Zenith reframe + canvas), or a
defensible-as-is patch (option (c) keep generic, fix integrity defects).

The user must pick before Session 9 begins. My recommendation, surfaced
in §9, is **option (a) — MS-GAME-aligned reskin** as the lowest-risk
Phase 1 path. It honours the highest-ranked source, requires no canvas
UI, and the engine's data shape transfers directly. Option (b) is a
larger build that may or may not be Phase-1 feasible depending on the
"upload bundle" content I cannot see.

Beyond the architectural call, **eight substantive defects** are
present regardless of which canonical wins. Most match the
platform-wide patterns from Sessions 2-5. They are listed in §6 and §7.

---

## 2. Architectural classification

**The engine implements generic SQC — not Zenith Engine Works, not the
MS-GAME-canonical two-context sim.**

### 2.1 Evidence the engine is generic SQC

| Line | Quote | Reading |
|---|---|---|
| 102 | `numBatches: config.numBatches \|\| 20` | 20 batches default — matches generic-MD spec |
| 103 | `initialDefectRate: config.initialDefectRate \|\| 8.0` | 8% default — matches generic-MD spec |
| 106 | `targetDefectRate: config.targetDefectRate \|\| 2.0` | 2% target — matches generic-MD spec |
| 116 | `currentBatch: 10` | Starts at "batch 10 (have 10 historical batches)" — matches generic-MD spec |
| 236 | `const batchSize = 1000` | Hardcoded 1000 units per batch — matches generic-MD spec |
| 397 | `const shifts = ['A', 'B', 'C']` | **3 shifts A/B/C, NOT Morning/Evening** — contradicts Zenith |
| 398 | `const operators = ['John', 'Mary', 'Bob', 'Alice', 'Charlie']` | Western names — neither Indian factory nor Zenith's spec |
| 399 | `const machines = ['M1', 'M2', 'M3', 'M4']` | **Machines, NOT production lines A/B/C** — contradicts Zenith |
| 400 | `const defectTypes = ['Scratch', 'Dent', 'Misalignment', 'Color defect', 'Size error']` | **5 generic defect types, NOT 6 (Coating, Corrosion, Dimensional, Finish, Pinholes, Surface Cracks)** — contradicts Zenith |
| 351 | `total: \`$${this.state.totalCost.toLocaleString()}\`` | **USD currency, not ₹** — contradicts an Indian-factory framing |
| (n/a) | No `phase` field on state | **No flowchart-construction phase exists.** The state has `currentBatch`, `toolsApplied`, `inspectionStrategy` but no notion of "currently building flowchart" — contradicts Zenith |
| (n/a) | No CSV/XLSX export method | **No Excel download capability** — contradicts Zenith |
| (n/a) | No 6-month time axis on `defectData` | `timestamp: new Date(Date.now() - (count - i) * 24 * 3600 * 1000)` (line 414) — generates 1-day-spaced timestamps for the past 10 days, **not** 6 months × 2 shifts × 3 lines. Contradicts Zenith. |
| 81 | `export class DefectDetectivesEngine extends BaseGameEngine` | No reference to "Zenith" anywhere in 503 lines |

**Verdict on classification:** the engine implements `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md`'s generic SQC spec, on which `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` was clearly *generated from the engine* (the analysis MD's "Implementation Checklist" at lines 1822-1836 pre-checks every backend item already implemented in the engine, suggesting reverse-doc rather than spec-then-build).

### 2.2 Where the Zenith spec lives (or doesn't)

`grep -ri "Zenith"` across the repo returns **one match**: CLAUDE.md
itself. `Coating`, `Pinhole`, `Surface Crack`, `automotive bolt`,
`Morning shift`, `Evening shift`, `flowchart construction`, and `dark
store` likewise appear only in CLAUDE.md (one mention) and MS-GAME.txt
(`dark store` once, in the canonical 2-context tagline). The Zenith
narrative cited in CLAUDE.md §8 references "session text in the upload
bundle" — i.e. **a document the audit cannot read**.

This means there are two reasonable readings of the Zenith claim in
CLAUDE.md §8:

1. The upload bundle does contain a Zenith specification, in which case
   it is canonical (matches MS-GAME.txt's authority ranking — session
   text > FULL SIMULATION LOGIC > analysis MD), and the engine has
   massive drift. **Sessions 9 + 9.5 to refactor.**
2. The upload bundle is silent on Zenith and the CLAUDE.md note was
   imported from a session transcript that is no longer ground truth.
   In this case MS-GAME.txt's two-context framing wins, and the engine
   has medium drift (branding + integrity). **Session 9 only.**

**Audit cannot resolve this.** Surfaced as the headline architectural
question for the user.

### 2.3 Where MS-GAME.txt lands

MS-GAME.txt:187-199 (the highest-ranked branding source) describes:

- **Slug:** `defect-detective` (singular — engine and seed both use plural)
- **Author:** Dr. Jaya Priyadarshini
- **Source institution:** Great Lakes Institute of Management, Gurgaon
- **Duration:** 60 mins (engine seed says 50)
- **Type:** Single Player (engine respects this)
- **Two contexts:** "consumer goods manufacturing" AND "quick-commerce dark store"
- **Mechanics:** 7 QC Tools, UCL/LCL bounds. **No mention of 6-month / 2-shift / 3-line / 6-defect-type / flowchart-construction.**

The MS-GAME.txt mechanics are *compatible* with the current engine's
data shape — they don't *require* flowchart-construction or Zenith's
6-defect-type taxonomy. A 90-minute reskin can ship two `scenarios.json`
entries (`consumer-goods` and `dark-store`) over the existing engine.

---

## 3. Match — what aligns with whichever spec the engine is closest to

Holding the engine against `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md`
(the spec it actually implements):

| Item | Source | Engine | Status |
|---|---|---|---|
| 20 batches × 1000 units | analysis MD line 44 | line 102, line 236 | ✅ |
| 8% initial → 2% target | analysis MD line 191-192 | line 103, 106 | ✅ |
| Inspection cost $2 / defect cost $50 | analysis MD line 200-202 | line 104-105 | ✅ |
| 7 QC Tools list (Check Sheet, Histogram, Pareto, Fishbone, Scatter, Flowchart, Control Chart) | analysis MD line 73-107 | line 423-450 | ✅ |
| Per-tool reduction percentages (5/8/15/12/7/10/18) | analysis MD line 673-681 | line 423-450 | ✅ exact match |
| Each tool can only be applied once (canonical pool) | analysis MD line 358-360 | line 175 | ✅ |
| `currentDefectRate * (1 - reduction/100)` cumulative | analysis MD line 1024-1029 | line 188 | ✅ |
| Floor at `targetDefectRate` | analysis MD line 1032-1034 | line 187 | ✅ |
| 100% / sampling / none inspection strategies | analysis MD line 689-815 | line 211, 244-270 | ✅ |
| 100% inspection cost = batchSize × $2; catches all | analysis MD line 693-705 | line 246-249 | ✅ |
| Sampling cost = sampleSize × $2; catches 70% if sampleDefects > 0 | analysis MD line 727-739 | line 252-262 | ✅ |
| No-inspection cost = 0; all defects pass | analysis MD line 765-773 | line 265-270 | ✅ |
| UCL = mean + 3σ, LCL = max(0, mean - 3σ) | analysis MD line 110-115 | line 480-481 | ✅ formula correct |
| Out-of-control = rate > UCL OR rate < LCL | analysis MD line 862-866 | line 282 | ✅ |
| Performance grade tiers (Excellent / Very Good / Good / Fair / Needs Improvement) | analysis MD line 1115-1130 | line 486-490 | ✅ |
| `defectsDetected + defectsPassedToCustomer` cumulative tracking | analysis MD line 444-445 | line 277-278 | ✅ |
| `applyAction` rejects after `isComplete` | (standard pattern) | line 139-144 | ✅ |
| Engine factory registration | factory.ts | factory.ts:71 | ✅ |
| `BaseGameEngine` extension | platform pattern | line 81 | ✅ |

The engine is a faithful implementation of `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md`.
The MD describes itself as "Document Version 1.0, Last Updated January
2025, Status: Complete Analysis - Ready for Implementation, Based on:
DefectDetectivesEngine.ts" (lines 1862-1865). The MD post-dates the
engine and was generated *from* it — a tautology, not a validation.

---

## 4. Drift — what diverges from canonical

Holding the engine against MS-GAME.txt + Zenith narrative (the two
higher-ranked sources). Each item is a separate decision; some go away
under one architectural choice and stay under another.

### D1. Branding — author, institution, currency

- `simulations-data.json:147` `"author": "Parasmani Skills Team"` →
  canonical (MS-GAME.txt:195) is **`Dr. Jaya Priyadarshini, Great
  Lakes Institute of Management, Gurgaon`**.
- `simulations-data.json:149` `"duration_minutes": 50` → canonical
  (MS-GAME.txt:192) is **60**.
- `simulations-data.json:145` `"name": "Defect Detectives - Quality
  Control"` → canonical (MS-GAME.txt:187) is **"Defect Detectives: A
  Quality Control Simulation"**.
- Engine `computeMetrics` line 351: `\`$${this.state.totalCost.toLocaleString()}\``
  → currency should be **₹** for an India-authored sim. Same currency
  bug as the broader Indian-context drift seen in Onion Dilemma audit
  (CLAUDE.md §8 currency drift table).
- `inspectionCostPerUnit: 2` and `defectCostPerUnit: 50` are interpreted
  by the analysis MD as USD ($2 inspection, $50 defect cost). For
  Indian factory branding these should rebase to ₹100 and ₹2,500 (rough
  PPP) or stay nominal but display ₹.

**Same shape as Sessions 2-5 author/branding drift.**

### D2. Slug mismatch with msgames canonical

- MS-GAME.txt:188: `defect-detective` (singular)
- `factory.ts:71`, `simulations-data.json:144`, engine constructor line
  85: all use `defect-detectives` (plural)

Cross-platform-consistency probably wins (changing the slug breaks
existing seeds, sessions, and the slug→component map), so I'd flag
this as **leave plural, document drift**. Not a defect; flagged for
completeness.

### D3. Zenith data-shape contradiction (if Zenith is canonical)

If the user confirms the Zenith narrative is the spec, the engine has
fundamental data-shape drift:

| Aspect | Engine | Zenith canonical (per CLAUDE.md §8) |
|---|---|---|
| Time axis | Days (10 historical, 10 future batches) | 6 months |
| Shifts | 3 shifts: `A` / `B` / `C` (line 397) | 2 shifts: Morning / Evening |
| Lines | None — only "machines" `M1..M4` (line 399) | 3 production lines: A / B / C |
| Defect types | 5: Scratch, Dent, Misalignment, Color defect, Size error (line 400) | 6: Coating, Corrosion, Dimensional, Finish, Pinholes, Surface Cracks |
| Operators | 5 Western names: John/Mary/Bob/Alice/Charlie (line 398) | (not specified in §8) |
| Factory branding | Generic | "Zenith Engine Works", automotive bolts |
| Game phase | Single phase (all actions allowed in any order) | Distinct phases including flowchart-construction |
| Excel export | None | Required (CSV/XLSX dataset download) |

If MS-GAME.txt is canonical, this whole table collapses to "branding
drift only" and the data shape is acceptable.

### D4. Pareto / Histogram / Fishbone / Scatter "insights" are static strings, regardless of dataset

[DefectDetectivesEngine.ts:421-461](../backend/src/services/gameEngines/DefectDetectivesEngine.ts#L421-L461)
maps each tool to a **fixed** insight string and a **fixed** reduction
percentage. The function ignores `analysis` (the player's interaction
data) and ignores `this.state.defectData` (the actual generated
dataset).

Examples:

```
Pareto Chart → "80% of defects come from 2 defect types: Scratch and
                Misalignment." (always)
Histogram   → "Distribution shows defect clustering around specific
              machines." (always)
Fishbone    → "Root cause identified: Machine M2 calibration drift."
              (always)
```

The engine generates `defectData` randomly (line 395-419), so the
"actual" peak defect type / shift / machine is whatever `Math.random`
produces. The static insights are **disconnected from the dataset**. A
player whose random data shows zero scratches still receives the
"scratches and misalignment dominate" insight from Pareto.

**Same defect class as Customer-In-Store's identical-intervention-modes
stub (CIS audit D1) and EV Gambit's hardcoded event-effect strings
(EV Gambit pre-Session-6 D2).** The "tool" is a button that returns a
hardcoded message; the dataset is decorative.

### D5. Sampling math is degenerate w.r.t. sample size

`processBatch` line 252-262: when `inspectionStrategy === 'sampling'`,
the engine computes `sampleDefects = sampleSize * (defectRate/100)`
just to gate a binary `if (sampleDefects > 0)`. If the sample contained
*any* defect, the engine declares 70% of the BATCH's defects caught.
The 70% is **independent of sample size**.

Pedagogically, a sampling-plan trade-off study is *the* way to teach
producer's risk vs consumer's risk, and the magnitude of detection
should scale with sample size (or at least with sampling fraction).
The engine collapses the entire sampling-plan dimension to a single
"if I see anything, I catch 70%" lookup.

**Same shape of stub as D4.**

### D6. Tool effects do not interact with inspection strategy

The two state-modifiers on `currentDefectRate` (QC tool application)
and `defectsPassedToCustomer` (inspection strategy) are completely
independent. A player can:

- Apply 7 QC tools → drive defect rate from 8% → 2% (target floored).
- Set `inspectionStrategy: 'none'` → save all inspection cost.
- Process 10 batches → 1000 × 2% × 10 = 200 defects pass × ₹50 = ₹10,000
  total cost. Performance grade: "Excellent (Six Sigma) ⭐⭐⭐⭐⭐"
  because target achieved.

A player who just turns inspection off after applying tools wins on
both axes. There is no incentive to maintain inspection once tools are
applied. Real factories use SPC + sampling together because both
produce different signals — the engine doesn't model that.

### D7. Out-of-control points are computed but never reacted to

[DefectDetectivesEngine.ts:282](../backend/src/services/gameEngines/DefectDetectivesEngine.ts#L282)
computes `outOfControl: boolean` per batch but it has **no
consequence**. No event triggers, no penalty, no facilitator
notification, no UI alert (the field is in `getParticipantState` so a
UI *could* render it, but the engine never says "halt, special cause
detected"). For an SQC simulation, this is the central pedagogical
hook: when a chart detects a special cause, the operator should
intervene. Stub.

### D8. Defect-data generation is random and unanchored

[DefectDetectivesEngine.ts:395-419](../backend/src/services/gameEngines/DefectDetectivesEngine.ts#L395-L419):
shifts, operators, machines, defect types are all uniform-random. Per
canonical Pareto/80-20 pedagogy the dataset should contain **biased**
distributions (e.g. one machine produces 60% of defects, one shift
produces 40% more, one defect type accounts for 50%) so that applying
Pareto/Fishbone/Scatter actually reveals patterns. Currently the data
is uniformly random, the "insight" is hardcoded, and they don't have
to agree.

### D9. `Math.random()` in defect generator is non-deterministic per session

[DefectDetectivesEngine.ts:404,408,409,410,411](../backend/src/services/gameEngines/DefectDetectivesEngine.ts#L404):
defect-data generation uses uncontrolled `Math.random()`. Cannot
replay; cannot test; two students running identical scenarios get
different datasets. Same anti-pattern as Fruit Beer's pre-Session-4
random demand (later replaced with deterministic step pattern).

For SQC pedagogy *some* noise is appropriate (real factories have it),
but it must be **bounded and reproducible per session** (seeded RNG).
The current engine has neither bound nor seed.

---

## 5. Missing — what's specced in canonical but absent

### M1. Two-context scenario library (MS-GAME.txt-canonical)

MS-GAME.txt:198: "Two contexts: consumer goods manufacturing and
quick-commerce dark store." Engine has **one** generic context. No
`scenarios.json` exists; data shape is fixed in code. Per HR Comp's
externalization pattern (Session 2A), this would be one
`backend/src/services/gameEngines/data/defectDetectives/scenarios.json`
keyed `consumer-goods` and `dark-store` with per-scenario shifts,
operators, defect types, currency. ~150 lines extracted.

### M2. Flowchart-construction phase (Zenith-canonical, per CLAUDE.md §8)

If Zenith is the spec, the engine has **no** flowchart-construction
phase. State has no `phase` discriminator; there is no
`flowchart-canvas` action type; no engine support for "submit
flowchart of defective process." This is significant work — ~300
lines of state + a frontend canvas (likely react-flow library).

### M3. CSV/XLSX dataset export (Zenith-canonical)

Engine has no export method. `getParticipantState` returns
`defectData` as a JSON array, which the UI could serialize, but no
canonical CSV/Excel output exists. ~30 lines of helper if added
server-side.

### M4. Test file

No `backend/src/__tests__/DefectDetectivesEngine.test.ts`. Required by
Phase 1 workflow per CLAUDE.md §7.2.

### M5. Tool-output rendering (e.g. actual Pareto bars / Histogram bins)

Each `applyQCTool` returns `{ tool, insight: string, defectReduction:
number }`. There is no shaped data the UI can render as a chart. A
real Pareto application should return `{ defectType: string, count:
number, cumulativePct: number }[]` so the UI can render the chart. A
real Histogram should return `{ bin: string, count: number }[]`. None
of this exists. **Same shape as D4** — the engine doesn't compute
analytics, just emits a string.

### M6. Cost-of-quality tracking (Prevention / Appraisal / Internal Failure / External Failure)

Analysis MD line 149-179 specs this four-bucket cost model. Engine
tracks **only** Appraisal (inspection cost) and External Failure
(defectsPassedToCustomer × $50). No prevention bucket (QC-tool
application is free in the engine — line 191 `applyQCTool` doesn't
charge cost), no internal-failure bucket (defectsDetected don't incur
rework cost). This may be a deliberate simplification but is a
canonical-spec gap.

---

## 6. Integrity audit (per CLAUDE.md §15 / Sessions 2-5 pattern)

### Pattern A — state leak

| Check | Status | Detail |
|---|---|---|
| `getPublicState` exposes target defect rate? | ⚠️ borderline | Line 372: `targetDefectRate` is in publicState. This is the *goal* — fine to expose. Not a leak. |
| `getPublicState` exposes per-tool defect-reduction values before application? | ✅ | Line 373: only emits `toolsApplied.map(t => t.tool)` — names of *already-applied* tools. Reduction values not in publicState. ✅ |
| `getParticipantState` exposes correct optimal tool order? | ✅ | Line 387: `toolsAppliedDetails` only includes tools the player has applied. The unapplied tools' reduction constants are not surfaced. ✅ |
| Hardcoded reduction constants readable from engine source? | ⚠️ | Lines 423-450 have `Pareto = 15%, Control Chart = 18%, Check Sheet = 5%`, etc. as plain JS literals. Not a runtime state leak — but anyone reading the engine source on github knows the lookup table. Borderline; the canonical fix is content externalization (M1) which moves them to JSON, equally readable. Pedagogy concern, not integrity. |
| `getPublicState` exposes random `defectData` to all participants? | ⚠️ | Line 386: `defectData` is in `getParticipantState` only — not `getPublicState`. ✅ |
| Future control-chart UCL/LCL revealed? | ✅ | Line 388: `controlChartData` is the *history* of past batches; the next batch's UCL/LCL is computed only when `processBatch` is called. ✅ |

**Pattern A status: marginal.** No critical leak.

### Pattern B — forged input

| Check | Status | Detail |
|---|---|---|
| `applyAction` validates `actionType` enum? | ✅ | Line 146-161 — switch with default-error. ✅ |
| `applyQCTool` validates `tool` against the canonical 7-tool list? | ❌ **Critical.** | Line 167-172 only checks `!tool` (truthy). A client can submit `tool: "MagicWand"` and `calculateToolImpact` returns the **default** `{ reduction: 5, insight: 'Analysis completed.' }` (line 453). Worse: the tool dedup check at line 175 checks for the literal `tool` string, so a client can submit `MagicWand1`, `MagicWand2`, `MagicWand3`, ... infinite times — each gets a fresh 5% reduction stack. After ~30 fake submissions, `currentDefectRate` floors at target. Trivial cheat. **Same shape as EV Gambit's pre-Session-6 forged-decision-shape integrity defect.** |
| `setInspectionStrategy` validates `strategy` enum? | ✅ | Line 211 — `['100%', 'sampling', 'none'].includes(strategy)`. ✅ |
| `setInspectionStrategy` validates `sampleSize` is a positive integer? | ❌ | Line 219-221: `if (strategy === 'sampling' && sampleSize) this.state.sampleSize = sampleSize`. Accepts: `0` (becomes the if-falsy path, sampleSize unchanged — OK), `-50` (truthy → stored as -50, yields negative inspection cost), `1e9` (stored as 1 billion — accepted but inspection cost = $2bn), `NaN` (truthy → stored, all subsequent math poisoned), `"50"` (truthy string → stored as string, math works coercively but the type contract breaks), `1.5` (float — accepted, inspection-cost rounds awkwardly). **Critical for `-50` (negative cost) which is server-side profit per batch — let player play forever at negative cost.** |
| `processBatch` accepts forged `batchSize`? | ✅ | Hardcoded `const batchSize = 1000` (line 236) — not from client. ✅ |
| `applyQCTool` accepts forged `analysis` payload? | ✅ trivial | `calculateToolImpact(tool, analysis)` ignores `analysis` (line 421). Forged `analysis` does nothing. (But also nothing the player can do meaningfully shapes the outcome — see D4.) |

**Pattern B status: 2 critical defects.** Tool name not gated, sampleSize not bounded.

### Pattern C — state progression / phase enforcement

| Check | Status | Detail |
|---|---|---|
| Phases enforced? | ⚠️ | The sim has **no explicit phases**. The analysis MD specs a "1. EXPLORE DATA → 2. APPLY QC TOOLS → 3. SET INSPECTION STRATEGY → 4. PROCESS BATCHES" flow (line 220-247), but the engine accepts any of `apply-qc-tool` / `set-inspection-strategy` / `process-batch` in any order. A player can call `processBatch` 10 times with 8% defect rate and inspection-strategy `sampling/50` — never apply a tool, never explore the data, just rip through batches. No state progression enforcement. |
| Tool can be applied multiple times for cumulative bonus? | ⚠️ | The same *real* tool name cannot (dedup at line 175). But forged tool names (Pattern B above) bypass this — infinite stacking. |
| Batch processing requires QC-tool application first? | ❌ | No; player can `processBatch` immediately after init. |
| Inspection strategy must be set before processing? | ❌ | No; the engine initializes `inspectionStrategy: 'sampling'` with sampleSize 50 by default (line 120-121). Defaults are fine, but no gate is enforced. |
| Player can `processBatch` after `isComplete`? | ✅ | Line 139-144 rejects all actions after `isComplete`. ✅ |
| `processBatch` past batch 20? | ✅ | `currentBatch >= numBatches` at line 296 sets isComplete; combined with the previous gate, no over-run. ✅ |

**Pattern C status: 2 marginal defects.** No phase enforcement; cumulative-bonus exploit via forged tool names.

### Pattern D — async/sync leaks

| Check | Status | Detail |
|---|---|---|
| `computeMetrics` is async, called un-awaited? | ❌ **Critical.** | Line 389: `metrics: this.state.isComplete ? this.computeMetrics() : undefined`. `computeMetrics` is `async` (line 333). Returns `Promise<any>`, not the resolved metrics object. UI receives `metrics: {}` (an empty serialized Promise). **Same defect as Customer-In-Store D6, EV Gambit C1, HR Comp pattern.** Every sim audited so far has had this defect; this is the fourth. |
| `applyAction` properly awaits sub-handlers? | ✅ | Line 148-154: `return await this.applyQCTool(data)` etc. ✅ |
| `saveGameState` properly awaited? | ✅ | Line 193, 223, 300 — all awaited. ✅ |

**Pattern D status: 1 critical defect (matches platform-wide pattern).**

---

## 7. Pedagogy audit

| Check | Status | Detail |
|---|---|---|
| Headline metric (defect-rate-after-intervention) computed deterministically vs stubbed vs random? | ⚠️ | **Deterministic** per applied tool: `currentDefectRate * (1 - reduction/100)`, capped at target. Acceptable. But the per-tool reduction percentages are **arbitrary lookup constants** disconnected from any analysis the player did — they're prescribed regardless of dataset. Pedagogically, applying Pareto to a dataset where 50% of defects are from one type *should* yield a bigger reduction than applying it to a uniform dataset. Engine treats both identically (15%). Same stub family as D4. |
| 7 QC Tools each produce DIFFERENT analytical output? | ❌ | Each tool returns the same `{ tool, insight: string, defectReduction: number }` shape, with `insight` being a fixed canned string. The UI cannot render a Pareto bar chart, a histogram, a fishbone, or a scatter plot from the engine's response — there is no shaped data emitted per tool. **Identical-output pattern, same shape as Customer-In-Store's three-modes-return-the-same-payload defect (CIS audit D1 pre-fix).** |
| 7 QC Tools each produce DIFFERENT defect-reduction effect? | ✅ | Yes, each has a unique `reduction` value (5/8/15/12/7/10/18). Different on the *number* axis. But the differences are arbitrary lookup constants. Better than identical, weaker than principled. |
| Cost-benefit math (inspection cost vs defect cost trade-off)? | ✅ formula-correct | `defectCost = passedToCustomer × $50`, `inspectionCost = inspected × $2`. Matches spec. **But** see D6 — once tools drive defect rate to 2%, switching off inspection has no downside, breaking the trade-off pedagogy. |
| 100% / sampling / none cost calculations correct? | ✅ | Match analysis MD (lines 693-815). |
| Sampling detection rate scales with sample size? | ❌ | D5 — hardcoded 70% catch rate independent of sample size. Pedagogy ceiling. |
| UCL/LCL formulas (μ ± 3σ)? | ✅ | Line 480-481. ✅ |
| σ uses sample stddev (n-1) or population stddev (n)? | ⚠️ | Line 476: divides variance by `recentData.length` (n), not (n-1). Population stddev. SQC convention is sample stddev (n-1). For n=10 the difference is ~5% in σ; not catastrophic but stylistically incorrect for an SPC course. |
| Out-of-control points have consequences? | ❌ | D7 — computed but ignored. Pedagogy stub. |
| Cost-of-quality four-bucket model (Prevention / Appraisal / Internal / External)? | ❌ | M6 — only Appraisal + External tracked. |
| Random data without bias for Pareto pedagogy? | ❌ | D8 — uniform random data, but Pareto's static insight insists on Scratch + Misalignment dominance. |
| Reproducible per session (seeded RNG)? | ❌ | D9 — un-seeded `Math.random()`. |

**Pedagogy issues, ordered:**

1. **D4** — tools produce hardcoded insights disconnected from the
   actual dataset. The simulation pretends to teach analytical tools
   but the player never analyzes anything; they just click 7 buttons.
2. **D5** — sampling 50 vs 500 catches the same 70%. Sample-size pedagogy stub.
3. **D6** — once defect rate ≤ target, no incentive to keep
   inspection on. The two-axis trade-off collapses.
4. **D7** — out-of-control flag computed but ignored. SPC's central
   teaching hook (intervene on special cause) absent.
5. **D8** — uniformly random data prevents the pattern-discovery
   pedagogy that Pareto / Fishbone / Scatter exist to teach.

---

## 8. Correctness audit

| Check | Status | Detail |
|---|---|---|
| Edge case: zero defects (rate = 0%) | ✅ | `defectCount = round(1000 * 0) = 0`. All inspection paths yield 0 defects. No divide-by-zero. ✅ |
| Edge case: 100% defect rate | ✅ | `defectCount = 1000`. 100% inspection catches all; sampling catches 70% of 1000 = 700; 'none' passes 1000. All cost math holds. ✅ |
| Edge case: single-batch run | ✅ | `recentData.length < 3` falls back to `initialDefectRate × 1.5` UCL (line 467-471). ✅ |
| Edge case: all 10 historical batches at zero variance | ⚠️ | If `defectData` were stable at exactly the same rate (it isn't, due to D9 randomness, but consider seeded determinism), variance → 0 → σ → 0 → UCL = LCL = mean. Any tiny perturbation marks `outOfControl`. Latent edge case; not currently triggered because data is random. |
| Floating point: variance computation | ⚠️ | Line 475-477 — straightforward; no catastrophic cancellation for n=10 reasonable values. ✅ |
| **C1 — `computeMetrics` async-not-awaited (Pattern D above)** | ❌ | Line 389. Same as CIS D6, EV Gambit C1. |
| **C2 — `costs.perBatch = totalCost / currentBatch` divides by wrong N** | ❌ | Line 352: `(this.state.totalCost / this.state.currentBatch).toFixed(2)`. After 10 batches processed, `currentBatch` is 20 (started at 10, incremented 10 times). So `perBatch = totalCost / 20`, not `totalCost / 10`. Off-by-2x. **Same family of off-by-one as Customer-In-Store's `correctAnswer` indexing defect (CIS D4) — engine state is 0-indexed-from-warmup, display is 1-indexed-from-game-start.** |
| **C3 — `defectsDetected += defectsDetected` parameter shadowing** | ⚠️ | Line 277: `this.state.defectsDetected += defectsDetected` — works because the local `defectsDetected` (line 240) is shadowed by the same name as the state field. The pattern is fragile but currently correct because the two are in different scopes. Refactor target. |
| **C4 — currency hardcoded as `$`** | ❌ | Line 351: `\`$${this.state.totalCost.toLocaleString()}\``. For India-context sim should be ₹. Branding bug. |
| **C5 — slug singular/plural mismatch** | ⚠️ | D2. Engine and seed use `defect-detectives`; canonical is `defect-detective`. Cross-platform decision; flag don't fix. |
| **C6 — `currentBatch` initialized to 10 means first batch processed is batch 10, last is batch 19; total processed = 10** | ⚠️ | This is the spec ("Start at batch 10 (have 10 historical batches)"). But the metric `costs.perBatch` divides by `currentBatch` (= 20 at end), not by 10 (actual processed count). Combined with C2 above. |
| **C7 — `controlChartData` pushed BEFORE `currentBatch++`** | ✅ | Line 284-290 records with current batch ID, then increments at line 293. Order is consistent. ✅ |
| **C8 — `defectData` array never grows after initialization** | ⚠️ | Line 110 generates 10 historical entries; no engine method appends to `defectData` during processing. So `defectData` is *only* the warm-up data; per-batch processing never logs new entries. If a UI wants to show "defect data over time", it can use `controlChartData` (which does grow), but the original `defectData` is frozen. Minor, not a defect. |
| **C9 — every action writes a fresh `gameState` row** | ⚠️ | `prisma.gameState.create` in `saveGameState` (line 494) creates a new row each call. Over a 10-batch + 7-tool + 1-strategy session = 18+ rows. Storage growth, not correctness. |
| **C10 — no participant binding** | ⚠️ | `applyAction(participantId, action)` ignores `participantId` (line 134-162). The state is single-participant (`state.participantId` set at init from `participants[0]`). Single-player sim — fine — but no defense-in-depth: any participant in the session can act on the single shared state. For a Single-Player sim (per MS-GAME.txt:193) running one student at a time, this is correct; for the platform's "one session, multiple participants each running solo" pattern (which EV Gambit uses), it's wrong. Worth flagging for the user to decide. |
| **C11 — `data.defectReduction` returned as a string `"15%"` not a number** | ⚠️ | Line 201: `defectReduction: result.defectReduction + '%'`. Frontend gets a string; can't sum without parsing. Type contract bug; cosmetic. |

**Off-by-one summary (audit-undercounts pattern):** the audit
catches **C2** (perBatch divisor wrong by 2x) and the slug singular/plural
mismatch (C5/D2). Per the audit-undercounts-defects multiplier, expect
1-2 more off-by-ones to surface during fix.

---

## 9. Recommendation

The integrity, pedagogy, and correctness defects are **independent of
the architectural choice** — they need fixing under any verdict. Use
that as a floor, then layer the architectural choice on top.

### Three options for the user

#### Option A — **Generic-but-cleaner (fastest)**
Keep the `DEFECT_DETECTIVES_DETAILED_ANALYSIS.md` spec; fix all
integrity / pedagogy / correctness defects; rebrand to ₹ + India
operator names; externalize tool-effect constants and dataset to JSON.

- **Estimated effort:** 1 backend session (Session 9), 1 UI session (Session 10)
- **Skips:** flowchart-construction, Excel export, two-context library, Zenith data shape
- **Risk:** lowest; defends against MSgames audit later as "we shipped a generic SQC drill"

#### Option B — **MS-GAME.txt-aligned reskin (recommended)**
Reskin to MS-GAME.txt's two contexts (consumer-goods manufacturing +
quick-commerce dark store). Keep current data shape; change branding,
defect types, operator names, currency per scenario. Add a second
scenario to JSON. Same fixes as Option A on top.

- **Estimated effort:** 1 backend session (Session 9, longer than A by ~30 min), 1 UI session (Session 10)
- **Skips:** flowchart-construction, Excel export, Zenith 6-month / 2-shift / 3-line data shape
- **Risk:** low; honours the highest-ranked source (MS-GAME.txt > analysis MD per CLAUDE.md §8); avoids the Zenith canvas-UI risk
- **My recommendation.** Reasoning: MS-GAME.txt is the on-repo highest-ranked source; the engine's data shape transfers; no new UI library needed.

#### Option C — **Full Zenith reframe (most pedagogically rich, riskiest)**
If the upload-bundle session text confirms Zenith as canonical,
reframe to Zenith's 6-month × 2-shift × 3-line × 6-defect-type data
shape. Add a `phase` discriminator to state (warmup → flowchart-build
→ data-explore → tool-application → batch-processing). Add CSV/XLSX
export. Add react-flow canvas for flowchart construction.

- **Estimated effort:** Session 9 + 9.5 (data-shape + Excel + phase machine) + Session 10 (UI canvas + standard UI)
- **New dependencies:** `react-flow-renderer` (or equivalent canvas library) on the frontend; ~4-5 KB bundle
- **Risk:** highest; the canonical Zenith spec is not in the repo, so the rewrite has to be re-confirmed against the upload bundle before starting; flowchart-canvas is novel UI work for the platform
- **Phase 1 wrap-up impact:** likely pushes Phase 1 wrap-up (Session 11 instead of 10)

### What every option shares (the floor — independent of choice)

These fixes ship regardless:

- **Validate `tool` against canonical 7-tool list** in `applyQCTool`
  (closes Pattern B critical #1).
- **Validate `sampleSize`** as positive integer in
  `setInspectionStrategy` (closes Pattern B critical #2; rejects
  negative-cost exploit).
- **Fix `computeMetrics` async-not-awaited** in
  `getParticipantState` (closes Pattern D; matches every other engine's
  fix).
- **Fix `costs.perBatch` divisor** to use processed-batch count, not
  `currentBatch` (closes C2).
- **Currency to ₹**, author to Dr. Jaya Priyadarshini, name and
  duration per MS-GAME.txt (closes D1).
- **Externalize tool effects + dataset config to JSON** per HR Comp's
  pattern (sets up scenario library).
- **Seed the RNG** for reproducibility (closes D9).
- **Bias the dataset** so Pareto / Fishbone / Scatter find real
  patterns, and **wire tool insights to actual analysis** of the
  biased dataset (closes D4 + D8 — the major pedagogy fix).
- **Make sampling detection-rate scale with sample size** (closes D5).
- **Add cost or risk to "no inspection" once defect rate is at
  target** OR add prevention-cost to QC tool application (closes D6 —
  restore the trade-off pedagogy).
- **Out-of-control consequence** — emit a facilitator-visible alert OR
  block the next batch until acknowledged (closes D7).
- **Full test file** at `__tests__/DefectDetectivesEngine.test.ts`
  covering: init, all 7 tools individually, forged-tool-name reject,
  forged-sampleSize reject, sampling math, control-chart formulas,
  computeMetrics shape, edge cases (closes M4).
- **`computeMetrics` returns numeric `defectReduction`, not
  string** (closes C11).

---

## 10. Effort estimate

Per CLAUDE.md "audit-undercounts-defects" rule: predicted defects ×
1.5 = expected defects. Audit found 11 substantive defects (D1-D9
plus C1, C2, C4 → call it 12 with C11). Apply 1.5× → expect ~18 to
surface during fix. The estimate below has been padded accordingly
(documented in the "padding" line per task).

### Floor (every option) — Session 9 backend

| Task | Files | Naive estimate | Padded (×1.5) |
|---|---|---:|---:|
| Fix `simulations-data.json` row 8 (name, author, duration, type, tags) + re-seed | `simulations-data.json` (1 row) | 5 min | 10 min |
| Externalise tool effects + dataset config to JSON (`data/defectDetectives/scenarios.json`, `tools.json`) + wire loader | `DefectDetectivesEngine.ts` (~ −80/+50), 2 new JSON files | 75 min | 110 min |
| Validate `tool` against canonical 7-tool list (closes Pattern B #1) | `DefectDetectivesEngine.ts` (~10 lines) | 15 min | 25 min |
| Validate `sampleSize` as positive integer (closes Pattern B #2) | `DefectDetectivesEngine.ts` (~15 lines) | 15 min | 25 min |
| Fix `computeMetrics` async-not-awaited via `computeMetricsSync` helper (closes Pattern D) | `DefectDetectivesEngine.ts` (~25 lines) | 20 min | 30 min |
| Fix `costs.perBatch` divisor (closes C2) | `DefectDetectivesEngine.ts` (~5 lines) | 5 min | 10 min |
| Currency to ₹ (closes C4 / D1) | `DefectDetectivesEngine.ts` (~5 lines) | 10 min | 15 min |
| Seed the RNG (closes D9) | `DefectDetectivesEngine.ts` + state shape (~25 lines) | 30 min | 45 min |
| Bias the dataset + wire tool insights to real analysis (closes D4 + D8 — the *big* pedagogy fix) | `DefectDetectivesEngine.ts` (~ +120 lines for Pareto/Histogram/Fishbone/Scatter analysis routines) | 90 min | 135 min |
| Sampling-detection-rate scales with sample size (closes D5) | `DefectDetectivesEngine.ts` (~15 lines) | 25 min | 40 min |
| Prevention cost on QC tool application + restore trade-off (closes D6) | `DefectDetectivesEngine.ts` (~20 lines) | 25 min | 40 min |
| Out-of-control consequence (alert / block next batch) (closes D7) | `DefectDetectivesEngine.ts` (~15 lines) | 15 min | 25 min |
| `defectReduction` returned as number not string (closes C11) | `DefectDetectivesEngine.ts` (~5 lines) | 5 min | 10 min |
| Tests covering above + edge cases (closes M4) | `__tests__/DefectDetectivesEngine.test.ts` (new, ~300 lines) | 90 min | 135 min |
| **Floor backend total (Session 9)** | | **~7.0 h** | **~10.5 h** ⚠️ |

The **10.5h padded floor exceeds a single session window** (typical
session is 4-6h). Two backend sessions or a longer single session is
required. **Realistic: Session 9 = backend part 1 (validation + async +
metrics + branding + RNG seed); Session 9b = backend part 2 (pedagogy
fixes — biased data, sampling-scales, prevention cost, OOC
consequence, tests).**

### Option B reskin overhead (on top of floor)

| Task | Files | Naive | Padded |
|---|---|---:|---:|
| Add second scenario (`dark-store`) to `scenarios.json` | scenarios.json (~50 lines) | 25 min | 40 min |
| Per-scenario operator names, defect types, currency, "factory" branding | scenarios.json | 30 min | 45 min |
| Engine reads `config.scenario` and loads accordingly (mirror HR Comp pattern) | `DefectDetectivesEngine.ts` (~20 lines) | 20 min | 30 min |
| Tests covering both scenarios | tests (~50 lines) | 25 min | 40 min |
| **Option B overhead** | | **~1.7 h** | **~2.5 h** |

### Option C Zenith overhead (on top of floor)

| Task | Files | Naive | Padded |
|---|---|---:|---:|
| Reshape state to 6 months × 2 shifts × 3 lines × 6 defect types | `DefectDetectivesEngine.ts` (~100 lines rewritten) | 90 min | 135 min |
| Add `phase` discriminator + phase-transition action | `DefectDetectivesEngine.ts` (~80 lines) | 60 min | 90 min |
| `flowchart-build` action: accept node/edge graph from client, validate, store | `DefectDetectivesEngine.ts` (~60 lines) | 60 min | 90 min |
| CSV/XLSX export endpoint or method | `DefectDetectivesEngine.ts` + route (~50 lines) | 45 min | 70 min |
| Tests for Zenith-specific shape | tests (~150 lines) | 90 min | 135 min |
| **Option C backend overhead** | | **~5.7 h** | **~8.5 h** ⚠️ |

This pushes Option C **backend** to **~19h padded** — three sessions
of backend work, before any UI starts.

### UI overhead (Session 10 / 10.5)

| Task | Files | Naive | Padded |
|---|---|---:|---:|
| `frontend/src/components/games/DefectDetectives/index.tsx` + slug-map registration | new | 30 min | 45 min |
| Dashboard with current defect rate + tools applied + cost | DefectDetectives/Dashboard.tsx | 60 min | 90 min |
| QC Tool selector + per-tool result panel (Pareto bar chart, Histogram bins, Fishbone svg, Scatter plot, Flowchart svg, Control Chart line) using Recharts | DefectDetectives/Tools/*.tsx (7 components) | 180 min | 270 min |
| Inspection-strategy selector + sample-size input | DefectDetectives/InspectionPanel.tsx | 30 min | 45 min |
| Batch processing UI + animated metrics | DefectDetectives/BatchPanel.tsx | 45 min | 70 min |
| Final scorecard + performance grade | DefectDetectives/Scorecard.tsx | 30 min | 45 min |
| **Floor UI total (Session 10)** | | **~6.3 h** | **~9.5 h** ⚠️ |

**UI also exceeds a single session.** Likely a Session 10 (engine UI
wrapper + 2-3 chart components) and Session 10.5 (remaining 4-5 chart
components + scorecard).

### Option C UI overhead

| Task | Files | Naive | Padded |
|---|---|---:|---:|
| Flowchart-build canvas via `reactflow` | DefectDetectives/FlowchartBuilder.tsx (~250 lines) | 180 min | 270 min |
| Dataset table with download CSV button | DefectDetectives/DatasetTable.tsx | 60 min | 90 min |
| Phase navigator | DefectDetectives/PhaseNav.tsx | 30 min | 45 min |
| **Option C UI overhead** | | **~4.5 h** | **~6.7 h** |

### Total estimate by option

| Option | Backend padded | UI padded | Sessions |
|---|---:|---:|---|
| A (generic-cleaner) | 10.5 h | 9.5 h | 9, 9b, 10 (3 sessions) |
| **B (MS-GAME reskin)** | **13 h** | **9.5 h** | **9, 9b, 10 (3 sessions)** |
| C (Zenith full reframe) | 19 h | 16 h | 9, 9b, 9c, 10, 10.5 (5 sessions) |

---

## 11. Phase 1 vs Phase 2 boundary

Defect Detectives is the last sim before Phase 1 wrap-up. The
architectural choice has direct Phase 1 wrap-up implications.

### Recommended Phase 1 trajectory

**Pick Option B (MS-GAME.txt-aligned reskin).** Three sessions:

- **Session 9** — backend part 1: integrity defects (Pattern B + D),
  branding/currency, RNG seed, scenario externalization, async/sync fix.
  ~6h padded.
- **Session 9b** — backend part 2: biased dataset + wired tool
  analyses (the big pedagogy fix), sampling-scales, prevention cost,
  out-of-control consequence, second scenario, tests. ~7h padded.
- **Session 10** — frontend: dashboard + 7 tool result panels using
  Recharts. ~9.5h padded → may need to split into 10 + 10.5.

Phase 1 wrap-up (sim 11 ship-ready: Fruit Beer, EV Gambit, Customer
In Store, HR Comp, Defect Detectives ready; Demand Forecast still
open per CLAUDE.md §11 Q1) can occur after Session 10.5 — call it
**Session 11**.

### If user picks Option C (Zenith)

Then Phase 1 wrap-up moves out by 2 sessions. Recommend either:
- Ship Zenith **without** the flowchart-construction phase in Phase 1
  (defer canvas to Phase 2, accept "minor missing feature" in Phase 1
  ship notes). Cuts ~5h off Option C estimate.
- **Or** explicitly move Defect Detectives to Phase 2 (substitute
  another sim from the Phase-2 deferral list — not needed here since
  HR/Fruit Beer/CIS/EV are already 4 of the 6 priority sims; dropping
  Defect Detectives leaves 5 priority sims shipped + Demand Forecast
  open).

### If user picks Option A (generic-cleaner)

Same trajectory as Option B (2 backend + 1-2 UI sessions). Probably
the lowest-effort, but doesn't honour the MS-GAME.txt branding gap.
Defensible if the user prioritizes Phase 1 ship over pedagogical
fidelity to msgames canonical.

### Recommendation summary for Phase 1 wrap-up

- **Pick Option B.** Session 9 + 9b backend, Session 10 (+ 10.5 if
  needed) frontend, then Phase 1 wrap-up Session 11.
- **Demand Forecast Challenge (CLAUDE.md §11 Q1)** still needs
  user decision before Phase 1 close — either reverse-engineer to a
  spec doc or substitute. That decision is independent of Defect
  Detectives.
- **No reshape of Phase 1 wrap-up needed** under Option A or B.
  **Phase 1 wrap-up reshapes under Option C** (push by 2 sessions, or
  defer Defect Detectives to Phase 2).

---

*Audit by Session 8. No code modified. No tests written. Recommendation
deferred to user review. The architectural decision (A / B / C) is the
gating question; please confirm before Session 9 begins.*
