import { Lightbulb } from 'lucide-react';
import {
  CheckSheetChartData,
  ControlChartChartData,
  ControlChartPoint,
  FishboneChartData,
  FlowchartChartData,
  HistogramChartData,
  ParetoChartData,
  QCToolApplied,
  ScatterChartData,
} from './types';
import { ParetoChart } from './ParetoChart';
import { ControlChart } from './ControlChart';
import { HistogramChart } from './HistogramChart';
import { ScatterChart } from './ScatterChart';
import { CheckSheetTable } from './CheckSheetTable';
import { FishboneDiagram } from './FishboneDiagram';
import { FlowchartDiagram } from './FlowchartDiagram';

interface Props {
  applied: QCToolApplied[];
  scenarioId: string;
  machines: string[];
  liveControlData: ControlChartPoint[];
}

export function ToolResultPanel({ applied, scenarioId, machines, liveControlData }: Props) {
  if (applied.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-dashed border-slate-700 rounded-2xl p-6 text-center text-sm text-slate-400">
        <Lightbulb className="w-5 h-5 mx-auto mb-2 text-slate-500" />
        Apply a QC tool from the right panel to extract insights from the data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applied.map(result => (
        <div
          key={result.tool}
          className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Tool result</p>
              <h3 className="text-base font-semibold text-white">{result.tool}</h3>
            </div>
            <span className="text-[11px] text-slate-500">
              applied at batch {result.appliedAtBatch}
            </span>
          </div>
          {renderChart(result, scenarioId, machines, liveControlData)}
        </div>
      ))}
    </div>
  );
}

function renderChart(
  result: QCToolApplied,
  scenarioId: string,
  machines: string[],
  liveControlData: ControlChartPoint[]
) {
  const { tool, chartData, insight } = result;
  if (!chartData) {
    return <p className="text-sm text-slate-300">{insight}</p>;
  }
  switch (tool) {
    case 'Pareto Analysis':
      return <ParetoChart data={chartData as ParetoChartData} insight={insight} />;
    case 'Control Chart':
      return (
        <ControlChart
          data={chartData as ControlChartChartData}
          insight={insight}
          liveControlData={liveControlData}
        />
      );
    case 'Histogram':
      return <HistogramChart data={chartData as HistogramChartData} insight={insight} />;
    case 'Scatter Diagram':
      return (
        <ScatterChart
          data={chartData as ScatterChartData}
          insight={insight}
          machines={machines}
        />
      );
    case 'Check Sheet':
      return <CheckSheetTable data={chartData as CheckSheetChartData} insight={insight} />;
    case 'Cause-and-Effect Diagram':
      return <FishboneDiagram data={chartData as FishboneChartData} insight={insight} />;
    case 'Flowchart':
      return (
        <FlowchartDiagram
          data={chartData as FlowchartChartData}
          insight={insight}
          scenarioId={scenarioId}
        />
      );
    default:
      return <p className="text-sm text-slate-300">{insight}</p>;
  }
}
