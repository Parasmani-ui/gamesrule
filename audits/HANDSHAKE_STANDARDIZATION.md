# Handshake Contract Standardization — Session HS-1

**Date:** 2026-05-14
**Scope:** Platform-wide standardization of the `onAction → socket → engine`
action contract. The documented exception to the sim-isolation rule in
CLAUDE.md §14 — the contract itself is the unit of work.
**Trigger:** Discovered while verifying Demand Forecast's UI that the bridge
had no enforced contract; 8 engines destructured the action object in three
different ways, 6 UIs sent payloads in two different shapes. The system
worked only because each UI happened to match its engine's expectations.

---

## 1. The bridge, end to end

```
UI:              onAction(actionType, payload)
                       │
                       ▼
[sessionId].tsx: handleGameAction(actionType, payload)
                       │
                       ▼
socket.ts:       socketService.sendAction(sessionId, participantId,
                                          actionType, payload)
                       │
                       ▼
                 socket.emit('player_action',
                   { sessionId, participantId, actionType, payload })
                       │
                       ▼ (over websocket)
                       ▼
sockets/index.ts:225  socket.on('player_action', async (payload) => {
                        const { sessionId, participantId, actionType,
                                payload: actionPayload } = payload;
                        ...
                        engine.applyAction(participantId, {
                          actionType,
                          ...actionPayload,
                        });
                      })
```

The single most important fact: the **action object delivered to
`engine.applyAction(participantId, action)`** has the shape
`{ actionType, ...payload }`. `actionType` lives at the top level; payload
fields are spread alongside it.

The `payload` the UI hands to `onAction` is the spread; the canonical
contract is therefore that payload fields must live at the top level of the
payload object — never under a nested `data` key.

---

## 2. Pre-Session-HS-1 inconsistencies

### Engine destructuring (8 engines, three different shapes)

| Engine | Destructure | Shape |
|---|---|---|
| FruitBeerEngine | `const { orderQuantity } = action` | flat |
| CustomerInStoreEngine | `const { answer, questionIndex, ... } = action` | flat |
| DualSourceEngine | `const { orderA, orderB } = action` | flat |
| DemandForecastEngine | reads `action.phase` / `action.method` directly | flat |
| EVGambitEngine | switches on `action?.actionType`, handlers read `action.X` | flat |
| HRCompensationEngine | `const { stage, data } = action` | **hybrid** |
| DefectDetectivesEngine | `const { actionType, data } = action` | **nested** |
| OrderOpsEngine | `const { actionType, data } = action` | **nested** |
| SustainableSelectEngine | `const { actionType, data } = action` | **nested** |
| OnionDilemmaEngine | skeleton — no destructure | n/a |
| TOCFactoryEngine | skeleton — no destructure | n/a |

### UI payload shape (6 sims, two different shapes)

| UI | onAction payload shape |
|---|---|
| FruitBeer | `{ orderQuantity }` — flat |
| CustomerInStore | `{ questionIndex, answer, timeSpent, stockCalculation? }` — flat |
| EVGambit | `{ round, decisionId, rationale?, alternatives? }` / `{ round, answers }` — flat |
| DemandForecast | `{ phase, guess }` / `{ method, params }` — flat |
| HRCompensation | `{ stage, data: { ... } }` — **hybrid (data-wrapped fields)** |
| DefectDetectives | `{ data: { tool } }` / `{ data: { strategy, sampleSize? } }` — **nested** |

### Were any sims actually broken?

**No.** Every UI happened to match its engine's destructure shape, so all
six Phase-1 sims worked at runtime. The drift was a latent contract failure,
not an active routing failure — but it was a routing failure waiting to
happen the moment any future engineer wrote a new sim assuming the wrong
shape, or refactored either side without coordinating the other.

