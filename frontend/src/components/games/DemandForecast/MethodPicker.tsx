import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';
import {
  CanonicalMethod,
  ForecastAction,
  MethodMetadata,
  MethodParams,
} from './types';
import { MethodHelpText } from './MethodHelpText';

interface Props {
  /** All six methods, broadcast from publicState.availableMethods. */
  availableMethods: MethodMetadata[];
  /** Length of the visible history slice — used to validate n / weights[]. */
  historyLength: number;
  /** Forecast period the engine will be expecting (1-indexed for display). */
  nextPeriod: number;
  totalPeriods: number;
  submitting: boolean;
  onSubmit: (action: ForecastAction) => void;
}

interface ParamState {
  // moving-average
  n: number;
  // weighted-moving-average
  weights: number[];
  // exponential-smoothing + holts
  alpha: number;
  // holts
  beta: number;
}

const DEFAULT_PARAMS: ParamState = {
  n: 3,
  weights: [0.5, 0.3, 0.2],
  alpha: 0.3,
  beta: 0.1,
};

/**
 * Per-period method-and-parameter picker. The dropdown lists all six methods;
 * the parameter form below adapts to the selected method.
 *
 * Critical pedagogy guarantee: this component does NOT compute or send a
 * forecast number. It sends `{ method, params }` only — the engine computes
 * the forecast. If you find yourself writing forecast math here, stop —
 * that was the broken architecture the audit killed.
 */
