import { Coins } from 'lucide-react';
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
import { CostBucketSummary } from './types';

interface Props {
  costs: CostBucketSummary;
  currencySymbol: string;
}

const BUCKETS = [
  { key: 'prevention', label: 'Prevention', color: '#34d399' },
  { key: 'appraisal', label: 'Appraisal', color: '#38bdf8' },
  { key: 'internalFailure', label: 'Internal failure', color: '#fbbf24' },
  { key: 'externalFailure', label: 'External failure', color: '#f87171' },
] as const;

export function CostOfQualityPanel({ costs, currencySymbol }: Props) {
  const data = BUCKETS.map(b => ({
    bucket: b.label,
    value: Math.round(costs[b.key]),
    color: b.color,
  }));

  const fmt = (n: number) => `${currencySymbol}${n.toLocaleString()}`;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-300" />
          <h3 className="text-base font-semibold text-white">Cost of quality</h3>
        </div>
        <p className="text-xs text-slate-400">
          Total <span className="text-amber-300 font-mono ml-1">{fmt(Math.round(costs.total))}</span>
          {costs.perBatch > 0 && (
            <span className="ml-3">
              per batch{' '}
              <span className="text-slate-200 font-mono">{fmt(Math.round(costs.perBatch))}</span>
            </span>
          )}
        </p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="bucket" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <YAxis
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(v: number) => fmt(v)}
            />
            <Legend wrapperStyle={{ display: 'none' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Prevention and appraisal costs are upfront and predictable. Internal failure is the cost of
        defects you catch before shipping; external failure is the cost when defects reach the
        customer. The four-bucket model is the central pedagogical hook.
      </p>
    </div>
  );
}