OrderOps, SustainableSelect, and DualSource have no UI yet (Phase-2). When
those UIs land, an engineer following the most common Phase-1 sims as a
template (FruitBeer, EVGambit, CustomerInStore — all flat) would have
written flat payloads, which OrderOps and SustainableSelect (nested
`data` engines) would silently fail to route. The fix prevents that.

---

## 3. The canonical contract

Adopted by HS-1, documented in CLAUDE.md §5.2:

> The action object delivered to `engine.applyAction(participantId, action)`
> is `{ actionType: string, ...payloadFields }`. Payload fields live at the
> top level of the action object — there is no nested `data` wrapper.
>
> The UI calls `onAction(actionType, payload)` with a **flat** payload
> object. The discriminator field is normally `actionType` but a sim may
> use its own top-level field instead (HRComp uses `stage`,
> DemandForecast uses `phase` / `method`); the rule is only that the
> discriminator sits at the top level of the payload, never under `data`.
>
> Engines destructure either fields directly (`const { x, y } = action`)
> or via spread-rest (`const { actionType, ...data } = action`) — both
> are canonical. Passing the spread `data` to internal handlers keeps the
> existing per-handler API surface intact.

Choice rationale: 4 of 8 engines were already flat, plus 1 hybrid was
roughly flat — making flat the canonical contract changes 4 engines and 2
UIs. Choosing nested instead would have changed 4 engines and 4 UIs (the
flat engines would all break). Flat minimises disruption AND aligns with
the implicit assumption a new engineer would make from reading the most
common cases.

---

## 4. The new GameProps type

`frontend/src/components/games/types.ts` now declares:

```ts
export interface GameAction {
  actionType: string;
}

export type ActionPayload<
  TAction extends GameAction,
  AT extends TAction['actionType']
> = string extends TAction['actionType']
  ? Record<string, unknown> | { [k: string]: any }
  : Omit<Extract<TAction, { actionType: AT }>, 'actionType'>;

export interface GameProps<TAction extends GameAction = GameAction> {
  sessionId: string;
  participantId: string | null;
  state: any;
  onAction: <AT extends TAction['actionType']>(
    actionType: AT,
    payload: ActionPayload<TAction, AT>
  ) => void;
  isFacilitator: boolean;
  actionLoading: boolean;
  actionFeedback: { type: 'success' | 'error'; message: string } | null;
}

export type GameComponent<TAction extends GameAction = GameAction> =
  React.ComponentType<GameProps<TAction>>;
```

How narrowing works:

1. **No type parameter (default):** `TAction['actionType']` is wide `string`,
   `string extends string` is true, so `payload` resolves to a permissive
   `Record<string, unknown>`. The dispatcher in `[sessionId].tsx` keeps
   composing without modification.

2. **Per-sim discriminated union:** when a sim declares
   `GameProps<MySimAction>` with `MySimAction` being a literal union, the
   `string extends TAction['actionType']` branch is false; `Extract`
   narrows to the variant matching `AT`, and `Omit` strips `actionType`
   so the payload type is exactly the variant's remaining fields.

Each of the 6 Phase-1 sims declares its action union at the top of its
`index.tsx`. A future onAction call with a wrong shape — including the
pre-Session-HS-1 `{ data: { tool } }` shape that Defect Detectives used —
is a compile error rather than a silent runtime routing failure.

### Compile-time proof

DefectDetectives's union is:

```ts
type DefectDetectivesAction =
  | { actionType: 'apply-qc-tool'; tool: ToolName }
  | { actionType: 'set-inspection-strategy'; strategy: InspectionStrategy; sampleSize?: number }
  | { actionType: 'process-batch' };
```

Calling `onAction('apply-qc-tool', { data: { tool } })` produces

> Argument of type `{ data: { tool: ToolName } }` is not assignable to
> parameter of type `{ tool: ToolName }`. Property `tool` is missing in
> type `{ data: { tool: ToolName } }`.

The original handshake bug becomes a compile error.

---

## 5. Per-engine changes

