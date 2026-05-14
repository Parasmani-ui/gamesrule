import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';
import { CanonicalMethod } from './types';

interface Props {
  selectedMethod: CanonicalMethod | null;
}

/**
 * Plain-language description of the six methods. GENERIC ONLY — describes what
 * each method does. NEVER references the visible series, never recommends a
 * method for the current data. Doing either would leak the pattern (Pattern A).
 *
 * Each line is a single paragraph the player can scan before committing
 * parameters.
 */
const HELP_LINES: Record<CanonicalMethod, string> = {
  naive:
    'Forecasts the next period as equal to the most recent observation. Zero parameters. The pedagogical baseline — useful as a no-effort benchmark.',
  'moving-average':
    'Averages the last n observations to forecast the next period. Smooths out short-term noise; lags behind any sustained drift in the data.',
  'weighted-moving-average':
    'Like Moving Average, but you assign explicit weights (summing to 1) to recent periods. Lets you emphasise the most recent observations or, with careful timing, recurring cycles.',
  'exponential-smoothing':
    'Recursive weighted average with a single smoothing constant α. Larger α (close to 1) tracks recent changes quickly; smaller α produces a smoother, slower-reacting forecast.',
  'holts-double-es':
    "Holt's method runs two smoothing recursions — α for the level, β for the trend. It explicitly models a linear-trend component the single-α version cannot.",
  'linear-regression':
    'Fits a least-squares straight line through all observed periods and extrapolates one step ahead. Best when the underlying signal is a clean line; sensitive to noise late in the series.',
};

export function MethodHelpText({ selectedMethod }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!selectedMethod) {
    return (
      <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
        <p>Pick a method above to see a one-line explanation of how it works.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
        <div className="text-sm text-slate-300 leading-relaxed">
          {HELP_LINES[selectedMethod]}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Hide other methods
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show all six methods
          </>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-slate-700/70">
          {Object.entries(HELP_LINES).map(([id, text]) => (
            <div key={id} className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{labelFor(id as CanonicalMethod)}:</span>{' '}
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelFor(id: CanonicalMethod): string {
  switch (id) {
    case 'naive':
      return 'Naive';
    case 'moving-average':
      return 'Moving Average';
    case 'weighted-moving-average':
      return 'Weighted Moving Average';
    case 'exponential-smoothing':
      return 'Exponential Smoothing';
    case 'holts-double-es':
      return "Holt's Double ES";
    case 'linear-regression':
      return 'Linear Regression';
  }
}
