import { useState } from 'react';
import { ArrowUpRight, Loader2, Scale } from 'lucide-react';

interface Attribute {
  id: string;
  name: string;
}

interface Props {
  attributes: Attribute[];
  currentWeights: { [key: string]: number };
  onSubmit: (weights: { [key: string]: number }) => void;
  actionLoading: boolean;
}

export function AttributeWeighting({ attributes, currentWeights, onSubmit, actionLoading }: Props) {
  const [weights, setWeights] = useState<{ [key: string]: number }>(() => {
    const seeded = Object.keys(currentWeights);
    if (seeded.length > 0) {
      return seeded.reduce((acc, key) => {
        acc[key] = Math.round((currentWeights[key] || 0) * 100);
        return acc;
      }, {} as { [key: string]: number });
    }
    const equal = Math.round(100 / attributes.length);
    return attributes.reduce((acc, attr, idx) => {
      acc[attr.id] = idx === attributes.length - 1 ? 100 - equal * (attributes.length - 1) : equal;
      return acc;
    }, {} as { [key: string]: number });
  });

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isValid = Math.abs(totalWeight - 100) <= 1;

  const handleWeightChange = (id: string, value: number) => {
    setWeights(prev => ({ ...prev, [id]: Math.max(0, Math.min(100, value)) }));
  };

  const handleSubmit = () => {
    const decimal = Object.entries(weights).reduce((acc, [key, value]) => {
      acc[key] = value / 100;
      return acc;
    }, {} as { [key: string]: number });
    onSubmit(decimal);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <Scale className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-200 font-semibold">Stage 2 — Weight the evaluation criteria</p>
          <p className="text-sm text-slate-400 mt-1">
            Distribute 100% across the criteria below. The weights will define how candidates are
            scored in the next stage. The optimal distribution is hidden — your job is to elicit
            it from the experts you consulted.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {attributes.map(attr => (
          <div key={attr.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white font-medium">{attr.name}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[attr.id] ?? 0}
                  onChange={e => handleWeightChange(attr.id, parseInt(e.target.value, 10) || 0)}
                  className="w-20 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-slate-400 w-6">%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[attr.id] ?? 0}
              onChange={e => handleWeightChange(attr.id, parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        ))}
      </div>

      <div
        className={`rounded-xl p-4 flex items-center justify-between ${
          isValid
            ? 'bg-emerald-500/10 border border-emerald-500/40'
            : 'bg-red-500/10 border border-red-500/40'
        }`}
      >
        <p className="font-medium text-slate-200">Total weight</p>
        <p className={`text-2xl font-bold ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalWeight}%
        </p>
      </div>

      {!isValid && (
        <p className="text-red-400 text-center text-sm">
          Weights must sum to 100%. Current total: {totalWeight}%.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={actionLoading || !isValid}
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
            Confirm attribute weights
          </>
        )}
      </button>
    </div>
  );
}
