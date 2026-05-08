import { useState } from 'react';
import { ArrowRight, CheckCircle2, IndianRupee } from 'lucide-react';

interface DecisionOption {
  id: string;
  type: string;
  name: string;
  cost: number;
}

interface DecisionCategory {
  category: string;
  decisions: DecisionOption[];
}

interface Props {
  categories: DecisionCategory[];
  cash: number;
  round: number;
  onSelect: (decisionId: string) => void;
  onBack: () => void;
}

const formatCost = (cost: number): string => {
  if (cost === 0) return 'No upfront cost';
  if (cost < 0) return `+₹${(Math.abs(cost) / 10000000).toFixed(2)} cr`;
  return `₹${(cost / 10000000).toFixed(2)} cr`;
};

export function DecisionPanel({ categories, cash, round, onSelect, onBack }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allDecisions = categories.flatMap(c => c.decisions.map(d => ({ ...d, category: c.category })));
  const selected = selectedId ? allDecisions.find(d => d.id === selectedId) : null;
  const insufficient = selected && selected.cost > 0 && cash < selected.cost;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Round {round} · Choose your move
            </p>
            <h3 className="text-xl font-bold text-white mt-1">
              Pick one strategic decision
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Available cash</p>
            <p className="text-2xl font-bold text-emerald-300">
              ₹{(cash / 10000000).toFixed(2)} cr
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {categories.map(cat => (
          <div key={cat.category} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-emerald-300 font-semibold mb-3">
              {cat.category}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.decisions.map(d => {
                const isSelected = selectedId === d.id;
                const cantAfford = d.cost > 0 && cash < d.cost;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    disabled={cantAfford}
                    className={`text-left rounded-xl p-4 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : cantAfford
                        ? 'border-slate-800 bg-slate-900/40 opacity-50 cursor-not-allowed'
                        : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-slate-100 font-semibold leading-snug">{d.name}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-300">
                          <IndianRupee className="w-3 h-3" />
                          <span>{formatCost(d.cost)}</span>
                        </div>
                        {cantAfford && (
                          <p className="text-xs text-red-300 mt-1">Insufficient cash</p>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Re-read event briefing
        </button>
        <button
          type="button"
          onClick={() => selectedId && !insufficient && onSelect(selectedId)}
          disabled={!selectedId || Boolean(insufficient)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          {selected ? `Continue with: ${selected.name.slice(0, 32)}${selected.name.length > 32 ? '…' : ''}` : 'Pick a decision'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
