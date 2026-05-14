import { DemandForecastEngine } from '../services/gameEngines/DemandForecastEngine';
import { prisma } from '../db';

/**
 * Demand Forecast Engine Tests — Sessions DF-2a foundation + DF-2b
 * pedagogy layer.
 *
 * Pattern: mock Prisma (mirrors EVGambitEngine.test.ts and
 * DefectDetectivesEngine.test.ts) so tests run without a live DB.
 *
 * DF-2a coverage (kept):
 *   - Initialization with default + alternative scenarios
 *   - Six method helpers (handcrafted history, hand-computed expected)
 *   - Pattern B: method-enum + per-param schema validation
 *   - Pattern C: rejects post-isComplete actions
 *   - Pattern D: getParticipantState.metrics is a value, not a Promise
 *   - MAPE skips zero-actual periods; tracks excluded count
 *   - Seeded RNG: reproducibility across sessionIds
 *
 * DF-2b coverage (new):
 *   - Pattern-inference action (correct / close / wrong scoring;
 *     enum validation; phase ordering)
 *   - Pattern hiding (publicState never leaks pattern; participantState
 *     gates truePattern / optimalMethod behind isComplete)
 *   - Three-component scoring (inference + appropriateness + accuracy;
 *     final = weighted blend)
 *   - Per-participant state isolation + per-pid seeding
 *
 * DF-2a tests that exercised the forecasting loop are routed through
 * makeEngine() which auto-submits a pattern inference so the engine
 * lands in the forecasting phase — preserving the body of the
 * existing test bodies.
 */

jest.mock('../db', () => ({
  prisma: {
    sessionParticipant: { findMany: jest.fn() },
    sessionStateCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const SESSION_ID = 'test-session-df';
const P1 = 'p1';
const P2 = 'p2';

const ALL_METHODS = [
  'naive',
  'moving-average',
  'weighted-moving-average',
  'exponential-smoothing',
  'holts-double-es',
  'linear-regression',
];

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
    { id: P1, role: 'PLAYER', joined_at: new Date() },
  ]);
  (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.sessionStateCache.upsert as jest.Mock).mockResolvedValue({});
});

/**
 * Build an engine pre-seeded with a hand-crafted history AND
 * auto-submit a pattern-inference so the engine is in the forecasting
 * phase. This preserves the DF-2a forecasting-loop test bodies.
 *
 * Pass `skipInference: true` to leave the engine in 'pattern-inference'
 * phase (DF-2b pattern-inference tests use this).
 */
async function makeEngine(opts: {
  sessionId?: string;
  participantId?: string;
  historicalDemand?: number[];
  warmupPeriods?: number;
  numPeriods?: number;
  scenario?: string;
  rngSeed?: number;
  skipInference?: boolean;
  inferenceGuess?: 'stationary' | 'trending' | 'seasonal' | 'random';
} = {}): Promise<DemandForecastEngine> {
  const engine = new DemandForecastEngine(opts.sessionId || SESSION_ID);
  await engine.initialize({
    scenario: opts.scenario,
    historicalDemand: opts.historicalDemand,
    warmupPeriods: opts.warmupPeriods,
    numPeriods: opts.numPeriods ?? opts.historicalDemand?.length,
    rngSeed: opts.rngSeed,
  });
  if (!opts.skipInference) {
    const guess = opts.inferenceGuess ?? 'stationary';
    await engine.applyAction(opts.participantId ?? P1, {
      phase: 'pattern-inference',
      guess,
    });
  }
  return engine;
}

// ===========================================================================
// Initialization
// ===========================================================================

