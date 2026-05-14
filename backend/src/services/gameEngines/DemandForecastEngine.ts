import fs from 'fs/promises';
import path from 'path';
import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Demand Forecast Challenge — Time-Series Forecasting Drill
 *
 * Operations-management curriculum (Stevenson Ch. 3, Heizer Ch. 4,
 * Chase & Jacobs Ch. 17–18). Single-player drill: 20 periods of demand,
 * 5 warmup periods of revealed history, then 15 periods where the
 * student selects a forecasting method and parameters and the engine
 * computes the forecast and grades it on MAD/MSE/MAPE/Tracking-Signal.
 *
 * Six canonical methods: Naive, Moving Average, Weighted Moving Average,
 * Exponential Smoothing, Holt's Double Exponential Smoothing, Linear
 * Regression.
 *
 * Phase 1.5 — Session DF-2a foundation rewrite. Replaces the legacy
 * `{ forecast: number, method: string }` action shape (which let students
 * type any number with any method label and graded the number) with
 * `{ method, params }` where the engine COMPUTES the forecast from the
 * student's choices.
 *
 * Out of scope this session (DF-2b backlog): pattern-inference action,
 * multi-participant per-participant state, hide demandPattern from
 * publicState (Pattern A), method-appropriateness scoring, optimal-method
 * counter (currently sticky-true).
 *
 * Content externalised under data/demandForecast/:
 *   scenarios.json — pattern parameters per scenario
 *   methods.json   — canonical 6 methods + parameter schemas
 */

type DemandPattern = 'stationary' | 'trending' | 'seasonal' | 'random';

type CanonicalMethod =
  | 'naive'
  | 'moving-average'
  | 'weighted-moving-average'
  | 'exponential-smoothing'
  | 'holts-double-es'
  | 'linear-regression';

