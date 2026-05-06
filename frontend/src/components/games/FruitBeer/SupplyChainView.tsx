import { ArrowDown, ArrowUp, Boxes, Factory, ShoppingBag, Store, Truck, User } from 'lucide-react';

type Role = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

const TIERS: { role: Role; label: string; icon: typeof Boxes }[] = [
  { role: 'RETAILER', label: 'Retailer', icon: Store },
  { role: 'WHOLESALER', label: 'Wholesaler', icon: Truck },
  { role: 'DISTRIBUTOR', label: 'Distributor', icon: Boxes },
  { role: 'MANUFACTURER', label: 'Manufacturer', icon: Factory },
];

interface Props {
  ownRole: Role | null;
  ownInventory: number | null;
  ownBacklog: number | null;
  ownIncomingShipments: number[];
  ownIncomingOrders: number[];
  currentWeek: number;
  maxWeeks: number;
  customerDemand: number[];
}

export function SupplyChainView({
  ownRole,
  ownInventory,
  ownBacklog,
  ownIncomingShipments,
  ownIncomingOrders,
  currentWeek,
  maxWeeks,
  customerDemand,
}: Props) {
  const progressPercent = maxWeeks > 0 ? Math.min(100, (currentWeek / maxWeeks) * 100) : 0;
  const customerDemandThisWeek = customerDemand[currentWeek] ?? null;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Supply chain — Week {currentWeek} of {maxWeeks}</h3>
          <p className="text-sm text-slate-400 mt-1">
            Information flows upstream (orders), product flows downstream (shipments). Lead time creates the bullwhip.
          </p>
        </div>
        <div className="flex-1 max-w-md">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Progress {progressPercent.toFixed(0)}%</p>
        </div>
      </div>

      {/* Customer node */}
      <div className="flex justify-end">
        <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3 max-w-xs">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Customer</p>
            <p className="text-sm font-semibold text-white">
              Demand: {customerDemandThisWeek !== null ? `${customerDemandThisWeek} units` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Flow legend */}
      <div className="flex justify-end gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <ArrowUp className="w-3 h-3 text-sky-400" />
          orders upstream
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDown className="w-3 h-3 text-emerald-400" />
          product downstream
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIERS.map((tier, idx) => {
          const isMe = tier.role === ownRole;
          const Icon = tier.icon;
          return (
            <div
              key={tier.role}
              className={`relative rounded-xl border p-4 transition-all ${
                isMe
                  ? 'bg-emerald-500/10 border-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/40 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${isMe ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${isMe ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {tier.label}
                </span>
                {isMe && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide bg-emerald-500 text-emerald-950 rounded px-1.5 py-0.5 font-bold">
                    You
                  </span>
                )}
              </div>

              {isMe ? (
                <div className="space-y-2 text-sm">
                  <Row label="Inventory" value={ownInventory ?? 0} accent="text-emerald-300" />
                  <Row label="Backlog" value={ownBacklog ?? 0} accent={ownBacklog ? 'text-rose-300' : 'text-slate-400'} />
                  <Row
                    label="Incoming"
                    value={ownIncomingShipments.reduce((a, b) => a + b, 0)}
                    helper={pipelineLabel(ownIncomingShipments)}
                  />
                  {tier.role !== 'RETAILER' && (
                    <Row
                      label="Pending orders"
                      value={ownIncomingOrders.reduce((a, b) => a + b, 0)}
                      helper={pipelineLabel(ownIncomingOrders)}
                    />
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 leading-relaxed">
                  {hiddenLabel(tier.role)}
                </div>
              )}

              {idx < TIERS.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex-col gap-1">
                  <ArrowUp className="w-4 h-4 text-sky-400" />
                  <ArrowDown className="w-4 h-4 text-emerald-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 italic flex items-center gap-2">
        <ShoppingBag className="w-3 h-3" />
        Other tiers' inventories are hidden — that information asymmetry is what drives the bullwhip.
      </p>
    </div>
  );
}

function Row({ label, value, helper, accent }: { label: string; value: number; helper?: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right">
        <span className={`text-base font-semibold ${accent ?? 'text-slate-100'}`}>{value}</span>
        {helper && <span className="block text-[10px] text-slate-500 font-mono">{helper}</span>}
      </span>
    </div>
  );
}

function pipelineLabel(pipeline: number[]): string {
  if (!pipeline.length) return '';
  return `[${pipeline.slice(0, 4).join(', ')}]`;
}

function hiddenLabel(role: Role): string {
  switch (role) {
    case 'RETAILER':
      return 'Faces customer demand directly. Orders from Wholesaler.';
    case 'WHOLESALER':
      return 'Supplies Retailer. Orders from Distributor.';
    case 'DISTRIBUTOR':
      return 'Supplies Wholesaler. Orders from Manufacturer.';
    case 'MANUFACTURER':
      return 'Produces goods. Lead time on production.';
  }
}
