import { Activity, BarChart3, Brain } from 'lucide-react';
import { Phase } from './types';

interface Props {
  displayName: string;
  phase: Phase;
  isComplete: boolean;
  currentPeriod: number;
  totalPeriods: number;
  warmupPeriods: number;
}

/**
 * Top strip for the active session. Shows the pattern-NEUTRAL scenario name,
 * the current phase, and a period progress indicator.
 *
 * Pattern A reminder: `displayName` is the engine's pattern-neutral label
 * (from scenarios.json). The pattern-encoding `name` field is NEVER sent
 * over the wire. Do not derive or render a pattern hint here.
 */
export function ScenarioHeader({
  displayName,
  phase,
  isComplete,
  currentPeriod,
  totalPeriods,
  warmupPeriods,
}: Props) {
  const forecastingPeriods = Math.max(0, totalPeriods - warmupPeriods);
  const forecastsSubmitted = Math.max(0, currentPeriod - warmupPeriods);
  const progressPct = totalPeriods > 0 ? Math.min(100, (currentPeriod / totalPeriods) * 100) : 0;

  const phaseLabel = isComplete
    ? 'Complete'
    : phase === 'pattern-inference'
    ? 'Phase 1 · Pattern Inference'
    : 'Phase 2 · Forecasting';

  const PhaseIcon = isComplete ? BarChart3 : phase === 'pattern-inference' ? Brain : Activity;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">Scenario</p>
          <h2 className="text-lg md:text-xl font-bold text-white">{displayName}</h2>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-semibold">
          <PhaseIcon className="w-4 h-4" />
          {phaseLabel}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Warmup periods revealed: <span className="text-slate-200 font-semibold">{warmupPeriods}</span>
          </span>
          <span>
            Forecasts submitted:{' '}
            <span className="text-slate-200 font-semibold">
              {forecastsSubmitted} / {forecastingPeriods}
            </span>
          </span>
          <span>
            Period:{' '}
            <span className="text-slate-200 font-semibold">
              {Math.min(currentPeriod, totalPeriods)} / {totalPeriods}
            </span>
          </span>
        </div>
        <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