describe('initialization', () => {
  it('loads the default scenario; emits pattern-neutral displayName', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const pub = engine.getPublicState();
    expect(pub.scenarioId).toBe('default');
    expect(pub.displayName).toBe('Regional Retail Demand — Q1-Q5');
    // Pattern A — publicState MUST NOT leak the true pattern.
    expect(pub.demandPattern).toBeUndefined();
    expect(pub.truePattern).toBeUndefined();
    expect(pub.scenarioName).toBeUndefined();
    expect(pub.totalPeriods).toBe(20);
    expect(pub.warmupPeriods).toBe(5);
  });

  it('loads the trending-quarterly-retail scenario', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({ scenario: 'trending-quarterly-retail' });
    const pub = engine.getPublicState();
    expect(pub.scenarioId).toBe('trending-quarterly-retail');
    expect(pub.displayName).toBe('Growth-Phase Retailer — Weekly Demand');
    expect(pub.demandPattern).toBeUndefined();
  });

  it('loads the seasonal-quarterly scenario (audit D6 fix — sinePeriod=4)', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({ scenario: 'seasonal-quarterly' });
    const pub = engine.getPublicState();
    expect(pub.scenarioId).toBe('seasonal-quarterly');
    expect(pub.displayName).toBe('Periodic Demand Series — Weekly View');
    expect(pub.demandPattern).toBeUndefined();
  });

  it('rejects an unknown scenario id', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await expect(engine.initialize({ scenario: 'does-not-exist' })).rejects.toThrow(
      /Unknown Demand Forecast scenario/
    );
  });

  it('rejects warmupPeriods >= numPeriods (audit D10 fix)', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await expect(
      engine.initialize({ numPeriods: 5, warmupPeriods: 5 })
    ).rejects.toThrow(/warmupPeriods .* must be less than numPeriods/);
  });

  it('exposes available methods (canonical 6) on publicState', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const pub = engine.getPublicState();
    expect(pub.availableMethods).toHaveLength(6);
    const ids = pub.availableMethods.map((m: any) => m.id);
    for (const id of ALL_METHODS) {
      expect(ids).toContain(id);
    }
  });

  it('exposes pattern options (the four canonical patterns) on publicState', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const pub = engine.getPublicState();
    expect(pub.patternOptions).toEqual(['stationary', 'trending', 'seasonal', 'random']);
  });

  it('initial state for participant is in pattern-inference phase', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const ps = engine.getParticipantState(P1);
    expect(ps.phase).toBe('pattern-inference');
    expect(ps.inferenceGuess).toBeNull();
  });
});

// ===========================================================================
// Method helpers — handcrafted-input correctness (DF-2a regression)
// ===========================================================================

describe('method helpers (handcrafted inputs — DF-2a regression)', () => {
  it('Naive: history [10,20,30] → 30', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 99],
      warmupPeriods: 3,
      numPeriods: 4,
    });
    const r = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBe(30);
  });

  it('MA n=3: history [10,20,30,40,50] → 40', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 99],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    const r = await engine.applyAction(P1, {
      method: 'moving-average',
      params: { n: 3 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(40, 9);
  });

  it('WMA weights [0.5,0.3,0.2]: history [10,20,30] → 23', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 99],
      warmupPeriods: 3,
      numPeriods: 4,
    });
    const r = await engine.applyAction(P1, {
      method: 'weighted-moving-average',
      params: { weights: [0.5, 0.3, 0.2] },
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(23, 9);
  });

  it('ES α=0.5: history [10,20] → 15 (canonical recursion, F(0)=A(0))', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 99],
      warmupPeriods: 2,
      numPeriods: 3,
    });
    const r = await engine.applyAction(P1, {
      method: 'exponential-smoothing',
      params: { alpha: 0.5 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(15, 9);
  });

  it('ES α=0.75: history [10,20] → 17.5', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 99],
      warmupPeriods: 2,
      numPeriods: 3,
    });
    const r = await engine.applyAction(P1, {
      method: 'exponential-smoothing',
      params: { alpha: 0.75 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(17.5, 9);
  });

  it("Holt's α=0.5, β=0.3: history [10,15,22,30] → ~34.005", async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 15, 22, 30, 99],
      warmupPeriods: 4,
      numPeriods: 5,
    });
    const r = await engine.applyAction(P1, {
      method: 'holts-double-es',
      params: { alpha: 0.5, beta: 0.3 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(34.005, 6);
  });

  it('Linear Regression: history [10,12,14,16,18] → F(period 5)=20', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 12, 14, 16, 18, 99],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    const r = await engine.applyAction(P1, {
      method: 'linear-regression',
      params: {},
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(20, 9);
  });

  it('Linear Regression: history [10,12,14,16,18,20] → F(period 6)=22', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 12, 14, 16, 18, 20, 99],
      warmupPeriods: 6,
      numPeriods: 7,
    });
    const r = await engine.applyAction(P1, {
      method: 'linear-regression',
      params: {},
    });
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBeCloseTo(22, 9);
  });
});

