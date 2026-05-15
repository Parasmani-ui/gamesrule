import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { GameProps } from '../types';
import { socketService } from '../../../services/socket';
import {
  DemandForecastParticipantState,
  DemandPattern,
  ForecastAction,
  MethodMetadata,
  Phase,
} from './types';
import { ScenarioHeader } from './ScenarioHeader';
import { DemandHistoryChart } from './DemandHistoryChart';
import { PatternInference } from './PatternInference';
import { MethodPicker } from './MethodPicker';
import { PeriodFeedback } from './PeriodFeedback';
import { MetricsChart } from './MetricsChart';
import { Scorecard } from './Scorecard';

/**
 * Demand Forecast Challenge — Phase 1.5 single-player drill.
 *
 * Engine state contract (from DemandForecastEngine.getParticipantState):
 *   - phase: 'pattern-inference' | 'forecasting'
 *   - currentPeriod: 0-indexed pointer into historicalDemand. During warmup
 *     it equals warmupPeriods; each forecast advances it by 1.
 *   - totalPeriods, warmupPeriods, displayName, currencySymbol
 *   - availableMethods: the 6 canonical method metas (id/label/formula/desc/params)
 *   - patternOptions: ['stationary', 'trending', 'seasonal', 'random']
 *   - historicalDemand: visible slice ONLY (length = currentPeriod)
 *   - playerForecasts[]: per-period records, missing usedRecommendedMethod
 *     until isComplete (Pattern A sanitization).
 *   - inferenceGuess: the participant's own guess (or null pre-submit)
 *   - cumulativeMetrics, metrics: live diagnostics
 *   - isComplete: post-game reveal gate
 *
 * Pattern-A reveals (truePattern, optimalMethod, recommendedMethods,
 * patternRationale, fullDemandData) live ONLY in `state` when isComplete.
 * The forecasting view does not read or display them; the Scorecard
 * (rendered when isComplete) consumes them.
 *
 * Local socket subscription: we listen for action_result so submission
 * errors / per-period feedback land immediately without waiting for the
 * parent's session reload (Fruit Beer / Customer In Store pattern).
 *
 * --- Mock state shapes for ad-hoc verification --------------------------
 *   pattern-inference phase:
 *     state = {
 *       phase: 'pattern-inference', currentPeriod: 5, totalPeriods: 20,
 *       warmupPeriods: 5, displayName: 'Regional Retail Demand — Q1-Q5',
 *       currencySymbol: '₹', availableMethods: [...6 entries],
 *       patternOptions: ['stationary','trending','seasonal','random'],
 *       historicalDemand: [102,98,105,99,101], playerForecasts: [],
 *       inferenceGuess: null, isComplete: false,
 *       cumulativeMetrics: {...zeros}, metrics: {...nulls}
 *     }
 *   forecasting phase: same shape + phase='forecasting', inferenceGuess set.
 *   isComplete (Scorecard reveal):
 *     state = { ...all of the above, isComplete: true,
 *       playerForecasts: [...filled with `usedRecommendedMethod` now present],
 *       truePattern: 'trending', optimalMethod: 'holts-double-es',
 *       recommendedMethods: ['holts-double-es','linear-regression'],
 *       patternRationale: 'Trend dominates...', fullDemandData: [...20 nums],
 *       metrics.playerPerformance: {inferenceScore: 60, methodAppropriatenessScore: 73,
 *         accuracyScore: 81, finalScore: 73.5, scoringWeights: {0.3, 0.3, 0.4}, ...}
 *     }
 */
type DemandForecastUiAction =
  | {
      actionType: 'infer-pattern';
      phase: 'pattern-inference';
      guess: DemandPattern;
    }
  | ({ actionType: 'forecast' } & ForecastAction);

