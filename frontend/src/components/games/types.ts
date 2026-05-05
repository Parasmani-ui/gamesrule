/**
 * Shared interface that every per-simulation game UI implements.
 *
 * The dispatcher in [sessionId].tsx mounts a slug-keyed component and hands it
 * one of these prop bags. Engines diverge wildly in mechanics, so `state` is
 * intentionally untyped here and narrowed inside each game component.
 */
export interface GameProps {
  sessionId: string;
  participantId: string | null;
  state: any;
  onAction: (actionType: string, payload: any) => void;
  isFacilitator: boolean;
  actionLoading: boolean;
  actionFeedback: { type: 'success' | 'error'; message: string } | null;
}

export type GameComponent = React.ComponentType<GameProps>;
