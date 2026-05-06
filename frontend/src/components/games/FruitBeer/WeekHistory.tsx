import { History } from 'lucide-react';

interface WeekStat {
  week: number;
  demand: number;
  received: number;
  shipped?: number;
  orderPlaced: number;
  inventory: number;
  backorder: number;
  holdingCost: number;
  stockoutCost: number;
  totalCost: number;
}

interface Props {
  weeklyStats: WeekStat[];
}

export function WeekHistory({ weeklyStats }: Props) {
  const ordered = [...weeklyStats].sort((a, b) => b.week - a.week);

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Week-by-week history</h3>
        <span className="ml-auto text-xs text-slate-500">most recent first</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-700">
              <th className="py-2 pr-4">Week</th>
              <th className="py-2 pr-4">Demand received</th>
              <th className="py-2 pr-4">Shipment received</th>
              <th className="py-2 pr-4">Fulfilled</th>
              <th className="py-2 pr-4">Order placed</th>
              <th className="py-2 pr-4">Inventory</th>
              <th className="py-2 pr-4">Backlog</th>
              <th className="py-2 pr-4">Week cost</th>
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-500">
                  No history yet. Place your first order to advance to week 1.
                </td>
              </tr>
            ) : (
              ordered.map(w => {
                const weekCost = (w.holdingCost ?? 0) + (w.stockoutCost ?? 0);
                return (
                  <tr key={w.week} className="border-b border-slate-700/40 text-slate-300 hover:bg-slate-900/40">
                    <td className="py-2 pr-4 font-mono">{w.week}</td>
                    <td className="py-2 pr-4">{w.demand ?? 0}</td>
                    <td className="py-2 pr-4">{w.received ?? 0}</td>
                    <td className="py-2 pr-4">{w.shipped ?? 0}</td>
                    <td className="py-2 pr-4 text-emerald-300">{w.orderPlaced ?? 0}</td>
                    <td className="py-2 pr-4">{w.inventory}</td>
                    <td className={`py-2 pr-4 ${w.backorder > 0 ? 'text-rose-300' : ''}`}>{w.backorder}</td>
                    <td className="py-2 pr-4 font-mono">₹{weekCost.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
