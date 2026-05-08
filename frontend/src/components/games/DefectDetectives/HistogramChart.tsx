import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HistogramChartData } from './types';

interface Props {
  data: HistogramChartData;
  insight: string;
}

export function HistogramChart({ data, insight }: Props) {
  const chart = data.bins.map(b => ({ range: b.range, count: b.count }));

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            μ <span className="text-emerald-300 font-mono">{data.mean.toFixed(2)}%</span>
          </span>
          <span className="text-slate-400">
            σ <span className="text-amber-300 font-mono">{data.stddev.toFixed(2)}%</span>
          </span>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="range" tick={{ fill: '#cbd5e1', fontSize: 10 }} interval={0} angle={-15} dy={8} height={50} />
            <YAxis tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
    </div>
  );
}
