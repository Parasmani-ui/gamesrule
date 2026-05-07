# Customer In A Store — Engine Audit

**Sim:** "Customer In A Store: A Supply Chain Management Simulation"
**Slug:** `customer-in-store`
**Engine file:** [backend/src/services/gameEngines/CustomerInStoreEngine.ts](../backend/src/services/gameEngines/CustomerInStoreEngine.ts)
**Tests:** [backend/src/__tests__/CustomerInStoreEngine.test.ts](../backend/src/__tests__/CustomerInStoreEngine.test.ts)
✅ added in this session
**Date:** 2026-05-07

---

## Verdict

**Partial refactor.** The stock-flow math is correct (`Stock(t) = Stock(t-1) +
Inflow(t) − Outflow(t)`), and `getPublicState` does not leak per-question
correct answers (the field is stripped). Beyond that, the engine has the
shape of an MVP that nobody played end-to-end, with seven substantive
defects, every one of them fixed in this session:

1. **All three intervention modes (`learning-by-doing`,
   `task-decomposition`, `binary-feedback`) were stubs.** The
   `learningGroup` field is stored on `config` and echoed back in
   `getPublicState`, but the engine produces the *same* feedback payload
   regardless. The "research interventions" — the entire pedagogical
   point of the sim per `MSGAMES_WEBSITE_ANALYSIS.md` — were not
   implemented at all.
2. **No input validation in `applyAction`.** Same shape as Session 2
   (HR Comp stage-validation) and Session 3 (Fruit Beer unbounded
   orders). The engine accepts any value as `answer`: strings, NaN,
   negatives, `undefined`, > pattern length, floats. Trivially
   exploitable from any non-UI socket client.
3. **No question-progression validation.** A client can submit
   `{ answer: 5 }` 100 times and the engine will dutifully advance to
   question 100 (which doesn't exist; will throw on the 11th). There
   is no `questionIndex` echoed back from the client to gate against
   replay or skip-ahead.
4. **Off-by-one indexing across answers.** `correctAnswer` is the
   index into `stockLevels` (length `inflow.length + 1`, with
   `stockLevels[0]` being the *initial* stock before any flow).
   Player picks period `t`. Engine compares against an index that
   counts from a "period 0" that the player never sees. The marker in
   `getExplanation` is also misaligned because of this.
5. **All easy questions have the same correct answer**, all medium
   ditto, all hard ditto. `generateSingleQuestion` is a `switch` over
   three hardcoded `(inflow, outflow)` tuples. So if a player sees
   Q1 (easy/store) → answer 6 wins, they can blind-fire 6 for Q2 and
   Q3 too. Correlation-heuristic detection is also degenerate: the
   inflow peak is the same across the three identical questions.
6. **`computeMetrics` is `async` but `getParticipantState` calls it
   un-`await`-ed**, then includes the resulting `Promise` in the
   participant state object. The UI receives `metrics: {}` (an empty
   serialized Promise) instead of a metrics object.
7. **Author and tagline drift in `simulations-data.json`.** Listed as
   "Prof. Raghunathan, IIM Ahmedabad" — not even on MSgames'
   author roster. Canonical per `MSGAMES_WEBSITE_ANALYSIS.md` line
   336 and `MS-GAME.txt` line 99 is **T. T. Niranjan, IIT Bombay**
   (same author as Fruit Beer Game, which we corrected last session).
   The display name and `type` are also off.

There is no "warm-up" cognitive-reflection phase implemented in the
engine, even though `MS-GAME.txt:102` lists it as a "Key Mechanic." Per
the brief, that phase is built **client-side** in this session
(`WarmupQuiz.tsx`) — engine doesn't need to know about it.

**Recommendation:** ship after the fixes below. No architectural
changes, schema is fine, JSON-column persistence is appropriate. The
engine ends up about ~150 lines longer once the three intervention
modes are real and validation is in place.

---

## Match — what's correct (pre-session)

| Item | Status |
|---|---|
| `Stock(t) = Stock(t-1) + Inflow(t) − Outflow(t)` formula in `calculateStockLevels` | ✅ |
| Initial stock = 10, stock floored at 0 (no negative inventory) | ✅ |
| Five scenario contexts (store / reservoir / warehouse / hospital / bank) match `MSGAMES_WEBSITE_ANALYSIS.md` | ✅ |
| `getPublicState` strips `correctAnswer` from the live question payload | ✅ |
| `applyAction` rejects further actions after `isComplete` | ✅ |
| Per-answer `usedCorrelationHeuristic` *concept* exists (player picked the inflow-peak period when wrong) | ✅ |
| Engine factory registration | ✅ |
| Player-paced `advanceRound` (no group-sync needed; sim is single-player per `MS-GAME.txt:97`) | ✅ |
| Per-answer record includes `playerAnswer`, `correctAnswer`, `isCorrect`, `timeSpent`, optional `stockCalculation` | ✅ |

---

## Drift — what's wrong (pre-session)

### D1. All three intervention modes are stubs

The simulation's headline mechanic (per
`MSGAMES_WEBSITE_ANALYSIS.md`, `MS-GAME.txt`, and the analysis MD §
"Learning Intervention Groups") is that the facilitator assigns
participants to one of three learning groups, and each group sees a
*different* feedback experience. The engine ignores
`config.learningGroup` after storing it.

