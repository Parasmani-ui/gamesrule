import fs from 'fs/promises';
import path from 'path';
import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Defect Detectives — A Quality Control Simulation
 * Author: Dr. Jaya Priyadarshini, Great Lakes Institute of Management, Gurgaon
 *
 * Single-player Quality Control Manager simulation. Apply the canonical
 * 7 QC Tools to a biased dataset, then drive defect rate from 8% → 2%
 * across 20 batches while balancing inspection cost against external
 * failure cost. Two contexts ship out of the box (consumer-goods +
 * quick-commerce dark store) per MS-GAME.txt.
 *
 * Content is externalised to `services/gameEngines/data/defectDetectives/`:
 *   - scenarios.json   — per-context config (currency, batch size, costs, bias)
 *   - tools.json       — canonical 7-tool list + reduction parameters
 *   - defects.json     — per-context defect categories + structural insights
 *   - shifts.json      — per-context shifts / operators / machines
 *
 * Pattern E note for UI: `getPublicState` strips per-tool `reduction`
 * values; UI types should narrow to match (no `reduction` field on
 * client-side tool descriptors before application).
 */

interface ShiftMeta {
  id: string;
  label: string;
}

interface DefectType {
  id: string;
  label: string;
  category: string;
}

interface ToolMeta {
  name: string;
  category: string;
  description: string;
  kind: 'data-driven' | 'structural';
  reduction: number;
  applicableTo: string[];
}

interface BiasProfile {
  dominantDefectShare: number;
  secondaryDefectShare: number;
  dominantMachineShare: number;
  dominantShiftMultiplier: number;
}

interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  currency: string;
  currencySymbol: string;
  factoryName: string;
  unitName: string;
  batchSize: number;
  numBatches: number;
  warmupBatches: number;
  initialDefectRate: number;
  targetDefectRate: number;
  inspectionCostPerUnit: number;
  defectCostPerUnit: number;
  noInspectionDriftPerBatch: number;
  noInspectionDriftCap: number;
  shiftSet: string;
  defectTypeSet: string;
  operatorSet: string;
  machineSet: string;
  structuralInsightSet: string;
  biasProfile: BiasProfile;
}

interface DefectDataPoint {
  batchId: number;
  shift: string;
  operator: string;
  machine: string;
  defectType: string;
  defectCount: number;
  sampleSize: number;
  timestamp: string;
}

interface QCToolResult {
  tool: string;
  appliedAtBatch: number;
  insight: string;
  defectReduction: number;
  chartData: any;
}

interface ControlChartPoint {
  batchId: number;
  defectRate: number;
  ucl: number;
  lcl: number;
  outOfControl: boolean;
}

interface DefectDetectivesGameState {
  sessionId: string;
  participantId: string;
  scenarioId: string;
  scenarioName: string;
  currencySymbol: string;
  config: {
    numBatches: number;
    warmupBatches: number;
    batchSize: number;
    initialDefectRate: number;
    targetDefectRate: number;
    inspectionCostPerUnit: number;
    defectCostPerUnit: number;
    noInspectionDriftPerBatch: number;
    noInspectionDriftCap: number;
  };
  rngState: number;
  currentBatch: number;
  processedBatchCount: number;
  defectData: DefectDataPoint[];
  toolsApplied: QCToolResult[];
  currentDefectRate: number;
  inspectionStrategy: '100%' | 'sampling' | 'none';
  sampleSize: number;
  totalCost: number;
  prevention: { count: number; cost: number };
  appraisal: { count: number; cost: number };
  internalFailure: { count: number; cost: number };
  externalFailure: { count: number; cost: number };
  defectsDetected: number;
  defectsPassedToCustomer: number;
  controlChartData: ControlChartPoint[];
  consecutiveNoInspectBatches: number;
  isComplete: boolean;
}

interface DefectDetectivesInitOptions {
  scenario?: string;
  numBatches?: number;
  initialDefectRate?: number;
  targetDefectRate?: number;
  rngSeed?: number;
}

const DATA_DIR = path.join(__dirname, 'data', 'defectDetectives');

