# EV Gambit — Engine Audit

**Sim:** "The EV Gambit: A Strategy Simulation"
**Slug:** `ev-gambit`
**Engine file:** [backend/src/services/gameEngines/EVGambitEngine.ts](../backend/src/services/gameEngines/EVGambitEngine.ts) (1,739 lines)
**Tests:** none — `backend/src/__tests__/EVGambitEngine.test.ts` does not exist
**Date:** 2026-05-07
**Session:** 5 (audit-only)

---

## 1. Verdict

**Partial refactor.** The engine implements the *correct* sim — the canonical
5-event scripted workflow per `ev gambit Game workflow.txt` and `MS-GAME.txt:107-119`.
It is **not** the 12-round dynamic-strategy game implied by
`SIMULATION_IMPLEMENTATION_SUMMARY.md:124`. The summary doc is stale; the
engine, the in-repo `EV_GAMBIT_IMPLEMENTATION_NOTES.md`, and the workflow text
all agree on 5 rounds = 5 scripted events.

The size (1,739 lines, 3.4× the platform average) comes mostly from:
- 254 lines of hardcoded event data (`generateEvents`, lines 1074-1325) — 5 events × 4 quiz questions each, all branding text and option strings inline.
- 376 lines of hardcoded decision data (`getAvailableDecisions`, lines 1362-1737) — 5 events × 2-3 categories × 2-3 options, all inline.
- ~120 lines of duplicated state-init code (the `firstParticipant` fallback at lines 251-296 is dead code; the for-loop at 189-241 already covers the `participants[0]` case).
- ~60 lines of legacy state-format conversion (lines 142-171).