// ===========================================================================
// Method-enum + param-schema validation (DF-2a regression)
// ===========================================================================

describe('method-enum validation (Pattern B)', () => {
  it('rejects an unknown method name', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60],
      warmupPeriods: 5,
    });
    const r = await engine.applyAction(P1, {
      method: 'QuantumOracle',
      params: {},
    });
    expect(r.success).toBe(false);
    expect(r.message).toContain('Unknown forecasting method');
  });

  it('rejects empty / null / undefined method', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60],
      warmupPeriods: 5,
    });
    expect((await engine.applyAction(P1, { method: '', params: {} })).success).toBe(false);
    // null / undefined fall through to the "unknown action shape" branch
    expect((await engine.applyAction(P1, { method: null, params: {} } as any)).success).toBe(false);
    expect(
      (await engine.applyAction(P1, { method: undefined, params: {} } as any)).success
    ).toBe(false);
  });

  it('accepts each of the 6 canonical methods with valid params', async () => {
    const validParams: Record<string, any> = {
      naive: {},
      'moving-average': { n: 3 },
      'weighted-moving-average': { weights: [0.5, 0.3, 0.2] },
      'exponential-smoothing': { alpha: 0.3 },
      'holts-double-es': { alpha: 0.3, beta: 0.2 },
      'linear-regression': {},
    };
    for (const method of ALL_METHODS) {
      const engine = await makeEngine({
        sessionId: `${SESSION_ID}-${method}`,
        historicalDemand: [10, 20, 30, 40, 50, 60, 99],
        warmupPeriods: 6,
        numPeriods: 7,
      });
      const r = await engine.applyAction(P1, {
        method,
        params: validParams[method],
      });
      expect(r.success).toBe(true);
      expect(typeof r.data?.forecast).toBe('number');
    }
  });
});

describe('param-schema validation (Pattern B)', () => {
  let engine: DemandForecastEngine;
  beforeEach(async () => {
    engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 99],
      warmupPeriods: 6,
      numPeriods: 7,
    });
  });

  it('moving-average n=0 → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'moving-average',
      params: { n: 0 },
    });
    expect(r.success).toBe(false);
  });

  it('moving-average n=1000 (> history) → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'moving-average',
      params: { n: 1000 },
    });
    expect(r.success).toBe(false);
  });

  it('moving-average non-integer n → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'moving-average',
      params: { n: 3.5 },
    });
    expect(r.success).toBe(false);
  });

  it('weighted-moving-average weights summing to 0.9 → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'weighted-moving-average',
      params: { weights: [0.5, 0.3, 0.1] },
    });
    expect(r.success).toBe(false);
  });

  it('weighted-moving-average weights summing to 1.0 → accepted', async () => {
    const r = await engine.applyAction(P1, {
      method: 'weighted-moving-average',
      params: { weights: [0.5, 0.3, 0.2] },
    });
    expect(r.success).toBe(true);
  });

  it('exponential-smoothing alpha=1.5 → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'exponential-smoothing',
      params: { alpha: 1.5 },
    });
    expect(r.success).toBe(false);
  });

  it('exponential-smoothing alpha=-0.1 → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'exponential-smoothing',
      params: { alpha: -0.1 },
    });
    expect(r.success).toBe(false);
  });

  it("Holt's missing β → rejected", async () => {
    const r = await engine.applyAction(P1, {
      method: 'holts-double-es',
      params: { alpha: 0.3 },
    });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/beta/i);
  });

  it("Holt's β > 1 → rejected", async () => {
    const r = await engine.applyAction(P1, {
      method: 'holts-double-es',
      params: { alpha: 0.3, beta: 1.2 },
    });
    expect(r.success).toBe(false);
  });

  it('weighted-moving-average non-array weights → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'weighted-moving-average',
      params: { weights: 'oops' },
    });
    expect(r.success).toBe(false);
  });

  it('weighted-moving-average NaN inside weights → rejected', async () => {
    const r = await engine.applyAction(P1, {
      method: 'weighted-moving-average',
      params: { weights: [NaN, 0.5, 0.5] },
    });
    expect(r.success).toBe(false);
  });
});

