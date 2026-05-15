import { Activity, AlertCircle, Brain, Target, TrendingDown } from 'lucide-react';
import {
  CanonicalMethod,
  CumulativeMetrics,
  ForecastHistoryEntry,
  METHOD_LABEL,
} from './types';

interface Props {
  /** The most recent entry in state.playerForecasts. Null when the player has
   * not yet submitted a forecast this phase. */
  latestForecast: ForecastHistoryEntry | null;
  /** state.cumulativeMetrics — engine-computed. UI never recomputes these. */
  cumulativeMetrics: CumulativeMetrics;
  /** Total forecasts submitted so far — used as a small badge. */
  totalForecasts: number;
}

/**
 * Per-period feedback shown during the forecasting phase. Updates whenever
 * the parent state advances (which it does after every action_result +
 * session_update round-trip — see index.tsx's local subscription).
 *
 * PEDAGOGICAL GATE (Pattern A): this component MUST NOT show whether the
 * chosen method was "recommended" / "optimal". That flag is stripped from
 * playerForecasts mid-game by the engine and the type system marks it
 * optional. We do not render it here. The recommended-method comparison
 * lives in the Scorecard, after isComplete.
 *
 * NO FORECAST MATH: this component DISPLAYS the engine-computed forecast,
 * error, and cumulative metrics. It does not derive any of them.
 */
export function PeriodFeedback({
  latestForecast,
  cumulativeMetrics,
  totalForecasts,
}: Props) {
  if (!latestForecast) {
    return (
      <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <p>Submit your first forecast to start seeing per-period feedback.</p>
      </div>
    );
  }

  // sign convention: error = actual - forecast. Positive error means the
  // forecast was below the actual (under-forecast).
  const underForecast = latestForecast.error > 0;
  const overForecast = latestForecast.error < 0;
  const directionLabel = underForecast
    ? 'under-forecast'
    : overForecast
    ? 'over-forecast'
    : 'on target';
  const errSign = latestForecast.error >= 0 ? '+' : '';

  const tsAbs = Math.abs(cumulativeMetrics.trackingSignal);
  const tsHint =
    tsAbs > 4
      ? 'Out of control · biased'
      : tsAbs > 2
      ? 'Drift warning'
      : 'In control';

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Last period feedback
          </p>
          <p className="text-lg font-semibold text-white mt-0.5">
            Period {latestForecast.period + 1}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700 font-mono text-slate-300">
          Forecast {totalForecasts}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FactCard
          label="Method"
          value={METHOD_LABEL[latestForecast.method]}
          icon={<Brain className="w-4 h-4 text-indigo-300" />}
        />
        <FactCard
          label="Forecast"
          value={latestForecast.forecast.toFixed(2)}
          icon={<Target className="w-4 h-4 text-emerald-300" />}
          mono
        />
        <FactCard
          label="Actual"
          value={latestForecast.actual.toFixed(0)}
          icon={<Activity className="w-4 h-4 text-sky-300" />}
          mono
        />
        <FactCard
          label={`Error (${directionLabel})`}
          value={`${errSign}${latestForecast.error.toFixed(2)}`}
          icon={<TrendingDown className="w-4 h-4 text-amber-300" />}
          mono
        />
      </div>

      <div className="text-xs text-slate-500 font-mono break-words">
        Parameters: {formatParams(latestForecast.params as Record<string, unknown>)}
      </div>

      <div className="border-t border-slate-700/70 pt-3">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Cumulative diagnostics
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <MetricSquare label="MAD" value={cumulativeMetrics.mad.toFixed(2)} />
          <MetricSquare label="MSE" value={cumulativeMetrics.mse.toFixed(2)} />
          <MetricSquare label="MAPE" value={`${cumulativeMetrics.mape.toFixed(2)}%`} />
          <MetricSquare
            label="Tracking Signal"
            value={cumulativeMetrics.trackingSignal.toFixed(2)}
            hint={tsHint}
            warn={tsAbs > 4}
          />
        </div>
        {cumulativeMetrics.mapeExcludedCount > 0 && (
          <p className="text-xs text-slate-500 mt-2">
            MAPE excludes {cumulativeMetrics.mapeExcludedCount} zero-demand period
            {cumulativeMetrics.mapeExcludedCount === 1 ? '' : 's'}.
          </p>
        )}
      </div>
    </div>
  );
}

function formatParams(params: Record<string, unknown> | null | undefined): string {
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
    return '—';
  }
  return Object.entries(params)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}=[${v.map(x => Number(x).toFixed(2)).join(', ')}]`;
      }
      if (typeof v === 'number') return `${k}=${Number(v).toFixed(3)}`;
      return `${k}=${String(v)}`;
    })
    .join(' · ');
}

interface FactCardProps {
  label: string;
  value: string;
  icon?: JSX.Element;
  mono?: boolean;
}

function FactCard({ label, value, icon, mono }: FactCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p
        className={`text-base font-semibold text-slate-100 mt-1 ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

interface MetricSquareProps {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}

function MetricSquare({ label, value, hint, warn }: MetricSquareProps) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        warn ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/40'
      }`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-base font-mono mt-0.5 ${
          warn ? 'text-amber-200' : 'text-slate-100'
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className={`text-[10px] mt-0.5 ${warn ? 'text-amber-300' : 'text-slate-500'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

// Re-export the canonical method type so component-level imports stay tidy.
export type { CanonicalMethod };