Strip those to JSON files (per HR Comp's pattern) and the engine collapses to
~800 lines. **No architectural rewrite needed.** Several integrity/pedagogy
defects must be fixed before UI work, all matching the platform-wide pattern
(Sessions 2-4): input validation, state leak in `getPublicState`, decision-shape
not gated against the canonical decision pool, and one math bug
(double-counted force impacts per event).

**Recommendation:** ship in two sessions —
- **Session 6 (backend):** fix the 3 integrity defects, the double-count bug, externalise events/decisions to JSON, fix `simulations-data.json`, write tests.
- **Session 7 (frontend UI):** decompose the slug branch into `components/games/EVGambit/` per the standard layout.

---

## 2. Architectural classification

**This is a 5-event scripted simulation, not a 12-round dynamic strategy game.**

Evidence from the engine:

| Line | Quote | Reading |
|---|---|---|
| 182 | `numRounds: config.numRounds \|\| 5,  // 5 events = 5 rounds` | Authoritative: 5 rounds = 5 events. |
| 184 | `events: config.events \|\| this.generateEvents(5),` | Generates exactly 5 events. |
| 386-401 | `roundEvents = this.state.config.events.filter(e => e.round === this.state.currentRound + 1)` | Events triggered by round number, scripted. |
| 1077-1124 | `round: 1, title: 'Government Push'` (hardcoded) | Event 1 is scripted. |
| 1126, 1175, 1224, 1273 | rounds 2-5 likewise hardcoded by title | All events scripted by round. |
| 1371 | `switch (currentEvent.title) { case 'Government Push': ...` | Decision options are picked by event title — scripted decision pool, not free-form strategy. |
| 1083, 1132, 1181, 1230, 1279 | `quizQuestions: [...4 MCQs each]` | Exactly 4 MCQs per round, exactly 20 total — matches canonical. |

The five forces and supplier/buyer state *is* tracked dynamically (lines
108-127), but it's a **side-effect display** of scripted events, not an
input to decision options. There is no engine path where, say, a high
supplier-power score unlocks a different decision tree. The `applyDecisionImpact`
method (lines 663-757) updates the forces, but those updates do not feed back
into `getAvailableDecisions` — that method only branches on `currentEvent.title`.

`SIMULATION_IMPLEMENTATION_SUMMARY.md:124` ("12-round strategic simulation")
and `THE_EV_GAMBIT_DETAILED_ANALYSIS.md:34-42` ("round strategic simulation")
are **wrong about the round count**. They are also wrong about player starting
share (analysis MD says 15%; engine + workflow text agree on 5%). The detailed
analysis MD has the systematic drift CLAUDE.md §8 warned about — its mechanics
description lifted competitor list ("Traditional Motors") and force values
that do not match the canonical sim. **Treat the analysis MD as discarded.**

---

## 3. Match — what aligns with the canonical msgames spec

The engine matches the canonical workflow text very closely:

| Item | Canonical source | Engine | Status |
|---|---|---|---|
| 5 rounds, one event per round | `ev gambit Game workflow.txt:30`, `MS-GAME.txt:118` | line 182, 184 | ✅ |
| Event 1 = "Government Push" + verbatim subsidy text | workflow:6-7 | line 1080 (text matches) | ✅ |
| Event 2 = "Import Ban" + verbatim Chinese-ban text | workflow:9-10 | line 1129 (text matches) | ✅ |
| Event 3 = "Buyer Acquisition" (Rexa acquires Ushuttle) | workflow:12-13 | line 1178 (text matches) | ✅ |
| Event 4 = "Emission Norms" (Electrify scrutiny) | workflow:15-16 | line 1227 (text matches) | ✅ |
| Event 5 = "Tesla Coming" (premium plant) | workflow:18-19 | line 1276 (text matches) | ✅ |
| 4 MCQs per event, 4 options each, single correct index | workflow:115-124 etc. | quiz arrays at 1083, 1132, 1181, 1230, 1279 | ✅ all 20 questions match verbatim |
| Decision categories per event match workflow | workflow:90-103 etc. | switch in `getAvailableDecisions` | ✅ |
| Specific decision option strings match workflow | workflow:91-103 (Event 1) | lines 1379, 1388, 1402, 1411, 1425, 1435 | ✅ |
| Player firm = "EVans", focal EV manufacturer | workflow:34, 64 | line 196 (`name: 'EVans'`) | ✅ |
| Direct competitor = "Electrify Inc." | workflow:35, 67 | line 1048 | ✅ |
| Suppliers: LiOn 60% (Chinese), Rusloth 40% (Russian) | workflow:64 | lines 224-225 | ✅ |
| India Mines as 2-year future supplier | workflow:64 | line 226 (`yearsRemaining: 2`) | ✅ |
| Buyers: Rexa (50% of EVans) + Ushuttle | workflow:64 | lines 229-230 | ✅ |
| Substitute: SmartRide (ride-sharing) | workflow:35, 79 | referenced in events but not in state |  ⚠️ partial |
| New Entrant: Tesla, 5 years out | workflow:35, 73 | line 1056 (`marketShare: 0`) | ✅ |
| Workflow per round: event → decision → rationale + alternatives → quiz → continue | workflow:105-124 | `handleDecisionSubmission` (375-454) → `handleQuizSubmission` (456-573) → `handleContinueToNextEvent` (575-633) | ✅ |
| Free-text rationale + alternatives captured | workflow:107-110 | line 376 destructures both, line 432 stores them | ✅ |
| Porter's Five Forces tracked (5 named forces, 0-100) | workflow:25-30; brief | lines 108-114 | ✅ |
| Industry attractiveness = 100 − avg(forces) | (canonical Porter framing) | lines 866-878 | ✅ |
| Single-player game | `MS-GAME.txt:113` | each participant has independent state in `participantStates` Map | ✅ (de facto — each player runs their own game) |

The engine is, structurally, the canonical sim. This is a **rare** case in the
audit pass — Sessions 2-4 each found at least one mechanic-level drift. EV
Gambit's mechanics-level drift is small.

---

## 4. Drift — what diverges from canonical

### D1. `simulations-data.json` author + name + duration drift

Row 10 (`simulations-data.json:183-201`):

| Field | In seed | Canonical |
|---|---|---|
| `name` | `"EV Gambit - Strategic Management"` | `"The EV Gambit: A Strategy Simulation"` (`MS-GAME.txt:110`, `MSGAMES_WEBSITE_ANALYSIS.md:354`) |
| `author` | `"Parasmani Skills Team"` | `"Prof. Devasheesh Mathur"` (`MS-GAME.txt:115`, `MSGAMES_WEBSITE_ANALYSIS.md:361`) |
| `duration_minutes` | `55` | `60` (`MS-GAME.txt:112`) |
| `min_players`/`max_players` | `1` / `4` | `1` / `1` — single player per `MS-GAME.txt:113` |
| `supports_bots` | `true` | `false` — there is no bot logic in the engine; engine has multi-participant scoping but no bot strategies |
| `tags` | `["strategy", "porter", "competition", "multiplayer"]` | should be `["business-strategy", "porter-five-forces", "ev-industry", "single-player"]` |
| `type` | `"strategy"` | `"business-strategy"` (matches `MS-GAME.txt:111`'s "Business Strategy, Operations Management, Competitive Analysis") |

**Same shape as Sessions 2-4 author drift.** Source institution is **IMI New
Delhi** (`MS-GAME.txt:116`) — useful for a future sub-line if the schema
ever adds it.

### D2. `applyEventEffects` double-counts force impacts with `applyEventToForces`

In `handleDecisionSubmission` (line 387-401), for each new event in the round:

```ts
this.state.events.push(event);
this.applyEventToForces(event);    // line 391
this.applyEventEffects(event);     // line 392
```

- `applyEventToForces` (lines 836-846) reads `event.impact` and applies
  `impact * 10` to the named `forceAffected`.
- `applyEventEffects` (lines 792-833) `switch`es on `event.title` and
  applies a *second*, hardcoded delta to (sometimes) the same force.

For the **Import Ban** event (line 1129, `forceAffected: 'suppliers',
impact: 2.0`):
- `applyEventToForces`: `suppliers += 2.0 * 10 = +20`.
- `applyEventEffects` `case 'Import Ban'` (line 808): `suppliers += 15`.
- Net: `+35` to suppliers, plus `+10` clamping headroom only if there is room.

The engine starts suppliers at 75, so after Import Ban it pegs at 100
(clamped). Canonical pedagogy is "supplier power increases meaningfully" —
the score reaches max in any case, but the *model is wrong*. If a downstream
decision intends to subtract supplier power, the player is starting from 100
instead of (e.g.) 90 — they need to fight harder to bring it back.

Same double-count on:
- Event 1 (Government Push): `forceAffected: 'buyers', impact: -1.0` →
  `applyEventToForces` does `buyers -= 10`. Then `applyEventEffects` does
  `buyers -= 10`. Total `−20` (intended either −10 or −10, not both).
- Event 3 (Buyer Acquisition): `forceAffected: 'buyers', impact: 2.0` →
  `+20`. Then `applyEventEffects` does `+20`. Total `+40`.
- Event 4 (Emission Norms): `forceAffected: 'rivalry', impact: -0.8` →
  `−8`. Then `applyEventEffects` does `−5`. Total `−13`.
- Event 5 (Tesla Coming): `forceAffected: 'newEntrants', impact: 1.8` →
  `+18`. Then `applyEventEffects` does `+15` (newEntrants) AND `+10`
  (rivalry, NOT in `forceAffected`). Total newEntrants `+33`, rivalry `+10`.

This is the same shape of bug as Fruit Beer's `recordWeeklyStats` (Session 4
D3): two methods writing to the same fields, neither aware of the other.
**The fix is one of: (a) drop `event.impact` and use only `applyEventEffects`
deltas, or (b) drop `applyEventEffects` and put per-event deltas into a
richer `event.impacts` object.** Option (b) cleaner because `applyEventEffects`
also does state-not-force work (toggling `suppliers.liOn.available`,
`buyers.rexa.acquired` etc. — those are not double-counted, and need to stay).

### D3. Quiz `correctAnswer` is leaked in `getPublicState`

Line 938:

```ts
currentQuiz: firstState.currentQuiz, // Include currentQuiz in public state so frontend can access it
```

`currentQuiz.questions[*]` is shaped as:

```ts
{ question: string; options: string[]; correctAnswer: number; explanation?: string }
```

— the `correctAnswer` index is included. A non-UI socket client reads any
`session_update` payload, picks `currentQuiz.questions[i].correctAnswer`,
and submits a perfect quiz. **Same defect class** as the
`Customer-In-Store` audit's pre-fix state (CUSTOMER_IN_STORE_AUDIT line 80
documented this was *not* the case for that sim because of `getPublicState`
stripping). EV Gambit does not strip.

