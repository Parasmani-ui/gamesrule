import { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle, ListOrdered, Loader2 } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  scores: { [key: string]: number };
}

interface Attribute {
  id: string;
  name: string;
}

interface Props {
  candidates: Candidate[];
  attributes: Attribute[];
  weights: { [key: string]: number };
  currentRanking: string[];
  onSubmit: (ranking: string[]) => void;
  actionLoading: boolean;
}

export function CandidateRanking({
  candidates,
  attributes,
  weights,
  currentRanking,
  onSubmit,
  actionLoading,
}: Props) {
  const [ranking, setRanking] = useState<string[]>(() =>
    currentRanking.length > 0 ? currentRanking : candidates.map(c => c.id)
  );

  const calculateWeightedScore = (candidate: Candidate) => {
    let total = 0;
    for (const [attrId, weight] of Object.entries(weights)) {
      total += (candidate.scores[attrId] || 0) * weight;
    }
    return total;
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= ranking.length) return;
    const next = [...ranking];
    [next[index], next[target]] = [next[target], next[index]];
    setRanking(next);
  };

  const rankedCandidates = ranking
    .map(id => candidates.find(c => c.id === id))
    .filter((c): c is Candidate => Boolean(c));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <ListOrdered className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-200 font-semibold">Stage 3 — Rank the candidates</p>
          <p className="text-sm text-slate-400 mt-1">
            Place candidates from best fit (1) to worst fit ({candidates.length}). Use the arrows
            to reorder. Weighted scores update live based on your Stage 2 weights, but the optimal
            ranking is determined by the engine — your judgement still matters.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p className="text-sm text-slate-400 mb-3">Your attribute weights</p>
        <div className="flex flex-wrap gap-2">
          {attributes.map(attr => (
            <span
              key={attr.id}
              className="px-3 py-1 bg-slate-700/70 rounded-full text-sm text-slate-200"
            >
              {attr.name}:{' '}
              <span className="text-emerald-400 font-semibold">
                {((weights[attr.id] || 0) * 100).toFixed(0)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rankedCandidates.map((candidate, index) => (
          <div
            key={candidate.id}
            className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${candidate.name} up`}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-5 h-5 text-slate-200" />
              </button>
              <span className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white font-bold rounded-full">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === ranking.length - 1}
                aria-label={`Move ${candidate.name} down`}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-5 h-5 text-slate-200" />
              </button>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {attributes.map(attr => (
                  <span
                    key={attr.id}
                    className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300"
                  >
                    {attr.name}:{' '}
                    <span className="text-sky-400 font-semibold">{candidate.scores[attr.id]}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-400">Weighted score</p>
              <p className="text-xl font-bold text-emerald-400">
                {calculateWeightedScore(candidate).toFixed(1)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSubmit(ranking)}
        disabled={actionLoading}
        className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {actionLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Submit final ranking
          </>
        )}
      </button>
    </div>
  );
}
