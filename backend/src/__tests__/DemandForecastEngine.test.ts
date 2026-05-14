import { DemandForecastEngine } from '../services/gameEngines/DemandForecastEngine';
import { prisma } from '../db';

/**
 * Demand Forecast Engine Tests — Session DF-2a foundation rewrite.
 *
 * Pattern: mock Prisma (mirrors EVGambitEngine.test.ts and
 * DefectDetectivesEngine.test.ts) so tests run without a live DB.
 *
 * Coverage:
 *   - Initialization with default + alternative scenarios
 *   - Six method helpers (handcrafted history, hand-computed expected)
 *   - Pattern B: method-enum validation; param schema validation
 *   - Pattern C: rejects post-isComplete actions
 *   - Pattern D: getParticipantState.metrics is a value, not a Promise
 *   - DEFECT 4: MAPE skips zero-actual periods; tracks excluded count
 *   - Seeded RNG: reproducibility across sessionIds
 *   - Edge cases: terminal period, degenerate (all-zero) history
 *
 * The handcrafted-history tests pass an explicit `historicalDemand`
 * + `warmupPeriods` + `numPeriods` to make each helper's expected
 * output deterministic. The helpers are private; we exercise them
 * via the public action contract and inspect the returned forecast.
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

/** Build an engine pre-seeded with a hand-crafted history. The first
 *  forecasting period equals `historicalDemand[warmupPeriods]`. */
