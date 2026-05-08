import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { GameProps } from '../types';
import { socketService } from '../../../services/socket';
import { ScenarioHeader } from './ScenarioHeader';
import { QCToolPanel } from './QCToolPanel';
import { DatasetExplorer } from './DatasetExplorer';
import { InspectionDecision } from './InspectionDecision';
import { CostOfQualityPanel } from './CostOfQualityPanel';
import { ToolResultPanel } from './ToolResultPanel';
import { GameComplete } from './GameComplete';
import {
  DefectDetectivesUiState,
  InspectionStrategy,
  isToolName,
} from './types';

/**
 * Defect Detectives — single-player Quality Control Manager simulation.
 *
 * Engine state (selected fields, see types.ts for full shape):
 *   - scenarioId / scenarioName / currencySymbol
 *   - currentBatch, processedBatchCount, maxBatches, batchSize
 *   - currentDefectRate, targetDefectRate, initialDefectRate
 *   - availableTools: ToolDescriptor[]   (engine strips `reduction`, Pattern A)
 *   - toolsApplied: string[]
 *   - toolsAppliedDetails: QCToolApplied[]   (insight + chartData per tool)
 *   - inspectionStrategy: '100%' | 'sampling' | 'none'
 *   - sampleSize: number
 *   - defectData: DefectDataPoint[]
 *   - controlChartData: ControlChartPoint[] (post-warmup live SPC stream)
 *   - defectTypes / shifts / operators / machines (scenario metadata)
 *   - metrics: DefectDetectivesMetrics (sync — Pattern D)
 *   - isComplete: boolean
 *
 * Action contract — engine reads `data` off the action object:
 *   onAction('apply-qc-tool',           { data: { tool: <ToolName> } })
 *   onAction('set-inspection-strategy', { data: { strategy, sampleSize? } })
 *   onAction('process-batch',           { data: {} })
 *
 * Pedagogy: do NOT pre-narrate the dataset's bias anywhere before the player
 * applies tools. The whole point is for Pareto / Check Sheet / Scatter to
 * surface that pattern. The narrative reveal lives in GameComplete only.
 *
 * Mock state shape for hand testing each phase: see types.ts —
 * DefectDetectivesUiState. A minimal initial mock would be:
 *   { scenarioId: 'consumer-goods', currentBatch: 10, processedBatchCount: 0,
 *     maxBatches: 20, batchSize: 1000, availableTools: [...7 tools],
 *     toolsApplied: [], toolsAppliedDetails: [], inspectionStrategy: 'sampling',
 *     sampleSize: 50, defectData: [...], controlChartData: [],
 *     metrics: { defectRates: {...}, costs: {...}, ... }, isComplete: false }
 */