### D4. `getAvailableDecisions` exposes `expectedImpact` numeric values to the client

Line 935: `availableDecisions: this.getAvailableDecisions()`.

`getAvailableDecisions` returns the full `Decision[]` for the current event,
each entry containing
`expectedImpact: { marketShare: 2.5, brandValue: 5, ... }`. This is the score
input — the client can display a sorted list and pick whichever decision has
the highest aggregate. Whether to expose impact numbers is a design call —
some sims do, some hide them — but per `ev gambit Game workflow.txt:90-103`
the canonical player view is just decision *names*, no numbers. Fix: hide the
expected-impact map from the client; render only `name` + `cost` (and
`category`).

### D5. Decision-score doesn't reward context-appropriate choices

`calculateDecisionScore` (lines 635-661) takes `(decision, round)` but never
reads `round`. The scoring is just "10 base + sum of clamped positive impact
values". Picking "Reach out to Tesla for a possible JV" in Event 1 (when
Tesla is 5 years away — not yet a relevant force) scores identically to
picking the same decision in Event 5 (when Tesla is arriving — directly
relevant). The pedagogical premise of the sim per `MS-GAME.txt:118` is
"strategic decision-making" — students should be rewarded for matching their
decision to the active force. The current rubric is "did your decision have
positive numbers".

