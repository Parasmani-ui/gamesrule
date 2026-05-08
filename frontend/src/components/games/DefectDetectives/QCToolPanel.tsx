import {
  BarChart2,
  CheckSquare,
  GitBranch,
  LineChart,
  ScatterChart,
  Sigma,
  Workflow,
} from 'lucide-react';
import { ToolDescriptor, isToolName } from './types';

interface Props {
  tools: ToolDescriptor[];
  applied: string[];
  selected: string | null;
  onSelect: (tool: string) => void;
  onApply: (tool: string) => void;
  isComplete: boolean;
  submitting: boolean;
}

const TOOL_ICONS: Record<string, JSX.Element> = {
  'Check Sheet': <CheckSquare className="w-4 h-4" />,
  Histogram: <BarChart2 className="w-4 h-4" />,
  'Pareto Analysis': <BarChart2 className="w-4 h-4" />,
  'Cause-and-Effect Diagram': <GitBranch className="w-4 h-4" />,
  'Scatter Diagram': <ScatterChart className="w-4 h-4" />,
  Flowchart: <Workflow className="w-4 h-4" />,
  'Control Chart': <LineChart className="w-4 h-4" />,
};

export function QCToolPanel({
  tools,
  applied,
  selected,
  onSelect,
  onApply,
  isComplete,
  submitting,
}: Props) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sigma className="w-5 h-5 text-emerald-300" />
        <h3 className="text-base font-semibold text-white">7 QC Tools</h3>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Select a tool to inspect, then apply it to extract an insight from the data. Each tool can
        be applied once per session.
      </p>

      <div className="space-y-2">
        {tools.map(tool => {
          const isApplied = applied.includes(tool.name);
          const isSelected = selected === tool.name;
          // Defense in depth: only render registered tool names. Engine will
          // reject anything else (Pattern B) — we don't bypass.
          const recognised = isToolName(tool.name);
          if (!recognised) return null;

          return (
            <button
              key={tool.name}
              type="button"
              disabled={isApplied || isComplete}
              onClick={() => onSelect(tool.name)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                isApplied
                  ? 'bg-emerald-500/10 border-emerald-500/40 cursor-default'
                  : isSelected
                  ? 'bg-slate-900/80 border-emerald-400'
                  : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`${
                      isApplied ? 'text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    {TOOL_ICONS[tool.name] ?? <Sigma className="w-4 h-4" />}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isApplied ? 'text-emerald-200' : 'text-slate-100'
                    }`}
                  >
                    {tool.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    tool.kind === 'data-driven' ? 'text-sky-300' : 'text-amber-300'
                  }`}
                >
                  {tool.kind === 'data-driven' ? 'data' : 'structural'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-snug">{tool.description}</p>

              {!isApplied && isSelected && (
                <button
                  type="button"
                  disabled={submitting || isComplete}
                  onClick={e => {
                    e.stopPropagation();
                    onApply(tool.name);
                  }}
                  className="mt-2.5 w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded-md"
                >
                  {submitting ? 'Applying…' : `Apply ${tool.name}`}
                </button>
              )}
              {isApplied && (
                <p className="text-[11px] text-emerald-300 mt-1.5">Applied</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
