import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  inflow: number[];
  outflow: number[];
  unitLabel?: string;
}

/**
 * Two-line chart of inflow vs outflow over time. The X-axis is 1-indexed
 * minute (matches the answer the player must enter).
 *
 * Palette is colour-blind safe (deuteranopia-friendly): emerald-400 for
 * inflow, amber-400 for outflow. We deliberately do NOT plot the stock
 * level — the whole point of the simulation is that the player has to
 * mentally accumulate the difference. Showing stock would defeat the test.
 */
export function GraphChart({ inflow, outflow, unitLabel = 'people / minute' }: Props) {
  const length = Math.max(inflow.length, outflow.length);
  const data = Array.from({ length }, (_, i) => ({
    minute: i + 1,
    inflow: inflow[i] ?? 0,
    outflow: outflow[i] ?? 0,
  }));

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              dataKey="minute"
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              label={{
                value: 'Minute',
                position: 'insideBottom',
                offset: -2,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              label={{
                value: unitLabel,
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
              }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#e2e8f0',
              }}
              labelFormatter={(label: number) => `Minute ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="inflow"
              name="Inflow"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#34d399' }}
            />
            <Line
              type="monotone"
              dataKey="outflow"
              name="Outflow"
              stroke="#fbbf24"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#fbbf24' }}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