### D6. Stale tests/docs claim 12 rounds

`SIMULATION_IMPLEMENTATION_SUMMARY.md:124` says "12-round strategic
simulation". `THE_EV_GAMBIT_DETAILED_ANALYSIS.md:34-42` reads "round
strategic simulation" (truncated). These docs are wrong; engine + workflow
text + `MS-GAME.txt` + in-repo `EV_GAMBIT_IMPLEMENTATION_NOTES.md` all agree
on 5 rounds. Per CLAUDE.md §8, the analysis MDs drift; this is one example.
**Decision:** discard `THE_EV_GAMBIT_DETAILED_ANALYSIS.md`. Leave
`SIMULATION_IMPLEMENTATION_SUMMARY.md` alone (it covers all sims; correcting
just this row is out of scope).

### D7. Missing context fact: SmartRide as substitute is referenced in events but not modelled in state

`workflow:35, 79` defines SmartRide as the substitute (ride-sharing
unicorn). `state.fiveForces.substitutes` is initialized to 70 but nothing
in `applyEventEffects` ever moves it; only decisions with
`expectedImpact.substituteThreat` ever touch it. Compare LiOn/Rusloth/India
Mines and Rexa/Ushuttle, which both have dedicated state objects (`suppliers`
line 118-122, `buyers` line 124-127). SmartRide gets no equivalent state
shape — it's just a string in event copy. Minor; not a teaching priority for
the sim, but worth noting for completeness.

---

## 5. Missing — what's specced in canonical but absent

### M1. No bot players (matches sim type)
`MS-GAME.txt:113` says single player, so this is correct. `simulations-data.json:199`
incorrectly says `supports_bots: true`, which is what should change (D1 above), not
the engine.

### M2. No facilitator dashboard hooks
`getAllParticipantsState` (line 1027-1041) returns a stub — currentRound +
maxRounds + isComplete + currentEvent. For a facilitator running a class of
30 students through parallel solo plays, this is insufficient. Out of scope
for Phase 1 audit; flag for Phase 2.

### M3. No "Review Your Submission" intermediate step
`workflow:113` mentions a review screen between Submit and the quiz. The
engine immediately marks `hasSubmittedDecision = true` and presents the quiz
on the next update. The review can be implemented client-side without any
engine change (UI-only).

### M4. No persistence of the in-memory engine across restart, beyond `SessionStateCache`
The engine *does* save and restore from `SessionStateCache` (lines 142-171,
1337-1356), unlike Fruit Beer (audit M3). This is good — but the format in
the JSON column is the entire `participantStates` map plus all 5 events
inlined per participant. Each participant carries a redundant copy of the
events. Minor space concern, not a correctness issue.

---

## 6. Integrity audit (per Sessions 2-4 pattern)

