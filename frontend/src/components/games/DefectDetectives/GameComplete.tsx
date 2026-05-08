import { Award, Sparkles, Target, Trophy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DefectDataPoint,
  DefectDetectivesMetrics,
  QCToolApplied,
} from './types';

interface Props {
  metrics: DefectDetectivesMetrics;
  toolsApplied: QCToolApplied[];
  defectData: DefectDataPoint[];
  totalCost: number;
  currencySymbol: string;
}

const TOOL_ORDER = [
  'Check Sheet',
  'Pareto Analysis',
  'Histogram',
  'Control Chart',
  'Scatter Diagram',
  'Cause-and-Effect Diagram',
  'Flowchart',
];

export function GameComplete({
  metrics,
  toolsApplied,
  defectData,
  totalCost,
  currencySymbol,
}: Props) {
  const onTarget = metrics.targetAchieved;
  const grade = metrics.performanceGrade;
  const reductionPct = metrics.defectRates.reductionPct;

  // Bias reveal — computed from the actual warmup dataset, narrated only here.
  const bias = computeBias(defectData);

  const costData = [
    { bucket: 'Prevention', value: Math.round(metrics.costs.prevention), color: '#34d399' },
    { bucket: 'Appraisal', value: Math.round(metrics.costs.appraisal), color: '#38bdf8' },
    { bucket: 'Internal', value: Math.round(metrics.costs.internalFailure), color: '#fbbf24' },
    { bucket: 'External', value: Math.round(metrics.costs.externalFailure), color: '#f87171' },
  ];

  const fmt = (n: number) => `${currencySymbol}${Math.round(n).toLocaleString()}`;

  const appliedSet = new Set(toolsApplied.map(t => t.tool));
  const dataDrivenTools = ['Check Sheet', 'Pareto Analysis', 'Histogram', 'Control Chart', 'Scatter Diagram'];
  const biasSurfacingApplied = dataDrivenTools.filter(t => appliedSet.has(t)).length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            onTarget ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}
        >
          <Trophy className={`w-10 h-10 ${onTarget ? 'text-emerald-400' : 'text-amber-300'}`} />
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Final defect rate</p>
        <p className={`text-5xl font-bold mt-2 ${onTarget ? 'text-emerald-400' : 'text-amber-300'}`}>
          {metrics.defectRates.current.toFixed(2)}%
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Started at {metrics.defectRates.initial.toFixed(1)}% · target {metrics.defectRates.target.toFixed(1)}%
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/70 border border-slate-700">
          <Award className="w-5 h-5 text-amber-300" />
          <span className="font-semibold text-amber-200">{grade}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Defect reduction"
          value={`${reductionPct.toFixed(1)}%`}
          tone="emerald"
          icon={<Target className="w-5 h-5" />}
        />
        <KpiCard
          label="Tools applied"
          value={`${metrics.toolsAppliedCount} / ${metrics.toolsTotal}`}
          tone="indigo"
        />
        <KpiCard label="Total cost of quality" value={fmt(totalCost)} tone="amber" />
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Cost of quality breakdown</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="bucket" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <YAxis
                tick={{ fill: '#cbd5e1', fontSize: 11 }}
                tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#cbd5e1' }}
                formatter={(v: number) => fmt(v)}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {costData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          The optimal mix shifts prevention + appraisal up so internal and external failure costs
          come down. Heavy external-failure spend means defects reached customers — the most
          expensive failure mode.
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tools you applied</h3>
        <ol className="space-y-2">
          {TOOL_ORDER.map((toolName, idx) => {
            const applied = toolsApplied.find(t => t.tool === toolName);
            return (
              <li
                key={toolName}
                className={`flex items-start justify-between gap-3 rounded-lg p-3 text-sm ${
                  applied
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-slate-900/40 border border-slate-700 opacity-60'
                }`}
              >
                <div>
                  <span className="text-slate-400 mr-2">{idx + 1}.</span>
                  <span className="text-slate-100 font-medium">{toolName}</span>
                  {applied && (
                    <p className="text-xs text-slate-300 mt-1 leading-snug">{applied.insight}</p>
                  )}
                  {!applied && (
                    <p className="text-xs text-slate-500 mt-1">Not applied this session.</p>
                  )}
                </div>
                {applied && (
                  <span className="text-emerald-300 font-mono text-xs whitespace-nowrap">
                    −{applied.defectReduction}%
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <h3 className="text-lg font-semibold text-white">Did you spot the bias?</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          The warmup dataset was deliberately biased. Hidden in the {defectData.length} rows were
          three patterns:
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="bg-slate-900/50 rounded-lg p-3">
            <span className="text-slate-400">Dominant defect type:</span>{' '}
            <span className="text-amber-300 font-semibold">{bias.dominantDefect.label}</span>{' '}
            <span className="text-slate-400">
              ({bias.dominantDefect.share.toFixed(0)}% of all defects)
            </span>
          </li>
          <li className="bg-slate-900/50 rounded-lg p-3">
            <span className="text-slate-400">Dominant machine / zone:</span>{' '}
            <span className="text-amber-300 font-semibold">{bias.dominantMachine.label}</span>{' '}
            <span className="text-slate-400">
              ({bias.dominantMachine.share.toFixed(0)}% of all defects)
            </span>
          </li>
          <li className="bg-slate-900/50 rounded-lg p-3">
            <span className="text-slate-400">Dominant shift:</span>{' '}
            <span className="text-amber-300 font-semibold">Shift {bias.dominantShift.label}</span>{' '}
            <span className="text-slate-400">
              ({bias.dominantShift.share.toFixed(0)}% of all defects)
            </span>
          </li>
        </ul>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          Pareto, Check Sheet, and Scatter would each have surfaced one of these patterns. You
          applied {biasSurfacingApplied} of those 5 data-driven tools. The 7-tool kit is designed
          to make biased data give up its structure — when you skip tools, you fly half-blind.
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'indigo' | 'amber';
  icon?: JSX.Element;
}) {
  const color = {
    emerald: 'text-emerald-300',
    indigo: 'text-indigo-300',
    amber: 'text-amber-300',
  }[tone];
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <p className="text-sm text-slate-400 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function computeBias(data: DefectDataPoint[]): {
  dominantDefect: { label: string; share: number };
  dominantMachine: { label: string; share: number };
  dominantShift: { label: string; share: number };
} {
  const total = data.reduce((s, d) => s + d.defectCount, 0) || 1;

  const tally = (key: 'defectType' | 'machine' | 'shift') => {
    const counts: Record<string, number> = {};
    for (const d of data) counts[d[key]] = (counts[d[key]] || 0) + d.defectCount;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { label: '—', share: 0 };
    return { label: sorted[0][0], share: (sorted[0][1] / total) * 100 };
  };

  return {
    dominantDefect: tally('defectType'),
    dominantMachine: tally('machine'),
    dominantShift: tally('shift'),
  };
}
