/**
 * Demand Forecast Challenge — client-side types.
 *
 * Pattern E (CLAUDE.md §15) — Type narrowing as second-line defense.
 *
 * The engine's `getPublicState` deliberately omits the true demand pattern,
 * the optimal method, the recommended-method list, and the un-revealed
 * future demand series (sanitization boundary documented at
 * `DemandForecastEngine.getPublicState` / `getParticipantState`).
 *
 * The client `PublicState` type narrows to match exactly that stripped shape.
 * A future engineer who writes `state.truePattern` during the game gets a
 * **TypeScript compile error**, not a runtime surprise.
 *
 * Pattern A reveals (truePattern, optimalMethod, recommendedMethods,
 * patternRationale, fullDemandData, sub-scores, optimalMethodChoiceCount)
 * live on `ParticipantState` and ONLY inside an `IfComplete` sub-shape that
 * the engine populates after `isComplete === true`. Reading those fields
 * mid-game is therefore a type error too.
 */

// =============================================================================
// CANONICAL ENUMS — must match engine constants exactly.
// =============================================================================

export type DemandPattern = 'stationary' | 'trending' | 'seasonal' | 'random';

export const PATTERN_OPTIONS: readonly DemandPattern[] = [
  'stationary',
  'trending',
  'seasonal',
  'random',
] as const;

export type CanonicalMethod =
  | 'naive'
  | 'moving-average'
  | 'weighted-moving-average'
  | 'exponential-smoothing'
  | 'holts-double-es'
  | 'linear-regression';

export type Phase = 'pattern-inference' | 'forecasting';

// =============================================================================
// METHOD PARAMS — one shape per canonical method.
// =============================================================================

export type NaiveParams = Record<string, never>;

export interface MovingAverageParams {
  n: number;
}

export interface WMAParams {
  weights: number[];
}

export interface ESParams {
  alpha: number;
}

export interface HoltsParams {
  alpha: number;
  beta: number;
}

export type LinearRegressionParams = Record<string, never>;

export type MethodParams =
  | NaiveParams
  | MovingAverageParams
  | WMAParams
  | ESParams
  | HoltsParams
  | LinearRegressionParams;

// =============================================================================
// METHOD METADATA — broadcast in publicState.availableMethods. Matches
// `methods.json` shape from the engine. Loaded once per scenario; immutable.
// =============================================================================

export interface MethodParamSchema {
  type: 'integer' | 'number' | 'number-array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  sumTo?: number;
  sumTolerance?: number;
  description?: string;
}

export interface MethodMetadata {
  id: CanonicalMethod;
  label: string;
  formula: string;
  description: string;
  params: Record<string, MethodParamSchema>;
}

// =============================================================================
// PUBLIC STATE — what every socket in the room sees.
//
// PATTERN E ENFORCEMENT: this type DELIBERATELY OMITS
//   - truePattern / demandPattern
//   - optimalMethod
//   - recommendedMethods
//   - patternRationale
//   - fullDemandData (un-revealed future periods)
//   - scenarioName (the long, pattern-encoding label)
//
// Reading `state.truePattern` mid-game = compile error. Confirmed by mirroring
// EV Gambit's PublicState narrowing (Session 7).
// =============================================================================

export interface DemandForecastPublicState {
  scenarioId: string;
  /** Pattern-NEUTRAL display name. Never leaks the pattern. */
  displayName: string;
  currencySymbol: string;
  totalPeriods: number;
  warmupPeriods: number;
  availableMethods: MethodMetadata[];
  patternOptions: DemandPattern[];
}

// =============================================================================
// FORECAST HISTORY ENTRY — what arrives back in `playerForecasts`.
//
// Pattern A: `usedRecommendedMethod` is stripped by the engine until
// `isComplete`. We mark it optional + only-after-complete to match.
// =============================================================================

export interface ForecastHistoryEntry {
  period: number;
  forecast: number;
  actual: number;
  method: CanonicalMethod;
  params: MethodParams;
  error: number;
  absoluteError: number;
  percentageError: number | null;
  /** Engine omits this field until isComplete. */
  usedRecommendedMethod?: boolean;
}

export interface CumulativeMetrics {
  mad: number;
  mse: number;
  mape: number;
  trackingSignal: number;
  mapeExcludedCount: number;
}

// Sub-scores are null mid-game by engine contract; reveal post-complete.
export interface DemandForecastMetricsView {
  playerPerformance: {
    mad: number;
    mse: number;
    mape: number;
    trackingSignal: number;
    mapeExcludedPeriods: number;
    inferenceScore: number | null;
    methodAppropriatenessScore: number | null;
    accuracyScore: number | null;
    finalScore: number | null;
    scoringWeights: {
      inference: number;
      methodAppropriateness: number;
      accuracy: number;
    };
    optimalMethodChoiceCount: number | null;
  };
  truePattern: DemandPattern | null;
  optimalMethod: CanonicalMethod | null;
  inferenceGuess: DemandPattern | null;
  forecastsCount: number;
}

// =============================================================================
// PARTICIPANT STATE
//
// The base shape is what's visible at all times. Reveal fields live in the
// `ifComplete` sub-shape: when `isComplete === true`, the engine populates
// them; otherwise they are `undefined`. Code that reads them must check
// `isComplete` first, OR live inside the post-game scorecard (DF-3b).
// =============================================================================

export interface DemandForecastParticipantState extends DemandForecastPublicState {
  participantId: string;
  phase: Phase;
  currentPeriod: number;
  /** Visible history slice — never includes future periods mid-game. */
  historicalDemand: number[];
  playerForecasts: ForecastHistoryEntry[];
  inferenceGuess: DemandPattern | null;
  cumulativeMetrics: CumulativeMetrics;
  metrics: DemandForecastMetricsView;
  isComplete: boolean;

  // ---- post-complete reveals (Pattern A gate) ---------------------------
  // Engine sets these only when isComplete === true. Treat as undefined
  // until then, and consume from the DF-3b scorecard.
  truePattern?: DemandPattern;
  optimalMethod?: CanonicalMethod;
  recommendedMethods?: CanonicalMethod[];
  patternRationale?: string;
  fullDemandData?: number[];
}

// =============================================================================
// ACTION PAYLOADS — what we send to onAction.
// The engine's `applyAction` discriminates on action.phase / action.method.
// =============================================================================

export interface PatternInferenceAction {
  phase: 'pattern-inference';
  guess: DemandPattern;
}

export interface ForecastAction {
  method: CanonicalMethod;
  params: MethodParams;
}
