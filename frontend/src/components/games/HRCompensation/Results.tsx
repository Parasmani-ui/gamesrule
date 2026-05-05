import { Award, CheckCircle, Trophy } from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface Expert {
  id: string;
  name: string;
}

interface Attribute {
  id: string;
  name: string;
}

interface Candidate {
  id: string;
  name: string;
}

interface OptimalValues {
  expertCredibilities?: { id: string; credibility: number }[];
  optimalWeights?: { id: string; optimalWeight: number }[];
  optimalRanking?: string[];
}

interface Scores {
  expertSelectionScore: number;
  attributeWeightScore: number;
  rankingMatchScore: number;
  totalScore: number;
}

interface Props {
  finalCompensation: number;
  baseSalary: number;
  scores: Scores;
  experts: Expert[];
  attributes: Attribute[];
  candidates: Candidate[];
  selectedExperts: string[];
  attributeWeights: { [key: string]: number };
  candidateRanking: string[];
  optimalValues?: OptimalValues;
  expertiseLevel?: string;
}

const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const expertiseColor = (level?: string) => {
  if (!level) return 'text-slate-300';
  if (level.startsWith('Expert')) return 'text-amber-300';
  if (level.startsWith('Advanced')) return 'text-emerald-300';
  if (level.startsWith('Proficient')) return 'text-sky-300';
  if (level.startsWith('Intermediate')) return 'text-indigo-300';
  return 'text-slate-300';
};

export function Results({
  finalCompensation,
  baseSalary,
  scores,
  experts,
  attributes,
  candidates,
  selectedExperts,
  attributeWeights,
  candidateRanking,
  optimalValues,
  expertiseLevel,
}: Props) {
  const maxFinal = baseSalary + 450000;
  const percentageOfMax = maxFinal ? (finalCompensation / maxFinal) * 100 : 0;

  const radarData = attributes.map(attr => {
    const optimal = optimalValues?.optimalWeights?.find(w => w.id === attr.id)?.optimalWeight ?? 0;
    return {
      attribute: attr.name,
      yours: Math.round((attributeWeights[attr.id] || 0) * 100),
      optimal: Math.round(optimal * 100),
    };
  });

  const expertById = (id: string) => experts.find(e => e.id === id)?.name ?? id;
  const candidateById = (id: string) => candidates.find(c => c.id === id)?.name ?? id;

  const optimalRanking = optimalValues?.optimalRanking ?? [];

  const breakdown = [
    {
      label: 'Expert selection',
      value: scores.expertSelectionScore,
      max: 50000,
      accent: 'text-sky-300',
    },
    {
      label: 'Attribute weighting',
      value: scores.attributeWeightScore,
      max: 100000,
      accent: 'text-emerald-300',
    },
    {
      label: 'Candidate ranking',
      value: scores.rankingMatchScore,
      max: 300000,
      accent: 'text-amber-300',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-5">
          <Trophy className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Final compensation</p>
        <p className="text-5xl font-bold text-emerald-400 mt-2">{formatINR(finalCompensation)}</p>
        <p className="text-sm text-slate-400 mt-2">
          {percentageOfMax.toFixed(1)}% of maximum possible ({formatINR(maxFinal)})
        </p>
        {expertiseLevel && (
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700">
            <Award className={`w-5 h-5 ${expertiseColor(expertiseLevel)}`} />
            <span className={`font-semibold ${expertiseColor(expertiseLevel)}`}>
              {expertiseLevel}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {breakdown.map(item => {
          const pct = item.max ? (item.value / item.max) * 100 : 0;
          return (
            <div
              key={item.label}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-5"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.accent}`}>{formatINR(item.value)}</p>
              <p className="text-xs text-slate-500 mt-1">
                of {formatINR(item.max)} ({pct.toFixed(0)}%)
              </p>
              <div className="h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {radarData.length > 0 && optimalValues?.optimalWeights && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Your weights vs the optimal distribution
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="attribute" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'auto']}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Radar
                  name="Yours"
                  dataKey="yours"
                  stroke="#34d399"
                  fill="#34d399"
                  fillOpacity={0.35}
                />
                <Radar
                  name="Optimal"
                  dataKey="optimal"
                  stroke="#fbbf24"
                  fill="#fbbf24"
                  fillOpacity={0.2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-2 text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400" /> Your weights
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> Optimal weights
            </span>
          </div>
        </div>
      )}

      {optimalValues && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {optimalValues.expertCredibilities && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400 mb-3">Expert credibilities</p>
              <ul className="space-y-2 text-sm">
                {optimalValues.expertCredibilities.map(exp => {
                  const wasSelected = selectedExperts.includes(exp.id);
                  return (
                    <li
                      key={exp.id}
                      className="flex items-center justify-between bg-slate-900/60 rounded p-2"
                    >
                      <span className="text-slate-200">
                        {expertById(exp.id)}
                        {wasSelected && (
                          <CheckCircle className="inline w-4 h-4 text-emerald-400 ml-1.5" />
                        )}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {(exp.credibility * 100).toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {optimalValues.optimalWeights && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400 mb-3">Optimal vs your weights</p>
              <ul className="space-y-2 text-sm">
                {optimalValues.optimalWeights.map(w => {
                  const yours = (attributeWeights[w.id] || 0) * 100;
                  const optimal = w.optimalWeight * 100;
                  const delta = yours - optimal;
                  return (
                    <li
                      key={w.id}
                      className="flex items-center justify-between bg-slate-900/60 rounded p-2"
                    >
                      <span className="text-slate-200">
                        {attributes.find(a => a.id === w.id)?.name ?? w.id}
                      </span>
                      <span className="text-slate-300">
                        <span className="text-emerald-400 font-semibold">{yours.toFixed(0)}%</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-amber-400 font-semibold">{optimal.toFixed(0)}%</span>
                        <span
                          className={`ml-2 text-xs ${
                            Math.abs(delta) <= 5
                              ? 'text-emerald-300'
                              : Math.abs(delta) <= 15
                              ? 'text-amber-300'
                              : 'text-red-300'
                          }`}
                        >
                          ({delta >= 0 ? '+' : ''}
                          {delta.toFixed(0)})
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {optimalRanking.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <p className="text-sm text-slate-400 mb-3">Optimal vs your ranking</p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Optimal</p>
                  <p className="text-amber-300">
                    {optimalRanking.map(candidateById).join(' → ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Yours</p>
                  <p className="text-emerald-300">
                    {candidateRanking.map(candidateById).join(' → ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
