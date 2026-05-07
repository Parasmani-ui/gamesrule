import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PerQuestion {
  questionIndex: number;
  playerAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  usedCorrelationHeuristic: boolean;
  timeSpent: number;
}

interface Metrics {
  totalQuestions: number;
  questionsCompleted: number;
  score: number;
  accuracyRate: string;
  averageTimePerQuestion: string;
  improvementTrend: string;
  correlationHeuristic: {
    wrongAnswers: number;
    heuristicErrors: number;
    rateOfWrongAnswers: number;
    detected: boolean;
  };
  perQuestion: PerQuestion[];
}

interface Props {
  metrics: Metrics;
  mode: 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';
}

const MODE_INTERPRETATION: Record<Props['mode'], string> = {
  'learning-by-doing':
    'You worked through this with minimal feedback. The accuracy curve below shows whether you built intuition through repetition — improvement means you began catching the pattern.',
  'task-decomposition':
    'You worked through this with the full stock table after each question. Strong accuracy here suggests the explicit step-by-step approach worked for you; consider whether you can keep the discipline without the table next time.',
  'binary-feedback':
    'You got immediate ✓/✗ after each question. Improvement here suggests reinforcement learning is doing the work; flat or declining accuracy suggests the heuristic is sticking.',
};

export function Results({ metrics, mode }: Props) {
  const accuracyData = metrics.perQuestion.map((q, i) => {
    const upToHere = metrics.perQuestion.slice(0, i + 1);
    const acc = (upToHere.filter(x => x.isCorrect).length / upToHere.length) * 100;
    return {
      question: i + 1,
      accuracy: Number(acc.toFixed(1)),
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500/10 via-slate-800/60 to-slate-800/60 border border-emerald-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-full p-2">
            <Award className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Simulation complete</h2>
            <p className="text-sm text-slate-300 mt-0.5">
              {metrics.score} of {metrics.totalQuestions} correct ({metrics.accuracyRate})
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-emerald-300" />}
          label="Accuracy"
          value={metrics.accuracyRate}
          sub={`${metrics.score} / ${metrics.totalQuestions}`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-emerald-300" />}
          label="Average time"
          value={metrics.averageTimePerQuestion}
          sub="per question"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-300" />}
          label="Trend"
          value={metrics.improvementTrend}
          sub="first vs second half"
        />
        <StatCard
          icon={
            metrics.correlationHeuristic.detected ? (
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            )
          }
          label="Correlation bias"
          value={`${metrics.correlationHeuristic.rateOfWrongAnswers}%`}
          sub={`of ${metrics.correlationHeuristic.wrongAnswers} wrong answer${metrics.correlationHeuristic.wrongAnswers === 1 ? '' : 's'}`}
          highlight={metrics.correlationHeuristic.detected}
        />
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Learning curve</h3>
        <p className="text-sm text-slate-400 mb-4">
          Cumulative accuracy after each question. A rising line means the intervention is
          working; a flat or falling line means the correlation heuristic is sticking.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={accuracyData}
              margin={{ top: 10, right: 16, bottom: 8, left: 4 }}
            >
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis
                dataKey="question"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Question',
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#94a3b8',
                  fontSize: 12,
                }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                }}
                formatter={(value: number) => [`${value}%`, 'Accuracy']}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Target 70%', position: 'right', fill: '#10b981', fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#34d399' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">
          Per-question breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-2 py-2 text-left font-medium">#</th>
                <th className="px-2 py-2 text-right font-medium">Your answer</th>
                <th className="px-2 py-2 text-right font-medium">Correct</th>
                <th className="px-2 py-2 text-right font-medium">Time</th>
                <th className="px-2 py-2 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {metrics.perQuestion.map(q => (
                <tr
                  key={q.questionIndex}
                  className="border-b border-slate-800 last:border-0"
                >
                  <td className="px-2 py-2 text-slate-300 font-mono">
                    Q{q.questionIndex + 1}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-200">
                    {q.playerAnswer}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-200">
                    {q.correctAnswer}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-400">
                    {q.timeSpent}s
                  </td>
                  <td className="px-2 py-2 text-right">
                    {q.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : q.usedCorrelationHeuristic ? (
                      <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" /> Heuristic
                      </span>
                    ) : (
                      <span className="text-red-300 text-xs font-semibold">Wrong</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-sm text-slate-300">
        <p className="font-semibold text-slate-100 mb-1">
          Interpretation for the {modeLabel(mode)} group
        </p>
        <p>{MODE_INTERPRETATION[mode]}</p>
      </div>
    </div>
  );
}

function modeLabel(mode: Props['mode']): string {
  switch (mode) {
    case 'learning-by-doing':
      return 'learning-by-doing';
    case 'task-decomposition':
      return 'task-decomposition';
    case 'binary-feedback':
      return 'binary-feedback';
  }
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? 'bg-amber-500/10 border-amber-500/40'
          : 'bg-slate-800/60 border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white mt-2">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