| Check | Status | Detail |
|---|---|---|
| Input bounds on every numeric/string/enum field? | ❌ | `applyAction` only validates `action.actionType` is one of three strings. `decision.cost`, `decision.expectedImpact.*`, `decision.type` are not validated. `quiz.answers[i]` is not validated to be in `[0, 3]`. Same shape as Customer-In-Store D2. |
| Decision shape gated against `getAvailableDecisions()`? | ❌ **Critical.** | `handleDecisionSubmission` accepts ANY decision object the client constructs. The check at line 403 is just `if (!decision \|\| !decision.type) return error`. A client can submit `{ type: 'business', name: 'XX', cost: -100000000, expectedImpact: { marketShare: 100, brandValue: 100, technology: 100 } }` — get +₹10cr cash, +100 to every metric, capped at 100, decision score 20/20. Trivial cheat. |
| Quiz answer-index validation? | ❌ | `handleQuizSubmission` checks `Array.isArray(answers)` and `answers.length === questions.length` but does not check each `answers[i]` is an integer in `[0, 3]`. `{ answers: [-1, 99, NaN, "0"] }` is accepted; all 4 fail `=== correctAnswer` (silently scored 0). Recorded as garbage in `quizSubmissions`. |
| Action-round binding? | ❌ | No `action.round` field gated against `this.state.currentRound + 1`. A client can hold a stale connection while currentRound advances and submit a decision intended for an earlier round. The `hasSubmittedDecision` flag prevents double-submission within a round, but not cross-round confusion. Same shape as Customer-In-Store D3. |
| Participant binding: only the right participant can act? | ⚠️ | The engine uses the action's `participantId` to scope state (line 343). If the socket layer passes the *authenticated* participantId (not a client-claimed one), this is fine. There is no defense-in-depth in the engine. Standard platform pattern, but worth flagging. |
| State leak: correct quiz answers exposed in publicState before submission? | ❌ **Critical.** | D3 above. `getPublicState.currentQuiz.questions[*].correctAnswer` is exposed. Client reads from any state update. |
| State leak: optimal decision exposed in publicState before submission? | ⚠️ | D4 above. `getAvailableDecisions` returns `expectedImpact` numbers. Borderline — depends on design intent — but the canonical UI per `workflow.txt` shows only decision names. |
| State leak: future events / future quiz content exposed? | ✅ | `getPublicState.currentEvent` only returns the event for `currentRound + 1`. `recentEvents` (line 930) is `state.events` — only events that have already fired. Future events at round N+1 are not exposed in `getPublicState`. Quiz content is only set into `state.currentQuiz` after the player submits a decision (line 394-399), so the quiz isn't exposed pre-decision. ✅ |
| Async/sync type leaks? | ✅ | `computeMetrics` is `async` (line 894). It is awaited in `computeMetricsForParticipant` (line 1018) — actually wait, line 1018 says `const metrics = this.computeMetrics();` — **not awaited**. So `getParticipantState` (line 999) sets `metrics` to a `Promise<any>` instead of the resolved metrics object. **Same defect as Customer-In-Store D6.** Tracking as a correctness issue (C1). |
| Decision can be submitted after isComplete? | ✅ | `applyAction` early-returns at line 345-349 if `isComplete`. |
| Quiz can be submitted before decision? | ✅ | `handleQuizSubmission` rejects at line 471-476. |
| Quiz can be re-submitted? | ✅ | `hasSubmittedQuiz` flag at line 478-483. |
| Decision can be re-submitted within a round? | ✅ | `hasSubmittedDecision` flag at line 379-384. |

**Three critical integrity defects:**
1. Quiz `correctAnswer` leaked in `getPublicState`.
2. Decision shape not gated against canonical decision pool.
3. Quiz answer values not validated to be in `[0, options.length-1]`.

---

## 7. Pedagogy audit (per Sessions 2-4 pattern)

