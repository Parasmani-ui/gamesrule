import fs from 'fs/promises';
import path from 'path';
import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Demand Forecast Challenge — Time-Series Forecasting Drill
 *
 * Operations-management curriculum (Stevenson Ch. 3, Heizer Ch. 4,
 * Chase & Jacobs Ch. 17–18). Two-phase single-player drill, one
 * concurrent state per participant in a session.
 *
 *   phase 'pattern-inference' — player sees the warmup demand series
 *     with NO pattern label and guesses which of the four canonical
 *     patterns it is.
 *   phase 'forecasting' — per-period: pick a method + params, engine
 *     computes the forecast and grades it on MAD/MSE/MAPE/Tracking-
 *     Signal. Headline pedagogy is method-appropriateness, not just
 *     accuracy.
 *
 * Phase 1.5 — Session DF-2b. Builds on DF-2a's foundation (six method
 * helpers + seeded RNG + validation + async/sync split) to add the
 * pedagogy layer:
 *   - Pattern-inference action (audit M1)
 *   - Per-participant state map (audit M4 / D15)
 *   - Pattern hidden from publicState (audit D11/D14 — Pattern A)
 *   - 3-component scoring: inference + method-appropriateness +
 *     accuracy (audit M2/M9)
 *   - optimalMethodUsed → per-period counter (audit D17)
 *
 * Content externalised under data/demandForecast/:
 *   scenarios.json              — pattern parameters + scoring weights
 *   methods.json                — canonical 6 methods + param schemas
 *   patternRecommendations.json — pattern→recommended-methods +
 *                                 inference partial-credit matrix
 *
 * Sanitization boundary (security/pedagogy-critical, mirror EV Gambit's
 * stripQuiz pattern):
 *   - getPublicState NEVER emits the true demand pattern, the optimal
 *     method, the un-revealed future demand series, scenario `name`
 *     (which encodes the pattern), or `truePatternHash` derivatives.
 *   - getParticipantState REVEALS truePattern + optimalMethod +
 *     inferenceResult ONLY when state.isComplete === true.
 *   - All publicly visible scenario identifiers use `displayName` (a
 *     pattern-neutral label faculty chooses).
 */

type DemandPattern = 'stationary' | 'trending' | 'seasonal' | 'random';
const PATTERN_ENUM: DemandPattern[] = ['stationary', 'trending', 'seasonal', 'random'];

type CanonicalMethod =
  | 'naive'
  | 'moving-average'
  | 'weighted-moving-average'
  | 'exponential-smoothing'
  | 'holts-double-es'
  | 'linear-regression';

type Phase = 'pattern-inference' | 'forecasting';

interface ScoringWeights {
  inference: number;
  methodAppropriateness: number;
  accuracy: number;
}

interface ScenarioMeta {
  id: string;
  name: string;
  displayName: string;
  description: string;
  pattern: DemandPattern;
  baseLevel: number;
  slope: number;
  sineAmplitude: number;
  sinePeriod: number;
  noiseAmplitude: number;
  numPeriods: number;
  warmupPeriods: number;
  currency: string;
  currencySymbol: string;
  scoringWeights: ScoringWeights;
}

interface MethodParamSchema {
  type: 'integer' | 'number' | 'number-array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  sumTo?: number;
  sumTolerance?: number;
}

interface MethodMeta {
  id: CanonicalMethod;
  label: string;
  formula: string;
  description: string;
  params: Record<string, MethodParamSchema>;
}

interface PatternRecommendation {
  recommended: CanonicalMethod[];
  rationale: string;
  limitation?: string;
}

interface RecommendationsData {
  patterns: Record<DemandPattern, PatternRecommendation>;
  inferencePartialCredit: Record<DemandPattern, Record<DemandPattern, number>>;
}

interface ForecastEntry {
  period: number;
  forecast: number;
  actual: number;
  method: CanonicalMethod;
  params: any;
  error: number;
  absoluteError: number;
  percentageError: number | null;
  usedRecommendedMethod: boolean; // resolved against TRUE pattern
}

interface InferenceRecord {
  guess: DemandPattern;
  submittedAt: string;
}

interface ParticipantStateDF {
  sessionId: string;
  participantId: string;
  phase: Phase;
  historicalDemand: number[];
  rngState: number;
  currentPeriod: number;
  totalPeriods: number;
  warmupPeriods: number;
  scenarioId: string;
  truePattern: DemandPattern;
  scoringWeights: ScoringWeights;
  playerForecasts: ForecastEntry[];
  inference?: InferenceRecord;
  optimalMethodChoiceCount: number;
  cumulativeMetrics: {
    mad: number;
    mse: number;
    mape: number;
    trackingSignal: number;
    mapeExcludedCount: number;
  };
  isComplete: boolean;
}