// ===========================================================================
// async/sync metrics (Pattern D, DF-2a regression)
// ===========================================================================

describe('async/sync metrics (Pattern D)', () => {
  it('getParticipantState.metrics is a resolved object, not a Promise', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 99],
      warmupPeriods: 6,
      numPeriods: 7,
    });
    const ps = engine.getParticipantState(P1);
    expect(ps.metrics).toBeDefined();
    expect(typeof (ps.metrics as any).then).toBe('undefined');
    expect(ps.metrics.playerPerformance).toBeDefined();
    expect(typeof ps.metrics.playerPerformance.mad).toBe('number');
  });

  it('async computeMetrics still satisfies the BaseGameEngine contract', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 99],
      warmupPeriods: 6,
      numPeriods: 7,
    });
    const m = await engine.computeMetrics();
    expect(m.playerPerformance).toBeDefined();
    expect(typeof m.playerPerformance.mad).toBe('number');
  });
});

// ===========================================================================
// MAPE divide-by-zero — DF-2a regression
// ===========================================================================

describe('MAPE handling (audit D7)', () => {
  it('zero-actual periods are excluded from MAPE; tracked separately', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 0, 10, 99],
      warmupPeriods: 5,
      numPeriods: 8,
    });
    const r1 = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r1.success).toBe(true);
    expect(r1.data?.percentageError).toBeNull();

    const r2 = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r2.success).toBe(true);
    expect(typeof r2.data?.percentageError).toBe('number');

    const ps = engine.getParticipantState(P1);
    expect(ps.metrics.playerPerformance.mapeExcludedPeriods).toBe(1);
    expect(Number.isFinite(ps.metrics.playerPerformance.mape)).toBe(true);
  });

  it('all-zero history does not poison metrics with NaN', async () => {
    const engine = await makeEngine({
      historicalDemand: [0, 0, 0, 0, 0, 0, 0, 0],
      warmupPeriods: 5,
      numPeriods: 8,
    });
    for (let i = 0; i < 3; i++) {
      const r = await engine.applyAction(P1, { method: 'naive', params: {} });
      expect(r.success).toBe(true);
    }
    const ps = engine.getParticipantState(P1);
    expect(Number.isFinite(ps.metrics.playerPerformance.mad)).toBe(true);
    expect(Number.isFinite(ps.metrics.playerPerformance.mape)).toBe(true);
    expect(ps.metrics.playerPerformance.mapeExcludedPeriods).toBe(3);
  });
});

// ===========================================================================
// Seeded RNG (audit D8 — refined for per-participant)
// ===========================================================================

