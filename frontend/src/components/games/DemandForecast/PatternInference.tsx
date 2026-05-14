import { useState } from 'react';
import { ArrowRight, Brain, Loader2, TrendingUp, Activity, Waves, Sparkles } from 'lucide-react';
import { DemandPattern, PATTERN_OPTIONS } from './types';

interface Props {
  /** Engine's `patternOptions` from publicState — the four canonical patterns. */
  options: readonly DemandPattern[];
  submitting: boolean;
  onSubmit: (guess: DemandPattern) => void;
}

interface PatternUI {
  id: DemandPattern;
  label: string;
  blurb: string;
  Icon: typeof Brain;
}

/**
 * Phase-1 of the simulation: classify the warmup demand series as one of the
 * four canonical OM-forecasting patterns. The player submits a single guess.
 * The engine records it, advances to the forecasting phase, and hides both
 * the true pattern and the inference score until isComplete (Pattern A).
 *
 * The card descriptions DESCRIBE each pattern type generically. They do
 * NOT analyse the visible data or suggest which one fits — that would
 * short-circuit the cognitive task.
 */
const PATTERN_UI: Record<DemandPattern, Omit<PatternUI, 'id'>> = {
  stationary: {
    label: 'Stationary',
    blurb:
      'Demand fluctuates around a roughly constant mean. No trend up or down, no repeating cycle.',
    Icon: Activity,
  },
  trending: {
    label: 'Trending',
    blurb:
      'Demand drifts in one direction over time — a consistent rise or fall on top of period-to-period noise.',
    Icon: TrendingUp,
  },
  seasonal: {
    label: 'Seasonal',
    blurb:
      'Demand rises and falls in a repeating cycle of fixed length (e.g., quarterly peaks and troughs).',
    Icon: Waves,
  },
  random: {
    label: 'Random',
    blurb:
      'Pure noise around a level — no detectable trend, no repeating cycle. Large period-to-period swings.',
    Icon: Sparkles,
  },
};

export function PatternInference({ options, submitting, onSubmit }: Props) {
  const [selected, setSelected] = useState<DemandPattern | null>(null);

  // Use the engine-supplied option set when present; fall back to canonical
  // order. We DO NOT rearrange options by likelihood — that would hint.
  const ordered = options.length > 0 ? options : PATTERN_OPTIONS;

  const handleSubmit = () => {
    if (!selected) return;
    onSubmit(selected);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <Brain className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-200 font-semibold">Step 1 — Read the demand history</p>
          <p className="text-sm text-slate-400 mt-1">
            Study the warmup series above. Which of the four canonical demand patterns best
            describes its shape? Your guess is recorded once. The forecasting phase opens after
            you submit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ordered.map(p => {
          const meta = PATTERN_UI[p];
          const isSelected = selected === p;
          const Icon = meta.Icon;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelected(p)}
              className={`text-left rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  className={`w-5 h-5 ${
                    isSelected ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                />
                <p
                  className={`font-semibold ${
                    isSelected ? 'text-emerald-200' : 'text-white'
                  }`}
                >
                  {meta.label}
                </p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{meta.blurb}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <ArrowRight className="w-5 h-5" />
            Submit pattern guess
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        Your inference score is hidden until the simulation ends.
      </p>
    </div>
  );
}
