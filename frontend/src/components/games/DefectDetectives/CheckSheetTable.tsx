import { CheckSheetChartData } from './types';

interface Props {
  data: CheckSheetChartData;
  insight: string;
}

/**
 * Heat-map check sheet. Engine returns aggregated defect-type tallies; we
 * render a single-column heat-map sorted by count. Background color scales
 * from emerald (low) → red (high) so the dominant category is visually
 * obvious without pre-narration.
 */
export function CheckSheetTable({ data, insight }: Props) {
  const max = data.rows.reduce((m, r) => Math.max(m, r.count), 0);
  const total = data.rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80">
            <tr className="text-slate-400">
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Defect type</th>
              <th className="px-3 py-2 text-right text-xs uppercase tracking-wide">Tally</th>
              <th className="px-3 py-2 text-right text-xs uppercase tracking-wide">% of total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.rows.map(r => {
              const ratio = max > 0 ? r.count / max : 0;
              const pct = total > 0 ? (r.count / total) * 100 : 0;
              const bg = heatColor(ratio);
              return (
                <tr key={r.defectType} style={{ backgroundColor: bg }}>
                  <td className="px-3 py-2 text-slate-100">{r.defectType}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-100">{r.count}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">{pct.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{insight}</p>
    </div>
  );
}

function heatColor(ratio: number): string {
  // emerald (low) → amber → red (high). All in low-alpha so dark theme survives.
  const r = Math.round(34 + ratio * (248 - 34));
  const g = Math.round(197 - ratio * (197 - 113));
  const b = Math.round(94 - ratio * (94 - 113));
  return `rgba(${r}, ${g}, ${b}, ${0.08 + ratio * 0.22})`;
}