async function makeEngine(opts: {
  sessionId?: string;
  historicalDemand?: number[];
  warmupPeriods?: number;
  numPeriods?: number;
  scenario?: string;
  rngSeed?: number;
} = {}): Promise<DemandForecastEngine> {
  const engine = new DemandForecastEngine(opts.sessionId || SESSION_ID);
  await engine.initialize({
    scenario: opts.scenario,
    historicalDemand: opts.historicalDemand,
    warmupPeriods: opts.warmupPeriods,
    numPeriods: opts.numPeriods ?? opts.historicalDemand?.length,
    rngSeed: opts.rngSeed,
  });
  return engine;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('initialization', () => {
  it('loads the default (Stevenson) scenario', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const pub = engine.getPublicState();
    expect(pub.scenarioId).toBe('default');
    expect(pub.scenarioName).toContain('Stationary');
    expect(pub.totalPeriods).toBe(20);
    expect(pub.warmupPeriods).toBe(5);
    expect(pub.currentPeriod).toBe(5);
    expect(pub.historicalDemand).toHaveLength(5);
    expect(pub.isComplete).toBe(false);
    expect(pub.demandPattern).toBe('stationary');
  });

  it('loads the trending-quarterly-retail scenario', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({ scenario: 'trending-quarterly-retail' });
    const pub = engine.getPublicState();
    expect(pub.scenarioId).toBe('trending-quarterly-retail');
    expect(pub.demandPattern).toBe('trending');
  });

  it('loads the seasonal-quarterly scenario (audit D6 fix — sinePeriod=4)', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({ scenario: 'seasonal-quarterly' });
    const pub = engine.getPublicState();
    expect(pub.demandPattern).toBe('seasonal');
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

  it('exposes available methods (canonical 6) without leaking sensitive data', async () => {
    const engine = new DemandForecastEngine(SESSION_ID);
    await engine.initialize({});
    const pub = engine.getPublicState();
    expect(pub.availableMethods).toHaveLength(6);
    const ids = pub.availableMethods.map((m: any) => m.id);
    for (const id of ALL_METHODS) {
      expect(ids).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// Method helpers — handcrafted-input correctness (PART B)
// ---------------------------------------------------------------------------

describe('method helpers (handcrafted inputs)', () => {
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
    // 0.5*30 + 0.3*20 + 0.2*10 = 15 + 6 + 2 = 23
    expect(r.data?.forecast).toBeCloseTo(23, 9);
  });

  it('ES α=0.5: history [10,20] → 15 (canonical recursion, F(0)=A(0))', async () => {
    // Per the engine doc: F(0)=A(0); F(t+1)=α·A(t)+(1-α)·F(t).
    // For α=0.5 and history [10, 20]:
    //   F(0)=10; F(1)=0.5·10+0.5·10=10; F(2)=0.5·20+0.5·10=15.
    // (The prompt's draft expectation of 17.5 corresponds to α=0.75 under
    // this same convention — see the next test.)
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

  it('ES α=0.75: history [10,20] → 17.5 (validates the α=0.75 stepwise case)', async () => {
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
    // F(0)=10; F(1)=0.75·10+0.25·10=10; F(2)=0.75·20+0.25·10=17.5
    expect(r.data?.forecast).toBeCloseTo(17.5, 9);
  });

  it("Holt's α=0.5, β=0.3: history [10,15,22,30] → ~34.005 (hand-traced L/T)", async () => {
    // L(0)=10, T(0)=A(1)-A(0)=5
    // t=1: L(1)=0.5·15+0.5·(10+5)=15;        T(1)=0.3·5+0.7·5=5
    // t=2: L(2)=0.5·22+0.5·(15+5)=21;        T(2)=0.3·6+0.7·5=5.3
    // t=3: L(3)=0.5·30+0.5·(21+5.3)=28.15;   T(3)=0.3·7.15+0.7·5.3=5.855
    // F(4) = L(3)+T(3) = 34.005
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

  it('Linear Regression: history [10,12,14,16,18] → slope=2, intercept=10, F(period 5)=20', async () => {
    // Default periodIndex = history.length = 5 → F(5) = 10 + 2·5 = 20.
    // Test the F(period 6)=22 case in the next test by stepping forward.
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
    // F(5) = 10 + 2·5 = 20
    expect(r.data?.forecast).toBeCloseTo(20, 9);
  });

  it('Linear Regression: history [10,12,14,16,18,20] → F(period 6)=22', async () => {
    // history extended by one observation; default periodIndex = 6 → F(6) = 22
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

// ---------------------------------------------------------------------------
// Method validation — Pattern B critical (audit D4)
// ---------------------------------------------------------------------------

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
    expect((await engine.applyAction(P1, { method: null, params: {} })).success).toBe(false);
    expect(
      (await engine.applyAction(P1, { method: undefined, params: {} })).success
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

// ---------------------------------------------------------------------------
// Async/sync split — Pattern D
// ---------------------------------------------------------------------------

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
    expect(ps.metrics.dataPattern).toBeDefined();
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
    expect(typeof m.playerPerformance.score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// MAPE divide-by-zero — DEFECT 4 (audit D7)
// ---------------------------------------------------------------------------

describe('MAPE handling (DEFECT 4)', () => {
  it('zero-actual periods are excluded from MAPE; tracked separately', async () => {
    // Period 5 has actual=0 → percentageError null; period 6 actual=10 → included.
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
    // MAPE = average of period-6 PE only (period-5 excluded)
    expect(ps.metrics.playerPerformance.mape).toBeGreaterThan(0);
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
    expect(Number.isFinite(ps.metrics.playerPerformance.score)).toBe(true);
    expect(ps.metrics.playerPerformance.mapeExcludedPeriods).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Seeded RNG — closes audit D8
// ---------------------------------------------------------------------------

describe('seeded RNG reproducibility', () => {
  it('two engines with the same sessionId produce identical historicalDemand', async () => {
    const e1 = new DemandForecastEngine('seed-test-A');
    await e1.initialize({});
    const e2 = new DemandForecastEngine('seed-test-A');
    await e2.initialize({});
    expect(e1.getPublicState().historicalDemand).toEqual(e2.getPublicState().historicalDemand);
    // also compare the full series via getParticipantState's hidden field
    // by stepping through to completion: easier path — internal state reads
    const ps1 = e1.getParticipantState(P1);
    const ps2 = e2.getParticipantState(P1);
    expect(ps1.historicalDemand).toEqual(ps2.historicalDemand);
  });

  it('different sessionIds produce different historicalDemand', async () => {
    const e1 = new DemandForecastEngine('seed-test-X');
    await e1.initialize({});
    const e2 = new DemandForecastEngine('seed-test-Y');
    await e2.initialize({});
    expect(e1.getPublicState().historicalDemand).not.toEqual(
      e2.getPublicState().historicalDemand
    );
  });

  it('explicit rngSeed overrides sessionId-derived seed', async () => {
    const e1 = new DemandForecastEngine('seed-test-A');
    await e1.initialize({ rngSeed: 12345 });
    const e2 = new DemandForecastEngine('seed-test-B');
    await e2.initialize({ rngSeed: 12345 });
    expect(e1.getPublicState().historicalDemand).toEqual(e2.getPublicState().historicalDemand);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

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
    // 2 forecasting periods (warmup 5, total 7).
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

  it('NaN-poisoning attempt: forecast value is computed by engine, never trusted from client', async () => {
    // Pre-rewrite the engine accepted forecast: NaN; it now ignores any
    // forecast field on the action and computes its own.
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    const r = await engine.applyAction(P1, {
      method: 'naive',
      params: {},
      forecast: NaN, // ignored — engine computes from helper
    } as any);
    expect(r.success).toBe(true);
    expect(r.data?.forecast).toBe(50);
    expect(Number.isFinite(r.data?.forecast)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cumulative metrics shape
// ---------------------------------------------------------------------------

describe('cumulative metrics shape', () => {
  it('returns expected fields including MAPE excluded-periods counter', async () => {
    const engine = await makeEngine({
      historicalDemand: [10, 20, 30, 40, 50, 60, 70],
      warmupPeriods: 5,
      numPeriods: 7,
    });
    await engine.applyAction(P1, { method: 'naive', params: {} });
    await engine.applyAction(P1, { method: 'naive', params: {} });
    const m = await engine.computeMetrics();
    expect(m.playerPerformance).toBeDefined();
    expect(typeof m.playerPerformance.mad).toBe('number');
    expect(typeof m.playerPerformance.mse).toBe('number');
    expect(typeof m.playerPerformance.mape).toBe('number');
    expect(typeof m.playerPerformance.trackingSignal).toBe('number');
    expect(typeof m.playerPerformance.mapeExcludedPeriods).toBe('number');
    expect(typeof m.playerPerformance.score).toBe('number');
    expect(m.dataPattern).toBeDefined();
    expect(m.optimalMethod).toBeDefined();
    expect(m.methodsUsed).toBeDefined();
    expect(m.forecastsCount).toBe(2);
  });
});
