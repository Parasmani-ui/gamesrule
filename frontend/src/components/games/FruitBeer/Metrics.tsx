import { Activity, DollarSign, Package, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface WeekStat {
  week: number;
  inventory: number;
  backorder: number;
  holdingCost: number;
  stockoutCost: number;
  orderPlaced: number;
}

interface Props {
  role: string;
  totalCost: number;
  weeklyStats: WeekStat[];
  holdingCostRate: number;
  stockoutCostRate: number;
  bullwhipRatio: number | null;
}

export function Metrics({ totalCost, weeklyStats, holdingCostRate, stockoutCostRate, bullwhipRatio }: Props) {
  const holdingCost = weeklyStats.reduce((acc, w) => acc + (w.holdingCost ?? 0), 0);
  const stockoutCost = weeklyStats.reduce((acc, w) => acc + (w.stockoutCost ?? 0), 0);

  const chartData = weeklyStats.map(w => ({
    week: w.week,
    inventory: w.inventory,
    order: w.orderPlaced,
  }));

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-semibold text-white">Your metrics</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={DollarSign}
          accent="text-rose-400"
          label="Total cost"
          value={`₹${totalCost.toFixed(2)}`}
          helper="holding + stockout"
        />
        <MetricCard
          icon={TrendingUp}
          accent="text-amber-400"
          label="Bullwhip ratio"
          value={bullwhipRatio !== null ? bullwhipRatio.toFixed(2) : '—'}
          helper={bullwhipRatio !== null ? interpretBullwhip(bullwhipRatio) : 'reveals at game end'}
        />
        <MetricCard
          icon={Package}
          accent="text-emerald-400"
          label="Holding cost"
          value={`₹${holdingCost.toFixed(2)}`}
          helper={`@ ₹${holdingCostRate.toFixed(2)} / unit / week`}
        />
        <MetricCard
          icon={Package}
          accent="text-rose-400"
          label="Stockout cost"
          value={`₹${stockoutCost.toFixed(2)}`}
          helper={`@ ₹${stockoutCostRate.toFixed(2)} / unit / week`}
        />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Inventory & order over time</p>
        <div className="h-44 bg-slate-900/40 rounded-lg p-2">
          {chartData.length === 0 ? (
            <p className="text-center text-slate-500 text-sm pt-12">No data yet — finish week 1 to start charting.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="inventory"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Inventory"
                />
                <Line
                  type="monotone"
                  dataKey="order"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Order"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  accent,
  label,
  value,
  helper,
}: {
  icon: typeof Activity;
  accent: string;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 flex items-start gap-3">
      <Icon className={`w-5 h-5 mt-0.5 ${accent}`} />
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-100">{value}</p>
        {helper && <p className="text-[10px] text-slate-500 mt-0.5">{helper}</p>}
      </div>
    </div>
  );
}

function interpretBullwhip(ratio: number): string {
  if (ratio < 1.2) return 'minimal amplification';
  if (ratio < 2.0) return 'moderate amplification';
  if (ratio < 4.0) return 'noticeable bullwhip';
  return 'severe bullwhip';
}
