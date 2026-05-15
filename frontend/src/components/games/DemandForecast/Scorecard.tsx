import { Award, CheckCircle2, Sparkles, Trophy, XCircle } from 'lucide-react';
import {
  DemandForecastParticipantState,
  ForecastHistoryEntry,
  METHOD_LABEL,
  PATTERN_LABEL,
} from './types';
import { DemandHistoryChart } from './DemandHistoryChart';
import { MetricsChart } from './MetricsChart';

interface Props {
  /** Engine state after isComplete. The reveal fields (truePattern,
   * optimalMethod, recommendedMethods, patternRationale, fullDemandData) are
   * populated by the engine ONLY in this state — see DemandForecastEngine
   * getParticipantState's reveal gate. */
  state: DemandForecastParticipantState;
}

/**
 * Final scorecard — the post-isComplete reveal screen.
 *
 * Layout (top → bottom):
 *   1. Headline final score + expertise badge.
 *   2. THREE-COMPONENT SCORE BREAKDOWN — the pedagogical headline (audit M2/M9).
 *      Each component shows raw score / weight / weighted contribution so the
 *      "your accuracy is one of three" point lands hard.
 *   3. THE REVEAL — true pattern vs the player's inference guess (correct /
 *      close / wrong), recommended methods, pattern rationale text.
 *   4. Full demand series chart — now we show the un-revealed periods too.
 *   5. Cumulative metrics chart (re-used from forecasting view).
 *   6. Per-period table — with the now-revealed `usedRecommendedMethod` flag.
 *
 * Pattern A defense-in-depth: every reveal field is read off `state` which
 * the engine populates only when isComplete. We additionally null-check at
 * the call site so a paranoid render right at the boundary doesn't crash.
 */