| Engine | Change |
|---|---|
| FruitBeerEngine | none — already flat |
| CustomerInStoreEngine | none — already flat |
| DualSourceEngine | none — already flat |
| DemandForecastEngine | none — already flat |
| EVGambitEngine | none — already flat |
| **HRCompensationEngine** | `{ stage, data }` → `{ actionType: _, stage, ...payload }`; handlers receive `payload` instead of `data` (same internal API) |
| **DefectDetectivesEngine** | `{ actionType, data }` → `{ actionType, ...payload }`; same handler-API preservation |
| **OrderOpsEngine** | `{ actionType, data }` → `{ actionType, ...payload }` |
| **SustainableSelectEngine** | `{ actionType, data }` → `{ actionType, ...payload }` |
| OnionDilemmaEngine | none — skeleton |
| TOCFactoryEngine | none — skeleton |

OrderOps, SustainableSelect, and DualSource don't have UIs yet — their
engine changes prevent the future bug rather than fixing a current one.

## 6. Per-UI changes

| UI | Change |
|---|---|
| FruitBeer | typed action union added, GameProps narrowed |
| CustomerInStore | typed action union added, GameProps narrowed |
| EVGambit | typed action union added, GameProps narrowed |
| DemandForecast | typed action union added, GameProps narrowed |
| **HRCompensation** | `{ stage, data: { expertIds } }` → `{ stage, expertIds }` (3 onAction call sites); typed action union added |
| **DefectDetectives** | `{ data: { tool } }` → `{ tool }` (3 onAction call sites); typed action union added |

---

## 7. Tests

### Existing tests touched

| File | Action-object updates |
|---|---|
| `__tests__/HRCompensationEngine.test.ts` | ~45 `data: { X }` wrappers flattened to top-level fields |
| `__tests__/DefectDetectivesEngine.test.ts` | ~30 `data: { tool }` / `data: { strategy, ... }` wrappers flattened |
| Other 4 test files | no changes — were already flat |

### New integration tests

`__tests__/HandshakeContract.test.ts` — one per Phase-1 sim (6 total).
Each test builds the action object exactly the way the production bridge
builds it (`{ actionType, ...payload }`, mirroring
`backend/src/sockets/index.ts:225-228`), then calls `applyAction` with
the UI's literal payload from the corresponding `index.tsx`. This is the
test class that was missing — the existing engine tests verified
applyAction with hand-built action objects whose shape was the test
author's invention, not the wire shape.

A future drift between the UI's payload shape and the engine's
destructure now trips the matching test instead of silently failing in
production.

---

## 8. Verification

| Gate | Result |
|---|---|
| `cd backend && npm test` | 233 passing (227 prior + 6 new) |
| `cd backend && npm run build` | exit 0 — clean |
| `cd frontend && npm run type-check` | clean |
| `cd frontend && npm run build` | succeeded; `/sessions/[sessionId]` route = 170 kB (unchanged) |

---

## 9. Follow-ups (open questions)

1. **DualSource, OrderOps, SustainableSelect** still need UIs (Phase-2).
   Engine destructure is now canonical; the corresponding UIs must send
   flat payloads when they ship.
2. **OnionDilemma, TOCFactory** are skeletons. Both should adopt the
   canonical contract when their engines are written.
3. **Demand Forecast DF-3b** is the only outstanding Phase-1.5 UI session
   (feedback panel + scorecard). DF-3a already conforms; DF-3b stays
   inside the canonical contract by default — its onAction additions
   (if any) extend the existing `DemandForecastUiAction` union.

This standardization closes the contract drift discovered in DF-3a
verification. It does not touch the response shape (`ActionResult`) — that
remains `{ success, message, data? }` per `BaseGameEngine`, and `data`
there is the **engine response payload**, unrelated to the action input
contract standardized here.

---

*Audit and rewrite by Session HS-1. The canonical contract is now law for
all current and future sims (CLAUDE.md §5.2, §15 Pattern H).*
