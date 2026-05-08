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
import { ControlChartChartData, ControlChartPoint } from './types';

interface Props {
  data: ControlChartChartData;
  insight: string;
  liveControlData?: ControlChartPoint[];
}

export function ControlChart({ data, insight, liveControlData }: Props) {
  const breachIds = new Set(data.breaches.map(b => b.batchId));

  // Use live SPC stream if present (post-warmup batches accumulate as the
  // student processes batches); otherwise fall back to the warmup-derived
  // synthetic per-batch series approximated from breaches.
  const series =
    liveControlData && liveControlData.length > 0
      ? liveControlData.map(p => ({
          batch: `B${p.batchId}`,
          rate: Number(p.defectRate.toFixed(2)),
          ucl: Number(p.ucl.toFixed(2)),
          lcl: Number(p.lcl.toFixed(2)),
          outOfControl: p.outOfControl,
        }))
      : data.breaches.map(b => ({
          batch: `B${b.batchId}`,
          rate: Number(b.rate.toFixed(2)),
          ucl: Number(data.ucl.toFixed(2)),
          lcl: Number(data.lcl.toFixed(2)),
          outOfControl: true,
        }));

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="batch" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <YAxis
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <ReferenceLine
              y={data.mean}
              stroke="#34d399"
              strokeDasharray="3 3"
              label={{ value: `μ ${data.mean.toFixed(2)}%`, fill: '#34d399', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={data.ucl}
              stroke="#f87171"
              strokeDasharray="6 4"
              label={{ value: `UCL ${data.ucl.toFixed(2)}%`, fill: '#f87171', fontSize: 11, position: 'right' }}
            />
            <ReferenceLine
              y={data.lcl}
              stroke="#f87171"
              strokeDasharray="6 4"
              label={{ value: `LCL ${data.lcl.toFixed(2)}%`, fill: '#f87171', fontSize: 11, position: 'right' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              name="Defect rate"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                const isBreach =
                  payload.outOfControl ||
                  breachIds.has(parseInt(String(payload.batch).replace('B', ''), 10));
                return (
                  <circle
                    key={`d-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isBreach ? 5 : 3}
                    fill={isBreach ? '#f87171' : '#38bdf8'}
                    stroke={isBreach ? '#fff' : 'none'}
                    strokeWidth={isBreach ? 1 : 0}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
      {data.breaches.length > 0 && (
        <p className="text-[11px] text-red-300 mt-1">
          Out-of-control batches: {data.breaches.map(b => `B${b.batchId}`).join(', ')}
        </p>
      )}
    </div>
  );
}