describe('seeded RNG reproducibility', () => {
  it('two engines with the same sessionId + same participant produce identical series', async () => {
    const e1 = new DemandForecastEngine('seed-test-A');
    await e1.initialize({});
    const e2 = new DemandForecastEngine('seed-test-A');
    await e2.initialize({});
    expect(e1.getParticipantState(P1).historicalDemand).toEqual(
      e2.getParticipantState(P1).historicalDemand
    );
  });

  it('different sessionIds produce different series', async () => {
    const e1 = new DemandForecastEngine('seed-test-X');
    await e1.initialize({});
    const e2 = new DemandForecastEngine('seed-test-Y');
    await e2.initialize({});
    expect(e1.getParticipantState(P1).historicalDemand).not.toEqual(
      e2.getParticipantState(P1).historicalDemand
    );
  });

  it('explicit rngSeed overrides per-participant seeding', async () => {
    const e1 = new DemandForecastEngine('seed-test-A');
    await e1.initialize({ rngSeed: 12345 });
    const e2 = new DemandForecastEngine('seed-test-B');
    await e2.initialize({ rngSeed: 12345 });
    expect(e1.getParticipantState(P1).historicalDemand).toEqual(
      e2.getParticipantState(P1).historicalDemand
    );
  });
});

// ===========================================================================
// Edge cases (DF-2a regression)
// ===========================================================================

describe('edge cases', () => {
  it('first period after warmup — engine handles', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 99],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    const r = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r.success).toBe(true);
    expect(r.data?.period).toBe(5);
  });

  it('terminal period — isComplete fires correctly', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    const r1 = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r1.data?.isComplete).toBe(false);
    const r2 = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r2.data?.isComplete).toBe(true);
  });

  it('rejects actions after isComplete (Pattern C)', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const r = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r.success).toBe(false);
    expect(r.message).toContain('already complete');
  });

  it('forecast field on the action is ignored — engine computes its own', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    const r = await engine.applyAction(P1, {
      method: 'naive',
      params: {},
      forecast: NaN,
    } as any);
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBe(50);
  });
});

// ===========================================================================
// DF-2b — Pattern inference action (PART A)
// ===========================================================================

describe('pattern-inference action (PART A)', () => {
  async function freshEngine() {
    const e = new DemandForecastEngine(SESSION_ID + '-inf');
    await e.initialize({
      historicalDemand: [10, 11, 12, 13, 14, 15, 16],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    return e;
  }

  it('engine starts in pattern-inference phase', async () => {
    const engine = await freshEngine();
    expect(engine.getParticipantState(P1).phase).toBe('pattern-inference');
  });

  it('accepts a valid pattern guess; transitions to forecasting phase', async () => {
    const engine = await freshEngine();
    const r = await engine.applyAction(P1, {
      phase: 'pattern-inference',
      guess: 'stationary',
    });
    expect(r.success).toBe(true);
    expect(r.data?.phase).toBe('forecasting');
    expect(engine.getParticipantState(P1).phase).toBe('forecasting');
    expect(engine.getParticipantState(P1).inferenceGuess).toBe('stationary');
  });

  it('rejects an invalid pattern guess (Pattern B)', async () => {
    const engine = await freshEngine();
    const r = await engine.applyAction(P1, {
      phase: 'pattern-inference',
      guess: 'cyclic-with-trend',
    });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/Invalid pattern guess/);
  });

  it('rejects a second pattern-inference submission (Pattern C — phase ordering)', async () => {
    const engine = await freshEngine();
    await engine.applyAction(P1, { phase: 'pattern-inference', guess: 'stationary' });
    const r = await engine.applyAction(P1, {
      phase: 'pattern-inference',
      guess: 'trending',
    });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/already submitted|forecasting phase/);
  });

  it('rejects a forecasting action while still in pattern-inference (Pattern C)', async () => {
    const engine = await freshEngine();
    const r = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/inference first/i);
  });
});

// ===========================================================================
// DF-2b — Pattern hiding (PART B / Pattern A)
// ===========================================================================

