import { Award, BookOpen, TrendingUp } from 'lucide-react';

type Role = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

const ROLE_ORDER: Role[] = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];

const ROLE_LABEL: Record<Role, string> = {
  RETAILER: 'Retailer',
  WHOLESALER: 'Wholesaler',
  DISTRIBUTOR: 'Distributor',
  MANUFACTURER: 'Manufacturer',
};

interface Props {
  metrics: {
    totalCosts?: Partial<Record<Role, number>>;
    bullwhipEffect?: Partial<Record<Role, number>>;
    inventoryVariance?: Partial<Record<Role, number>>;
    serviceLevel?: Partial<Record<Role, number>>;
  } | null;
  ownRole: Role | null;
  customerDemand: number[];
}

export function GameComplete({ metrics, ownRole, customerDemand }: Props) {
  const totalCosts = metrics?.totalCosts ?? {};
  const bullwhip = metrics?.bullwhipEffect ?? {};

  const myCost = ownRole ? totalCosts[ownRole] ?? 0 : 0;
  const myBullwhip = ownRole ? bullwhip[ownRole] ?? null : null;

  const bullwhipMax = Math.max(
    1,
    ...ROLE_ORDER.map(r => bullwhip[r] ?? 0),
  );

  const customerDemandSummary = describeDemand(customerDemand);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500/20 to-sky-500/10 border border-emerald-500/40 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/30 mb-3">
          <Award className="w-8 h-8 text-emerald-300" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Simulation complete</h2>
        <p className="text-slate-300 text-sm">
          Customer demand pattern: <span className="text-emerald-200 font-semibold">{customerDemandSummary}</span>
        </p>
        {ownRole && (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-4 text-sm">
            <Stat label="Your role" value={ROLE_LABEL[ownRole]} />
            <Stat label="Your total cost" value={`₹${myCost.toFixed(2)}`} />
            <Stat label="Your bullwhip" value={myBullwhip !== null ? myBullwhip.toFixed(2) : '—'} />
          </div>
        )}
      </div>

      {/* Cost comparison */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Total cost by tier</h3>
        <div className="space-y-3">
          {ROLE_ORDER.map(r => {
            const cost = totalCosts[r] ?? 0;
            const max = Math.max(1, ...ROLE_ORDER.map(role => totalCosts[role] ?? 0));
            const pct = (cost / max) * 100;
            const isMe = r === ownRole;
            return (
              <div key={r} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={isMe ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
                    {ROLE_LABEL[r]}
                    {isMe && <span className="ml-2 text-[10px] uppercase tracking-wide bg-emerald-500/20 text-emerald-200 rounded px-1.5 py-0.5">You</span>}
                  </span>
                  <span className="font-mono text-slate-100">₹{cost.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isMe ? 'bg-emerald-400' : 'bg-slate-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bullwhip amplification */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Bullwhip amplification up the chain</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Each ratio is σ²(orders placed) ÷ σ²(customer demand). If orders moved in lockstep with demand, every tier
          would be 1.0. Watch the curve grow as you walk upstream — that's the bullwhip.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {ROLE_ORDER.map(r => {
            const ratio = bullwhip[r] ?? 1;
            const pct = (ratio / bullwhipMax) * 100;
            const isMe = r === ownRole;
            return (
              <div
                key={r}
                className={`rounded-lg border p-4 ${
                  isMe ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/40'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{ROLE_LABEL[r]}</p>
                <p className={`text-2xl font-bold ${isMe ? 'text-emerald-300' : 'text-slate-100'}`}>
                  {ratio.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{interpretBullwhip(ratio)}</p>
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Takeaway */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Key takeaways</h3>
        </div>
        <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
          <li>
            Without information sharing, each tier's local optimisation amplifies demand variance — even when the underlying customer demand is stable.
          </li>
          <li>
            The further you sit from the customer, the bigger the bullwhip. POS-data sharing, vendor-managed inventory, and lead-time reduction all flatten this curve.
          </li>
          <li>
            Stockouts and excess inventory are two sides of the same coin: both grow when orders overcorrect.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function describeDemand(demand: number[]): string {
  if (!demand.length) return '—';
  const min = Math.min(...demand);
  const max = Math.max(...demand);
  if (min === max) return `constant ${min}`;
  return `${min} → ${max} units`;
}

function interpretBullwhip(ratio: number): string {
  if (ratio < 1.2) return 'minimal';
  if (ratio < 2.0) return 'moderate';
  if (ratio < 4.0) return 'noticeable';
  return 'severe';
}
