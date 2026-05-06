import { Hourglass } from 'lucide-react';

type Role = 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

const LABELS: Record<Role, string> = {
  RETAILER: 'Retailer',
  WHOLESALER: 'Wholesaler',
  DISTRIBUTOR: 'Distributor',
  MANUFACTURER: 'Manufacturer',
};

interface Props {
  ownRole: Role;
  otherRoles: Role[];
}

export function WaitingForOthers({ ownRole, otherRoles }: Props) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-center gap-3">
      <Hourglass className="w-5 h-5 text-amber-300 animate-pulse flex-shrink-0" />
      <div className="flex-1">
        <p className="text-amber-100 font-semibold text-sm">
          Order locked — waiting for the rest of the chain
        </p>
        <p className="text-amber-200/70 text-xs mt-0.5">
          As {LABELS[ownRole]}, you're done for this week. The round will auto-advance once these tiers submit (or
          their bots act):
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {otherRoles.map(role => (
            <span
              key={role}
              className="text-[11px] uppercase tracking-wide bg-amber-500/20 text-amber-100 rounded px-2 py-0.5 border border-amber-500/30"
            >
              {LABELS[role]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
