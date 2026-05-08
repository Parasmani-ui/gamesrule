import { Award, Trophy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DecisionRecord {
  round: number;
  decisionName: string;
  category: string;
  decisionScore: number;
}

interface QuizSubmission {
  round: number;
  correct: number;
  total: number;
  scorePercent: number;
}

interface Scores {
  decisionScore: number;
  quizScore: number;
  totalScore: number;
}

interface Metrics {
  finalMarketShare?: string;
  marketShareGrowth?: string;
  brandValue?: string;
  technology?: string;
  production?: string;
  cashRemaining?: string;
  competitivePosition?: string;
  industryAttractiveness?: string;
  decisionsCount?: number;
}

type ForceKey = 'rivalry' | 'newEntrants' | 'suppliers' | 'buyers' | 'substitutes';

interface Props {
  decisions: DecisionRecord[];
  quizSubmissions: QuizSubmission[];
  scores: Scores;
  metrics: Metrics | undefined;
  fiveForces: Record<ForceKey, number>;
  industryAttractiveness: number;
  totalRounds: number;
}

const FORCE_LABEL: Record<ForceKey, string> = {
  rivalry: 'Competitive Rivalry',
  newEntrants: 'New Entrants',
  suppliers: 'Supplier Power',
  buyers: 'Buyer Power',
  substitutes: 'Substitutes',
};

const expertiseLevel = (total: number): { label: string; color: string } => {
  if (total >= 85) return { label: 'EV Strategy Expert', color: 'text-amber-300' };
  if (total >= 70) return { label: 'Advanced Strategist', color: 'text-emerald-300' };
  if (total >= 55) return { label: 'Proficient Strategist', color: 'text-sky-300' };
  if (total >= 40) return { label: 'Intermediate Strategist', color: 'text-indigo-300' };
  return { label: 'Novice Strategist', color: 'text-slate-300' };
};

export function FinalDebrief({
  decisions,
  quizSubmissions,
  scores,
  metrics,
  fiveForces,
  industryAttractiveness,
  totalRounds,
}: Props) {
  const expertise = expertiseLevel(scores.totalScore);

  const perRound = Array.from({ length: totalRounds }, (_, i) => {
    const round = i + 1;
    const dec = decisions.find(d => d.round === round);
    const qz = quizSubmissions.find(q => q.round === round);
    return {
      round: `R${round}`,
      decision: Number((dec?.decisionScore ?? 0).toFixed(1)),
      quiz: Number((qz ? (qz.correct / qz.total) * 20 : 0).toFixed(1)),
    };
  });

  const forceData = (Object.keys(FORCE_LABEL) as ForceKey[]).map(k => ({
    force: FORCE_LABEL[k],
    value: fiveForces[k] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4">
          <Trophy className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Final score</p>
        <p className="text-5xl font-bold text-emerald-400 mt-2">
          {scores.totalScore.toFixed(1)} <span className="text-2xl text-slate-400">/ 100</span>
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700">
          <Award className={`w-5 h-5 ${expertise.color}`} />
          <span className={`font-semibold ${expertise.color}`}>{expertise.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400">Decision score</p>
          <p className="text-3xl font-bold text-emerald-300 mt-1">
            {scores.decisionScore.toFixed(1)} <span className="text-base text-slate-500">/ 100</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Sum across {totalRounds} rounds</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400">Quiz score</p>
          <p className="text-3xl font-bold text-indigo-300 mt-1">
            {scores.quizScore.toFixed(1)} <span className="text-base text-slate-500">/ 100</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {quizSubmissions.reduce((s, q) => s + q.correct, 0)} of{' '}
            {quizSubmissions.reduce((s, q) => s + q.total, 0)} correct
          </p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
          <p className="text-sm text-slate-400">Industry attractiveness</p>
          <p className="text-3xl font-bold text-amber-300 mt-1">
            {industryAttractiveness.toFixed(0)} <span className="text-base text-slate-500">/ 100</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">100 − avg(forces)</p>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Score per round</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perRound}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="round" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis domain={[0, 20]} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              <Bar dataKey="decision" name="Decision" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quiz" name="Quiz" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Final state of Porter&apos;s Forces</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis
                dataKey="force"
                type="category"
                width={130}
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {forceData.map((d, i) => {
                  const c =
                    d.value >= 80
                      ? '#f87171'
                      : d.value >= 60
                      ? '#fbbf24'
                      : d.value >= 40
                      ? '#34d399'
                      : '#38bdf8';
                  return <Cell key={i} fill={c} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Lower force values = more attractive industry for EVans. Suppliers and rivalry tend to
          spike late as Tesla arrives and the import ban tightens battery sourcing.
        </p>
      </div>

      {metrics && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">EVans final position</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Metric label="Market share" value={metrics.finalMarketShare} />
            <Metric label="Growth vs. start" value={metrics.marketShareGrowth} />
            <Metric label="Position" value={metrics.competitivePosition} />
            <Metric label="Brand value" value={metrics.brandValue} />
            <Metric label="Technology" value={metrics.technology} />
            <Metric label="Production capacity" value={metrics.production} />
            <Metric label="Cash remaining" value={metrics.cashRemaining} />
            <Metric label="Decisions made" value={metrics.decisionsCount?.toString()} />
            <Metric label="Industry attractiveness" value={metrics.industryAttractiveness} />
          </div>
        </div>
      )}

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Decision log</h3>
        <ol className="space-y-2">
          {decisions.map(d => (
            <li
              key={d.round}
              className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 text-sm"
            >
              <div>
                <span className="text-slate-400 mr-2">R{d.round}.</span>
                <span className="text-slate-100 font-medium">{d.decisionName}</span>
                <span className="text-xs text-slate-500 ml-2">{d.category}</span>
              </div>
              <span className="text-emerald-300 font-mono">{d.decisionScore.toFixed(1)} / 20</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-100 font-semibold mt-0.5">{value ?? '—'}</p>
    </div>
  );
}
