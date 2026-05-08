import { useMemo, useState } from 'react';
import { Filter, Table2 } from 'lucide-react';
import { DefectDataPoint, DefectTypeMeta, ShiftMeta } from './types';

interface Props {
  data: DefectDataPoint[];
  shifts: ShiftMeta[];
  defectTypes: DefectTypeMeta[];
  machines: string[];
}

const ALL = '__all__';

export function DatasetExplorer({ data, shifts, defectTypes, machines }: Props) {
  const [shift, setShift] = useState<string>(ALL);
  const [machine, setMachine] = useState<string>(ALL);
  const [defectType, setDefectType] = useState<string>(ALL);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (shift !== ALL && d.shift !== shift) return false;
      if (machine !== ALL && d.machine !== machine) return false;
      if (defectType !== ALL && d.defectType !== defectType) return false;
      return true;
    });
  }, [data, shift, machine, defectType]);

  const totalDefects = filtered.reduce((s, d) => s + d.defectCount, 0);
  const totalSampled = filtered.reduce((s, d) => s + d.sampleSize, 0);
  const rate = totalSampled > 0 ? (totalDefects / totalSampled) * 100 : 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5 text-sky-300" />
          <h3 className="text-base font-semibold text-white">Warmup dataset</h3>
        </div>
        <p className="text-xs text-slate-400">
          {filtered.length} rows · {totalDefects} defects in {totalSampled} units
          {totalSampled > 0 && (
            <span className="ml-2 text-amber-300 font-mono">{rate.toFixed(2)}%</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <Select
          label="Shift"
          value={shift}
          onChange={setShift}
          options={[
            { value: ALL, label: 'All shifts' },
            ...shifts.map(s => ({ value: s.id, label: s.label })),
          ]}
        />
        <Select
          label="Machine / Zone"
          value={machine}
          onChange={setMachine}
          options={[
            { value: ALL, label: 'All' },
            ...machines.map(m => ({ value: m, label: m })),
          ]}
        />
        <Select
          label="Defect type"
          value={defectType}
          onChange={setDefectType}
          options={[
            { value: ALL, label: 'All defect types' },
            ...defectTypes.map(d => ({ value: d.label, label: d.label })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-900/80 sticky top-0">
            <tr className="text-slate-400">
              <Th>Batch</Th>
              <Th>Shift</Th>
              <Th>Machine</Th>
              <Th>Operator</Th>
              <Th>Defect type</Th>
              <Th className="text-right">Defects</Th>
              <Th className="text-right">Sample</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-6">
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map(d => (
                <tr key={d.batchId} className="hover:bg-slate-900/50">
                  <Td>{d.batchId}</Td>
                  <Td>{d.shift}</Td>
                  <Td>{d.machine}</Td>
                  <Td className="text-slate-400">{d.operator}</Td>
                  <Td>{d.defectType}</Td>
                  <Td className="text-right text-amber-300 font-mono">{d.defectCount}</Td>
                  <Td className="text-right text-slate-400 font-mono">{d.sampleSize}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
        <Filter className="w-3 h-3" />
        Use the QC tools on the right to extract patterns from this data.
      </p>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-left font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-1.5 text-slate-200 ${className}`}>{children}</td>;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-400"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
