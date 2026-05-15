import { useMemo } from 'react';
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
import { ForecastHistoryEntry } from './types';

interface Props {
  /** Engine-emitted per-period forecast records. */
  playerForecasts: ForecastHistoryEntry[];
}

interface SeriesPoint {
  forecastIndex: number;
  period: number;
  mape: number;
  trackingSignal: number;
}

/**
 * Cumulative-error trajectory: MAPE and Tracking Signal over forecast number.
 *
 * NO FORECAST MATH: this chart re-aggregates engine-emitted per-period
 * absoluteError / error / percentageError into a running average, the same
 * way Customer In Store's Results.tsx re-aggregates per-question correctness
 * into a learning curve. It does NOT compute any forecast.
 *
 * Pedagogy: Tracking Signal is the textbook bias-drift indicator (Stevenson
 * Ch. 3 / Heizer Ch. 4). |TS| > 4 is the canonical out-of-control threshold;
 * dashed reference lines mark it.
 */
export function MetricsChart({ playerForecasts }: Props) {
  const series: SeriesPoint[] = useMemo(() => {
    if (playerForecasts.length === 0) return [];
    let sumAbs = 0;
    let sumErr = 0;
    let pctSum = 0;
    let pctCount = 0;
    return playerForecasts.map((f, idx) => {
      sumAbs += f.absoluteError;
      sumErr += f.error;
      if (f.percentageError !== null) {
        pctSum += f.percentageError;
        pctCount += 1;
      }
      const mad = sumAbs / (idx + 1);
      const mape = pctCount > 0 ? pctSum / pctCount : 0;
      const ts = mad === 0 ? 0 : sumErr / mad;
      return {
        forecastIndex: idx + 1,
        period: f.period + 1,
        mape: Number(mape.toFixed(2)),
        trackingSignal: Number(ts.toFixed(2)),
      };
    });
  }, [playerForecasts]);

  if (series.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 text-sm text-slate-500 text-center">
        Submit at least one forecast to see the error trajectory.
      </div>
    );
  }

  const maxAbsTs = Math.max(5, ...series.map(s => Math.abs(s.trackingSignal)));
  const tsDomain: [number, number] = [-Math.ceil(maxAbsTs), Math.ceil(maxAbsTs)];

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            Cumulative error over time
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            MAPE tracks accuracy; Tracking Signal tracks directional bias.
          </p>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          {series.length} forecast{series.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            MAPE (%)
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="forecastIndex"
                  type="number"
                  allowDecimals={false}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Forecast #',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#94a3b8',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                  formatter={(v: number) => [`${v}%`, 'Cumulative MAPE']}
                  labelFormatter={(l: number) => `After forecast ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="mape"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#34d399' }}
                  isAnimationActive={false}
                  name="MAPE"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
            Tracking Signal
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="forecastIndex"
                  type="number"
                  allowDecimals={false}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Forecast #',
                    position: 'insideBottom',
                    offset: -2,
                    fill: '#94a3b8',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  domain={tsDomain}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                  formatter={(v: number) => [v.toFixed(2), 'Tracking Signal']}
                  labelFormatter={(l: number) => `After forecast ${l}`}
                />
                <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={-4} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#64748b" />
                <Line
                  type="monotone"
                  dataKey="trackingSignal"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#818cf8' }}
                  isAnimationActive={false}
                  name="Tracking Signal"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
        |Tracking Signal| &gt; 4 is the textbook out-of-control threshold — the forecast
        is consistently biased in one direction. Re-evaluate your method (or its parameters)
        if TS climbs past either dashed line.
      </p>
    </div>
  );
}
