import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ScatterChartData } from './types';

interface Props {
  data: ScatterChartData;
  insight: string;
  machines: string[];
}

export function ScatterChart({ data, insight, machines }: Props) {
  const points = data.points.map(p => ({
    x: p.x,
    y: p.y,
    machine: p.machine,
  }));

  // Compute linear regression client-side from the engine-supplied points so
  // the trend line is consistent with the same correlation.
  const fit = leastSquares(points.map(p => p.x), points.map(p => p.y));
  const xs = points.map(p => p.x);
  const minX = xs.length > 0 ? Math.min(...xs) : 0;
  const maxX = xs.length > 0 ? Math.max(...xs) : 1;

  const r = data.correlation;
  const rTone = Math.abs(r) > 0.5 ? 'text-amber-300' : Math.abs(r) > 0.2 ? 'text-sky-300' : 'text-slate-300';

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className="text-slate-400">
          Pearson r <span className={`font-mono ${rTone}`}>{r.toFixed(2)}</span>
        </span>
        <span className="text-slate-500">x = machine index, y = defect count</span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RScatterChart margin={{ top: 5, right: 30, bottom: 25, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="x"
              name="Machine"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              domain={[minX - 0.5, maxX + 0.5]}
              tickFormatter={v => machines[Math.round(v)] ?? `${v}`}
              label={{ value: 'Machine', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Defects"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              label={{ value: 'Defects', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: any, name: any, props: any) => {
                if (props?.dataKey === 'x') return [props.payload?.machine ?? value, 'Machine'];
                return [value, name];
              }}
            />
            <Scatter data={points} fill="#38bdf8" />
            {fit && (
              <ReferenceLine
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="4 4"
                segment={[
                  { x: minX, y: fit.intercept + fit.slope * minX },
                  { x: maxX, y: fit.intercept + fit.slope * maxX },
                ]}
              />
            )}
          </RScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
    </div>
  );
}

function leastSquares(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    num += dx * (ys[i] - my);
    den += dx * dx;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}
