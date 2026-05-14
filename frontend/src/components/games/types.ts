import type React from 'react';

/**
 * Canonical action contract — see CLAUDE.md §5.2.
 *
 * The action object delivered to engine.applyAction has shape:
 *   { actionType: string, ...payloadFields }
 *
 * UI calls onAction(actionType, payload). socket.ts transports
 * { sessionId, participantId, actionType, payload }. The backend socket
 * handler ultimately calls engine.applyAction(participantId,
 * { actionType, ...payload }). Payload fields MUST live at the top level
 * — no nested `data` wrapper.
 *
 * Per-sim action shapes are declared as a discriminated union on
 * `actionType` (or a sim-specific discriminator like HRComp's `stage` or
 * DemandForecast's `phase` / `method`, all of which sit at the top level
 * of the payload alongside `actionType`).
 */
export interface GameAction {
  actionType: string;
}

/**
 * Resolve the payload shape for a given actionType AT against a sim's
 * action union. If the sim hasn't declared a literal-union action type
 * (TAction has the loose default with `actionType: string`), the payload
 * stays open as `Record<string, unknown>` so the dispatcher's
 * `(actionType: string, payload: any) => void` continues to compose. When
 * a sim declares a literal discriminated union, `Extract` narrows the
 * payload to that variant's fields and a wrong-shape dispatch becomes a
 * compile error.
 */
export type ActionPayload<
  TAction extends GameAction,
  AT extends TAction['actionType']
> = string extends TAction['actionType']
  ? Record<string, unknown> | { [k: string]: any }
  : Omit<Extract<TAction, { actionType: AT }>, 'actionType'>;

/**
 * Shared interface that every per-simulation game UI implements.
 *
 * The dispatcher in [sessionId].tsx mounts a slug-keyed component and hands
 * it one of these prop bags. Engines diverge wildly in mechanics, so `state`
 * is intentionally untyped here and narrowed inside each game component.
 *
 * `onAction` is generic over the sim's action union so per-sim components
 * can declare their action shapes and get compile-time checking on every
 * dispatch site. The default loose `GameAction` keeps the dispatcher
 * agnostic — see [[ActionPayload]] for the narrowing rule.
 */
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