describe('pattern hiding (PART B / Pattern A)', () => {
  it('getPublicState NEVER contains the true demand pattern', async () => {
    const engine = new DemandForecastEngine(SESSION_ID + '-hide');
    await engine.initialize({ scenario: 'trending-quarterly-retail' });
    const pub = engine.getPublicState();
    expect(pub.demandPattern).toBeUndefined();
    expect(pub.truePattern).toBeUndefined();
    expect(pub.optimalMethod).toBeUndefined();
    // The leaky DF-2a `scenarioName` field is gone — only `displayName`.
    expect(pub.scenarioName).toBeUndefined();
    expect(pub.displayName).not.toMatch(/trending|seasonal|stationary|random/i);
  });

  it('displayName is pattern-neutral for every scenario', async () => {
    for (const scenario of [
      'default',
      'trending-quarterly-retail',
      'seasonal-quarterly',
      'random-noise',
    ]) {
      const engine = new DemandForecastEngine(`${SESSION_ID}-d-${scenario}`);
      await engine.initialize({ scenario });
      const pub = engine.getPublicState();
      expect(pub.displayName).not.toMatch(/trending|seasonal|stationary|random/i);
    }
  });

  it('getParticipantState does NOT reveal truePattern before isComplete', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    const ps = engine.getParticipantState(P1);
    expect(ps.truePattern).toBeUndefined();
    expect(ps.optimalMethod).toBeUndefined();
    expect(ps.recommendedMethods).toBeUndefined();
    expect(ps.fullDemandData).toBeUndefined();
    expect(ps.metrics.truePattern).toBeNull();
    expect(ps.metrics.optimalMethod).toBeNull();
  });

  it('getParticipantState REVEALS truePattern + optimalMethod AFTER isComplete', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    // One forecast finishes the sim.
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const ps = engine.getParticipantState(P1);
    expect(ps.isComplete).toBe(true);
    expect(ps.truePattern).toBeDefined();
    expect(ps.optimalMethod).toBeDefined();
    expect(ps.recommendedMethods).toBeInstanceOf(Array);
    expect(ps.fullDemandData).toBeDefined();
    expect(ps.metrics.truePattern).toBe(ps.truePattern);
  });

  it('mid-game forecast entries do NOT carry the usedRecommendedMethod flag', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70, 80],
      warmupPeriods: 5,
      numPeriods: 8,
    });
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const ps = engine.getParticipantState(P1);
    expect(ps.isComplete).toBe(false);
    for (const f of ps.playerForecasts) {
      expect(f.usedRecommendedMethod).toBeUndefined();
    }
  });

  it('post-game forecast entries DO carry the usedRecommendedMethod flag', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60],
      warmupPeriods: 5,
      numPeriods: 6,
    });
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const ps = engine.getParticipantState(P1);
    expect(ps.isComplete).toBe(true);
    expect(ps.playerForecasts[0].usedRecommendedMethod).toBeDefined();
    expect(typeof ps.playerForecasts[0].usedRecommendedMethod).toBe('boolean');
  });

  it('forecast action result does NOT include optimalMethod / usedRecommendedMethod', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70, 80],
      warmupPeriods: 5,
      numPeriods: 8,
    });
    const r = await engine.applyAction(P1, { method: 'naive', params: {} });
    expect(r.success).toBe(true);
    expect(r.data?.optimalMethod).toBeUndefined();
    expect(r.data?.usedRecommendedMethod).toBeUndefined();
  });
});

// ===========================================================================
// DF-2b — Three-component scoring (PART C)
// ===========================================================================

