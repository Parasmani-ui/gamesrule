import { useState } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';

interface DecisionSummary {
  id: string;
  name: string;
  category: string;
}

interface Props {
  decision: DecisionSummary;
  onSubmit: (rationale: string, alternatives: string) => void;
  onBack: () => void;
}

export function Reflection({ decision, onSubmit, onBack }: Props) {
  const [rationale, setRationale] = useState('');
  const [alternatives, setAlternatives] = useState('');

  const canSubmit = rationale.trim().length >= 10 && alternatives.trim().length >= 5;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7 space-y-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/15 border border-sky-500/40 flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-sky-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reflection</p>
          <h3 className="text-xl font-bold text-white mt-0.5">Explain your reasoning</h3>
          <p className="text-sm text-slate-400 mt-1">
            You picked <span className="text-emerald-300 font-semibold">{decision.name}</span>{' '}
            from <span className="text-slate-300">{decision.category}</span>.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="evgambit-rationale" className="block text-sm font-medium text-slate-200">
          Why did you make this choice?
        </label>
        <textarea
          id="evgambit-rationale"
          value={rationale}
          onChange={e => setRationale(e.target.value)}
          rows={4}
          placeholder="Connect your decision to the active force, your firm's position, and the strategic time horizon."
          className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        />
        <p className="text-xs text-slate-500">{rationale.trim().length} characters · minimum 10</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="evgambit-alternatives" className="block text-sm font-medium text-slate-200">
          What alternative did you consider, and why did you reject it?
        </label>
        <textarea
          id="evgambit-alternatives"
          value={alternatives}
          onChange={e => setAlternatives(e.target.value)}
          rows={3}
          placeholder="Naming the second-best option you considered helps anchor the trade-off in the debrief."
          className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        />
        <p className="text-xs text-slate-500">{alternatives.trim().length} characters · minimum 5</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Pick a different decision
        </button>
        <button
          type="button"
          onClick={() => canSubmit && onSubmit(rationale.trim(), alternatives.trim())}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          Continue to review
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