/**
 * Mulberry32 PRNG. Deterministic, seeded by session id hash so two students
 * running the same scenario get the same dataset for facilitator comparison.
 * Closes audit D9 (un-seeded `Math.random` non-reproducibility).
 */
function mulberry32(seed: number): { next: () => number; state: () => number } {
  let s = seed >>> 0;
  return {
    next: () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => s,
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class DefectDetectivesEngine extends BaseGameEngine {
  private state!: DefectDetectivesGameState;
  private toolMeta: Record<string, ToolMeta> = {};
  private canonicalTools: string[] = [];
  private defectTypes: DefectType[] = [];
  private fishboneCategories: string[] = [];
  private flowchartFinding: string = '';
  private shifts: ShiftMeta[] = [];
  private operators: string[] = [];
  private machines: string[] = [];
  private rng!: { next: () => number; state: () => number };

  constructor(sessionId: string) {
    super(sessionId, 'defect-detectives');
  }

  async initialize(options: DefectDetectivesInitOptions = {}): Promise<void> {
    this.log('Initializing Defect Detectives', options);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });
    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }
    const participant = participants[0];

    const scenarioId = options.scenario || 'consumer-goods';
    const scenario = await this.loadScenarioMeta(scenarioId);
    await this.loadToolMeta();
    await this.loadDefects(scenario);
    await this.loadShifts(scenario);

    const seed = options.rngSeed ?? hashString(`${this.sessionId}:${scenarioId}`);
    this.rng = mulberry32(seed);

    const numBatches = options.numBatches ?? scenario.numBatches;
    const initialRate = options.initialDefectRate ?? scenario.initialDefectRate;
    const targetRate = options.targetDefectRate ?? scenario.targetDefectRate;

    const warmupData = this.generateBiasedDefectData(scenario.warmupBatches, initialRate, scenario);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      currencySymbol: scenario.currencySymbol,
      config: {
        numBatches,
        warmupBatches: scenario.warmupBatches,
        batchSize: scenario.batchSize,
        initialDefectRate: initialRate,
        targetDefectRate: targetRate,
        inspectionCostPerUnit: scenario.inspectionCostPerUnit,
        defectCostPerUnit: scenario.defectCostPerUnit,
        noInspectionDriftPerBatch: scenario.noInspectionDriftPerBatch,
        noInspectionDriftCap: scenario.noInspectionDriftCap,
      },
      rngState: this.rng.state(),
      currentBatch: scenario.warmupBatches,
      processedBatchCount: 0,
      defectData: warmupData,
      toolsApplied: [],
      currentDefectRate: initialRate,
      inspectionStrategy: 'sampling',
      sampleSize: 50,
      totalCost: 0,
      prevention: { count: 0, cost: 0 },
      appraisal: { count: 0, cost: 0 },
      internalFailure: { count: 0, cost: 0 },
      externalFailure: { count: 0, cost: 0 },
      defectsDetected: 0,
      defectsPassedToCustomer: 0,
      controlChartData: [],
      consecutiveNoInspectBatches: 0,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log(`Initialized (scenario=${scenario.id}, batches=${numBatches})`);
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  async applyAction(_participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();
    // Canonical contract (CLAUDE.md §5.2): action = { actionType, ...payload }
    // — payload fields live at the top level, never under a nested `data` key.
    const { actionType, ...payload } = action || {};

    if (this.state.isComplete) {
      return { success: false, message: 'Simulation already complete' };
    }

    switch (actionType) {
      case 'apply-qc-tool':
        return await this.applyQCTool(payload);
      case 'set-inspection-strategy':
        return await this.setInspectionStrategy(payload);
      case 'process-batch':
        return await this.processBatch();
      default:
        return { success: false, message: `Unknown action type: ${actionType}` };
    }
  }

  /**
   * DEFECT 1 (Pattern B critical): without canonical-list validation, a
   * client could submit infinite fake tools (`MagicWand1`, `MagicWand2`, …)
   * and stack the default 5% reduction until the target floor was hit.
   */
  private async applyQCTool(data: any): Promise<ActionResult> {
    const tool = data?.tool;

    if (!tool || typeof tool !== 'string') {
      return { success: false, message: 'Please specify which QC tool to apply' };
    }
    if (!this.canonicalTools.includes(tool)) {
      return {
        success: false,
        message: `Unknown QC tool "${tool}". Valid tools: ${this.canonicalTools.join(', ')}`,
      };
    }
    if (this.state.toolsApplied.some(t => t.tool === tool)) {
      return { success: false, message: `${tool} has already been applied` };
    }

    const meta = this.toolMeta[tool];
    const { insight, chartData } = this.deriveToolOutput(tool, meta);

    this.state.currentDefectRate = Math.max(
      this.state.config.targetDefectRate,
      this.state.currentDefectRate * (1 - meta.reduction / 100)
    );

    const result: QCToolResult = {
      tool,
      appliedAtBatch: this.state.currentBatch,
      insight,
      defectReduction: meta.reduction,
      chartData,
    };
    this.state.toolsApplied.push(result);
    this.state.prevention.count += 1;
    this.state.rngState = this.rng.state();

    await this.saveGameState();

    return {
      success: true,
      message: `${tool} applied successfully`,
      data: {
        tool,
        insight,
        defectReduction: meta.reduction,
        newDefectRate: this.state.currentDefectRate,
        toolsAppliedCount: this.state.toolsApplied.length,
        chartData,
      },
    };
  }

  /**
   * Pattern B fix for sampleSize: must be a positive integer within the
   * batch size. Pre-Session-9 the engine accepted negatives (negative
   * inspection cost), NaN, strings, and 1e9.
   */
  private async setInspectionStrategy(data: any): Promise<ActionResult> {
    const { strategy, sampleSize } = data || {};

    if (!['100%', 'sampling', 'none'].includes(strategy)) {
      return { success: false, message: 'Invalid inspection strategy' };
    }

    if (strategy === 'sampling') {
      if (
        typeof sampleSize !== 'number' ||
        !Number.isFinite(sampleSize) ||
        !Number.isInteger(sampleSize) ||
        sampleSize <= 0 ||
        sampleSize > this.state.config.batchSize
      ) {
        return {
          success: false,
          message: `sampleSize must be an integer between 1 and ${this.state.config.batchSize}`,
        };
      }
      this.state.sampleSize = sampleSize;
    }

    this.state.inspectionStrategy = strategy;
    if (strategy !== 'none') {
      this.state.consecutiveNoInspectBatches = 0;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Inspection strategy set to: ${strategy}`,
      data: {
        strategy,
        sampleSize: strategy === 'sampling' ? this.state.sampleSize : undefined,
      },
    };
  }

  private async processBatch(): Promise<ActionResult> {
    const { batchSize, inspectionCostPerUnit, defectCostPerUnit } = this.state.config;

    // DEFECT 4 (pedagogy fix): once defect rate is at target and inspection
    // is off, defect rate drifts up (process unmonitored). Capped at
    // `target + noInspectionDriftCap` percentage points so the sim stays
    // bounded. Restores the cost-benefit trade-off pedagogy.
    if (this.state.inspectionStrategy === 'none') {
      this.state.consecutiveNoInspectBatches += 1;
      const driftCeiling =
        this.state.config.targetDefectRate + this.state.config.noInspectionDriftCap;
      this.state.currentDefectRate = Math.min(
        driftCeiling,
        this.state.currentDefectRate + this.state.config.noInspectionDriftPerBatch
      );
    }

    const defectCount = Math.round(batchSize * (this.state.currentDefectRate / 100));

    let inspectionCost = 0;
    let defectsDetected = 0;
    let defectsPassedToCustomer = 0;

    switch (this.state.inspectionStrategy) {
      case '100%': {
        inspectionCost = batchSize * inspectionCostPerUnit;
        defectsDetected = defectCount;
        defectsPassedToCustomer = 0;
        break;
      }
      case 'sampling': {
        // DEFECT 4 fix: catch rate scales with sample size.
        // catchRate = 1 - (1 - p)^sampleSize, p = 0.005 acuity per unit.
        // sampleSize 50 → ~22%, 200 → ~63%, 500 → ~92%.
        // Add bounded ±5% noise from seeded RNG so two runs differ slightly.
        inspectionCost = this.state.sampleSize * inspectionCostPerUnit;
        const acuity = 0.005;
        const baseCatch = 1 - Math.pow(1 - acuity, this.state.sampleSize);
        const noise = (this.rng.next() - 0.5) * 0.1;
        const catchRate = Math.max(0, Math.min(1, baseCatch + noise));
        defectsDetected = Math.round(defectCount * catchRate);
        defectsPassedToCustomer = Math.max(0, defectCount - defectsDetected);
        break;
      }
      case 'none': {
        inspectionCost = 0;
        defectsDetected = 0;
        defectsPassedToCustomer = defectCount;
        break;
      }
    }

    const internalFailureCost = defectsDetected * defectCostPerUnit * 0.3;
    const externalFailureCost = defectsPassedToCustomer * defectCostPerUnit;
    const batchCost = inspectionCost + internalFailureCost + externalFailureCost;

    this.state.totalCost += batchCost;
    this.state.appraisal.count += 1;
    this.state.appraisal.cost += inspectionCost;
    this.state.internalFailure.count += defectsDetected;
    this.state.internalFailure.cost += internalFailureCost;
    this.state.externalFailure.count += defectsPassedToCustomer;
    this.state.externalFailure.cost += externalFailureCost;
    this.state.defectsDetected += defectsDetected;
    this.state.defectsPassedToCustomer += defectsPassedToCustomer;

    const { ucl, lcl } = this.calculateControlLimits();
    const outOfControl =
      this.state.currentDefectRate > ucl || this.state.currentDefectRate < lcl;
    this.state.controlChartData.push({
      batchId: this.state.currentBatch,
      defectRate: this.state.currentDefectRate,
      ucl,
      lcl,
      outOfControl,
    });

    this.state.processedBatchCount += 1;
    this.state.currentBatch += 1;
    this.state.rngState = this.rng.state();

    if (this.state.currentBatch >= this.state.config.numBatches) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Batch ${this.state.currentBatch - 1} processed`,
      data: {
        batchId: this.state.currentBatch - 1,
        batchSize,
        defectCount,
        defectsDetected,
        defectsPassedToCustomer,
        costs: {
          inspection: inspectionCost,
          internalFailure: internalFailureCost,
          externalFailure: externalFailureCost,
          batch: batchCost,
        },
        cumulativeCost: this.state.totalCost,
        outOfControl,
        currentDefectRate: this.state.currentDefectRate,
        isComplete: this.state.isComplete,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    return {
      success: true,
      message: 'Batch processing',
      roundNumber: this.state.currentBatch,
      isComplete: this.state.isComplete,
    };
  }

  // =========================================================================
  // METRICS — Pattern D: split sync (used by getParticipantState) from
  // async (BaseGameEngine contract). Pre-Session-9 the un-awaited Promise
  // leaked into the UI as `metrics: {}`.
  // =========================================================================

  private computeMetricsSync(): any {
    const { initialDefectRate, targetDefectRate } = this.state.config;
    const reductionPct =
      ((initialDefectRate - this.state.currentDefectRate) / initialDefectRate) * 100;
    const targetAchieved = this.state.currentDefectRate <= targetDefectRate;
    const processed = Math.max(1, this.state.processedBatchCount);
    const detectionRateDenom = this.state.defectsDetected + this.state.defectsPassedToCustomer;

    return {
      defectRates: {
        initial: initialDefectRate,
        current: this.state.currentDefectRate,
        target: targetDefectRate,
        reductionPct,
      },
      targetAchieved,
      toolsAppliedCount: this.state.toolsApplied.length,
      toolsTotal: this.canonicalTools.length,
      costs: {
        currency: this.state.currencySymbol,
        total: this.state.totalCost,
        // DEFECT 3 fix: divide by actual processed-batch count, not the
        // batch index counter (which starts at warmup and is off-by-2x).
        perBatch: this.state.totalCost / processed,
        prevention: this.state.prevention.cost,
        appraisal: this.state.appraisal.cost,
        internalFailure: this.state.internalFailure.cost,
        externalFailure: this.state.externalFailure.cost,
      },
      defects: {
        detected: this.state.defectsDetected,
        passedToCustomer: this.state.defectsPassedToCustomer,
        detectionRate:
          detectionRateDenom > 0
            ? (this.state.defectsDetected / detectionRateDenom) * 100
            : null,
      },
      performanceGrade: this.calculatePerformanceGrade(targetAchieved, reductionPct),
      scenarioId: this.state.scenarioId,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    return this.computeMetricsSync();
  }

  // =========================================================================
  // STATE VIEWS — Pattern A: strip per-tool reduction values from public
  // and pre-application participant state. Players see what the tool *is*
  // and what it costs strategically (it's already applied), not the lookup
  // constant for unapplied tools.
  // =========================================================================

  private publicTools(): { name: string; category: string; description: string; kind: string }[] {
    return this.canonicalTools.map(name => {
      const meta = this.toolMeta[name];
      return {
        name: meta.name,
        category: meta.category,
        description: meta.description,
        kind: meta.kind,
        // reduction DELIBERATELY OMITTED (Pattern A)
      };
    });
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;
    return {
      scenarioId: this.state.scenarioId,
      scenarioName: this.state.scenarioName,
      currencySymbol: this.state.currencySymbol,
      currentBatch: this.state.currentBatch,
      processedBatchCount: this.state.processedBatchCount,
      maxBatches: this.state.config.numBatches,
      currentDefectRate: this.state.currentDefectRate,
      targetDefectRate: this.state.config.targetDefectRate,
      initialDefectRate: this.state.config.initialDefectRate,
      batchSize: this.state.config.batchSize,
      availableTools: this.publicTools(),
      toolsApplied: this.state.toolsApplied.map(t => t.tool),
      inspectionStrategy: this.state.inspectionStrategy,
      sampleSize: this.state.sampleSize,
      totalCost: this.state.totalCost,
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(_participantId: string): any {
    if (!this.isInitialized) return null;
    return {
      ...this.getPublicState(),
      defectData: this.state.defectData,
      toolsAppliedDetails: this.state.toolsApplied,
      controlChartData: this.state.controlChartData,
      defectTypes: this.defectTypes,
      shifts: this.shifts,
      operators: this.operators,
      machines: this.machines,
      // Pattern D: synchronous resolved object, not a Promise
      metrics: this.computeMetricsSync(),
    };
  }

  // =========================================================================
  // TOOL ANALYTICS — DEFECT 2 fix: each data-driven tool computes its
  // insight from the actual `defectData` array. Structural tools (Fishbone,
  // Flowchart) still produce scenario-driven prose because they're structural
  // by design; documented in defects.json.
  // =========================================================================

  private deriveToolOutput(toolName: string, _meta: ToolMeta): { insight: string; chartData: any } {
    switch (toolName) {
      case 'Check Sheet':
        return this.checkSheetAnalysis();
      case 'Histogram':
        return this.histogramAnalysis();
      case 'Pareto Analysis':
        return this.paretoAnalysis();
      case 'Cause-and-Effect Diagram':
        return this.fishboneAnalysis();
      case 'Scatter Diagram':
        return this.scatterAnalysis();
      case 'Flowchart':
        return this.flowchartAnalysis();
      case 'Control Chart':
        return this.controlChartAnalysis();
      default:
        return { insight: 'Analysis completed.', chartData: null };
    }
  }

  private checkSheetAnalysis(): { insight: string; chartData: any } {
    const counts: Record<string, number> = {};
    for (const d of this.state.defectData) {
      counts[d.defectType] = (counts[d.defectType] || 0) + d.defectCount;
    }
    const rows = Object.entries(counts)
      .map(([defectType, count]) => ({ defectType, count }))
      .sort((a, b) => b.count - a.count);
    const top = rows[0];
    return {
      insight: top
        ? `Tally across ${this.state.defectData.length} warmup batches: "${top.defectType}" leads with ${top.count} defects.`
        : 'No defects logged in warmup data.',
      chartData: { rows },
    };
  }

  private histogramAnalysis(): { insight: string; chartData: any } {
    const rates = this.state.defectData.map(d =>
      d.sampleSize > 0 ? (d.defectCount / d.sampleSize) * 100 : 0
    );
    if (rates.length === 0) return { insight: 'Insufficient data for histogram.', chartData: null };
    const mean = rates.reduce((s, x) => s + x, 0) / rates.length;
    const variance = rates.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, rates.length - 1);
    const stddev = Math.sqrt(variance);
    const bins = this.binRates(rates, 6);
    return {
      insight: `Per-batch defect rate distribution: μ=${mean.toFixed(2)}%, σ=${stddev.toFixed(2)}% across ${rates.length} batches.`,
      chartData: { mean, stddev, bins },
    };
  }

  private paretoAnalysis(): { insight: string; chartData: any } {
    const counts: Record<string, number> = {};
    for (const d of this.state.defectData) {
      counts[d.defectType] = (counts[d.defectType] || 0) + d.defectCount;
    }
    const total = Object.values(counts).reduce((s, x) => s + x, 0);
    const sorted = Object.entries(counts)
      .map(([defectType, count]) => ({ defectType, count, pct: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
    let cum = 0;
    const rows = sorted.map(r => {
      cum += r.pct;
      return { ...r, cumulativePct: cum };
    });
    const top2 = rows.slice(0, 2);
    const top2Pct = top2.reduce((s, r) => s + r.pct, 0);
    return {
      insight:
        top2.length === 2
          ? `Top 2 defect categories ("${top2[0].defectType}" and "${top2[1].defectType}") account for ${top2Pct.toFixed(1)}% of all defects.`
          : 'Insufficient defect categories for Pareto analysis.',
      chartData: { rows, total },
    };
  }

  private fishboneAnalysis(): { insight: string; chartData: any } {
    return {
      insight: `Likely root-cause categories for this context: ${this.fishboneCategories.join('; ')}.`,
      chartData: { categories: this.fishboneCategories, kind: 'structural' },
    };
  }

  private scatterAnalysis(): { insight: string; chartData: any } {
    const points = this.state.defectData.map(d => ({
      x: this.machines.indexOf(d.machine),
      y: d.defectCount,
      machine: d.machine,
    }));
    if (points.length < 2) return { insight: 'Insufficient data for scatter analysis.', chartData: null };
    const r = correlation(
      points.map(p => p.x),
      points.map(p => p.y)
    );
    const direction = r > 0.2 ? 'positive' : r < -0.2 ? 'negative' : 'weak';
    return {
      insight: `Machine vs defect-count correlation r=${r.toFixed(2)} (${direction}). Higher-indexed machines ${
        r > 0.2 ? 'tend to produce more defects' : r < -0.2 ? 'tend to produce fewer defects' : 'show no clear pattern'
      }.`,
      chartData: { points, correlation: r },
    };
  }

  private flowchartAnalysis(): { insight: string; chartData: any } {
    return {
      insight: this.flowchartFinding,
      chartData: { kind: 'structural', finding: this.flowchartFinding },
    };
  }

  private controlChartAnalysis(): { insight: string; chartData: any } {
    const rates = this.state.defectData.map(d =>
      d.sampleSize > 0 ? (d.defectCount / d.sampleSize) * 100 : 0
    );
    if (rates.length < 3) return { insight: 'Insufficient data for control chart.', chartData: null };
    const mean = rates.reduce((s, x) => s + x, 0) / rates.length;
    const variance = rates.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, rates.length - 1);
    const stddev = Math.sqrt(variance);
    const ucl = mean + 3 * stddev;
    const lcl = Math.max(0, mean - 3 * stddev);
    const breaches = this.state.defectData
      .map((d, i) => ({ batchId: d.batchId, rate: rates[i] }))
      .filter(p => p.rate > ucl || p.rate < lcl);
    return {
      insight:
        breaches.length > 0
          ? `μ=${mean.toFixed(2)}%, UCL=${ucl.toFixed(2)}%, LCL=${lcl.toFixed(2)}%. ${breaches.length} warmup batch(es) breached limits — special-cause variation present.`
          : `μ=${mean.toFixed(2)}%, UCL=${ucl.toFixed(2)}%, LCL=${lcl.toFixed(2)}%. Process appears in statistical control across warmup data.`,
      chartData: { mean, ucl, lcl, breaches },
    };
  }

  private binRates(rates: number[], binCount: number): { range: string; count: number }[] {
    if (rates.length === 0) return [];
    const lo = Math.min(...rates);
    const hi = Math.max(...rates);
    const span = Math.max(0.001, hi - lo);
    const width = span / binCount;
    const bins = new Array(binCount).fill(0);
    for (const r of rates) {
      const idx = Math.min(binCount - 1, Math.floor((r - lo) / width));
      bins[idx] += 1;
    }
    return bins.map((count, i) => ({
      range: `${(lo + i * width).toFixed(2)}-${(lo + (i + 1) * width).toFixed(2)}%`,
      count,
    }));
  }

  // =========================================================================
  // CONTROL LIMITS — used by processBatch (live SPC chart)
  // =========================================================================

  private calculateControlLimits(): { ucl: number; lcl: number } {
    const recentData = this.state.controlChartData.slice(-10);
    if (recentData.length < 3) {
      return {
        ucl: this.state.config.initialDefectRate * 1.5,
        lcl: Math.max(0, this.state.config.initialDefectRate * 0.5),
      };
    }
    const mean = recentData.reduce((sum, d) => sum + d.defectRate, 0) / recentData.length;
    const variance =
      recentData.reduce((sum, d) => sum + (d.defectRate - mean) ** 2, 0) / Math.max(1, recentData.length - 1);
    const stdDev = Math.sqrt(variance);
    return { ucl: mean + 3 * stdDev, lcl: Math.max(0, mean - 3 * stdDev) };
  }

  private calculatePerformanceGrade(targetAchieved: boolean, reductionRate: number): string {
    if (targetAchieved && reductionRate >= 70) return 'Excellent (Six Sigma Level)';
    if (targetAchieved && reductionRate >= 50) return 'Very Good';
    if (reductionRate >= 40) return 'Good';
    if (reductionRate >= 25) return 'Fair';
    return 'Needs Improvement';
  }

  // =========================================================================
  // BIASED DATA GENERATION — DEFECT 2 / D8 fix. Without bias, Pareto /
  // Fishbone / Scatter would find no pattern in the dataset they're meant
  // to teach. The bias profile is loaded per-scenario so the dominant
  // defect / machine / shift is plausible for the context.
  // =========================================================================

  private generateBiasedDefectData(
    count: number,
    defectRate: number,
    scenario: ScenarioMeta
  ): DefectDataPoint[] {
    const data: DefectDataPoint[] = [];
    const sampleSize = 100;
    const bias = scenario.biasProfile;
    const dominantDefect = this.defectTypes[0];
    const secondaryDefect = this.defectTypes[1] || this.defectTypes[0];
    const dominantMachine = this.machines[Math.min(1, this.machines.length - 1)];
    const dominantShift = this.shifts[Math.min(1, this.shifts.length - 1)];

    for (let i = 0; i < count; i++) {
      const shift = this.weightedPick(this.shifts.map(s => s.id), id =>
        id === dominantShift.id ? bias.dominantShiftMultiplier : 1
      );
      const operator = this.operators[Math.floor(this.rng.next() * this.operators.length)];
      const machine = this.weightedPick(this.machines, m =>
        m === dominantMachine ? bias.dominantMachineShare * this.machines.length : 1 - bias.dominantMachineShare
      );
      const defectType = this.weightedPick(
        this.defectTypes.map(d => d.label),
        label => {
          if (label === dominantDefect.label) return bias.dominantDefectShare;
          if (label === secondaryDefect.label) return bias.secondaryDefectShare;
          return Math.max(0.01, 1 - bias.dominantDefectShare - bias.secondaryDefectShare) /
            Math.max(1, this.defectTypes.length - 2);
        }
      );

      const shiftMult = shift === dominantShift.id ? bias.dominantShiftMultiplier : 1;
      const machineMult = machine === dominantMachine ? 1.3 : 0.85;
      const noise = 0.85 + this.rng.next() * 0.3;
      const rawCount = sampleSize * (defectRate / 100) * shiftMult * machineMult * noise;
      const defectCount = Math.max(0, Math.round(rawCount));

      data.push({
        batchId: i + 1,
        shift,
        operator,
        machine,
        defectType,
        defectCount,
        sampleSize,
        timestamp: new Date(Date.now() - (count - i) * 8 * 3600 * 1000).toISOString(),
      });
    }
    return data;
  }

  private weightedPick<T>(items: T[], weight: (item: T) => number): T {
    const weights = items.map(weight);
    const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
    if (total <= 0) return items[0];
    let r = this.rng.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  // =========================================================================
  // CONTENT LOADERS
  // =========================================================================

  private async loadScenarioMeta(scenarioId: string): Promise<ScenarioMeta> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'scenarios.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { scenarios: Record<string, ScenarioMeta>; defaultScenario: string };
    const scenario = parsed.scenarios[scenarioId];
    if (!scenario) {
      const known = Object.keys(parsed.scenarios).join(', ');
      throw new Error(`Unknown Defect Detectives scenario: "${scenarioId}". Known scenarios: ${known}`);
    }
    return scenario;
  }

  private async loadToolMeta(): Promise<void> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'tools.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { canonicalTools: string[]; tools: Record<string, ToolMeta> };
    this.canonicalTools = parsed.canonicalTools;
    this.toolMeta = parsed.tools;
    for (const name of this.canonicalTools) {
      if (!this.toolMeta[name]) {
        throw new Error(`tools.json missing entry for canonical tool "${name}"`);
      }
    }
  }

  private async loadDefects(scenario: ScenarioMeta): Promise<void> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'defects.json'), 'utf-8');
    const parsed = JSON.parse(raw) as {
      defectTypeSets: Record<string, DefectType[]>;
      fishboneCategories: Record<string, string[]>;
      flowchartFindings: Record<string, string>;
    };
    const set = parsed.defectTypeSets[scenario.defectTypeSet];
    if (!set) throw new Error(`defects.json: unknown defectTypeSet "${scenario.defectTypeSet}"`);
    this.defectTypes = set;
    this.fishboneCategories = parsed.fishboneCategories[scenario.structuralInsightSet] || [];
    this.flowchartFinding = parsed.flowchartFindings[scenario.structuralInsightSet] || 'Process map reviewed.';
  }

  private async loadShifts(scenario: ScenarioMeta): Promise<void> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'shifts.json'), 'utf-8');
    const parsed = JSON.parse(raw) as {
      shiftSets: Record<string, ShiftMeta[]>;
      operatorSets: Record<string, string[]>;
      machineSets: Record<string, string[]>;
    };
    const shiftSet = parsed.shiftSets[scenario.shiftSet];
    const operatorSet = parsed.operatorSets[scenario.operatorSet];
    const machineSet = parsed.machineSets[scenario.machineSet];
    if (!shiftSet || !operatorSet || !machineSet) {
      throw new Error(`shifts.json: missing set for scenario "${scenario.id}"`);
    }
    this.shifts = shiftSet;
    this.operators = operatorSet;
    this.machines = machineSet;
  }

  private async saveGameState(): Promise<void> {
    try {
      await prisma.sessionStateCache.upsert({
        where: { session_id: this.sessionId },
        update: { state_data: this.state as any, updated_at: new Date() },
        create: { session_id: this.sessionId, state_data: this.state as any },
      });
    } catch (err) {
      this.log('Warning: could not persist state', err);
    }
  }
}

// Pearson correlation coefficient. Used by the Scatter Diagram tool to
// surface real correlations from the dataset.
function correlation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}
