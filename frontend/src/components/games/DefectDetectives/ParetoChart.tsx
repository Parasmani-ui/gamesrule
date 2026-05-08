import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ParetoChartData } from './types';

interface Props {
  data: ParetoChartData;
  insight: string;
}

export function ParetoChart({ data, insight }: Props) {
  const chart = data.rows.map(r => ({
    name: r.defectType,
    count: r.count,
    cumulative: Number(r.cumulativePct.toFixed(1)),
  }));

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} interval={0} angle={-15} dy={8} height={60} />
            <YAxis yAxisId="left" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number, name: string) => {
                if (name === 'cumulative') return [`${value.toFixed(1)}%`, 'Cumulative'];
                return [value, 'Count'];
              }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar yAxisId="left" dataKey="count" name="Defect count" fill="#f87171" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              name="Cumulative %"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ r: 4, fill: '#fbbf24' }}
            />
            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#34d399"
              strokeDasharray="4 4"
              label={{ value: '80%', fill: '#34d399', fontSize: 11, position: 'right' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
    </div>
  );
}
