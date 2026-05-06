import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle, Loader2, XCircle } from 'lucide-react';

type Role = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

interface Props {
  role: Role;
  currentWeek: number;
  maxWeeks: number;
  inventory: number;
  backorder: number;
  lastOrderPlaced: number;
  incomingDemand: number | null;
  incomingOrderQty: number | null;
  hasPlacedOrder: boolean;
  actionLoading: boolean;
  actionFeedback: { type: 'success' | 'error'; message: string } | null;
  onSubmit: (qty: number) => void;
}

const UPSTREAM: Record<Role, string> = {
  RETAILER: 'Wholesaler',
  WHOLESALER: 'Distributor',
  DISTRIBUTOR: 'Manufacturer',
  MANUFACTURER: 'production line',
};

export function OrderEntry({
  role,
  currentWeek,
  maxWeeks,
  inventory,
  backorder,
  lastOrderPlaced,
  incomingDemand,
  incomingOrderQty,
  hasPlacedOrder,
  actionLoading,
  actionFeedback,
  onSubmit,
}: Props) {
  const [orderQty, setOrderQty] = useState<number>(lastOrderPlaced);

  // When the engine bumps lastOrderPlaced (week advance), reset the input to
  // the new prior order so the player has a sensible starting point each week.
  useEffect(() => {
    setOrderQty(lastOrderPlaced);
  }, [lastOrderPlaced, currentWeek]);

  const upstream = UPSTREAM[role];
  const isManufacturer = role === 'MANUFACTURER';
  const lastWeek = currentWeek >= maxWeeks;

  const handleSubmit = () => {
    if (Number.isNaN(orderQty) || orderQty < 0) return;
    onSubmit(Math.floor(orderQty));
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-white">
          Place order to {upstream}
        </h3>
      </div>

      {/* Decision context */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <ContextCell
          label={role === 'RETAILER' ? 'Customer demand' : 'Order from downstream'}
          value={
            role === 'RETAILER'
              ? incomingDemand !== null ? `${incomingDemand}` : '—'
              : incomingOrderQty !== null ? `${incomingOrderQty}` : '—'
          }
          helper="this week"
        />
        <ContextCell label="On-hand inventory" value={inventory} accent={inventory > 0 ? 'text-emerald-300' : 'text-slate-400'} />
        <ContextCell label="Backlog" value={backorder} accent={backorder > 0 ? 'text-rose-300' : 'text-slate-400'} />
        <ContextCell label="Last order" value={lastOrderPlaced} helper="prior week" />
      </div>

      {hasPlacedOrder ? (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-300" />
          <div>
            <p className="text-emerald-200 font-semibold text-sm">Order locked in for week {currentWeek + 1}</p>
            <p className="text-emerald-200/70 text-xs">Waiting for the rest of the chain to submit.</p>
          </div>
        </div>
      ) : lastWeek ? (
        <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 text-sm text-slate-300">
          Final week reached — no more orders to place.
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1">
              {isManufacturer ? 'Production qty' : `Order qty (units to ${upstream})`}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderQty(Math.max(0, orderQty - 1))}
                className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={Number.isNaN(orderQty) ? '' : orderQty}
                onChange={e => {
                  const v = Number(e.target.value);
                  setOrderQty(Number.isNaN(v) ? 0 : Math.max(0, v));
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setOrderQty(orderQty + 1)}
                className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={actionLoading || orderQty < 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                Submit order
              </>
            )}
          </button>
        </>
      )}

      {actionFeedback && (
        <div
          className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
            actionFeedback.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/40 text-rose-100'
              : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
          }`}
        >
          {actionFeedback.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {actionFeedback.message}
        </div>
      )}
    </div>
  );
}

function ContextCell({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: number | string;
  helper?: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-xl font-semibold ${accent ?? 'text-slate-100'}`}>{value}</p>
      {helper && <p className="text-[10px] text-slate-500">{helper}</p>}
    </div>
  );
}