| Check | Status | Detail |
|---|---|---|
| Headline teaching metric computed correctly, not stubbed? | ✅ | Industry Attractiveness = `100 - avg(fiveForces)` (line 866-878). Not stubbed. Forces are real numeric state that updates per event + decision. Distinguishes EV Gambit from Fruit Beer (where bullwhip was hardcoded `1.0` pre-fix). |
| Multiple decision categories actually differ in scoring impact? | ❌ | `calculateDecisionScore` (635-661) treats `decision.type` ("business" / "operations" / "corporate" / "marketing" / "sales") identically. Only `expectedImpact.*` numbers matter. Two decisions with the same impact map but different types score the same. The category tags exist for UI grouping, not for pedagogy. |
| Round-context informs scoring? | ❌ | D5 above. `calculateDecisionScore(decision, round)` ignores `round`. A "Reach out to Tesla for a JV" decision in Event 1 (Tesla is 5 years away) scores identically to the same decision in Event 5 (Tesla is arriving). Canonical pedagogy is "match decision to active force" — engine doesn't reward this. |
| Decision impacts feed back into available decisions? | ❌ | `getAvailableDecisions` only branches on `currentEvent.title`. Force values, cash level, supplier availability — none gate which decisions appear. So if a player exhausts cash to ₹0 in Event 1, they still see Event 2's ₹3.5 cr "Expedite Indian Lithium" option (which the cost-affordability gate at line 411-416 then rejects, but only on click). Per workflow text this is fine — decisions are scripted by event — but worth flagging as a pedagogy ceiling. |
| Hardcoded content vs procedural / scenario-driven? | ⚠️ | All event text + all 20 quiz questions + all 5×2-3 decision options are hardcoded inline (lines 1077-1737). No way to swap to a different scenario (e.g., FMCG instead of EV) without code changes. HR Comp externalised this to JSON in Session 2A; EV Gambit could do the same. |
| Off-by-one or unit-mismatch issues? | ⚠️ | Round numbering: 0-indexed `currentRound` 0..4 maps to display rounds 1..5. Mostly handled (`currentRound + 1` everywhere). One spot: line 386 filters events by `e.round === currentRound + 1` — correct (events are 1-indexed in `generateEvents`). No off-by-one defect found. |
| Random impact (0.8-1.2x) noise on every decision? | ⚠️ | Lines 668, 674, 681, 687, 695, 704, 713, 722, 731 all multiply expectedImpact by `(0.8 + Math.random() * 0.4)`. For a teaching simulation, this introduces noise that can flip a good decision to a mediocre score. Students debugging "why did X work last time but not this time?" may form wrong conclusions. Recommend deterministic outcomes in a teaching context (parallels Fruit Beer's deterministic demand pattern). |
| Tesla competitor visible from round 1? | ⚠️ | Line 1056 puts Tesla in `competitors` with `marketShare: 0` from initialization. Filter at 926 (`c.marketShare > 0 \|\| c.name === 'Tesla Motors'`) explicitly keeps Tesla visible even at 0%. Pedagogically defensible — Tesla is a *known future entrant* per workflow:73 — but means the "Tesla Coming" reveal in Event 5 is not actually a reveal. Probably intentional. |

**Three pedagogy issues:**
1. Decision-score rubric ignores round/event context.
2. Decision-type categories don't differ in scoring.
3. Random 0.8-1.2x impact noise undermines deterministic-feedback pedagogy.

---

## 8. Correctness audit (per Sessions 2-4 pattern)

| Check | Status | Detail |
|---|---|---|
| Spec formulas match implementation? | ✅ mostly | Industry attractiveness = `100 - avg`, force impacts clamped to `[0, 100]`, cost subtracted from cash, market share normalised to 100% across player + competitors. All correct. |
| End-of-game detection: round 5 marks `isComplete`? | ✅ | `handleContinueToNextEvent` line 583-606 (early-exit branch) and `processRound` line 766-779 (regular branch) both mark complete when `currentRound >= numRounds - 1`. **Duplicated logic** but both paths produce the same result. Refactor target. |
| Edge case: round 1, no prior state? | ✅ | `currentRound` starts at 0, no prior events, `decisions` and `quizSubmissions` arrays are empty. First event loaded on first decision submission. |
| Edge case: empty decisions / empty answers? | ⚠️ | `handleDecisionSubmission` rejects `!decision \|\| !decision.type`. `handleQuizSubmission` rejects `!answers` and non-array. But `answers: []` (empty array) does NOT match `currentQuiz.questions.length` (4), so it's rejected by length check at 508. ✅ |
| Edge case: all-correct quiz / all-wrong quiz? | ✅ | Score is `(correct / total) * 100`, scaled to 20 per round. All-correct = 20/20. All-wrong = 0/20. |
| Floating point hazards? | ✅ | All numeric state is bounded (`Math.max(0, Math.min(100, x))`) so no unbounded drift. `marketShare` normalisation at line 856-863 divides by `totalMarketShare`; if total goes to 0 (all competitors at 0% AND player at 0%), `100 / 0 = Infinity`. Theoretically reachable but requires player driving share to negative AND every competitor doing the same; the random walk in `simulateCompetitorActions` makes this extremely unlikely over 5 rounds. Document as a hazard, no fix needed. |
| Divide-by-zero in scoring? | ✅ | `correctAnswers / questions.length` — questions.length is always 4 (hardcoded in `generateEvents`). Safe. |
| **C1. `computeMetrics` async-not-awaited in `getParticipantState`** | ❌ | `computeMetricsForParticipant` (line 1011-1021) calls `this.computeMetrics()` without `await`. Returns a `Promise<any>`. `getParticipantState` (line 999) places this Promise into the response under `metrics:`. UI receives `metrics: {}` (empty serialized Promise). **Same defect as Customer-In-Store D6.** Fix: synchronous helper called by both sync and async paths. |
| **C2. Dead fallback code in `initialize`** | ⚠️ | Lines 251-296 build a fallback state for the first participant if `participantStates` does not have it — but the for-loop at 189-241 already populates the map for every participant (including `participants[0]`). The fallback is unreachable. Bloat, not a defect. |
| **C3. Duplicated end-of-game logic** | ⚠️ | `handleContinueToNextEvent` (583-606) and `processRound` (767-779) both compute final scores and set isComplete. Identical formula in both. Refactor target. |
| **C4. `applyDecisionImpact` mutates `this.state.suppliers.indiaMines`** by name-string match | ⚠️ | Line 740: `if (decision.name.includes('India Mines') \|\| decision.name.includes('Expedite mining'))`. Brittle: any decision whose name contains the substring "India Mines" triggers this, even if it's a future decision unrelated to mining. Refactor target: use an explicit `decision.effect: 'expedite-india-mines'` enum field. |
| **C5. `processRound` updates competitors but new event fires in `handleDecisionSubmission`, not `processRound`** | ⚠️ | `handleDecisionSubmission` line 387-401 fires the event for the round *being entered* (currentRound + 1). `processRound` (called from `handleContinueToNextEvent`) only updates competitor share + recalculates attractiveness, then increments currentRound. So events fire on decision submission, not on round advancement. Probably correct, but the asymmetry is confusing. |
| `simulateCompetitorActions` random walk can drive shares negative? | ⚠️ | `change = (Math.random() - 0.5) * 2` is `[-1, +1]` per round. Over 5 rounds, max accumulated drift is ±5%. "Other Competitors" starts at 83% — safe. "Electrify Inc." starts at 12% — safe. Tesla starts at 0% — could go negative; filter at 926 hides it but math still updates. The post-step normalisation at line 856-863 doesn't clamp negatives, so a negative share gets scaled by a positive factor, staying negative. Cosmetic bug; not gameplay-affecting. |

---

## 9. Recommendation

**Verdict: partial refactor (option b).**

Not a small patch — there are three integrity-critical defects, the
double-counted force impact bug, and the engine has substantial dead/duplicated
code that should go before tests are written against it.

Not a full rewrite — the engine implements the correct sim. The 5-event
scripted workflow matches canonical *exactly* in event names, descriptions,
quiz questions, and decision options. Throwing this away to write a new
"more aligned" engine would be churn for no gain.

**What stays (~800 lines):**
- `BaseGameEngine` boilerplate, `initialize` (slimmed), `applyAction`
  router, `handleDecisionSubmission`, `handleQuizSubmission`,
  `handleContinueToNextEvent`, `applyDecisionImpact`,
  `applyEventToForces` OR `applyEventEffects` (one of, not both),
  `simulateCompetitorActions`, `calculateIndustryAttractiveness`,
  `getPublicState`, `getParticipantState` (stripped of state leaks),
  `computeMetrics(Sync)`, `getAvailableDecisions` (slimmed to load
  from JSON), `saveGameState`, `determineCompetitivePosition`.

**What gets rewritten / fixed:**
- `applyEventEffects` + `applyEventToForces` collapsed into one method that
  applies per-event force deltas + per-event state-shape changes (D2).
- `applyAction` validates decision shape against `getAvailableDecisions()`
  pool — only canonical decisions accepted (integrity #2).
- `applyAction` validates quiz answers are integers in `[0, 3]` (integrity #3).
- `getPublicState` strips `correctAnswer` from `currentQuiz.questions[*]`
  and `expectedImpact` from `availableDecisions[*]` (integrity #1, D4).
- `applyAction` accepts and validates `action.round` against
  `this.state.currentRound + 1` (round-binding).
- `calculateDecisionScore` rewards context-appropriate decisions: bonus
  when `decision.type` matches an expected category for the active event
  (e.g., supplier-power decisions during Import Ban).
- `decision.name`-string matching in `applyDecisionImpact` (C4) replaced
  with an explicit `effect` enum.
- `computeMetricsForParticipant` calls a synchronous helper (C1).
- Random 0.8-1.2x noise gated behind a `config.randomImpacts` flag (default
  `false` for deterministic teaching, `true` for advanced play).

**What gets externalised to JSON (per HR Comp's pattern):**
- `backend/src/services/gameEngines/data/evGambit/events.json` — the 5
  events with descriptions, force impacts, and quiz questions (~250 lines
  out of the engine).
- `backend/src/services/gameEngines/data/evGambit/decisions.json` — the
  per-event decision pool (~370 lines out of the engine).
- A `scenarios.json` keyed `default` that wires the above (and provides
  hooks for future scenarios, e.g., FMCG strategy game using the same
  engine with different content).

**What gets removed:**
- Lines 251-296 (dead fallback) — C2.
- Duplicated end-of-game block in `processRound` — C3.
- Legacy state-format conversion at lines 158-167 (no production sessions
  on the legacy format; safe to remove with a one-line migration if needed).

**Estimated post-refactor engine size:** ~750-800 lines, plus ~180 lines of
JSON in two data files. Test file: ~250 lines covering the categories
below.

**Tests to add (`__tests__/EVGambitEngine.test.ts`):**
- Initialize, idempotent re-init, per-participant state isolation.
- All 5 events fire on the right round in the right order.
- Quiz `correctAnswer` is NOT in `getPublicState`.
- Decision `expectedImpact` is NOT in `getPublicState.availableDecisions`.
- Decision shape rejected if not in canonical pool.
- Quiz answers rejected if not integer / not in `[0, 3]`.
- Wrong-round decision rejected.
- Force impacts not double-counted (Import Ban: suppliers ends at expected
  value, not double).
- Final score: 5 perfect rounds → 100. 5 zero rounds → 0.
- `computeMetrics` returns an object, not a Promise.

---

## 10. Effort estimate

| Task | Files | Effort |
|---|---|---|
| Fix `simulations-data.json` row 10 (name, author, type, duration, players, supports_bots, tags) + re-seed | `simulations-data.json` (1 row) | 5 min |
| Externalise events to `data/evGambit/events.json`, decisions to `data/evGambit/decisions.json`, wire loader | `EVGambitEngine.ts` (~ −620 / +60 lines), 2 new JSON files | 60 min |
| Collapse `applyEventEffects` + `applyEventToForces` into one method (fix D2 double-count) | `EVGambitEngine.ts` (~ −40 / +30 lines) | 30 min |
| Strip `correctAnswer` from `getPublicState.currentQuiz`; strip `expectedImpact` from `availableDecisions` | `EVGambitEngine.ts` (~15 lines) | 15 min |
| Validate decision shape against canonical pool; validate quiz answer indices; round-binding gate | `EVGambitEngine.ts` (~40 lines) | 30 min |
| Context-aware `calculateDecisionScore` (event-matched type bonus) | `EVGambitEngine.ts` (~25 lines) | 25 min |
| Replace `decision.name.includes(...)` with explicit `effect` enum | `EVGambitEngine.ts` + `decisions.json` (~10 lines) | 15 min |
| Sync `computeMetricsSync` helper, fix C1 | `EVGambitEngine.ts` (~15 lines) | 10 min |
| Remove dead fallback code (lines 251-296) and legacy-state conversion (158-167) | `EVGambitEngine.ts` (~ −80 lines) | 10 min |
| Refactor end-of-game logic into single helper (C3) | `EVGambitEngine.ts` (~ −20 / +15 lines) | 15 min |
| Add tests covering all of the above | `EVGambitEngine.test.ts` (new file, ~250 lines) | 90 min |
| **Backend total** | | **~5 h (Session 6)** |
| Build `frontend/src/components/games/EVGambit/` (index + EventCard + DecisionGrid + RationaleForm + QuizCard + FiveForcesRadar + FinalScorecard) + slug-map registration | new files + 1-line registration | **~3 h (Session 7)** |
| **Total** | | **~2 sessions** |

---

## Bot status — CLAUDE.md §11 Q5

**N/A.** Single-player game per `MS-GAME.txt:113`. Multiple participants
in a session each run independent solo plays (engine supports this via
`participantStates: Map`). No bot fill-in needed; no group sync. The
`simulations-data.json` `supports_bots: true` field is wrong (D1) and
should be set to `false`.

---

*Audit by Session 5. No code modified. Recommendation deferred to user review.*
