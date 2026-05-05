import { useState } from 'react';
import { ArrowUpRight, CheckCircle, Loader2, Users } from 'lucide-react';

interface Expert {
  id: string;
  name: string;
  specialty: string;
  cost: number;
}

interface Props {
  experts: Expert[];
  selectedExperts: string[];
  onSubmit: (expertIds: string[]) => void;
  actionLoading: boolean;
}

const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export function ExpertSelection({ experts, selectedExperts, onSubmit, actionLoading }: Props) {
  const [selected, setSelected] = useState<string[]>(selectedExperts);

  const toggleExpert = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]));
  };

  const totalCost = experts.filter(e => selected.includes(e.id)).reduce((sum, e) => sum + e.cost, 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <Users className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-200 font-semibold">Stage 1 — Choose your advisory panel</p>
          <p className="text-sm text-slate-400 mt-1">
            Each expert offers a different lens on compensation. Higher-credibility advisors
            improve the score the engine awards to your subsequent decisions, but they cost more
            to consult.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experts.map(expert => {
          const isSelected = selected.includes(expert.id);
          return (
            <button
              key={expert.id}
              type="button"
              onClick={() => toggleExpert(expert.id)}
              className={`text-left rounded-xl p-5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{expert.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{expert.specialty}</p>
                  <p className="text-sm text-amber-400 mt-3">Consultation cost: {formatINR(expert.cost)}</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-500'
                  }`}
                >
                  {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Selected experts</p>
          <p className="text-xl font-bold text-white">
            {selected.length} / {experts.length}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Total consultation cost</p>
          <p className="text-xl font-bold text-amber-400">{formatINR(totalCost)}</p>
        </div>
      </div>

      <button
        onClick={() => onSubmit(selected)}
        disabled={actionLoading || selected.length === 0}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {actionLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <ArrowUpRight className="w-5 h-5" />
            Confirm expert selection
          </>
        )}
      </button>
    </div>
  );
}
