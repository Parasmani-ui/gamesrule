import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  /** All revealed demand observations (warmup + any periods already played). */
  historicalDemand: number[];
  /** Periods 1..warmupPeriods are warmup; the rest are post-warmup forecasts. */
  warmupPeriods: number;
  /** Total scenario length; used to lock the x-axis even on the warmup phase. */
  totalPeriods: number;
  /** Optional series of player forecasts, aligned on `period` index. */
  forecasts?: { period: number; forecast: number }[];
}

/**
 * Line chart of observed demand. This is the chart the player studies to
 * infer the pattern and pick methods.
 *
 * Pattern A reminder: the chart MUST NOT annotate the pattern name, hint at
 * the optimal method, or render future periods. We only plot what the engine
 * has already revealed.
 *
 * 0-indexed engine periods are presented as 1-indexed minutes/weeks-style
 * labels on the X-axis (consistent with the warmup count in ScenarioHeader).
 */
export function DemandHistoryChart({
  historicalDemand,
  warmupPeriods,
  totalPeriods,
  forecasts,
}: Props) {
  const forecastsByPeriod = new Map<number, number>();
  (forecasts ?? []).forEach(f => forecastsByPeriod.set(f.period, f.forecast));

  const data = historicalDemand.map((value, idx) => ({
    period: idx + 1,
    demand: value,
    forecast: forecastsByPeriod.has(idx) ? forecastsByPeriod.get(idx) : null,
  }));

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-200">Demand history</p>
        <p className="text-xs text-slate-400">
          Plotted: {historicalDemand.length} of {totalPeriods} periods
        </p>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              type="number"
              domain={[1, totalPeriods]}
              allowDecimals={false}
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              label={{
                value: 'Period',
                position: 'insideBottom',
                offset: -2,
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              allowDecimals={false}
              label={{
                value: 'Demand',
                angle: -90,
                position: 'insideLeft',
                fill: '#94a3b8',
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#e2e8f0',
              }}
              labelFormatter={(label: number) => `Period ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
            {warmupPeriods > 0 && warmupPeriods < totalPeriods && (
              <ReferenceLine
                x={warmupPeriods}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: 'Warmup ends',
                  position: 'top',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="demand"
              name="Observed demand"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#34d399' }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {forecasts && forecasts.length > 0 && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="Your forecast"
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#fbbf24' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