interface DemandForecastInitOptions {
  scenario?: string;
  numPeriods?: number;
  warmupPeriods?: number;
  rngSeed?: number;
  historicalDemand?: number[];
}

const DATA_DIR = path.join(__dirname, 'data', 'demandForecast');
const MAPE_EPSILON = 1e-9;
const FORECAST_HARD_CAP = 1e9;

/**
 * Mulberry32 PRNG. Deterministic, seeded by sessionId + participantId +
 * scenarioId so each student gets a different-but-reproducible series.
 * Mirrors Defect Detectives Session 9 PRNG. Closes audit D8.
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

export class DemandForecastEngine extends BaseGameEngine {
  // Shared engine-level content (loaded from JSON once per engine
  // instance and immutable thereafter).
  private canonicalMethods: CanonicalMethod[] = [];
  private methodMeta: Record<CanonicalMethod, MethodMeta> = {} as any;
  private scenarioMeta!: ScenarioMeta;
  private recommendations!: RecommendationsData;
  private initOptions: DemandForecastInitOptions = {};

  // Per-participant state (audit M4 fix).
  private participantStates: Map<string, ParticipantStateDF> = new Map();

  constructor(sessionId: string) {
    super(sessionId, 'demand-forecast-challenge');
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  async initialize(options: DemandForecastInitOptions = {}): Promise<void> {
    this.log('Initializing Demand Forecast Challenge', options);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });
    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    await this.loadMethodMeta();
    await this.loadRecommendations();
    const scenarioId = options.scenario || 'default';
    this.scenarioMeta = await this.loadScenarioMeta(scenarioId);

    const totalPeriods = options.numPeriods ?? this.scenarioMeta.numPeriods;
    const warmupPeriods = options.warmupPeriods ?? this.scenarioMeta.warmupPeriods;

    if (!Number.isInteger(totalPeriods) || totalPeriods <= 0) {
      throw new Error('numPeriods must be a positive integer');
    }
    if (!Number.isInteger(warmupPeriods) || warmupPeriods < 1) {
      throw new Error('warmupPeriods must be a positive integer (>=1)');
    }
    if (warmupPeriods >= totalPeriods) {
      throw new Error(
        `warmupPeriods (${warmupPeriods}) must be less than numPeriods (${totalPeriods}) — closes audit D10.`
      );
    }

    this.initOptions = { ...options, numPeriods: totalPeriods, warmupPeriods };

    // Try to restore per-participant state from cache. Old DF-2a payloads
    // are flat-state (no participantStates map); treat as stale.
    let restored = 0;
    try {
      const cached = await prisma.sessionStateCache.findUnique({
        where: { session_id: this.sessionId },
      });
      const map = (cached?.state_data as any)?.participantStates;
      if (map && typeof map === 'object') {
        for (const [pid, st] of Object.entries(map)) {
          const candidate = st as Partial<ParticipantStateDF>;
          if (
            typeof candidate.phase === 'string' &&
            Array.isArray(candidate.historicalDemand) &&
            Array.isArray(candidate.playerForecasts)
          ) {
            this.participantStates.set(pid, candidate as ParticipantStateDF);
            restored++;
          }
        }
      }
    } catch (err) {
      this.log('Cache restore failed; starting fresh', err);
    }

    // Lazy-create fresh state for any participant without a cached entry.
    for (const p of participants) {
      if (!this.participantStates.has(p.id)) {
        this.participantStates.set(p.id, this.makeFreshState(p.id));
      }
    }

    await this.saveGameState(true);
    this.isInitialized = true;
    this.log(
      `Initialized (scenario=${scenarioId}, participants=${this.participantStates.size}, restored=${restored})`
    );
  }

  /**
   * Generate a fresh per-participant state. Seeded RNG keyed on
   * (sessionId, participantId, scenarioId) so two students in the same
   * session get DIFFERENT demand series but a student replaying their
   * own seat sees the SAME series. Audit M4 + D8.
   *
   * If options.historicalDemand is provided, all participants use the
   * same injected series (test-only escape hatch).
   */
  private makeFreshState(participantId: string): ParticipantStateDF {
    const scenario = this.scenarioMeta;
    const totalPeriods = this.initOptions.numPeriods ?? scenario.numPeriods;
    const warmupPeriods = this.initOptions.warmupPeriods ?? scenario.warmupPeriods;
    const seed =
      this.initOptions.rngSeed ??
      hashString(`${this.sessionId}:${participantId}:${scenario.id}`);
    const rng = mulberry32(seed);

    const historicalDemand =
      this.initOptions.historicalDemand && this.initOptions.historicalDemand.length === totalPeriods
        ? this.initOptions.historicalDemand.slice()
        : this.generateDemandPattern(scenario, totalPeriods, rng);

    return {
      sessionId: this.sessionId,
      participantId,
      phase: 'pattern-inference',
      historicalDemand,
      rngState: rng.state(),
      currentPeriod: warmupPeriods,
      totalPeriods,
      warmupPeriods,
      scenarioId: scenario.id,
      truePattern: scenario.pattern,
      scoringWeights: scenario.scoringWeights,
      playerForecasts: [],
      optimalMethodChoiceCount: 0,
      cumulativeMetrics: {
        mad: 0,
        mse: 0,
        mape: 0,
        trackingSignal: 0,
        mapeExcludedCount: 0,
      },
      isComplete: false,
    };
  }

  // =========================================================================
  // ACTIONS — dispatch on `phase` discriminator or method presence
  // =========================================================================

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    if (typeof participantId !== 'string' || !participantId) {
      return { success: false, message: 'participantId is required' };
    }

    // Lazy-create state for unknown participants (mirror EV Gambit pattern
    // — keeps the engine resilient when a participant joins mid-session).
    if (!this.participantStates.has(participantId)) {
      this.participantStates.set(participantId, this.makeFreshState(participantId));
    }

    const state = this.participantStates.get(participantId)!;
    if (state.isComplete) {
      return { success: false, message: 'Simulation already complete' };
    }

    // Pattern-inference action.
    if (action?.phase === 'pattern-inference' || action?.guess !== undefined) {
      return this.handlePatternInference(state, action);
    }

    // Forecast action (DF-2a contract: { method, params }).
    if (typeof action?.method === 'string') {
      return this.handleForecast(state, action);
    }

    return {
      success: false,
      message: 'Unknown action shape. Expected { phase: "pattern-inference", guess } or { method, params }.',
    };
  }

  /**
   * PART A — pattern-inference handler.
   *
   * Pattern B: `guess` must be one of the 4 canonical pattern enums.
   * Pattern C: rejected unless engine is in 'pattern-inference' phase.
   */
  private async handlePatternInference(
    state: ParticipantStateDF,
    action: any
  ): Promise<ActionResult> {
    if (state.phase !== 'pattern-inference') {
      return {
        success: false,
        message: 'Pattern inference already submitted; engine is in the forecasting phase.',
      };
    }

    const guess = action?.guess;
    if (!PATTERN_ENUM.includes(guess)) {
      return {
        success: false,
        message: `Invalid pattern guess "${String(guess)}". Valid: ${PATTERN_ENUM.join(', ')}`,
      };
    }

    state.inference = {
      guess,
      submittedAt: new Date().toISOString(),
    };
    state.phase = 'forecasting';

    await this.saveGameState();

    return {
      success: true,
      message: 'Pattern inference recorded. Forecasting phase open.',
      data: {
        phase: state.phase,
        guess,
        // True pattern + score remain HIDDEN until isComplete (Pattern A).
      },
    };
  }

  /**
   * Forecast action — unchanged contract from DF-2a:
   * { method: CanonicalMethod, params: {...} }. The engine computes
   * the forecast from helpers; the client never supplies a number.
   *
   * Pattern C: rejected unless engine is in 'forecasting' phase.
   * Pattern B: method enum + per-param schema validation.
   */
  private async handleForecast(state: ParticipantStateDF, action: any): Promise<ActionResult> {
    if (state.phase !== 'forecasting') {
      return {
        success: false,
        message: 'Submit a pattern inference first before forecasting.',
      };
    }

    const { method, params } = action;

    if (!this.canonicalMethods.includes(method as CanonicalMethod)) {
      return {
        success: false,
        message: `Unknown forecasting method "${String(method)}". Valid methods: ${this.canonicalMethods.join(', ')}`,
      };
    }

    const methodId = method as CanonicalMethod;
    const meta = this.methodMeta[methodId];
    const history = state.historicalDemand.slice(0, state.currentPeriod);

    const validation = this.validateMethodParams(meta, params || {}, history.length);
    if (!validation.ok) {
      return { success: false, message: validation.message };
    }

    let forecast: number;
    try {
      forecast = this.computeForecast(methodId, history, params || {}, state.currentPeriod);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Forecast computation failed' };
    }

    if (!Number.isFinite(forecast)) {
      return {
        success: false,
        message: 'Method computation failed — params likely unstable for this data.',
      };
    }
    if (Math.abs(forecast) > FORECAST_HARD_CAP) {
      return {
        success: false,
        message: `Computed forecast magnitude exceeds the safety cap (${FORECAST_HARD_CAP}). Try gentler smoothing constants.`,
      };
    }

    const actualDemand = state.historicalDemand[state.currentPeriod];
    const error = actualDemand - forecast;
    const absoluteError = Math.abs(error);

    // Audit D7 — MAPE skip-period for zero-actual demand.
    let percentageError: number | null = null;
    if (Math.abs(actualDemand) > MAPE_EPSILON) {
      percentageError = (absoluteError / Math.abs(actualDemand)) * 100;
    } else {
      state.cumulativeMetrics.mapeExcludedCount += 1;
    }

    // Audit D17 — per-period counter instead of sticky-true flag. The
    // "recommended" check uses the TRUE pattern (engine-side); leaking
    // this would tip off the student which pattern they're in, so the
    // count itself stays hidden until isComplete via the metrics gate.
    const recommended = this.recommendations.patterns[state.truePattern].recommended;
    const usedRecommendedMethod = recommended.includes(methodId);
    if (usedRecommendedMethod) {
      state.optimalMethodChoiceCount += 1;
    }

    state.playerForecasts.push({
      period: state.currentPeriod,
      forecast,
      actual: actualDemand,
      method: methodId,
      params: params || {},
      error,
      absoluteError,
      percentageError,
      usedRecommendedMethod,
    });

    this.updateCumulativeMetrics(state);

    state.currentPeriod += 1;
    if (state.currentPeriod >= state.totalPeriods) {
      state.isComplete = true;
    }

    await this.saveGameState();

    // Action result: ONLY player-known facts pre-completion (forecast,
    // actual, errors, accuracy). Method-appropriateness flag and
    // optimal-method label remain server-side until isComplete.
    return {
      success: true,
      message: `Forecast recorded for period ${state.currentPeriod - 1}`,
      data: {
        period: state.currentPeriod - 1,
        method: methodId,
        params: params || {},
        forecast,
        actual: actualDemand,
        error,
        absoluteError,
        percentageError,
        cumulativeMetrics: state.cumulativeMetrics,
        isComplete: state.isComplete,
        // No optimalMethod / no usedRecommendedMethod / no score here —
        // those reveal only via getParticipantState after isComplete.
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    // Demand Forecast is player-paced and per-participant; advanceRound
    // is a no-op that just mirrors the first participant's progression
    // so the BaseGameEngine contract is satisfied.
    const anyState = this.participantStates.values().next().value;
    return {
      success: true,
      message: 'Player-paced simulation',
      roundNumber: anyState ? anyState.currentPeriod : 0,
      isComplete: anyState ? anyState.isComplete : false,
      isGameComplete: anyState ? anyState.isComplete : false,
    };
  }

  // =========================================================================
  // METHOD HELPERS (DF-2a) — unchanged behavior, refactored to take an
  // RNG parameter so per-participant data generation can pass its own.
  // =========================================================================

  private computeForecast(
    method: CanonicalMethod,
    history: number[],
    params: any,
    periodIndex: number
  ): number {
    switch (method) {
      case 'naive':
        return this.computeNaive(history);
      case 'moving-average':
        return this.computeMovingAverage(history, params);
      case 'weighted-moving-average':
        return this.computeWeightedMovingAverage(history, params);
      case 'exponential-smoothing':
        return this.computeExponentialSmoothing(history, params);
      case 'holts-double-es':
        return this.computeHoltsDoubleES(history, params);
      case 'linear-regression':
        return this.computeLinearRegression(history, params, periodIndex);
    }
  }

  /** Naive: F(t+1) = A(t). */
  private computeNaive(history: number[]): number {
    if (history.length === 0) {
      throw new Error('Naive forecast requires at least one prior observation.');
    }
    return history[history.length - 1];
  }

  /** MA(n): F(t+1) = mean of last n observations. */
  private computeMovingAverage(history: number[], params: { n: number }): number {
    const n = params.n;
    if (n > history.length) {
      throw new Error(`Moving Average n=${n} exceeds available history (${history.length}).`);
    }
    const slice = history.slice(history.length - n);
    return slice.reduce((s, x) => s + x, 0) / n;
  }

  /**
   * WMA: F(t+1) = Σ weights[i] · A(t-i). weights[0] is most-recent.
   * Caller-supplied weights must sum to 1 (within ε). Validation enforced
   * up-front in validateMethodParams; this helper assumes a clean schema.
   */
  private computeWeightedMovingAverage(history: number[], params: { weights: number[] }): number {
    const weights = params.weights;
    if (weights.length > history.length) {
      throw new Error(
        `Weighted Moving Average needs ${weights.length} prior periods; only ${history.length} available.`
      );
    }
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i] * history[history.length - 1 - i];
    }
    return sum;
  }

  /**
   * ES: F(t+1) = α·A(t) + (1-α)·F(t).
   *
   * Initialization (Stevenson Ch. 3 / Heizer Ch. 4): F(0) = A(0). The
   * geometrically-decaying bias from this seeding is the conventional
   * textbook choice; documented per audit §2.1.
   */
  private computeExponentialSmoothing(history: number[], params: { alpha: number }): number {
    const alpha = params.alpha;
    if (history.length === 0) {
      throw new Error('Exponential Smoothing requires at least one prior observation.');
    }
    let f = history[0];
    for (let t = 0; t < history.length; t++) {
      f = alpha * history[t] + (1 - alpha) * f;
    }
    return f;
  }

  /**
   * Holt's Double ES (linear-trend variant).
   *
   * Initialization (Hyndman §7.3 / Heizer Ch. 4): L(0) = A(0);
   * T(0) = A(1) - A(0). Requires history.length ≥ 2.
   */
  private computeHoltsDoubleES(
    history: number[],
    params: { alpha: number; beta: number }
  ): number {
    const { alpha, beta } = params;
    if (history.length < 2) {
      throw new Error("Holt's Double ES requires at least two prior observations.");
    }
    let level = history[0];
    let trend = history[1] - history[0];
    for (let t = 1; t < history.length; t++) {
      const prevLevel = level;
      level = alpha * history[t] + (1 - alpha) * (prevLevel + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    return level + trend;
  }

  /**
   * Linear Regression — full-cumulative least-squares fit. 0-indexed
   * periods. Pass `periodIndex` explicitly to forecast a specific
   * period; default = history.length (next period after history).
   */
  private computeLinearRegression(
    history: number[],
    _params: any,
    periodIndex?: number
  ): number {
    const n = history.length;
    if (n < 2) {
      throw new Error('Linear Regression requires at least two prior observations.');
    }
    let sumT = 0;
    let sumA = 0;
    for (let i = 0; i < n; i++) {
      sumT += i;
      sumA += history[i];
    }
    const meanT = sumT / n;
    const meanA = sumA / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const dt = i - meanT;
      num += dt * (history[i] - meanA);
      den += dt * dt;
    }
    if (den === 0) {
      throw new Error('Linear Regression: zero variance in time index — cannot fit.');
    }
    const b = num / den;
    const a = meanA - b * meanT;
    const period = typeof periodIndex === 'number' ? periodIndex : n;
    return a + b * period;
  }

  // =========================================================================
  // PARAM VALIDATION
  // =========================================================================

  private validateMethodParams(
    meta: MethodMeta,
    params: any,
    historyLength: number
  ): { ok: true } | { ok: false; message: string } {
    for (const [key, schema] of Object.entries(meta.params)) {
      const value = params[key];
      if (value === undefined || value === null) {
        return { ok: false, message: `Missing required parameter "${key}" for ${meta.label}.` };
      }
      switch (schema.type) {
        case 'integer': {
          if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
            return { ok: false, message: `Parameter "${key}" must be an integer.` };
          }
          if (schema.min !== undefined && value < schema.min) {
            return {
              ok: false,
              message: `Parameter "${key}" must be ≥ ${schema.min} (got ${value}).`,
            };
          }
          if (schema.max !== undefined && value > schema.max) {
            return {
              ok: false,
              message: `Parameter "${key}" must be ≤ ${schema.max} (got ${value}).`,
            };
          }
          if (key === 'n' && value > historyLength) {
            return {
              ok: false,
              message: `Parameter "n"=${value} exceeds available history (${historyLength}).`,
            };
          }
          break;
        }
        case 'number': {
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            return { ok: false, message: `Parameter "${key}" must be a finite number.` };
          }
          if (schema.min !== undefined && value < schema.min) {
            return {
              ok: false,
              message: `Parameter "${key}" must be ≥ ${schema.min} (got ${value}).`,
            };
          }
          if (schema.max !== undefined && value > schema.max) {
            return {
              ok: false,
              message: `Parameter "${key}" must be ≤ ${schema.max} (got ${value}).`,
            };
          }
          break;
        }
        case 'number-array': {
          if (!Array.isArray(value)) {
            return { ok: false, message: `Parameter "${key}" must be an array of numbers.` };
          }
          if (schema.minLength !== undefined && value.length < schema.minLength) {
            return {
              ok: false,
              message: `Parameter "${key}" must have at least ${schema.minLength} elements.`,
            };
          }
          if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            return {
              ok: false,
              message: `Parameter "${key}" must have at most ${schema.maxLength} elements.`,
            };
          }
          for (const x of value) {
            if (typeof x !== 'number' || !Number.isFinite(x)) {
              return { ok: false, message: `Parameter "${key}" must contain only finite numbers.` };
            }
          }
          if (value.length > historyLength) {
            return {
              ok: false,
              message: `Parameter "${key}" length (${value.length}) exceeds available history (${historyLength}).`,
            };
          }
          if (schema.sumTo !== undefined) {
            const sum = value.reduce((s, x) => s + x, 0);
            const tol = schema.sumTolerance ?? 0.001;
            if (Math.abs(sum - schema.sumTo) > tol) {
              return {
                ok: false,
                message: `Parameter "${key}" must sum to ${schema.sumTo} within ±${tol} (got ${sum.toFixed(4)}).`,
              };
            }
          }
          break;
        }
      }
    }
    return { ok: true };
  }

  // =========================================================================
  // METRICS — Pattern D: sync helper for views; async wrapper for the
  // BaseGameEngine contract.
  // =========================================================================

  private updateCumulativeMetrics(state: ParticipantStateDF): void {
    const n = state.playerForecasts.length;
    if (n === 0) return;

    const sumAbs = state.playerForecasts.reduce((s, f) => s + f.absoluteError, 0);
    const sumSq = state.playerForecasts.reduce((s, f) => s + f.error * f.error, 0);
    const sumErr = state.playerForecasts.reduce((s, f) => s + f.error, 0);

    const mapeIncluded = state.playerForecasts.filter(f => f.percentageError !== null);
    const sumPct = mapeIncluded.reduce((s, f) => s + (f.percentageError as number), 0);

    state.cumulativeMetrics.mad = sumAbs / n;
    state.cumulativeMetrics.mse = sumSq / n;
    state.cumulativeMetrics.mape = mapeIncluded.length > 0 ? sumPct / mapeIncluded.length : 0;
    state.cumulativeMetrics.trackingSignal =
      state.cumulativeMetrics.mad !== 0 ? sumErr / state.cumulativeMetrics.mad : 0;
  }

  /**
   * PART C — three-component scoring.
   *
   * Inference component: `inferencePartialCredit[guess][truth]` from
   *   patternRecommendations.json. 100 / 60 / 30 / 0 per the matrix.
   * Method-appropriateness: `usedRecommendedMethod` count / total forecasts.
   * Accuracy: `max(0, 100 - mape)`.
   * Final score: weighted blend per scenario's scoringWeights.
   */
  private computePartScores(state: ParticipantStateDF): {
    inferenceScore: number;
    methodAppropriatenessScore: number;
    accuracyScore: number;
    finalScore: number;
  } {
    let inferenceScore = 0;
    if (state.inference) {
      inferenceScore =
        this.recommendations.inferencePartialCredit[state.inference.guess]?.[state.truePattern] ?? 0;
    }

    const totalForecasts = state.playerForecasts.length;
    const methodAppropriatenessScore =
      totalForecasts > 0 ? (state.optimalMethodChoiceCount / totalForecasts) * 100 : 0;

    const accuracyScore = Math.max(0, 100 - state.cumulativeMetrics.mape);

    const w = state.scoringWeights;
    const finalScore =
      w.inference * inferenceScore +
      w.methodAppropriateness * methodAppropriatenessScore +
      w.accuracy * accuracyScore;

    return { inferenceScore, methodAppropriatenessScore, accuracyScore, finalScore };
  }

  private computeMetricsSyncFor(state: ParticipantStateDF): any {
    const scores = this.computePartScores(state);
    return {
      playerPerformance: {
        mad: state.cumulativeMetrics.mad,
        mse: state.cumulativeMetrics.mse,
        mape: state.cumulativeMetrics.mape,
        trackingSignal: state.cumulativeMetrics.trackingSignal,
        mapeExcludedPeriods: state.cumulativeMetrics.mapeExcludedCount,
        // Score components — sub-scores are only meaningful after the
        // game is complete (mid-game accuracy can be misleading); we
        // still publish them as live diagnostics, but final-score gate
        // is the player-facing one.
        inferenceScore: state.isComplete ? scores.inferenceScore : null,
        methodAppropriatenessScore: state.isComplete
          ? scores.methodAppropriatenessScore
          : null,
        accuracyScore: state.isComplete ? scores.accuracyScore : null,
        finalScore: state.isComplete ? scores.finalScore : null,
        scoringWeights: state.scoringWeights,
        optimalMethodChoiceCount: state.isComplete ? state.optimalMethodChoiceCount : null,
      },
      // Pattern A: NEVER leak truePattern / optimalMethod mid-game.
      truePattern: state.isComplete ? state.truePattern : null,
      optimalMethod: state.isComplete
        ? this.recommendations.patterns[state.truePattern].recommended[0]
        : null,
      inferenceGuess: state.inference?.guess ?? null,
      forecastsCount: state.playerForecasts.length,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    const anyState = this.participantStates.values().next().value;
    if (!anyState) return {};
    return this.computeMetricsSyncFor(anyState);
  }

  // =========================================================================
  // STATE VIEWS — Pattern A sanitization boundary.
  //
  // getPublicState is broadcast to the whole room and is the lowest-trust
  // surface. It must contain NOTHING that lets a player derive the true
  // pattern.
  //
  // getParticipantState is sent only to the owning socket. It may include
  // the participant's OWN inference guess, OWN forecasts, OWN cumulative
  // accuracy. It MUST NOT reveal truePattern, optimalMethod, or the
  // method-appropriateness flag on individual forecasts UNTIL isComplete.
  // =========================================================================

  getPublicState(): any {
    if (!this.isInitialized) return null;
    return {
      scenarioId: this.scenarioMeta.id,
      displayName: this.scenarioMeta.displayName,
      currencySymbol: this.scenarioMeta.currencySymbol,
      totalPeriods: this.initOptions.numPeriods ?? this.scenarioMeta.numPeriods,
      warmupPeriods: this.initOptions.warmupPeriods ?? this.scenarioMeta.warmupPeriods,
      availableMethods: this.publicMethods(),
      patternOptions: PATTERN_ENUM,
      // DELIBERATELY OMITTED (Pattern A — DF-2b):
      //   - demandPattern / truePattern
      //   - scenarioName  (e.g. "Trending Demand — Heizer Ch. 4 …" leaks)
      //   - optimalMethod, recommended-method list
      //   - per-participant historicalDemand / forecasts (per-pid only)
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    // Lazy-create on first read for participants who joined mid-session.
    if (!this.participantStates.has(participantId)) {
      this.participantStates.set(participantId, this.makeFreshState(participantId));
      this.saveGameState().catch(err => this.log('saveGameState failed', err));
    }

    const state = this.participantStates.get(participantId)!;
    const visibleHistory = state.historicalDemand.slice(0, state.currentPeriod);

    // Strip the `usedRecommendedMethod` flag from individual forecasts
    // until isComplete — leaking even per-forecast hit/miss tells the
    // student which pattern they're in.
    const sanitizedForecasts = state.isComplete
      ? state.playerForecasts
      : state.playerForecasts.map(f => ({
          period: f.period,
          forecast: f.forecast,
          actual: f.actual,
          method: f.method,
          params: f.params,
          error: f.error,
          absoluteError: f.absoluteError,
          percentageError: f.percentageError,
          // usedRecommendedMethod DELIBERATELY OMITTED (Pattern A).
        }));

    return {
      ...this.getPublicState(),
      participantId,
      phase: state.phase,
      currentPeriod: state.currentPeriod,
      historicalDemand: visibleHistory,
      playerForecasts: sanitizedForecasts,
      inferenceGuess: state.inference?.guess ?? null,
      cumulativeMetrics: state.cumulativeMetrics,
      // Pattern D: synchronous resolved object, not a Promise.
      metrics: this.computeMetricsSyncFor(state),
      isComplete: state.isComplete,
      // Reveals gated to post-game only (Pattern A):
      truePattern: state.isComplete ? state.truePattern : undefined,
      optimalMethod: state.isComplete
        ? this.recommendations.patterns[state.truePattern].recommended[0]
        : undefined,
      recommendedMethods: state.isComplete
        ? this.recommendations.patterns[state.truePattern].recommended
        : undefined,
      patternRationale: state.isComplete
        ? this.recommendations.patterns[state.truePattern].rationale
        : undefined,
      fullDemandData: state.isComplete ? state.historicalDemand : undefined,
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private publicMethods(): {
    id: CanonicalMethod;
    label: string;
    formula: string;
    description: string;
    params: Record<string, MethodParamSchema>;
  }[] {
    return this.canonicalMethods.map(id => {
      const m = this.methodMeta[id];
      return {
        id: m.id,
        label: m.label,
        formula: m.formula,
        description: m.description,
        params: m.params,
      };
    });
  }

  private generateDemandPattern(
    scenario: ScenarioMeta,
    periods: number,
    rng: { next: () => number; state: () => number }
  ): number[] {
    const out: number[] = [];
    const { pattern, baseLevel, slope, sineAmplitude, sinePeriod, noiseAmplitude } = scenario;
    const noise = (amp: number) => (rng.next() - 0.5) * 2 * amp;

    for (let t = 0; t < periods; t++) {
      let value = baseLevel;
      switch (pattern) {
        case 'stationary':
          value += noise(noiseAmplitude);
          break;
        case 'trending':
          value += slope * t + noise(noiseAmplitude);
          break;
        case 'seasonal': {
          const seasonal =
            sineAmplitude * Math.sin((2 * Math.PI * t) / Math.max(1, sinePeriod));
          value += seasonal + noise(noiseAmplitude);
          break;
        }
        case 'random':
          value += noise(noiseAmplitude);
          break;
      }
      out.push(Math.max(0, Math.round(value)));
    }
    return out;
  }

  // =========================================================================
  // CONTENT LOADERS
  // =========================================================================

  private async loadScenarioMeta(scenarioId: string): Promise<ScenarioMeta> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'scenarios.json'), 'utf-8');
    const parsed = JSON.parse(raw) as {
      scenarios: Record<string, ScenarioMeta>;
      defaultScenario: string;
    };
    const scenario = parsed.scenarios[scenarioId];
    if (!scenario) {
      const known = Object.keys(parsed.scenarios).join(', ');
      throw new Error(
        `Unknown Demand Forecast scenario: "${scenarioId}". Known scenarios: ${known}`
      );
    }
    const w = scenario.scoringWeights;
    if (!w) {
      throw new Error(`Scenario "${scenarioId}" missing scoringWeights`);
    }
    const sum = w.inference + w.methodAppropriateness + w.accuracy;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error(
        `Scenario "${scenarioId}" scoringWeights must sum to 1.0 (got ${sum.toFixed(4)})`
      );
    }
    return scenario;
  }

  private async loadMethodMeta(): Promise<void> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'methods.json'), 'utf-8');
    const parsed = JSON.parse(raw) as {
      canonicalMethods: CanonicalMethod[];
      methods: Record<CanonicalMethod, MethodMeta>;
    };
    this.canonicalMethods = parsed.canonicalMethods;
    this.methodMeta = parsed.methods;
    for (const id of this.canonicalMethods) {
      if (!this.methodMeta[id]) {
        throw new Error(`methods.json missing entry for canonical method "${id}"`);
      }
    }
  }

  private async loadRecommendations(): Promise<void> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'patternRecommendations.json'), 'utf-8');
    const parsed = JSON.parse(raw) as RecommendationsData;
    // Sanity check: every pattern enum has both a recommended-set and a
    // full partial-credit row.
    for (const p of PATTERN_ENUM) {
      if (!parsed.patterns?.[p]?.recommended) {
        throw new Error(`patternRecommendations.json missing patterns.${p}.recommended`);
      }
      const row = parsed.inferencePartialCredit?.[p];
      if (!row) {
        throw new Error(`patternRecommendations.json missing inferencePartialCredit.${p}`);
      }
      for (const truth of PATTERN_ENUM) {
        if (typeof row[truth] !== 'number') {
          throw new Error(
            `patternRecommendations.json inferencePartialCredit.${p}.${truth} not a number`
          );
        }
      }
    }
    this.recommendations = parsed;
  }

  /**
   * Persistence — audit D16. The legacy engine wrote a new `gameState`
   * row per action via `prisma.gameState.create`; DF-2a flipped to a
   * single `sessionStateCache.upsert` row, which already closes the
   * storage-growth defect. Each call here overwrites the same row.
   */
  private async saveGameState(_force: boolean = false): Promise<void> {
    try {
      const payload = {
        participantStates: Object.fromEntries(this.participantStates.entries()),
        scenarioId: this.scenarioMeta?.id,
      };
      await prisma.sessionStateCache.upsert({
        where: { session_id: this.sessionId },
        update: { state_data: payload as any, updated_at: new Date() },
        create: { session_id: this.sessionId, state_data: payload as any },
      });
    } catch (err) {
      this.log('Warning: could not persist state', err);
    }
  }
}