export function Scorecard({ state }: Props) {
  const truePattern = state.truePattern;
  const optimalMethod = state.optimalMethod;
  const recommendedMethods = state.recommendedMethods ?? [];
  const patternRationale = state.patternRationale ?? '';
  const fullDemandData = state.fullDemandData ?? state.historicalDemand;

  const pp = state.metrics.playerPerformance;
  const weights = pp.scoringWeights;
  const inferenceScore = pp.inferenceScore ?? 0;
  const methodAppropriatenessScore = pp.methodAppropriatenessScore ?? 0;
  const accuracyScore = pp.accuracyScore ?? 0;
  const finalScore = pp.finalScore ?? 0;
  const optimalCount = pp.optimalMethodChoiceCount ?? 0;

  const inferenceWeighted = weights.inference * inferenceScore;
  const methodWeighted = weights.methodAppropriateness * methodAppropriatenessScore;
  const accuracyWeighted = weights.accuracy * accuracyScore;

  const playerGuess = state.inferenceGuess;
  const inferenceVerdict =
    !playerGuess || !truePattern
      ? { tone: 'wrong' as const, label: 'No guess submitted' }
      : playerGuess === truePattern
      ? { tone: 'correct' as const, label: 'Correct' }
      : inferenceScore >= 50
      ? { tone: 'close' as const, label: 'Close' }
      : { tone: 'wrong' as const, label: 'Off' };

  const ex = expertise(finalScore);

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4">
          <Trophy className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Final score
        </p>
        <p className="text-5xl font-bold text-emerald-400 mt-2">
          {finalScore.toFixed(1)}{' '}
          <span className="text-2xl text-slate-400">/ 100</span>
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700">
          <Award className={`w-5 h-5 ${ex.color}`} />
          <span className={`font-semibold ${ex.color}`}>{ex.label}</span>
        </div>
      </div>

      {/* THREE-COMPONENT BREAKDOWN — pedagogical headline */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <h3 className="text-lg font-semibold text-white">Score breakdown</h3>
        </div>
        <p className="text-sm text-slate-400 mb-5">
          Forecasting accuracy is one of three components. The pedagogy rewards method-fit
          (picking the right tool for the data shape) as much as the headline number itself.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ComponentCard
            label="Pattern inference"
            tone="indigo"
            raw={inferenceScore}
            weight={weights.inference}
            weighted={inferenceWeighted}
            sub={
              playerGuess && truePattern
                ? `Guessed ${PATTERN_LABEL[playerGuess]} · truth ${PATTERN_LABEL[truePattern]}`
                : 'No guess submitted'
            }
          />
          <ComponentCard
            label="Method appropriateness"
            tone="emerald"
            raw={methodAppropriatenessScore}
            weight={weights.methodAppropriateness}
            weighted={methodWeighted}
            sub={`${optimalCount} of ${state.playerForecasts.length} forecasts used a recommended method`}
          />
          <ComponentCard
            label="Accuracy"
            tone="amber"
            raw={accuracyScore}
            weight={weights.accuracy}
            weighted={accuracyWeighted}
            sub={`MAPE ${state.cumulativeMetrics.mape.toFixed(2)}% · score = max(0, 100 − MAPE)`}
          />
        </div>

        <div className="mt-5 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Weighted sum
          </p>
          <p className="text-sm text-slate-300 font-mono">
            ({weights.inference.toFixed(2)} × {inferenceScore.toFixed(1)}) +{' '}
            ({weights.methodAppropriateness.toFixed(2)} × {methodAppropriatenessScore.toFixed(1)}) +{' '}
            ({weights.accuracy.toFixed(2)} × {accuracyScore.toFixed(1)}) ={' '}
            <span className="text-emerald-300 font-semibold ml-1">
              {finalScore.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* THE REVEAL */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">The reveal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RevealCard
            label="True pattern"
            value={truePattern ? PATTERN_LABEL[truePattern] : '—'}
            tone="emerald"
          />
          <RevealCard
            label="Your guess"
            value={playerGuess ? PATTERN_LABEL[playerGuess] : 'Not submitted'}
            tone={inferenceVerdict.tone}
            badge={inferenceVerdict.label}
          />
        </div>

        {patternRationale && (
          <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Why this pattern
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">
              {patternRationale}
            </p>
          </div>
        )}

        <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Recommended methods for this pattern
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendedMethods.length === 0 && (
              <span className="text-sm text-slate-500">—</span>
            )}
            {recommendedMethods.map(m => (
              <span
                key={m}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  m === optimalMethod
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-800 border-slate-600 text-slate-200'
                }`}
              >
                {METHOD_LABEL[m]}
                {m === optimalMethod && ' · best'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Full demand series — revealed */}
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Demand series (full reveal)
        </p>
        <DemandHistoryChart
          historicalDemand={fullDemandData}
          warmupPeriods={state.warmupPeriods}
          totalPeriods={state.totalPeriods}
          forecasts={state.playerForecasts.map(f => ({
            period: f.period,
            forecast: f.forecast,
          }))}
        />
      </div>

      {/* Metrics over time */}
      <MetricsChart playerForecasts={state.playerForecasts} />

      {/* Per-period table */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Per-period log</h3>
        <p className="text-sm text-slate-400 mb-3">
          The "recommended?" column is now revealed — green means the method you picked
          was on the recommended list for the true pattern.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Period</th>
                <th className="px-2 py-2 text-left font-medium">Method</th>
                <th className="px-2 py-2 text-right font-medium">Forecast</th>
                <th className="px-2 py-2 text-right font-medium">Actual</th>
                <th className="px-2 py-2 text-right font-medium">Error</th>
                <th className="px-2 py-2 text-right font-medium">|Err|</th>
                <th className="px-2 py-2 text-right font-medium">% Err</th>
                <th className="px-2 py-2 text-center font-medium">Recommended?</th>
              </tr>
            </thead>
            <tbody>
              {state.playerForecasts.map(f => (
                <PeriodRow key={f.period} entry={f} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function expertise(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Forecasting Expert', color: 'text-amber-300' };
  if (score >= 70) return { label: 'Advanced Forecaster', color: 'text-emerald-300' };
  if (score >= 55) return { label: 'Proficient Forecaster', color: 'text-sky-300' };
  if (score >= 40) return { label: 'Intermediate Forecaster', color: 'text-indigo-300' };
  return { label: 'Novice Forecaster', color: 'text-slate-300' };
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

interface ComponentCardProps {
  label: string;
  tone: 'indigo' | 'emerald' | 'amber';
  raw: number;
  weight: number;
  weighted: number;
  sub: string;
}

function ComponentCard({
  label,
  tone,
  raw,
  weight,
  weighted,
  sub,
}: ComponentCardProps) {
  const color = {
    indigo: 'text-indigo-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
  }[tone];
  const bar = {
    indigo: 'from-indigo-500 to-indigo-400',
    emerald: 'from-emerald-500 to-emerald-400',
    amber: 'from-amber-500 to-amber-400',
  }[tone];
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5 flex flex-col">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>
        {raw.toFixed(1)} <span className="text-base text-slate-500">/ 100</span>
      </p>
      <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${bar}`}
          style={{ width: `${Math.max(0, Math.min(100, raw))}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-snug">{sub}</p>
      <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
        weight {(weight * 100).toFixed(0)}% ·{' '}
        <span className="text-slate-200 font-semibold">
          contributes {weighted.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

type RevealTone = 'emerald' | 'correct' | 'close' | 'wrong';

interface RevealCardProps {
  label: string;
  value: string;
  tone: RevealTone;
  badge?: string;
}

function RevealCard({ label, value, tone, badge }: RevealCardProps) {
  const ring: Record<RevealTone, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-500/10',
    correct: 'border-emerald-500/40 bg-emerald-500/10',
    close: 'border-amber-500/40 bg-amber-500/10',
    wrong: 'border-red-500/40 bg-red-500/10',
  };
  const badgeColor: Record<RevealTone, string> = {
    emerald: 'text-emerald-300',
    correct: 'text-emerald-300',
    close: 'text-amber-300',
    wrong: 'text-red-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${ring[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {badge && (
        <p className={`text-xs font-semibold mt-1 ${badgeColor[tone]}`}>{badge}</p>
      )}
    </div>
  );
}

function PeriodRow({ entry }: { entry: ForecastHistoryEntry }) {
  const errColor = entry.error >= 0 ? 'text-sky-300' : 'text-amber-300';
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="px-2 py-2 text-slate-300 font-mono">P{entry.period + 1}</td>
      <td className="px-2 py-2">
        <span className="text-slate-200 font-medium">
          {METHOD_LABEL[entry.method]}
        </span>
        <p className="text-xs text-slate-500 font-mono">
          {formatParams(entry.params as Record<string, unknown>)}
        </p>
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-200">
        {entry.forecast.toFixed(2)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-200">
        {entry.actual.toFixed(0)}
      </td>
      <td className={`px-2 py-2 text-right font-mono ${errColor}`}>
        {entry.error >= 0 ? '+' : ''}
        {entry.error.toFixed(2)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-300">
        {entry.absoluteError.toFixed(2)}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">
        {entry.percentageError === null
          ? '—'
          : `${entry.percentageError.toFixed(1)}%`}
      </td>
      <td className="px-2 py-2 text-center">
        {entry.usedRecommendedMethod ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
        ) : (
          <XCircle className="w-4 h-4 text-slate-500 inline" />
        )}
      </td>
    </tr>
  );
}
