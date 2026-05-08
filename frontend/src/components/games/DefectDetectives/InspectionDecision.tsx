import { useEffect, useState } from 'react';
import { ClipboardCheck, ShieldCheck, ShieldOff } from 'lucide-react';
import { InspectionStrategy } from './types';

interface Props {
  currentStrategy: InspectionStrategy;
  currentSampleSize: number;
  batchSize: number;
  inspectionCostPerUnit: number;
  defectCostPerUnit: number;
  currencySymbol: string;
  currentDefectRate: number;
  onSetStrategy: (strategy: InspectionStrategy, sampleSize?: number) => void;
  onProcessBatch: () => void;
  submitting: boolean;
  isComplete: boolean;
}

export function InspectionDecision({
  currentStrategy,
  currentSampleSize,
  batchSize,
  inspectionCostPerUnit,
  defectCostPerUnit,
  currencySymbol,
  currentDefectRate,
  onSetStrategy,
  onProcessBatch,
  submitting,
  isComplete,
}: Props) {
  const [strategy, setStrategy] = useState<InspectionStrategy>(currentStrategy);
  const [sampleSize, setSampleSize] = useState<number>(currentSampleSize);
  const [sampleError, setSampleError] = useState<string | null>(null);

  useEffect(() => {
    setStrategy(currentStrategy);
    setSampleSize(currentSampleSize);
  }, [currentStrategy, currentSampleSize]);

  const sampleSizeForCost =
    strategy === '100%' ? batchSize : strategy === 'sampling' ? sampleSize : 0;
  const inspectionCostEstimate = sampleSizeForCost * inspectionCostPerUnit;
  const expectedDefects = Math.round(batchSize * (currentDefectRate / 100));
  const acuity = 0.005;
  const baseCatch =
    strategy === '100%'
      ? 1
      : strategy === 'sampling'
      ? 1 - Math.pow(1 - acuity, sampleSize)
      : 0;
  const expectedCaught = Math.round(expectedDefects * baseCatch);
  const expectedEscape = Math.max(0, expectedDefects - expectedCaught);
  const externalCostEstimate = expectedEscape * defectCostPerUnit;
  const internalCostEstimate = Math.round(expectedCaught * defectCostPerUnit * 0.3);
  const totalEstimate = inspectionCostEstimate + internalCostEstimate + externalCostEstimate;

  const handleStrategyChange = (next: InspectionStrategy) => {
    setStrategy(next);
    setSampleError(null);
    if (next !== 'sampling') {
      onSetStrategy(next);
    }
  };

  const handleSampleCommit = () => {
    if (
      !Number.isFinite(sampleSize) ||
      !Number.isInteger(sampleSize) ||
      sampleSize <= 0 ||
      sampleSize > batchSize
    ) {
      setSampleError(`Sample size must be a whole number between 1 and ${batchSize}.`);
      return;
    }
    setSampleError(null);
    onSetStrategy('sampling', sampleSize);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-amber-300" />
        <h3 className="text-base font-semibold text-white">Inspection plan for next batch</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StrategyButton
          label="100% inspection"
          sublabel={`Inspect all ${batchSize} units`}
          icon={<ShieldCheck className="w-4 h-4" />}
          active={strategy === '100%'}
          onClick={() => handleStrategyChange('100%')}
        />
        <StrategyButton
          label="Sampling"
          sublabel="Inspect a sample"
          icon={<ShieldCheck className="w-4 h-4" />}
          active={strategy === 'sampling'}
          onClick={() => handleStrategyChange('sampling')}
        />
        <StrategyButton
          label="No inspection"
          sublabel="Save inspection cost"
          icon={<ShieldOff className="w-4 h-4" />}
          active={strategy === 'none'}
          onClick={() => handleStrategyChange('none')}
        />
      </div>

      {strategy === 'sampling' && (
        <div className="bg-slate-900/60 rounded-lg p-3 space-y-2">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Sample size (1–{batchSize})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={batchSize}
              step={1}
              value={sampleSize}
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                setSampleSize(Number.isFinite(v) ? v : 0);
                setSampleError(null);
              }}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-100 w-32 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={handleSampleCommit}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold"
            >
              Confirm
            </button>
          </div>
          {sampleError && <p className="text-xs text-red-300">{sampleError}</p>}
          <p className="text-[11px] text-slate-500">
            Catch rate scales with sample size. Server is authoritative on cost and detection.
          </p>
        </div>
      )}

      <div className="bg-slate-900/50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <CostStat label="Inspection" value={`${currencySymbol}${inspectionCostEstimate.toLocaleString()}`} tone="sky" />
        <CostStat label="Internal failure" value={`${currencySymbol}${internalCostEstimate.toLocaleString()}`} tone="amber" />
        <CostStat label="External failure" value={`${currencySymbol}${externalCostEstimate.toLocaleString()}`} tone="red" />
        <CostStat label="Estimated total" value={`${currencySymbol}${totalEstimate.toLocaleString()}`} tone="emerald" />
      </div>

      <button
        type="button"
        disabled={submitting || isComplete}
        onClick={onProcessBatch}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg"
      >
        {submitting ? 'Processing batch…' : 'Process next batch →'}
      </button>
    </div>
  );
}

function StrategyButton({
  label,
  sublabel,
  icon,
  active,
  onClick,
}: {
  label: string;
  sublabel: string;
  icon: JSX.Element;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-colors ${
        active
          ? 'bg-emerald-500/10 border-emerald-500/60'
          : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'
      }`}
    >
      <div className={`flex items-center gap-2 ${active ? 'text-emerald-200' : 'text-slate-200'}`}>
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>
    </button>
  );
}

function CostStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'sky' | 'amber' | 'red' | 'emerald';
}) {
  const color = {
    sky: 'text-sky-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
    emerald: 'text-emerald-300',
  }[tone];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono font-semibold ${color}`}>{value}</p>
    </div>
  );
}