export function MethodPicker({
  availableMethods,
  historyLength,
  nextPeriod,
  totalPeriods,
  submitting,
  onSubmit,
}: Props) {
  const [selectedId, setSelectedId] = useState<CanonicalMethod | ''>('');
  const [params, setParams] = useState<ParamState>(DEFAULT_PARAMS);

  const selectedMethod = useMemo(
    () => availableMethods.find(m => m.id === selectedId) ?? null,
    [availableMethods, selectedId]
  );

  // Reset params to sensible defaults when the user switches method, so a
  // weights array left over from a previous WMA submission doesn't bleed into
  // a Holt's submission.
  useEffect(() => {
    setParams(DEFAULT_PARAMS);
  }, [selectedId]);

  // ---- validation: mirrors engine's validateMethodParams contract ---------
  const validation = useMemo(() => {
    if (!selectedMethod) return { ok: false as const, message: 'Pick a method first.' };
    const schema = selectedMethod.params;

    if (selectedMethod.id === 'naive' || selectedMethod.id === 'linear-regression') {
      if (selectedMethod.id === 'linear-regression' && historyLength < 2) {
        return { ok: false as const, message: 'Linear Regression needs at least 2 prior observations.' };
      }
      if (selectedMethod.id === 'naive' && historyLength < 1) {
        return { ok: false as const, message: 'Naive forecast needs at least 1 prior observation.' };
      }
      return { ok: true as const };
    }

    if (selectedMethod.id === 'moving-average') {
      const s = schema.n;
      const v = params.n;
      if (!Number.isInteger(v)) return { ok: false as const, message: 'n must be an integer.' };
      if (s?.min !== undefined && v < s.min) {
        return { ok: false as const, message: `n must be ≥ ${s.min}.` };
      }
      if (s?.max !== undefined && v > s.max) {
        return { ok: false as const, message: `n must be ≤ ${s.max}.` };
      }
      if (v > historyLength) {
        return {
          ok: false as const,
          message: `n=${v} exceeds available history (${historyLength}).`,
        };
      }
      return { ok: true as const };
    }

    if (selectedMethod.id === 'exponential-smoothing') {
      const s = schema.alpha;
      const v = params.alpha;
      if (!Number.isFinite(v)) return { ok: false as const, message: 'α must be a number.' };
      if (s?.min !== undefined && v < s.min) {
        return { ok: false as const, message: `α must be ≥ ${s.min}.` };
      }
      if (s?.max !== undefined && v > s.max) {
        return { ok: false as const, message: `α must be ≤ ${s.max}.` };
      }
      return { ok: true as const };
    }

    if (selectedMethod.id === 'holts-double-es') {
      const sA = schema.alpha;
      const sB = schema.beta;
      const a = params.alpha;
      const b = params.beta;
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return { ok: false as const, message: 'α and β must be numbers.' };
      }
      if (sA?.min !== undefined && a < sA.min) {
        return { ok: false as const, message: `α must be ≥ ${sA.min}.` };
      }
      if (sA?.max !== undefined && a > sA.max) {
        return { ok: false as const, message: `α must be ≤ ${sA.max}.` };
      }
      if (sB?.min !== undefined && b < sB.min) {
        return { ok: false as const, message: `β must be ≥ ${sB.min}.` };
      }
      if (sB?.max !== undefined && b > sB.max) {
        return { ok: false as const, message: `β must be ≤ ${sB.max}.` };
      }
      if (historyLength < 2) {
        return { ok: false as const, message: "Holt's needs at least 2 prior observations." };
      }
      return { ok: true as const };
    }

    if (selectedMethod.id === 'weighted-moving-average') {
      const s = schema.weights;
      const w = params.weights;
      if (!Array.isArray(w) || w.length === 0) {
        return { ok: false as const, message: 'Provide at least 2 weights.' };
      }
      if (s?.minLength !== undefined && w.length < s.minLength) {
        return { ok: false as const, message: `At least ${s.minLength} weights required.` };
      }
      if (s?.maxLength !== undefined && w.length > s.maxLength) {
        return { ok: false as const, message: `At most ${s.maxLength} weights allowed.` };
      }
      if (w.length > historyLength) {
        return {
          ok: false as const,
          message: `Weights length (${w.length}) exceeds available history (${historyLength}).`,
        };
      }
      if (w.some(x => !Number.isFinite(x))) {
        return { ok: false as const, message: 'All weights must be finite numbers.' };
      }
      if (s?.sumTo !== undefined) {
        const sum = w.reduce((acc, x) => acc + x, 0);
        const tol = s.sumTolerance ?? 0.001;
        if (Math.abs(sum - s.sumTo) > tol) {
          return {
            ok: false as const,
            message: `Weights must sum to ${s.sumTo} (±${tol}). Current sum: ${sum.toFixed(4)}.`,
          };
        }
      }
      return { ok: true as const };
    }

    return { ok: false as const, message: 'Unknown method.' };
  }, [selectedMethod, params, historyLength]);

  const handleSubmit = () => {
    if (!selectedMethod || !validation.ok) return;

    let payloadParams: MethodParams = {};
    switch (selectedMethod.id) {
      case 'naive':
      case 'linear-regression':
        payloadParams = {};
        break;
      case 'moving-average':
        payloadParams = { n: params.n };
        break;
      case 'exponential-smoothing':
        payloadParams = { alpha: params.alpha };
        break;
      case 'holts-double-es':
        payloadParams = { alpha: params.alpha, beta: params.beta };
        break;
      case 'weighted-moving-average':
        payloadParams = { weights: params.weights };
        break;
    }

    onSubmit({ method: selectedMethod.id, params: payloadParams });
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
        <p className="text-slate-200 font-semibold">
          Forecast period {nextPeriod} of {totalPeriods}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Pick a forecasting method and set its parameters. The engine computes the forecast
          for you — you never type a number.
        </p>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Forecasting method</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value as CanonicalMethod | '')}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Select a method —</option>
            {availableMethods.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {selectedMethod && (
            <p className="text-xs text-slate-500 mt-2 font-mono">{selectedMethod.formula}</p>
          )}
        </div>

        <MethodHelpText selectedMethod={selectedMethod?.id ?? null} />

        {selectedMethod && (
          <div className="space-y-3 pt-2 border-t border-slate-700/60">
            <p className="text-xs uppercase tracking-wide text-slate-400">Parameters</p>
            <ParamForm
              methodId={selectedMethod.id}
              schema={selectedMethod.params}
              params={params}
              historyLength={historyLength}
              onChange={setParams}
            />
          </div>
        )}

        {selectedMethod && !validation.ok && (
          <p className="text-sm text-red-400">{validation.message}</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedMethod || !validation.ok || submitting}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit forecast for period {nextPeriod}
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// PARAM FORM — switches on method id.
// =============================================================================

interface ParamFormProps {
  methodId: CanonicalMethod;
  schema: Record<string, { type: string; min?: number; max?: number; minLength?: number; maxLength?: number; sumTo?: number; sumTolerance?: number; description?: string }>;
  params: ParamState;
  historyLength: number;
  onChange: (next: ParamState) => void;
}

function ParamForm({ methodId, schema, params, historyLength, onChange }: ParamFormProps) {
  switch (methodId) {
    case 'naive':
    case 'linear-regression':
      return (
        <p className="text-sm text-slate-400 italic">
          No parameters needed — this method runs straight off the observed series.
        </p>
      );

    case 'moving-average':
      return (
        <IntegerInput
          label="n (window size)"
          min={schema.n?.min ?? 2}
          max={Math.min(schema.n?.max ?? 10, historyLength)}
          value={params.n}
          onChange={n => onChange({ ...params, n })}
          hint={`Choose between ${schema.n?.min ?? 2} and ${Math.min(schema.n?.max ?? 10, historyLength)} (capped by available history of ${historyLength}).`}
        />
      );

    case 'exponential-smoothing':
      return (
        <NumberSlider
          label="α (smoothing constant)"
          min={schema.alpha?.min ?? 0}
          max={schema.alpha?.max ?? 1}
          step={0.05}
          value={params.alpha}
          onChange={alpha => onChange({ ...params, alpha })}
        />
      );

    case 'holts-double-es':
      return (
        <div className="space-y-4">
          <NumberSlider
            label="α (level smoothing)"
            min={schema.alpha?.min ?? 0}
            max={schema.alpha?.max ?? 1}
            step={0.05}
            value={params.alpha}
            onChange={alpha => onChange({ ...params, alpha })}
          />
          <NumberSlider
            label="β (trend smoothing)"
            min={schema.beta?.min ?? 0}
            max={schema.beta?.max ?? 1}
            step={0.05}
            value={params.beta}
            onChange={beta => onChange({ ...params, beta })}
          />
        </div>
      );

    case 'weighted-moving-average': {
      const minLen = schema.weights?.minLength ?? 2;
      const maxLen = Math.min(schema.weights?.maxLength ?? 10, historyLength);
      const sumTo = schema.weights?.sumTo ?? 1;
      const tol = schema.weights?.sumTolerance ?? 0.001;
      const sum = params.weights.reduce((acc, x) => acc + x, 0);
      const sumOk = Math.abs(sum - sumTo) <= tol;
      return (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            weights[0] applies to the most-recent observation. Must sum to {sumTo} (±{tol}).
          </p>
          <div className="space-y-2">
            {params.weights.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20 font-mono">
                  weights[{idx}]
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={w}
                  onChange={e => {
                    const next = [...params.weights];
                    const parsed = parseFloat(e.target.value);
                    next[idx] = Number.isFinite(parsed) ? parsed : 0;
                    onChange({ ...params, weights: next });
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {params.weights.length > minLen && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = params.weights.filter((_, i) => i !== idx);
                      onChange({ ...params, weights: next });
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    aria-label={`Remove weight ${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {params.weights.length < maxLen && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...params,
                    weights: [...params.weights, 0],
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add weight
              </button>
            )}
            <span
              className={`text-xs font-mono px-2 py-1 rounded ${
                sumOk
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-red-500/10 text-red-300'
              }`}
            >
              Σ = {sum.toFixed(4)}
            </span>
          </div>
        </div>
      );
    }
  }
}

// =============================================================================
// Small primitive inputs.
// =============================================================================

interface IntegerInputProps {
  label: string;
  min: number;
  max: number;
  value: number;
  hint?: string;
  onChange: (v: number) => void;
}

function IntegerInput({ label, min, max, value, hint, onChange }: IntegerInputProps) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1.5">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={e => {
          const parsed = parseInt(e.target.value, 10);
          onChange(Number.isFinite(parsed) ? parsed : min);
        }}
        className="w-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

interface NumberSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

function NumberSlider({ label, min, max, step, value, onChange }: NumberSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-slate-300">{label}</label>
        <span className="text-sm font-mono text-emerald-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