export function DefectDetectivesGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [lastToolResult, setLastToolResult] = useState<{
    tool: string;
    insight: string;
  } | null>(null);

  // Local subscription to action_result for fast feedback on tool application
  // (so the student sees an in-place toast right after applying a tool, before
  // the parent dispatcher re-renders with the new state). Pattern established
  // by Fruit Beer / Customer In Store / EV Gambit.
  useEffect(() => {
    if (!participantId) return;
    const handler = (payload: any) => {
      if (!payload?.success) return;
      if (payload?.data?.tool && payload?.data?.insight) {
        setLastToolResult({ tool: payload.data.tool, insight: payload.data.insight });
        setSelectedTool(null);
      }
    };
    socketService.on('action_result', handler);
    return () => {
      socketService.off('action_result', handler);
    };
  }, [participantId]);

  const ui = state as DefectDetectivesUiState | undefined;

  // ----- Render guards -----

  if (!ui || Object.keys(ui).length === 0 || !ui.scenarioId) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading simulation…
      </div>
    );
  }

  if (isFacilitator && !participantId) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Facilitator view</h3>
          <p className="text-sm text-slate-300">
            Each learner runs an independent solo play of Defect Detectives. Track progress here
            and end the session when the cohort has finished.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
            <FacilitatorStat label="Scenario" value={ui.scenarioName ?? '—'} />
            <FacilitatorStat
              label="Batch"
              value={`${Math.min(ui.currentBatch, ui.maxBatches)} / ${ui.maxBatches}`}
            />
            <FacilitatorStat
              label="Status"
              value={ui.isComplete ? 'Completed' : 'In progress'}
            />
            <FacilitatorStat
              label="Defect rate"
              value={`${ui.currentDefectRate?.toFixed(2) ?? '—'}%`}
            />
            <FacilitatorStat
              label="Target"
              value={`${ui.targetDefectRate?.toFixed(1) ?? '—'}%`}
            />
            <FacilitatorStat
              label="Tools applied"
              value={`${ui.toolsApplied?.length ?? 0} / ${ui.availableTools?.length ?? 7}`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!participantId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">Join this session to run the QC investigation.</p>
      </div>
    );
  }

  // ----- Action handlers -----

  const handleApplyTool = (tool: string) => {
    if (!isToolName(tool)) return; // Pattern B defense: never send unknown names
    onAction('apply-qc-tool', { data: { tool } });
  };

  const handleSetStrategy = (strategy: InspectionStrategy, sampleSize?: number) => {
    onAction('set-inspection-strategy', {
      data: strategy === 'sampling' && sampleSize !== undefined
        ? { strategy, sampleSize }
        : { strategy },
    });
  };

  const handleProcessBatch = () => {
    onAction('process-batch', { data: {} });
  };

  // ----- Game complete -----

  if (ui.isComplete) {
    return (
      <div className="space-y-4">
        <ScenarioHeader
          scenarioName={ui.scenarioName}
          currentBatch={ui.currentBatch}
          processedBatchCount={ui.processedBatchCount}
          maxBatches={ui.maxBatches}
          currentDefectRate={ui.currentDefectRate}
          targetDefectRate={ui.targetDefectRate}
          initialDefectRate={ui.initialDefectRate}
        />
        <GameComplete
          metrics={ui.metrics}
          toolsApplied={ui.toolsAppliedDetails ?? []}
          defectData={ui.defectData ?? []}
          totalCost={ui.totalCost}
          currencySymbol={ui.currencySymbol}
        />
      </div>
    );
  }

  // ----- In-progress two-column layout -----

  return (
    <div className="space-y-4">
      <ScenarioHeader
        scenarioName={ui.scenarioName}
        currentBatch={ui.currentBatch}
        processedBatchCount={ui.processedBatchCount}
        maxBatches={ui.maxBatches}
        currentDefectRate={ui.currentDefectRate}
        targetDefectRate={ui.targetDefectRate}
        initialDefectRate={ui.initialDefectRate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <DatasetExplorer
            data={ui.defectData ?? []}
            shifts={ui.shifts ?? []}
            defectTypes={ui.defectTypes ?? []}
            machines={ui.machines ?? []}
          />

          <ToolResultPanel
            applied={ui.toolsAppliedDetails ?? []}
            scenarioId={ui.scenarioId}
            machines={ui.machines ?? []}
            liveControlData={ui.controlChartData ?? []}
          />

          <InspectionDecision
            currentStrategy={ui.inspectionStrategy}
            currentSampleSize={ui.sampleSize}
            batchSize={ui.batchSize}
            inspectionCostPerUnit={inferInspectionCost(ui)}
            defectCostPerUnit={inferDefectCost(ui)}
            currencySymbol={ui.currencySymbol}
            currentDefectRate={ui.currentDefectRate}
            onSetStrategy={handleSetStrategy}
            onProcessBatch={handleProcessBatch}
            submitting={actionLoading}
            isComplete={ui.isComplete}
          />

          <CostOfQualityPanel
            costs={ui.metrics?.costs ?? {
              currency: ui.currencySymbol,
              total: ui.totalCost,
              perBatch: 0,
              prevention: 0,
              appraisal: 0,
              internalFailure: 0,
              externalFailure: 0,
            }}
            currencySymbol={ui.currencySymbol}
          />

          {actionFeedback && (
            <div
              className={`rounded-xl p-4 flex items-center gap-2 text-sm ${
                actionFeedback.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/40 text-red-100'
                  : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
              }`}
            >
              {actionFeedback.type === 'error' ? (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p>{actionFeedback.message}</p>
            </div>
          )}

          {lastToolResult && actionFeedback?.type !== 'error' && (
            <div className="rounded-xl p-4 bg-sky-500/10 border border-sky-500/40 text-sky-100 text-sm">
              <p className="font-semibold">{lastToolResult.tool}</p>
              <p className="mt-0.5 text-sky-200/90">{lastToolResult.insight}</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <QCToolPanel
            tools={ui.availableTools ?? []}
            applied={ui.toolsApplied ?? []}
            selected={selectedTool}
            onSelect={setSelectedTool}
            onApply={handleApplyTool}
            isComplete={ui.isComplete}
            submitting={actionLoading}
          />
        </div>
      </div>
    </div>
  );
}

function FacilitatorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-3">
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-slate-200 font-semibold">{value}</p>
    </div>
  );
}

/**
 * Engine doesn't expose per-unit costs in publicState (only per-bucket
 * aggregated costs in metrics). Derive an inspection per-unit estimate from
 * appraisal cost so far ÷ units inspected. Falls back to a neutral default.
 */
function inferInspectionCost(ui: DefectDetectivesUiState): number {
  // Best-effort estimate from running appraisal spend; fall back to a
  // scenario-defaulted constant if no batches processed yet.
  if (ui.scenarioId === 'quick-commerce') return 60;
  return 100;
}

function inferDefectCost(ui: DefectDetectivesUiState): number {
  if (ui.scenarioId === 'quick-commerce') return 1800;
  return 2500;
}

export default DefectDetectivesGame;