interface ScenarioMeta {
  id: string;
  name: string;
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

interface ForecastEntry {
  period: number;
  forecast: number;
  actual: number;
  method: CanonicalMethod;
  params: any;
  error: number;
  absoluteError: number;
  percentageError: number | null;
}

interface DemandForecastInitOptions {
  scenario?: string;
  numPeriods?: number;
  warmupPeriods?: number;
  rngSeed?: number;
  historicalDemand?: number[];
}

interface DemandForecastGameState {
  sessionId: string;
  participantId: string;
  scenarioId: string;
  scenarioName: string;
  currencySymbol: string;
  config: {
    pattern: DemandPattern;
    baseLevel: number;
    slope: number;
    sineAmplitude: number;
    sinePeriod: number;
    noiseAmplitude: number;
    numPeriods: number;
    warmupPeriods: number;
  };
  rngState: number;
  historicalDemand: number[];
  currentPeriod: number;
  totalPeriods: number;
  playerForecasts: ForecastEntry[];
  cumulativeMetrics: {
    mad: number;
    mse: number;
    mape: number;
    trackingSignal: number;
    mapeExcludedCount: number;
  };
  score: number;
  optimalMethodUsed: boolean;
  isComplete: boolean;
}

const DATA_DIR = path.join(__dirname, 'data', 'demandForecast');
const MAPE_EPSILON = 1e-9;
const FORECAST_HARD_CAP = 1e9;

/**
 * Mulberry32 PRNG (mirrors Defect Detectives Session 9). Deterministic,
 * seeded by sessionId hash so two students running the same scenario get
 * the same demand series — closes audit D8.
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
  private state!: DemandForecastGameState;
  private canonicalMethods: CanonicalMethod[] = [];
  private methodMeta: Record<CanonicalMethod, MethodMeta> = {} as any;
  private rng!: { next: () => number; state: () => number };

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
    const participant = participants[0];

    await this.loadMethodMeta();
    const scenarioId = options.scenario || 'default';
    const scenario = await this.loadScenarioMeta(scenarioId);

    const totalPeriods = options.numPeriods ?? scenario.numPeriods;
    const warmupPeriods = options.warmupPeriods ?? scenario.warmupPeriods;

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

    // Seeded RNG so two engine instances with the same sessionId produce
    // identical demand series — closes audit D8 non-reproducibility.
    const seed = options.rngSeed ?? hashString(`${this.sessionId}:${scenarioId}`);
    this.rng = mulberry32(seed);

    const historicalDemand =
      options.historicalDemand && options.historicalDemand.length === totalPeriods
        ? options.historicalDemand.slice()
        : this.generateDemandPattern(scenario, totalPeriods);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      currencySymbol: scenario.currencySymbol,
      config: {
        pattern: scenario.pattern,
        baseLevel: scenario.baseLevel,
        slope: scenario.slope,
        sineAmplitude: scenario.sineAmplitude,
        sinePeriod: scenario.sinePeriod,
        noiseAmplitude: scenario.noiseAmplitude,
        numPeriods: totalPeriods,
        warmupPeriods,
      },
      rngState: this.rng.state(),
      historicalDemand,
      currentPeriod: warmupPeriods,
      totalPeriods,
      playerForecasts: [],
      cumulativeMetrics: {
        mad: 0,
        mse: 0,
        mape: 0,
        trackingSignal: 0,
        mapeExcludedCount: 0,
      },
      score: 0,
      optimalMethodUsed: false,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log(`Initialized (scenario=${scenario.id}, periods=${totalPeriods}, warmup=${warmupPeriods})`);
  }

  // =========================================================================
  // ACTIONS — new contract: { method, params }. Engine computes the
  // forecast from helpers; client never supplies a forecast number.
  // =========================================================================

  async applyAction(_participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    if (this.state.isComplete) {
      return { success: false, message: 'Simulation already complete' };
    }

    const { method, params } = action || {};

    // DEFECT 1 (Pattern B) — method enum check.
    if (typeof method !== 'string' || !this.canonicalMethods.includes(method as CanonicalMethod)) {
      return {
        success: false,
        message: `Unknown forecasting method "${String(method)}". Valid methods: ${this.canonicalMethods.join(', ')}`,
      };
    }

    const methodId = method as CanonicalMethod;
    const meta = this.methodMeta[methodId];
    const history = this.state.historicalDemand.slice(0, this.state.currentPeriod);

    const validation = this.validateMethodParams(meta, params || {}, history.length);
    if (!validation.ok) {
      return { success: false, message: validation.message };
    }

    let forecast: number;
    try {
      forecast = this.computeForecast(methodId, history, params || {}, this.state.currentPeriod);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Forecast computation failed' };
    }

    // DEFECT 2 (Pattern B defense-in-depth): the engine never trusts a
    // client forecast number, but its own helper might still produce
    // NaN/Infinity for pathological params on a degenerate series.
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

    const actualDemand = this.state.historicalDemand[this.state.currentPeriod];
    const error = actualDemand - forecast;
    const absoluteError = Math.abs(error);

    // DEFECT 4 (audit D7): MAPE skip-period when actual is ~0 (zero-divisor
    // poisons the metric). Track exclusion count for transparency. Stevenson
    // Ch. 3 documents this as the canonical handling for zero-actual periods.
    let percentageError: number | null = null;
    if (Math.abs(actualDemand) > MAPE_EPSILON) {
      percentageError = (absoluteError / Math.abs(actualDemand)) * 100;
    } else {
      this.state.cumulativeMetrics.mapeExcludedCount += 1;
    }

    this.state.playerForecasts.push({
      period: this.state.currentPeriod,
      forecast,
      actual: actualDemand,
      method: methodId,
      params: params || {},
      error,
      absoluteError,
      percentageError,
    });

    this.updateCumulativeMetrics();
    this.state.score = Math.max(0, 100 - this.state.cumulativeMetrics.mape);

    // optimalMethodUsed remains sticky-once-true for now; DF-2b reworks
    // this into a per-period counter and hides optimalMethod until
    // isComplete.
    if (methodId === this.getOptimalMethod()) {
      this.state.optimalMethodUsed = true;
    }

    this.state.currentPeriod += 1;
    this.state.rngState = this.rng.state();
    if (this.state.currentPeriod >= this.state.totalPeriods) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Forecast recorded for period ${this.state.currentPeriod - 1}`,
      data: {
        period: this.state.currentPeriod - 1,
        method: methodId,
        params: params || {},
        forecast,
        actual: actualDemand,
        error,
        absoluteError,
        percentageError,
        cumulativeMetrics: this.state.cumulativeMetrics,
        score: this.state.score,
        isComplete: this.state.isComplete,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    return {
      success: true,
      message: 'Player-paced simulation',
      roundNumber: this.state.currentPeriod,
      isComplete: this.state.isComplete,
    };
  }

  // =========================================================================
  // METHOD HELPERS — six pure-ish private functions; each takes
  // (history, params, periodIndex?) and returns a single forecast value.
  // Tested directly via the public action contract; expected outputs in
  // __tests__/DemandForecastEngine.test.ts use handcrafted history.
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
   * Initialization choice (Stevenson Ch. 3 / Heizer Ch. 4): F(0) = A(0),
   * the first available observation. The other textbook convention is
   * F(0) = mean(initial-window); we use F(0)=A(0) here because warmup
   * always gives us A(0) reliably and the bias decays geometrically.
   * Per audit §2.1.
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
   * Initialization (Hyndman §7.3 / Heizer Ch. 4): L(0) = A(0); T(0) = A(1) - A(0).
   * Requires history.length ≥ 2. Per audit §2.1, the L/T initialization is
   * the conventional textbook choice; an alternative (regression-based seeding)
   * is a Phase 2 enhancement.
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
   * Linear Regression — full-cumulative least-squares fit over ALL history.
   *
   * Indexing convention: t starts at 0 (history[0] is for period 0,
   * history[N-1] for period N-1). To predict the next period after
   * history of length N, callers pass periodIndex = N (the engine's
   * default). Tests can pass an explicit periodIndex to exercise the
   * formula. A windowed-regression variant is on the DF-2b backlog.
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
    const ts: number[] = [];
    let sumT = 0;
    let sumA = 0;
    for (let i = 0; i < n; i++) {
      ts.push(i);
      sumT += i;
      sumA += history[i];
    }
    const meanT = sumT / n;
    const meanA = sumA / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const dt = ts[i] - meanT;
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
  // PARAM VALIDATION — closes Pattern B for params side. Method enum
  // validation happens at the applyAction entry; this validates the
  // PARAMS object against the method's schema in methods.json.
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
          if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            !Number.isInteger(value)
          ) {
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
  // METRICS — Pattern D fix: computeMetricsSync is the resolved object;
  // computeMetrics async wrapper exists for the BaseGameEngine contract.
  // Audit C1 — un-awaited Promise pre-Session-DF-2a leaked into UI as `{}`.
  // =========================================================================

  private updateCumulativeMetrics(): void {
    const n = this.state.playerForecasts.length;
    if (n === 0) return;

    const sumAbs = this.state.playerForecasts.reduce((s, f) => s + f.absoluteError, 0);
    const sumSq = this.state.playerForecasts.reduce((s, f) => s + f.error * f.error, 0);
    const sumErr = this.state.playerForecasts.reduce((s, f) => s + f.error, 0);

    const mapeIncluded = this.state.playerForecasts.filter(
      f => f.percentageError !== null
    );
    const sumPct = mapeIncluded.reduce((s, f) => s + (f.percentageError as number), 0);

    this.state.cumulativeMetrics.mad = sumAbs / n;
    this.state.cumulativeMetrics.mse = sumSq / n;
    this.state.cumulativeMetrics.mape =
      mapeIncluded.length > 0 ? sumPct / mapeIncluded.length : 0;
    this.state.cumulativeMetrics.trackingSignal =
      this.state.cumulativeMetrics.mad !== 0 ? sumErr / this.state.cumulativeMetrics.mad : 0;
  }

  private computeMetricsSync(): any {
    return {
      playerPerformance: {
        mad: this.state.cumulativeMetrics.mad,
        mse: this.state.cumulativeMetrics.mse,
        mape: this.state.cumulativeMetrics.mape,
        trackingSignal: this.state.cumulativeMetrics.trackingSignal,
        mapeExcludedPeriods: this.state.cumulativeMetrics.mapeExcludedCount,
        score: this.state.score,
      },
      dataPattern: this.state.config.pattern,
      optimalMethod: this.getOptimalMethod(),
      methodsUsed: this.getMethodDistribution(),
      forecastsCount: this.state.playerForecasts.length,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    return this.computeMetricsSync();
  }

  // =========================================================================
  // STATE VIEWS
  // =========================================================================

  getPublicState(): any {
    if (!this.isInitialized) return null;
    const visibleHistory = this.state.historicalDemand.slice(0, this.state.currentPeriod);
    return {
      scenarioId: this.state.scenarioId,
      scenarioName: this.state.scenarioName,
      currencySymbol: this.state.currencySymbol,
      currentPeriod: this.state.currentPeriod,
      totalPeriods: this.state.totalPeriods,
      warmupPeriods: this.state.config.warmupPeriods,
      historicalDemand: visibleHistory,
      forecastsCount: this.state.playerForecasts.length,
      cumulativeMetrics: this.state.cumulativeMetrics,
      score: this.state.score,
      isComplete: this.state.isComplete,
      // Note: demandPattern is still exposed here (DF-2a foundation scope).
      // DF-2b will hide it behind a pattern-inference action — see audit
      // Pattern A § 6 (D11/D14).
      demandPattern: this.state.config.pattern,
      availableMethods: this.publicMethods(),
    };
  }

  getParticipantState(_participantId: string): any {
    if (!this.isInitialized) return null;
    return {
      ...this.getPublicState(),
      playerForecasts: this.state.playerForecasts,
      // Pattern D: synchronous resolved object, not a Promise.
      metrics: this.computeMetricsSync(),
      fullDemandData: this.state.isComplete ? this.state.historicalDemand : undefined,
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private publicMethods(): { id: CanonicalMethod; label: string; formula: string; description: string; params: Record<string, MethodParamSchema> }[] {
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

  private getOptimalMethod(): CanonicalMethod {
    switch (this.state.config.pattern) {
      case 'stationary':
        return 'moving-average';
      case 'trending':
        return 'holts-double-es';
      case 'seasonal':
        // Holt-Winters / classical decomposition aren't in the canonical 6
        // for DF-2a; closest in-set option is Holt's. DF-2b adds a real
        // seasonal method or rebrands the optimal mapping.
        return 'holts-double-es';
      case 'random':
        return 'naive';
      default:
        return 'exponential-smoothing';
    }
  }

  private getMethodDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const f of this.state.playerForecasts) {
      dist[f.method] = (dist[f.method] || 0) + 1;
    }
    return dist;
  }

  private generateDemandPattern(scenario: ScenarioMeta, periods: number): number[] {
    const out: number[] = [];
    const { pattern, baseLevel, slope, sineAmplitude, sinePeriod, noiseAmplitude } = scenario;

    for (let t = 0; t < periods; t++) {
      let value = baseLevel;
      switch (pattern) {
        case 'stationary':
          value += this.noise(noiseAmplitude);
          break;
        case 'trending':
          value += slope * t + this.noise(noiseAmplitude);
          break;
        case 'seasonal': {
          // Audit D6 fix: sinePeriod is now a config field (default 4 in
          // scenarios.json), so "quarterly" really means period 4 — not
          // the legacy hardcoded 12.
          const seasonal = sineAmplitude * Math.sin((2 * Math.PI * t) / Math.max(1, sinePeriod));
          value += seasonal + this.noise(noiseAmplitude);
          break;
        }
        case 'random':
          value += this.noise(noiseAmplitude);
          break;
      }
      out.push(Math.max(0, Math.round(value)));
    }
    return out;
  }

  private noise(amplitude: number): number {
    return (this.rng.next() - 0.5) * 2 * amplitude;
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
