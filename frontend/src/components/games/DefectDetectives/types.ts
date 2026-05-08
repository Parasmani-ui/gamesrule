/**
 * Defect Detectives — UI-side type narrowings.
 *
 * Pattern E (per Session 9 engine note): the engine's `publicTools()` strips
 * `reduction` from each tool descriptor. Client-side `ToolDescriptor` MUST
 * also omit `reduction`, so any future engineer who tries to read or send
 * `reduction` for an unapplied tool gets a compile error rather than a
 * runtime hole.
 *
 * Each QC tool has a distinct chartData shape from the engine. We type each
 * result individually rather than letting `any` leak into chart components.
 */

export type ToolKind = 'data-driven' | 'structural';

export interface ToolDescriptor {
  name: string;
  category: string;
  description: string;
  kind: ToolKind;
  // reduction DELIBERATELY OMITTED — engine strips it from publicTools()
}

export interface DefectDataPoint {
  batchId: number;
  shift: string;
  operator: string;
  machine: string;
  defectType: string;
  defectCount: number;
  sampleSize: number;
  timestamp: string;
}

export interface ShiftMeta {
  id: string;
  label: string;
}

export interface DefectTypeMeta {
  id: string;
  label: string;
  category: string;
}

export interface ControlChartPoint {
  batchId: number;
  defectRate: number;
  ucl: number;
  lcl: number;
  outOfControl: boolean;
}

// ---- Per-tool result chart data shapes ----------------------------------

export interface ParetoRow {
  defectType: string;
  count: number;
  pct: number;
  cumulativePct: number;
}
export interface ParetoChartData {
  rows: ParetoRow[];
  total: number;
}

export interface HistogramBin {
  range: string;
  count: number;
}
export interface HistogramChartData {
  mean: number;
  stddev: number;
  bins: HistogramBin[];
}

export interface ControlChartBreach {
  batchId: number;
  rate: number;
}
export interface ControlChartChartData {
  mean: number;
  ucl: number;
  lcl: number;
  breaches: ControlChartBreach[];
}

export interface ScatterPoint {
  x: number;
  y: number;
  machine: string;
}
export interface ScatterChartData {
  points: ScatterPoint[];
  correlation: number;
}

export interface CheckSheetRow {
  defectType: string;
  count: number;
}
export interface CheckSheetChartData {
  rows: CheckSheetRow[];
}

export interface FishboneChartData {
  categories: string[];
  kind: 'structural';
}

export interface FlowchartChartData {
  kind: 'structural';
  finding: string;
}

export interface QCToolApplied {
  tool: string;
  appliedAtBatch: number;
  insight: string;
  defectReduction: number;
  chartData:
    | ParetoChartData
    | HistogramChartData
    | ControlChartChartData
    | ScatterChartData
    | CheckSheetChartData
    | FishboneChartData
    | FlowchartChartData
    | null;
}

export type InspectionStrategy = '100%' | 'sampling' | 'none';

export interface CostBucketSummary {
  total: number;
  prevention: number;
  appraisal: number;
  internalFailure: number;
  externalFailure: number;
  perBatch: number;
  currency: string;
}

export interface DefectDetectivesMetrics {
  defectRates: {
    initial: number;
    current: number;
    target: number;
    reductionPct: number;
  };
  targetAchieved: boolean;
  toolsAppliedCount: number;
  toolsTotal: number;
  costs: CostBucketSummary;
  defects: {
    detected: number;
    passedToCustomer: number;
    detectionRate: number | null;
  };
  performanceGrade: string;
  scenarioId: string;
}

export interface DefectDetectivesUiState {
  scenarioId: string;
  scenarioName: string;
  currencySymbol: string;
  currentBatch: number;
  processedBatchCount: number;
  maxBatches: number;
  currentDefectRate: number;
  targetDefectRate: number;
  initialDefectRate: number;
  batchSize: number;
  availableTools: ToolDescriptor[];
  toolsApplied: string[];
  toolsAppliedDetails: QCToolApplied[];
  inspectionStrategy: InspectionStrategy;
  sampleSize: number;
  totalCost: number;
  isComplete: boolean;
  defectData: DefectDataPoint[];
  controlChartData: ControlChartPoint[];
  defectTypes: DefectTypeMeta[];
  shifts: ShiftMeta[];
  operators: string[];
  machines: string[];
  metrics: DefectDetectivesMetrics;
}

export const TOOL_NAMES = [
  'Check Sheet',
  'Histogram',
  'Pareto Analysis',
  'Cause-and-Effect Diagram',
  'Scatter Diagram',
  'Flowchart',
  'Control Chart',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