What the modes are supposed to do:
- **learning-by-doing:** minimal feedback (✓ / ✗), correct answer
  withheld until the end. Force pattern recognition.
- **task-decomposition:** show the full stock table after each
  answer; optionally accept a `stockCalculation` array as part of
  the action so the player has to fill in the table.
- **binary-feedback:** immediate ✓/✗ with the correct answer
  revealed, no detailed table.

What the engine does today: returns the same `data: { isCorrect,
correctAnswer, explanation, ... }` payload for all three groups. The
explanation always includes the full stock-level table. There is no
behavioural difference.

**Status: fixed in this session.** `applyAction` now branches on
`this.state.config.learningGroup` and produces a mode-specific
`feedback` object (also tagged with `mode`). `getExplanation` gates
the table-building behind the modes that are meant to show it.

### D2. `applyAction` has no input validation

Reading the action payload:

```ts
const { answer, timeSpent, stockCalculation } = action;
// ... no validation ...
const isCorrect = answer === currentQuestion.correctAnswer;
```

A non-UI client can submit:
- `{ answer: "6" }` — string, will never `===` the numeric correct
  answer; quietly counted as wrong.
- `{ answer: NaN }` — same, always wrong.
- `{ answer: 1.5 }` — floats; almost-always wrong, but engine accepts.
- `{ answer: -3 }`, `{ answer: 10000 }` — out of range, accepted.
- `{ answer: undefined }` — accepted, recorded as `undefined ===
  correctAnswer` → false.

The session text and brief require integer answers in **1–30**.

**Status: fixed in this session.** Added a guard at the top of
`applyAction`:

```ts
if (typeof answer !== 'number' || !Number.isInteger(answer)) {
  return { success: false, message: 'Answer must be an integer' };
}
if (answer < 1 || answer > 30) {
  return { success: false, message: 'Answer must be between 1 and 30' };
}
if (answer > currentQuestion.inflowPattern.length) {
  return {
    success: false,
    message: `Answer must be a minute within the question (1-${currentQuestion.inflowPattern.length})`,
  };
}
```

### D3. No question-progression validation

The engine reads `this.state.questions[this.state.currentQuestionIndex]`
without verifying that the action being submitted is *for* that
question. So a malicious client can:
- Replay an action for `currentQuestionIndex - 1` (already-answered
  question) and have it counted as a fresh attempt at the *current*
  question.
- Skip ahead by spamming submissions: each call advances
  `currentQuestionIndex`. There is no per-question gating.

This is the same shape of integrity bug as Sessions 2/3 — the engine
trusts that the UI is the only client.

**Status: fixed in this session.** `applyAction` now accepts a
required `questionIndex` field on the action and rejects when it
doesn't match `state.currentQuestionIndex`:

```ts
if (typeof questionIndex !== 'number' || questionIndex !== this.state.currentQuestionIndex) {
  return {
    success: false,
    message: `Out-of-order submission: expected question ${this.state.currentQuestionIndex}, got ${questionIndex}`,
  };
}
```

