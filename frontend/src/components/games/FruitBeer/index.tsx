import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GameProps } from '../types';
import { socketService } from '../../../services/socket';
import { SupplyChainView } from './SupplyChainView';
import { OrderEntry } from './OrderEntry';
import { WeekHistory } from './WeekHistory';
import { Metrics } from './Metrics';
import { WaitingForOthers } from './WaitingForOthers';
import { GameComplete } from './GameComplete';

type Role = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

const ALL_ROLES: Role[] = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];

export function FruitBeerGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps) {
  // Merge in any updates that arrive via round_complete / participant_state_update.
  // The parent [sessionId].tsx only listens for session_update, which does not
  // fire after auto-advance — so without local listeners here, the player who
  // triggered the advance and the players who already submitted both end up
  // looking at stale week N - 1 state until they perform another action.
  const [liveState, setLiveState] = useState<any>(state);
  const [finalMetrics, setFinalMetrics] = useState<any>(state?.metrics ?? null);

  useEffect(() => {
    setLiveState((prev: any) => ({ ...(prev || {}), ...(state || {}) }));
    if (state?.metrics) setFinalMetrics(state.metrics);
  }, [state]);

  useEffect(() => {
    if (!participantId) return;

    const handleRoundComplete = () => {
      // The player's hasPlacedOrder flag was true; reset it so the order
      // entry re-enables for the new week.
      setLiveState((prev: any) => ({ ...(prev || {}), hasPlacedOrder: false }));
    };

    const handleParticipantStateUpdate = (payload: any) => {
      if (payload?.participantId === participantId && payload.state) {
        setLiveState((prev: any) => ({ ...(prev || {}), ...payload.state }));
      }
    };

    const handleGameComplete = (payload: any) => {
      if (payload?.finalMetrics) setFinalMetrics(payload.finalMetrics);
    };

    socketService.on('round_complete', handleRoundComplete);
    socketService.on('participant_state_update', handleParticipantStateUpdate);
    socketService.on('game_complete', handleGameComplete);

    return () => {
      socketService.off('round_complete', handleRoundComplete);
      socketService.off('participant_state_update', handleParticipantStateUpdate);
      socketService.off('game_complete', handleGameComplete);
    };
  }, [participantId]);

  const view = liveState ?? {};
  const role = view.role as Role | undefined;
  const currentWeek = Number(view.currentWeek ?? 0);
  const maxWeeks = Number(view.maxWeeks ?? 20);
  const isComplete = Boolean(view.isComplete);
  const customerDemand: number[] = view.config?.demandPattern ?? [];
  const weeklyStats = Array.isArray(view.weeklyStats) ? view.weeklyStats : [];

  const otherRolesPending = useMemo<Role[]>(() => {
    // We don't know which other tiers have submitted — engine doesn't expose
    // that on participantState. Until the round advances, surface "all peers"
    // so the player understands the round is gated on others.
    if (!role) return [];
    return ALL_ROLES.filter(r => r !== role);
  }, [role]);

  if (!view || Object.keys(view).length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading supply chain…
      </div>
    );
  }

  if (isFacilitator && !participantId) {
    return (
      <div className="space-y-6">
        <SupplyChainView
          ownRole={null}
          ownInventory={null}
          ownBacklog={null}
          ownIncomingShipments={[]}
          ownIncomingOrders={[]}
          currentWeek={currentWeek}
          maxWeeks={maxWeeks}
          customerDemand={customerDemand}
        />
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Facilitator view</h3>
          <p className="text-sm text-slate-300">
            Players are running the supply chain. The chain auto-advances when every
            non-bot participant submits this week's order. Cohort metrics reveal at game end.
          </p>
        </div>
        {isComplete && finalMetrics && (
          <GameComplete
            metrics={finalMetrics}
            ownRole={null}
            customerDemand={customerDemand}
          />
        )}
      </div>
    );
  }

  if (!participantId || !role) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">
          Join this session to play one of the four supply-chain tiers.
        </p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <GameComplete
        metrics={finalMetrics}
        ownRole={role}
        customerDemand={customerDemand}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SupplyChainView
        ownRole={role}
        ownInventory={Number(view.inventory ?? 0)}
        ownBacklog={Number(view.backorder ?? 0)}
        ownIncomingShipments={Array.isArray(view.incomingShipments) ? view.incomingShipments : []}
        ownIncomingOrders={Array.isArray(view.incomingOrders) ? view.incomingOrders : []}
        currentWeek={currentWeek}
        maxWeeks={maxWeeks}
        customerDemand={customerDemand}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <OrderEntry
          role={role}
          currentWeek={currentWeek}
          maxWeeks={maxWeeks}
          inventory={Number(view.inventory ?? 0)}
          backorder={Number(view.backorder ?? 0)}
          lastOrderPlaced={Number(view.lastOrderPlaced ?? 0)}
          incomingDemand={role === 'RETAILER' ? customerDemand[currentWeek] ?? null : null}
          incomingOrderQty={
            role !== 'RETAILER' && Array.isArray(view.incomingOrders)
              ? Number(view.incomingOrders[0] ?? 0)
              : null
          }
          hasPlacedOrder={Boolean(view.hasPlacedOrder)}
          actionLoading={actionLoading}
          actionFeedback={actionFeedback}
          onSubmit={qty => onAction('place_order', { orderQuantity: qty })}
        />

        <Metrics
          role={role}
          totalCost={Number(view.totalCost ?? 0)}
          weeklyStats={weeklyStats}
          holdingCostRate={Number(view.config?.holdingCost ?? 0.5)}
          stockoutCostRate={Number(view.config?.stockoutCost ?? 1.0)}
          bullwhipRatio={finalMetrics?.bullwhipEffect?.[role] ?? null}
        />
      </div>

      {Boolean(view.hasPlacedOrder) && !isComplete && (
        <WaitingForOthers ownRole={role} otherRoles={otherRolesPending} />
      )}

      <WeekHistory weeklyStats={weeklyStats} />
    </div>
  );
}

export default FruitBeerGame;
