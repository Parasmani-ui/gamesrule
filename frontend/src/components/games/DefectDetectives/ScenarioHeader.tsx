import { Factory, Target, TrendingDown } from 'lucide-react';

interface Props {
  scenarioName: string;
  currentBatch: number;
  processedBatchCount: number;
  maxBatches: number;
  currentDefectRate: number;
  targetDefectRate: number;
  initialDefectRate: number;
}

export function ScenarioHeader({
  scenarioName,
  currentBatch,
  processedBatchCount,
  maxBatches,
  currentDefectRate,
  targetDefectRate,
  initialDefectRate,
}: Props) {
  const pct = Math.min(100, Math.max(0, (processedBatchCount / Math.max(1, maxBatches)) * 100));
  const onTarget = currentDefectRate <= targetDefectRate;
  const reductionPct =
    initialDefectRate > 0
      ? ((initialDefectRate - currentDefectRate) / initialDefectRate) * 100
      : 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Factory className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">QC scenario</p>
            <h2 className="text-lg font-semibold text-white">{scenarioName}</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <Stat
            label="Batch"
            value={`${Math.min(currentBatch, maxBatches)} / ${maxBatches}`}
            tone="slate"
          />
          <Stat
            label="Defect rate"
            value={`${currentDefectRate.toFixed(2)}%`}
            tone={onTarget ? 'emerald' : 'amber'}
            icon={<TrendingDown className="w-4 h-4" />}
          />
          <Stat
            label="Target"
            value={`${targetDefectRate.toFixed(1)}%`}
            tone="indigo"
            icon={<Target className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>
            {reductionPct >= 0 ? '−' : '+'}
            {Math.abs(reductionPct).toFixed(1)}% from start
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-900/70 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'emerald' | 'amber' | 'indigo';
  icon?: JSX.Element;
}) {
  const toneColor = {
    slate: 'text-slate-200',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    indigo: 'text-indigo-300',
  }[tone];
  return (
    <div className="bg-slate-900/60 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-base font-semibold mt-0.5 flex items-center gap-1.5 ${toneColor}`}>
        {icon}
        {value}
      </p>
    </div>
  );
}
