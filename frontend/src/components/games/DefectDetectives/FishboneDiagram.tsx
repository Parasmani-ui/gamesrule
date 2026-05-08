import { FishboneChartData } from './types';

interface Props {
  data: FishboneChartData;
  insight: string;
}

/**
 * Structural Cause-and-Effect (Ishikawa) diagram. Engine supplies a list of
 * scenario-specific category strings; we lay them out as classic fishbone
 * branches. This is structural by design — not data-driven — and Session 9
 * documented that.
 */
export function FishboneDiagram({ data, insight }: Props) {
  const categories = data.categories;
  const top = categories.filter((_, i) => i % 2 === 0);
  const bottom = categories.filter((_, i) => i % 2 === 1);
  const width = 760;
  const height = 280;
  const spineY = height / 2;

  const branchSlots = (n: number, side: 'top' | 'bottom') => {
    const slots: { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number }[] = [];
    if (n === 0) return slots;
    const startX = 90;
    const usable = width - 180;
    const dx = usable / Math.max(1, n);
    const branchY = side === 'top' ? 60 : height - 60;
    for (let i = 0; i < n; i++) {
      const x1 = startX + dx * i + dx / 2;
      const y1 = branchY;
      const spineHit = x1 + 50;
      slots.push({
        x1,
        y1,
        x2: spineHit,
        y2: spineY,
        labelX: x1 - 6,
        labelY: side === 'top' ? branchY - 8 : branchY + 16,
      });
    }
    return slots;
  };

  const topSlots = branchSlots(top.length, 'top');
  const bottomSlots = branchSlots(bottom.length, 'bottom');

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-3xl mx-auto">
          {/* Spine */}
          <line x1={40} y1={spineY} x2={width - 60} y2={spineY} stroke="#64748b" strokeWidth={2} />
          {/* Head triangle */}
          <polygon
            points={`${width - 60},${spineY - 14} ${width - 20},${spineY} ${width - 60},${spineY + 14}`}
            fill="#34d399"
            stroke="#10b981"
            strokeWidth={1}
          />
          <text x={width - 60} y={spineY - 22} textAnchor="end" fill="#34d399" fontSize={12} fontWeight={600}>
            Defects
          </text>

          {topSlots.map((s, i) => (
            <g key={`top-${i}`}>
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#94a3b8" strokeWidth={1.5} />
              <text x={s.x1} y={s.labelY} fill="#cbd5e1" fontSize={11}>
                {top[i]}
              </text>
            </g>
          ))}
          {bottomSlots.map((s, i) => (
            <g key={`bot-${i}`}>
              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#94a3b8" strokeWidth={1.5} />
              <text x={s.x1} y={s.labelY} fill="#cbd5e1" fontSize={11}>
                {bottom[i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
      <p className="text-[11px] text-slate-500 mt-1">
        Cause-and-Effect is a structural tool: it organises hypotheses, not data.
      </p>
    </div>
  );
}
