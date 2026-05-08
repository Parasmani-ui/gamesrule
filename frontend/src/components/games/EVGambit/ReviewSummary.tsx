import { ArrowRight, ClipboardCheck } from 'lucide-react';

interface DecisionSummary {
  id: string;
  name: string;
  category: string;
  cost: number;
}

interface Props {
  decision: DecisionSummary;
  rationale: string;
  alternatives: string;
  onContinue: () => void;
  onBack: () => void;
  submitting: boolean;
}

const formatCost = (cost: number): string => {
  if (cost === 0) return 'No upfront cost';
  if (cost < 0) return `+₹${(Math.abs(cost) / 10000000).toFixed(2)} cr (cash inflow)`;
  return `₹${(cost / 10000000).toFixed(2)} cr`;
};

export function ReviewSummary({
  decision,
  rationale,
  alternatives,
  onContinue,
  onBack,
  submitting,
}: Props) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7 space-y-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex-shrink-0">
          <ClipboardCheck className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Review your submission</p>
          <h3 className="text-xl font-bold text-white mt-0.5">Confirm and proceed to the quiz</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Decision</p>
          <p className="text-slate-100 font-semibold mt-1">{decision.name}</p>
          <p className="text-xs text-slate-400 mt-1">{decision.category}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Cost to firm</p>
          <p className="text-amber-300 font-semibold mt-1">{formatCost(decision.cost)}</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Your rationale</p>
        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{rationale}</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Alternative considered</p>
        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{alternatives}</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
        >
          ← Edit reflection
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit & start quiz'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