describe('three-component scoring (PART C)', () => {
  /** Drive the full sim with a given inference + uniform method choice. */
  async function playGame(opts: {
    scenario: string;
    inferenceGuess: 'stationary' | 'trending' | 'seasonal' | 'random';
    forecastMethod: any;
    forecastParams: any;
  }): Promise<DemandForecastEngine> {
    const engine = new DemandForecastEngine(
      `${SESSION_ID}-${opts.scenario}-${opts.inferenceGuess}-${opts.forecastMethod}`
    );
    await engine.initialize({ scenario: opts.scenario, rngSeed: 42 });
    await engine.applyAction(P1, {
      phase: 'pattern-inference',
      guess: opts.inferenceGuess,
    });
    // Drive through the forecasting phase to completion.
    for (let i = 0; i < 100; i++) {
      const r = await engine.applyAction(P1, {
        method: opts.forecastMethod,
        params: opts.forecastParams,
      });
      if (!r.success || r.data?.isComplete) break;
    }
    return engine;
  }

  it('correct inference + recommended methods → inferenceScore=100, methodScore=100', async () => {
    const engine = await playGame({
      scenario: 'trending-quarterly-retail',
      inferenceGuess: 'trending',
      forecastMethod: 'holts-double-es',
      forecastParams: { alpha: 0.3, beta: 0.2 },
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    expect(m.inferenceScore).toBe(100);
    expect(m.methodAppropriatenessScore).toBe(100);
  });

  it('wrong inference → inferenceScore=0 (random guess vs trending truth)', async () => {
    const engine = await playGame({
      scenario: 'trending-quarterly-retail',
      inferenceGuess: 'random',
      forecastMethod: 'naive',
      forecastParams: {},
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    expect(m.inferenceScore).toBe(0);
  });

  it('close inference (stationary guess vs random truth) → inferenceScore=60', async () => {
    const engine = await playGame({
      scenario: 'random-noise',
      inferenceGuess: 'stationary',
      forecastMethod: 'naive',
      forecastParams: {},
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    // Partial-credit matrix: stationary↔random both flat-on-average → 60.
    expect(m.inferenceScore).toBe(60);
  });

  it('method appropriateness counts only recommended methods', async () => {
    // Trending truth; use linear-regression (recommended). Should yield 100%.
    const e1 = await playGame({
      scenario: 'trending-quarterly-retail',
      inferenceGuess: 'trending',
      forecastMethod: 'linear-regression',
      forecastParams: {},
    });
    expect(e1.getParticipantState(P1).metrics.playerPerformance.methodAppropriatenessScore).toBe(100);

    // Trending truth; use naive (NOT recommended for trending). 0%.
    const e2 = await playGame({
      scenario: 'trending-quarterly-retail',
      inferenceGuess: 'trending',
      forecastMethod: 'naive',
      forecastParams: {},
    });
    expect(e2.getParticipantState(P1).metrics.playerPerformance.methodAppropriatenessScore).toBe(0);
  });

  it('finalScore is the documented 0.30·inf + 0.30·meth + 0.40·acc blend', async () => {
    const engine = await playGame({
      scenario: 'default',
      inferenceGuess: 'stationary',
      forecastMethod: 'moving-average',
      forecastParams: { n: 3 },
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    const expected =
      0.30 * m.inferenceScore +
      0.30 * m.methodAppropriatenessScore +
      0.40 * m.accuracyScore;
    expect(m.finalScore).toBeCloseTo(expected, 6);
    expect(m.scoringWeights).toEqual({
      inference: 0.30,
      methodAppropriatenessScore: undefined, // not present; we use the schema key
      methodAppropriateness: 0.30,
      accuracy: 0.40,
    });
  });

  it('scenario-driven weights flow into the final-score blend', async () => {
    // Engine loads weights from scenarios.json; we can't mutate the JSON
    // mid-test, but we can verify the engine exposes them as part of the
    // metrics view so faculty know what weights drove the score.
    const engine = await playGame({
      scenario: 'default',
      inferenceGuess: 'stationary',
      forecastMethod: 'moving-average',
      forecastParams: { n: 3 },
    });
    const w = engine.getParticipantState(P1).metrics.playerPerformance.scoringWeights;
    expect(w.inference + w.methodAppropriateness + w.accuracy).toBeCloseTo(1.0, 9);
  });

  it('accuracy score equals max(0, 100 - mape) post-game', async () => {
    const engine = await playGame({
      scenario: 'default',
      inferenceGuess: 'stationary',
      forecastMethod: 'naive',
      forecastParams: {},
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    expect(m.accuracyScore).toBeCloseTo(Math.max(0, 100 - m.mape), 6);
  });

  it('optimalMethodChoiceCount is a per-period counter (audit D17)', async () => {
    const engine = await playGame({
      scenario: 'trending-quarterly-retail',
      inferenceGuess: 'trending',
      forecastMethod: 'holts-double-es',
      forecastParams: { alpha: 0.3, beta: 0.2 },
    });
    const m = engine.getParticipantState(P1).metrics.playerPerformance;
    const forecastsCount = engine.getParticipantState(P1).metrics.forecastsCount;
    expect(m.optimalMethodChoiceCount).toBe(forecastsCount);
  });
});

// ===========================================================================
// DF-2b — Per-participant state isolation (PART D)
// ===========================================================================

describe('per-participant state (PART D)', () => {
  beforeEach(() => {
    (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
      { id: P1, role: 'PLAYER', joined_at: new Date() },
      { id: P2, role: 'PLAYER', joined_at: new Date() },
    ]);
  });

  it('two participants in one session get different demand series', async () => {
    const engine = new DemandForecastEngine('multi-1');
    await engine.initialize({});
    const s1 = engine.getParticipantState(P1).historicalDemand;
    const s2 = engine.getParticipantState(P2).historicalDemand;
    expect(s1).not.toEqual(s2);
  });

  it('same session + same participant → reproducible series across engine instances', async () => {
    const e1 = new DemandForecastEngine('multi-2');
    await e1.initialize({});
    const e2 = new DemandForecastEngine('multi-2');
    await e2.initialize({});
    expect(e1.getParticipantState(P1).historicalDemand).toEqual(
      e2.getParticipantState(P1).historicalDemand
    );
    expect(e1.getParticipantState(P2).historicalDemand).toEqual(
      e2.getParticipantState(P2).historicalDemand
    );
  });

  it("getParticipantState(A) never returns participant B's state", async () => {
    const engine = new DemandForecastEngine('multi-3');
    await engine.initialize({});
    await engine.applyAction(P1, { phase: 'pattern-inference', guess: 'trending' });
    await engine.applyAction(P2, { phase: 'pattern-inference', guess: 'random' });
    const sA = engine.getParticipantState(P1);
    const sB = engine.getParticipantState(P2);
    expect(sA.inferenceGuess).toBe('trending');
    expect(sB.inferenceGuess).toBe('random');
    expect(sA.participantId).toBe(P1);
    expect(sB.participantId).toBe(P2);
  });

  it("applyAction for participant A doesn't mutate participant B's state", async () => {
    const engine = new DemandForecastEngine('multi-4');
    await engine.initialize({});
    await engine.applyAction(P1, { phase: 'pattern-inference', guess: 'stationary' });
    // A drives a forecast; B's state must stay in pattern-inference + zero forecasts.
    // We use an injected history for predictability — but per-participant
    // states are independently generated, so we just check B isn't disturbed.
    const before = engine.getParticipantState(P2);
    // Drive a forecast for A — need a method valid for default scenario's
    // initial history length (warmup=5).
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const after = engine.getParticipantState(P2);
    expect(after.phase).toBe('pattern-inference');
    expect(after.currentPeriod).toBe(before.currentPeriod);
    expect(after.playerForecasts).toHaveLength(0);
  });

  it('participantId is required on applyAction', async () => {
    const engine = new DemandForecastEngine('multi-5');
    await engine.initialize({});
    const r = await engine.applyAction('' as any, {
      phase: 'pattern-inference',
      guess: 'stationary',
    });
    expect(r.success).toBe(false);
    expect(r.message).toMatch(/participantId is required/);
  });

  it('lazy-create state for unknown participantId (joined-mid-session resilience)', async () => {
    const engine = new DemandForecastEngine('multi-6');
    await engine.initialize({});
    // Submit an action for a participant that isn't in the initial
    // findMany mock — engine should still process it.
    const r = await engine.applyAction('newcomer-pid', {
      phase: 'pattern-inference',
      guess: 'stationary',
    });
    expect(r.success).toBe(true);
    expect(engine.getParticipantState('newcomer-pid').inferenceGuess).toBe('stationary');
  });
});
