import { FlowchartChartData } from './types';

interface Props {
  data: FlowchartChartData;
  insight: string;
  scenarioId: string;
}

const FLOWS: Record<string, string[]> = {
  'consumer-goods': [
    'Material intake',
    'Forming / pressing',
    'Painting & cure',
    'In-line inspection',
    'Final QA gate',
    'Pack & dispatch',
  ],
  'quick-commerce': [
    'Order received',
    'Pick from slot',
    'Quality + qty check',
    'Pack with cold chain',
    'Pre-dispatch verify',
    'Hand-off to rider',
  ],
};

export function FlowchartDiagram({ data, insight, scenarioId }: Props) {
  const steps = FLOWS[scenarioId] ?? FLOWS['consumer-goods'];

  return (
    <div className="bg-slate-900/60 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 text-center min-w-[120px]">
              {step}
            </div>
            {i < steps.length - 1 && <span className="text-slate-500">→</span>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-300 mt-3 leading-relaxed">{insight}</p>
      <p className="text-[11px] text-slate-500 mt-1">
        Flowchart is a structural tool: it surfaces missing or ambiguous steps in the process map.
      </p>
      {data.finding && data.finding !== insight && (
        <p className="text-[11px] text-slate-400 mt-1 italic">{data.finding}</p>
      )}
    </div>
  );
}