export function DemandForecastGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps<DemandForecastUiAction>) {
  const typedState = state as DemandForecastParticipantState | undefined;
  const [actionResultError, setActionResultError] = useState<string | null>(null);

  // Local action_result subscription. We only surface errors here; success
  // results trigger a session_update from the server which refreshes `state`.
  useEffect(() => {
    if (!participantId) return;
    const handler = (payload: any) => {
      if (payload?.success === false) {
        setActionResultError(payload?.message ?? 'Action rejected.');
      } else if (payload?.success) {
        setActionResultError(null);
      }
    };
    socketService.on('action_result', handler);
    return () => {
      socketService.off('action_result', handler);
    };
  }, [participantId]);

  // ---- guards --------------------------------------------------------------

  if (!typedState || Object.keys(typedState).length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading simulation…
      </div>
    );
  }

  if (isFacilitator && !participantId) {
    return (
      <FacilitatorView
        displayName={typedState.displayName ?? '—'}
        phase={typedState.phase ?? 'pattern-inference'}
        currentPeriod={typedState.currentPeriod ?? 0}
        totalPeriods={typedState.totalPeriods ?? 0}
        warmupPeriods={typedState.warmupPeriods ?? 0}
        isComplete={Boolean(typedState.isComplete)}
      />
    );
  }

  if (!participantId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">Join this session to take the forecasting drill.</p>
      </div>
    );
  }

  // ---- normalize state pulls ----------------------------------------------

  const displayName = typedState.displayName ?? 'Demand Series';
  const phase: Phase = typedState.phase ?? 'pattern-inference';
  const currentPeriod = typedState.currentPeriod ?? 0;
  const totalPeriods = typedState.totalPeriods ?? 0;
  const warmupPeriods = typedState.warmupPeriods ?? 0;
  const historicalDemand: number[] = typedState.historicalDemand ?? [];
  const playerForecasts = typedState.playerForecasts ?? [];
  const availableMethods: MethodMetadata[] = typedState.availableMethods ?? [];
  const patternOptions: DemandPattern[] =
    typedState.patternOptions ?? (['stationary', 'trending', 'seasonal', 'random'] as DemandPattern[]);
  const isComplete = Boolean(typedState.isComplete);
  const inferenceGuess = typedState.inferenceGuess ?? null;

  // ---- handlers ------------------------------------------------------------

  const submitPatternGuess = (guess: DemandPattern) => {
    setActionResultError(null);
    onAction('infer-pattern', { phase: 'pattern-inference', guess });
  };

  const submitForecast = (action: ForecastAction) => {
    setActionResultError(null);
    onAction('forecast', action);
  };

  // ---- post-complete: full scorecard reveal -------------------------------
  // DF-3b: render the final reveal — three-component score breakdown, the
  // true-pattern vs guess reveal, recommended methods, full demand series,
  // metrics chart, per-period table. Reveal fields are gated server-side by
  // the engine's isComplete check; Scorecard additionally null-checks the
  // optional reveals as defense-in-depth (Pattern A).
  if (isComplete) {
    return (
      <div className="space-y-6">
        <ScenarioHeader
          displayName={displayName}
          phase={phase}
          isComplete={isComplete}
          currentPeriod={currentPeriod}
          totalPeriods={totalPeriods}
          warmupPeriods={warmupPeriods}
        />
        <Scorecard state={typedState} />
      </div>
    );
  }

  const latestForecast =
    playerForecasts.length > 0 ? playerForecasts[playerForecasts.length - 1] : null;
  const cumulativeMetrics = typedState.cumulativeMetrics ?? {
    mad: 0,
    mse: 0,
    mape: 0,
    trackingSignal: 0,
    mapeExcludedCount: 0,
  };

  const center =
    phase === 'pattern-inference' ? (
      <PatternInference
        options={patternOptions}
        submitting={actionLoading}
        onSubmit={submitPatternGuess}
      />
    ) : (
      <MethodPicker
        availableMethods={availableMethods}
        historyLength={historicalDemand.length}
        nextPeriod={currentPeriod + 1}
        totalPeriods={totalPeriods}
        submitting={actionLoading}
        onSubmit={submitForecast}
      />
    );

  return (
    <div className="space-y-6">
      <ScenarioHeader
        displayName={displayName}
        phase={phase}
        isComplete={isComplete}
        currentPeriod={currentPeriod}
        totalPeriods={totalPeriods}
        warmupPeriods={warmupPeriods}
      />

      <DemandHistoryChart
        historicalDemand={historicalDemand}
        warmupPeriods={warmupPeriods}
        totalPeriods={totalPeriods}
        forecasts={playerForecasts.map(f => ({ period: f.period, forecast: f.forecast }))}
      />

      {phase === 'forecasting' && inferenceGuess && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300">
          <span className="text-slate-500 mr-1">Your pattern guess:</span>
          <span className="font-semibold capitalize">{inferenceGuess}</span>
          <span className="text-slate-500 ml-2">(score revealed at end)</span>
        </div>
      )}

      {phase === 'forecasting' && playerForecasts.length > 0 && (
        <>
          <PeriodFeedback
            latestForecast={latestForecast}
            cumulativeMetrics={cumulativeMetrics}
            totalForecasts={playerForecasts.length}
          />
          <MetricsChart playerForecasts={playerForecasts} />
        </>
      )}

      {center}

      {(actionFeedback || actionResultError) && (
        <div
          className={`rounded-xl p-4 flex items-center gap-2 text-sm ${
            (actionFeedback?.type === 'error' || actionResultError)
              ? 'bg-red-500/10 border border-red-500/40 text-red-100'
              : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
          }`}
        >
          {actionFeedback?.type === 'error' || actionResultError ? (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p>{actionResultError ?? actionFeedback?.message}</p>
        </div>
      )}
    </div>
  );
}

interface FacilitatorViewProps {
  displayName: string;
  phase: Phase;
  currentPeriod: number;
  totalPeriods: number;
  warmupPeriods: number;
  isComplete: boolean;
}

function FacilitatorView({
  displayName,
  phase,
  currentPeriod,
  totalPeriods,
  warmupPeriods,
  isComplete,
}: FacilitatorViewProps) {
  return (
    <div className="space-y-4">
      <ScenarioHeader
        displayName={displayName}
        phase={phase}
        isComplete={isComplete}
        currentPeriod={currentPeriod}
        totalPeriods={totalPeriods}
        warmupPeriods={warmupPeriods}
      />
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Facilitator view</h3>
        <p className="text-sm text-slate-300">
          Each learner runs an independent forecasting drill — they see a different demand
          series but the same scenario family. End the session once the cohort has finished.
        </p>
      </div>
    </div>
  );
}

export default DemandForecastGame;
