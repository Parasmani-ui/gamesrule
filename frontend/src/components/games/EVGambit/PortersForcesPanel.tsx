import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

type ForceKey = 'rivalry' | 'newEntrants' | 'suppliers' | 'buyers' | 'substitutes';

interface Props {
  fiveForces: Record<ForceKey, number> | null | undefined;
  industryAttractiveness: number | undefined;
  highlightForce?: ForceKey | null;
}

const FORCE_LABELS: Record<ForceKey, string> = {
  rivalry: 'Competitive Rivalry',
  newEntrants: 'Threat of New Entrants',
  suppliers: 'Supplier Power',
  buyers: 'Buyer Power',
  substitutes: 'Threat of Substitutes',
};

const FORCE_ORDER: ForceKey[] = ['rivalry', 'newEntrants', 'suppliers', 'buyers', 'substitutes'];

const forceColor = (value: number): string => {
  if (value >= 80) return 'text-red-300';
  if (value >= 60) return 'text-amber-300';
  if (value >= 40) return 'text-emerald-300';
  return 'text-sky-300';
};

const forceBar = (value: number): string => {
  if (value >= 80) return 'from-red-500 to-red-400';
  if (value >= 60) return 'from-amber-500 to-amber-400';
  if (value >= 40) return 'from-emerald-500 to-emerald-400';
  return 'from-sky-500 to-sky-400';
};

export function PortersForcesPanel({ fiveForces, industryAttractiveness, highlightForce }: Props) {
  const safe: Record<ForceKey, number> = {
    rivalry: fiveForces?.rivalry ?? 0,
    newEntrants: fiveForces?.newEntrants ?? 0,
    suppliers: fiveForces?.suppliers ?? 0,
    buyers: fiveForces?.buyers ?? 0,
    substitutes: fiveForces?.substitutes ?? 0,
  };

  const radarData = FORCE_ORDER.map(key => ({
    force: FORCE_LABELS[key].replace(/^Threat of |^Competitive /, ''),
    value: safe[key],
  }));

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Porter&apos;s Five Forces</p>
        <p className="text-sm text-slate-300 mt-1">
          Industry attractiveness:{' '}
          <span className="text-emerald-300 font-bold">
            {(industryAttractiveness ?? 0).toFixed(0)}
          </span>{' '}
          / 100
        </p>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="force" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
            <Radar name="Force" dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.4} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#cbd5e1' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {FORCE_ORDER.map(key => {
          const v = safe[key];
          const isHi = key === highlightForce;
          return (
            <div
              key={key}
              className={`rounded-lg p-2 ${
                isHi ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${isHi ? 'text-emerald-200' : 'text-slate-300'}`}>
                  {FORCE_LABELS[key]}
                </span>
                <span className={`font-mono font-semibold ${forceColor(v)}`}>{v.toFixed(0)}</span>
              </div>
              <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${forceBar(v)} transition-all`}
                  style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