The UI sends the current question index with every submission.

### D4. Off-by-one indexing in `correctAnswer`

`stockLevels` is `[initial, after-period-1, after-period-2, …]` —
length `inflow.length + 1`. So `stockLevels.indexOf(max)` returns an
index in `[0, inflow.length]`. But the player views (and the UI
displays) periods 1..N — there is no "period 0" the player can pick
because period 0 *is* the initial state.

Effect: for the easy pattern `[2,4,6,8,6,4,2]` / `[3,3,3,3,3,3,3]`,
stocks `[10, 9, 10, 13, 18, 21, 22, 21]`, max at index 6. The
correct minute the *player* should pick is **7** (the seventh
period, after period 7's inflow/outflow have applied). But the
engine returns 6 and rejects "7" as wrong.

**Status: fixed in this session.** `correctAnswer` is now stored
1-indexed (= the minute the player would pick), and the
correlation-heuristic detector compares against `inflowPeakIndex +
1`. The 1-indexing also makes the brief's "1-30 valid input range"
work cleanly.

### D5. Degenerate question generation

`generateSingleQuestion` switches on difficulty (`'easy' | 'medium' |
'hard'`) and returns one of three hardcoded patterns. Every easy
question is identical (different scenario string, same numbers, same
correct answer). After the player answers Q1 they can autopilot the
next two. The "10 questions, progressive difficulty" advertised in
the analysis MD becomes "3 questions repeated".

Worse: correlation-heuristic detection counts *each* repeated wrong
answer separately. A player who picks the inflow peak on Q1 will pick
it on Q2 and Q3 too (because the question is identical). The bias
metric is inflated.

**Status: fixed in this session.** `generateSingleQuestion` now
synthesises a question per difficulty + index using a per-question
seed (default: question id), producing distinct
`inflowPattern`/`outflowPattern` arrays. Every generated question is
validated to ensure `correctAnswer !== inflowPeak + 1` (so the
correlation-heuristic test isn't trivially passable) and that
`stockLevels` never go negative. A `config.questions: Question[]`
escape hatch was added so tests can inject deterministic questions.

### D6. `computeMetrics` is `async` but called un-`await`-ed inside `getParticipantState`

```ts
getParticipantState(participantId: string): any {
  ...
  return {
    ...this.getPublicState(),
    answers: this.state.answers,
    metrics: this.computeMetrics(),   // returns Promise<any>, not metrics
  };
}
```

`getParticipantState` is *synchronous* across the engine contract, so
it can't `await`. The cleanest fix is to make `computeMetrics`'
real work synchronous (it doesn't touch the DB) and have
`getParticipantState` call the sync version. The `BaseGameEngine`
contract still requires the async wrapper on the public surface.

**Status: fixed in this session.** Added a private synchronous
`computeMetricsSync()` and wired both `computeMetrics()` (async,
unchanged contract) and `getParticipantState()` to it.

### D7. Author + tagline drift in `simulations-data.json`

| Field | Pre-session | Canonical |
|---|---|---|
| `name` | "Customer In A Store - Cognitive Bias" | "Customer In A Store" (subtitle "A Supply Chain Management Simulation") |
| `author` | "Prof. Raghunathan, IIM Ahmedabad" | "Prof. T. T. Niranjan, IIT Bombay" (per `MSGAMES_WEBSITE_ANALYSIS.md:336` + `MS-GAME.txt:99`) |
| `type` | `cognitive-science` | `operations-management` |
| `duration_minutes` | 25 | 20 (per `MS-GAME.txt:97`) |
| `tags` | cognitive-science, systems-thinking, bias, single-player | systems-thinking, stock-flow, single-player, behavioral-decision |

**Status: fixed in this session.** Row 9 of `simulations-data.json`
updated; re-seed required (`cd backend && npm run prisma:seed`)
for the change to land in the database for new sessions.

---

## Missing — what's not built

### M1. No warm-up cognitive-reflection phase in the engine

`MS-GAME.txt:102` and the brief both reference a warm-up of
4–5 logic puzzles (water-barrel, marks-rank, pig-trade,
stock-investment) that runs *before* the main 28-question quiz. The
engine has no notion of phases; it goes straight to question 1.

**Decision:** the warm-up is a UI-only construct in this session.
`WarmupQuiz.tsx` runs locally in the browser, accumulates answers
into local component state, and only when the player clicks "Start
Main Quiz" do we begin sending `submit_answer` actions to the
engine. The engine's `state.phase` could be added later for
scoring/persistence, but isn't required for the current pedagogical
goal (warm-up is a priming exercise; not graded).

### M2. The numQuestions config doesn't match the canonical 28

The brief says "28-question variant"; analysis MD says 10 default.
Engine accepts a `numQuestions` config so this is a runtime decision,
not a code change. The UI defaults to 10 for now to keep playthroughs
short during testing; a facilitator can override.

**Decision:** keep as-is; surface in a future facilitator-config UI.

### M3. `learningGroup` has no default

The socket lazy-init in `sockets/index.ts:121-146` doesn't have a
case for `customer-in-store`, so `getDefaultConfig` returns `{}` and
`config.learningGroup` is `undefined`. Per the sim-isolation rule
(CLAUDE.md §14) we cannot edit `sockets/index.ts` to add a case here.

**Status: fixed in this session inside the engine.** `initialize`
now coerces a missing `learningGroup` to `'binary-feedback'` (the
mode the analysis MD describes as the "default research condition").

### M4. No persistent reconstruction of in-memory engine state

Same platform-wide concern as Fruit Beer Game (CLAUDE.md §5.1, §12
pitfall 1, Fruit Beer audit M3). Out of scope for this session.

---

## Integrity-gap audit (the brief's specific checklist)

Per the brief, every engine in this platform was written assuming
the UI is the only client. Verifying the four listed shapes:

| Shape | Status (pre-session) | Fix |
|---|---|---|
| `applyAction` validates answer is in 1-30 | ❌ no validation at all | D2 — added type, integer, range, length-of-pattern guards |
| `applyAction` validates the question being answered is the current question | ❌ no `questionIndex` echo from client | D3 — `questionIndex` now required and matched |
| Correct answers leaked in any state field before answer submitted | ✅ already stripped from `getPublicState`'s `currentQuestion` payload | (no change; verified by test `correct answer not exposed in publicState before answer submitted`) |
| Bias-detection logic is client-spoofable | N/A — bias detection runs server-side over recorded answers; client cannot inject "I picked the stock peak" because the server records what the client submitted, not what it claims | (no change; verified by test that submitting the inflow-peak minute always fires the heuristic flag regardless of any other client claim) |

---

## What an audit-pass change set looks like

| Change | Files | Effort |
|---|---|---|
| Fix author/tagline/type/duration/tags + re-seed | `simulations-data.json` (1 row) | 5 min |
| Real implementations for the 3 intervention modes | `CustomerInStoreEngine.ts` (~60 lines) | 30 min |
| Input bounds + question-progression + integer validation | `CustomerInStoreEngine.ts` (~25 lines) | 15 min |
| Switch `correctAnswer` to 1-indexed; fix explanation marker | `CustomerInStoreEngine.ts` (~10 lines) | 10 min |
| Algorithmic question generation (distinct per question; validated) | `CustomerInStoreEngine.ts` (~50 lines) | 30 min |
| Sync `computeMetricsSync` + wire | `CustomerInStoreEngine.ts` (~15 lines) | 5 min |
| Default `learningGroup` in `initialize` | `CustomerInStoreEngine.ts` (~3 lines) | 2 min |
| Add tests covering all of the above | `CustomerInStoreEngine.test.ts` (new file) | 45 min |
| **Backend total** | | **~2.5 h** |
| Build `frontend/src/components/games/CustomerInStore/` (6 files: index + 5 sub-views) + slug-map registration | new files + 1-line slug map | **~2 h** |

---

## Bot status — CLAUDE.md §11 Q5

**N/A.** Customer In A Store is a single-player simulation per
`MS-GAME.txt:97` (`Type: Single Player`). No bot logic needed; one
participant, one question stream, no group sync.
