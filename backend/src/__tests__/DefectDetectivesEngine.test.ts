import { DefectDetectivesEngine } from '../services/gameEngines/DefectDetectivesEngine';
import { prisma } from '../db';

/**
 * Defect Detectives Engine Tests (Session 9 — Option B reskin)
 *
 * Pattern: mock Prisma (mirrors EVGambitEngine.test.ts and
 * CustomerInStoreEngine.test.ts) so tests run without a live DB.
 *
 * Coverage:
 *   - Initialization with consumer-goods (default) and quick-commerce scenarios
 *   - Pattern B: forged tool name rejected; canonical 7-tool list accepted
 *   - Pattern C: duplicate tool application rejected
 *   - Pattern D: getParticipantState.metrics is a value, not a Promise
 *   - Pattern A: per-tool reduction values stripped from publicState
 *   - DEFECT 2: tool insights derived from data (Pareto top-2, μ ± 3σ, correlation)
 *   - DEFECT 3: perBatch cost = totalCost / processed_batch_count, not currentBatch
 *   - DEFECT 4: sample-size-scaled catch rate; no-inspection drift
 *   - Reproducibility (seeded RNG)
 *   - Edge cases (zero defects, single batch, all 7 tools applied)
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

const SESSION_ID = 'test-session-dd';
const P1 = 'p1';

const ALL_TOOLS = [
  'Check Sheet',
  'Histogram',
  'Pareto Analysis',
  'Cause-and-Effect Diagram',
  'Scatter Diagram',
  'Flowchart',
  'Control Chart',
];

describe('DefectDetectivesEngine', () => {
  let engine: DefectDetectivesEngine;

  beforeEach(() => {
    engine = new DefectDetectivesEngine(SESSION_ID);
    jest.clearAllMocks();
    (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
      { id: P1, role: 'PLAYER', joined_at: new Date() },
    ]);
    (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.sessionStateCache.upsert as jest.Mock).mockResolvedValue({});
  });

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------

  describe('initialization', () => {
    it('loads the consumer-goods (default) scenario', async () => {
      await engine.initialize({});
      const pub = engine.getPublicState();
      expect(pub.scenarioId).toBe('consumer-goods');
      expect(pub.scenarioName).toContain('Consumer Goods');
      expect(pub.currencySymbol).toBe('₹');
      expect(pub.maxBatches).toBe(20);
      expect(pub.batchSize).toBe(1000);
      expect(pub.initialDefectRate).toBe(8.0);
      expect(pub.targetDefectRate).toBe(2.0);
      expect(pub.currentDefectRate).toBe(8.0);
      expect(pub.toolsApplied).toEqual([]);
      expect(pub.isComplete).toBe(false);
    });

    it('loads the quick-commerce scenario when requested', async () => {
      await engine.initialize({ scenario: 'quick-commerce' });
      const pub = engine.getPublicState();
      expect(pub.scenarioId).toBe('quick-commerce');
      expect(pub.scenarioName).toContain('Quick-Commerce');
      const ps = engine.getParticipantState(P1);
      // quick-commerce ships 2 shifts (Day + Evening Rush), not 3
      expect(ps.shifts).toHaveLength(2);
      expect(ps.defectTypes.map((d: any) => d.label)).toEqual(
        expect.arrayContaining(['Mispick', 'Damage', 'Late Pack', 'Wrong Quantity', 'Cold Chain Break'])
      );
    });

    it('rejects an unknown scenario id', async () => {
      await expect(engine.initialize({ scenario: 'does-not-exist' })).rejects.toThrow(
        /Unknown Defect Detectives scenario/
      );
    });

    it('exposes available tools without per-tool reduction (Pattern A)', async () => {
      await engine.initialize({});
      const pub = engine.getPublicState();
      expect(pub.availableTools).toHaveLength(7);
      for (const t of pub.availableTools) {
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t).not.toHaveProperty('reduction');
      }
    });
  });

  // -------------------------------------------------------------------
  // Pattern B — tool-name validation (THE critical Session 9 fix)
  // -------------------------------------------------------------------

  describe('tool-name validation (Pattern B)', () => {
    beforeEach(async () => {
      await engine.initialize({ rngSeed: 42 });
    });

    it('rejects an unknown tool name with explicit error', async () => {
      const result = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'MagicWand',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown QC tool');
    });

    it('rejects an empty / missing tool name', async () => {
      const r1 = await engine.applyAction(P1, { actionType: 'apply-qc-tool',  });
      expect(r1.success).toBe(false);
      const r2 = await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: '' });
      expect(r2.success).toBe(false);
    });

    it('cannot stack reductions via fake tool names', async () => {
      // Apply 30 fake tools — pre-Session-9 each would yield default 5%
      // reduction, flooring defect rate. Now all should reject.
      for (let i = 0; i < 30; i++) {
        const r = await engine.applyAction(P1, {
          actionType: 'apply-qc-tool',
          tool: `FakeTool${i}`,
        });
        expect(r.success).toBe(false);
      }
      const pub = engine.getPublicState();
      expect(pub.currentDefectRate).toBe(8.0);
      expect(pub.toolsApplied).toEqual([]);
    });

    it('accepts each of the 7 canonical tools', async () => {
      for (const tool of ALL_TOOLS) {
        const r = await engine.applyAction(P1, {
          actionType: 'apply-qc-tool',
          tool,
        });
        expect(r.success).toBe(true);
      }
      const pub = engine.getPublicState();
      expect(pub.toolsApplied).toHaveLength(7);
    });

    it('rejects re-applying the same tool (Pattern C)', async () => {
      const first = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Pareto Analysis',
      });
      expect(first.success).toBe(true);
      const dup = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Pareto Analysis',
      });
      expect(dup.success).toBe(false);
      expect(dup.message).toContain('already been applied');
    });
  });

  // -------------------------------------------------------------------
  // sampleSize validation (Pattern B)
  // -------------------------------------------------------------------

  describe('sampleSize validation', () => {
    beforeEach(async () => {
      await engine.initialize({ rngSeed: 42 });
    });

    it('rejects negative sampleSize', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: -50,
      });
      expect(r.success).toBe(false);
    });

    it('rejects non-integer sampleSize', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 50.5,
      });
      expect(r.success).toBe(false);
    });

    it('rejects sampleSize larger than batchSize', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 100000,
      });
      expect(r.success).toBe(false);
    });

    it('accepts a valid sampleSize within range', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 200,
      });
      expect(r.success).toBe(true);
      expect(engine.getPublicState().sampleSize).toBe(200);
    });
  });

  // -------------------------------------------------------------------
  // Tool insights derived from data (DEFECT 2)
  // -------------------------------------------------------------------

  describe('data-driven tool insights (DEFECT 2)', () => {
    beforeEach(async () => {
      await engine.initialize({ rngSeed: 42 });
    });

    it('Pareto returns real ranked categories with cumulative percentages', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Pareto Analysis',
      });
      expect(r.success).toBe(true);
      const chart = r.data?.chartData;
      expect(chart.rows).toBeDefined();
      expect(chart.rows.length).toBeGreaterThan(0);
      // Rows should be sorted descending by count
      for (let i = 1; i < chart.rows.length; i++) {
        expect(chart.rows[i - 1].count).toBeGreaterThanOrEqual(chart.rows[i].count);
      }
      // Cumulative percentage of last row should be ~100
      const last = chart.rows[chart.rows.length - 1];
      expect(last.cumulativePct).toBeGreaterThan(99);
      expect(last.cumulativePct).toBeLessThan(101);
    });

    it('Histogram returns mean + stddev computed from data', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Histogram',
      });
      expect(r.success).toBe(true);
      const chart = r.data?.chartData;
      expect(typeof chart.mean).toBe('number');
      expect(typeof chart.stddev).toBe('number');
      expect(chart.mean).toBeGreaterThanOrEqual(0);
      expect(chart.stddev).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(chart.bins)).toBe(true);
    });

    it('Control Chart computes UCL/LCL = μ ± 3σ from warmup data', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Control Chart',
      });
      expect(r.success).toBe(true);
      const chart = r.data?.chartData;
      expect(typeof chart.mean).toBe('number');
      expect(typeof chart.ucl).toBe('number');
      expect(typeof chart.lcl).toBe('number');
      expect(chart.ucl).toBeGreaterThan(chart.mean);
      expect(chart.lcl).toBeLessThanOrEqual(chart.mean);
      // UCL - LCL ≈ 6σ
      const sigma = (chart.ucl - chart.mean) / 3;
      const expectedLcl = Math.max(0, chart.mean - 3 * sigma);
      expect(chart.lcl).toBeCloseTo(expectedLcl, 5);
    });

    it('Scatter computes a real correlation coefficient', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Scatter Diagram',
      });
      expect(r.success).toBe(true);
      const chart = r.data?.chartData;
      expect(typeof chart.correlation).toBe('number');
      expect(chart.correlation).toBeGreaterThanOrEqual(-1);
      expect(chart.correlation).toBeLessThanOrEqual(1);
      expect(Array.isArray(chart.points)).toBe(true);
    });

    it('Check Sheet returns real defect-type tallies', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Check Sheet',
      });
      expect(r.success).toBe(true);
      const chart = r.data?.chartData;
      expect(Array.isArray(chart.rows)).toBe(true);
      expect(chart.rows.length).toBeGreaterThan(0);
      for (const row of chart.rows) {
        expect(typeof row.defectType).toBe('string');
        expect(typeof row.count).toBe('number');
        expect(row.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('Fishbone produces scenario-specific structural insight', async () => {
      const r = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Cause-and-Effect Diagram',
      });
      expect(r.success).toBe(true);
      // consumer-goods finger-prints: should mention machine calibration / material
      expect(r.data?.insight).toMatch(/Material|Equipment|Operator|Method|Environment/);
    });

    it('Flowchart finding differs by scenario', async () => {
      const consumer = await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Flowchart',
      });
      const consumerInsight = consumer.data?.insight as string;

      // Initialize a fresh engine for quick-commerce scenario
      const engine2 = new DefectDetectivesEngine(SESSION_ID + '-qc');
      await engine2.initialize({ scenario: 'quick-commerce', rngSeed: 42 });
      const dark = await engine2.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Flowchart',
      });
      const darkInsight = dark.data?.insight as string;

      expect(consumerInsight).not.toBe(darkInsight);
      expect(darkInsight).toMatch(/dispatch|pre-dispatch|verification|rush/i);
    });
  });

  // -------------------------------------------------------------------
  // Cost math (DEFECT 3)
  // -------------------------------------------------------------------

  describe('cost math', () => {
    beforeEach(async () => {
      await engine.initialize({ rngSeed: 42 });
    });

    it('costs.perBatch divides by processed-batch count, not currentBatch', async () => {
      // Set 100% inspection so cost is deterministic
      await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: '100%',
      });

      // Process 5 batches
      for (let i = 0; i < 5; i++) {
        const r = await engine.applyAction(P1, { actionType: 'process-batch' });
        expect(r.success).toBe(true);
      }

      const ps = engine.getParticipantState(P1);
      const m = ps.metrics;
      // 5 batches processed, currentBatch advanced from 10 to 15.
      // Pre-Session-9 the divisor was currentBatch (15) — off by 3x.
      // Now: totalCost / 5.
      const expectedPerBatch = m.costs.total / 5;
      expect(m.costs.perBatch).toBeCloseTo(expectedPerBatch, 5);
    });

    it('inspection cost scales with sample size', async () => {
      await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 100,
      });
      const r1 = await engine.applyAction(P1, { actionType: 'process-batch' });
      expect(r1.data?.costs.inspection).toBe(100 * 100); // sampleSize * inspectionCostPerUnit (₹100)

      // Now bigger sample
      const engine2 = new DefectDetectivesEngine(SESSION_ID + '-2');
      await engine2.initialize({ rngSeed: 42 });
      await engine2.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 500,
      });
      const r2 = await engine2.applyAction(P1, { actionType: 'process-batch' });
      expect(r2.data?.costs.inspection).toBe(500 * 100);
    });
  });

  // -------------------------------------------------------------------
  // Pedagogy: defect rate trends down with effective tools
  // -------------------------------------------------------------------

  describe('pedagogy', () => {
    it('defect rate trends down with effective tools applied', async () => {
      await engine.initialize({ rngSeed: 42 });
      const initial = engine.getPublicState().currentDefectRate;
      // Apply the high-impact tools
      await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: 'Control Chart' });
      await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: 'Pareto Analysis' });
      await engine.applyAction(P1, {
        actionType: 'apply-qc-tool',
        tool: 'Cause-and-Effect Diagram',
      });
      const after = engine.getPublicState().currentDefectRate;
      expect(after).toBeLessThan(initial);
    });

    it('sample size affects catch rate (DEFECT 4)', async () => {
      // Run two engines side-by-side: one with sampleSize=50, one with sampleSize=500.
      // Use 100% inspection to drive defect rate predictably... actually easier:
      // process several batches and compare cumulative defectsDetected.
      const small = new DefectDetectivesEngine('s1');
      await small.initialize({ rngSeed: 42 });
      await small.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 50,
      });

      const large = new DefectDetectivesEngine('s2');
      await large.initialize({ rngSeed: 42 });
      await large.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'sampling', sampleSize: 500,
      });

      let smallDetected = 0;
      let largeDetected = 0;
      for (let i = 0; i < 5; i++) {
        const sr = await small.applyAction(P1, { actionType: 'process-batch' });
        const lr = await large.applyAction(P1, { actionType: 'process-batch' });
        smallDetected += sr.data?.defectsDetected || 0;
        largeDetected += lr.data?.defectsDetected || 0;
      }
      expect(largeDetected).toBeGreaterThan(smallDetected);
    });

    it('defect rate drifts up without inspection once at target (DEFECT 4)', async () => {
      await engine.initialize({ rngSeed: 42, targetDefectRate: 6.0 });
      // Confirm currentDefectRate (8) > target (6) initially
      // Force rate down to target by applying Control Chart (18% reduction)
      // 8 * 0.82 = 6.56, then floor at 6.0 ... actually our floor is min(target, current * (1 - r/100))
      // 8 * 0.82 = 6.56 > target, so currentRate becomes 6.56. Apply Pareto: 6.56 * 0.85 = 5.576 < 6 → flooring at 6.
      await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: 'Control Chart' });
      await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: 'Pareto Analysis' });
      const atTarget = engine.getPublicState().currentDefectRate;
      expect(atTarget).toBeLessThanOrEqual(6.5);

      // Switch off inspection
      await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: 'none',
      });

      // Process batches; defect rate should drift up
      for (let i = 0; i < 5; i++) {
        await engine.applyAction(P1, { actionType: 'process-batch' });
      }
      const afterDrift = engine.getPublicState().currentDefectRate;
      expect(afterDrift).toBeGreaterThan(atTarget);
    });
  });

  // -------------------------------------------------------------------
  // Pattern A (state leak), Pattern D (async/sync leak)
  // -------------------------------------------------------------------

  describe('integrity patterns (Patterns A + D)', () => {
    beforeEach(async () => {
      await engine.initialize({ rngSeed: 42 });
    });

    it('Pattern A: per-tool reduction values not leaked in publicState', async () => {
      const pub = engine.getPublicState();
      for (const t of pub.availableTools) {
        expect(t.reduction).toBeUndefined();
      }
    });

    it('Pattern D: getParticipantState.metrics is a resolved object, not a Promise', async () => {
      const ps = engine.getParticipantState(P1);
      expect(ps.metrics).toBeDefined();
      expect(typeof ps.metrics.then).toBe('undefined');
      expect(ps.metrics.defectRates).toBeDefined();
      expect(ps.metrics.costs).toBeDefined();
    });

    it('computeMetrics async wrapper still satisfies BaseGameEngine contract', async () => {
      const m = await engine.computeMetrics();
      expect(m.defectRates).toBeDefined();
      expect(m.costs).toBeDefined();
      expect(m.scenarioId).toBe('consumer-goods');
    });
  });

  // -------------------------------------------------------------------
  // Reproducibility (seeded RNG closes audit D9)
  // -------------------------------------------------------------------

  describe('reproducibility (seeded RNG)', () => {
    it('same seed produces identical defect data', async () => {
      const e1 = new DefectDetectivesEngine('seed-test-1');
      await e1.initialize({ rngSeed: 999 });
      const data1 = e1.getParticipantState(P1).defectData;

      const e2 = new DefectDetectivesEngine('seed-test-2');
      await e2.initialize({ rngSeed: 999 });
      const data2 = e2.getParticipantState(P1).defectData;

      expect(data1.length).toBe(data2.length);
      for (let i = 0; i < data1.length; i++) {
        expect(data1[i].defectType).toBe(data2[i].defectType);
        expect(data1[i].machine).toBe(data2[i].machine);
        expect(data1[i].defectCount).toBe(data2[i].defectCount);
      }
    });

    it('different seeds produce different defect data', async () => {
      const e1 = new DefectDetectivesEngine('seed-test-3');
      await e1.initialize({ rngSeed: 1 });
      const e2 = new DefectDetectivesEngine('seed-test-4');
      await e2.initialize({ rngSeed: 2 });
      const data1 = e1.getParticipantState(P1).defectData;
      const data2 = e2.getParticipantState(P1).defectData;
      const same = data1.every(
        (d: any, i: number) =>
          d.defectType === data2[i].defectType && d.defectCount === data2[i].defectCount
      );
      expect(same).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles all 7 tools applied — defect rate floored at target', async () => {
      await engine.initialize({ rngSeed: 42 });
      for (const tool of ALL_TOOLS) {
        const r = await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool });
        expect(r.success).toBe(true);
      }
      const pub = engine.getPublicState();
      expect(pub.toolsApplied).toHaveLength(7);
      // Target is 2.0%; cumulative tool reductions floor at target
      expect(pub.currentDefectRate).toBeGreaterThanOrEqual(pub.targetDefectRate - 0.001);
    });

    it('handles a single batch run without crash', async () => {
      await engine.initialize({ rngSeed: 42, numBatches: 11 });
      const r = await engine.applyAction(P1, { actionType: 'process-batch' });
      expect(r.success).toBe(true);
      expect(r.data?.isComplete).toBe(true);
    });

    it('handles a 100%-inspection run with zero customer-passed defects', async () => {
      await engine.initialize({ rngSeed: 42 });
      await engine.applyAction(P1, {
        actionType: 'set-inspection-strategy',
        strategy: '100%',
      });
      for (let i = 0; i < 5; i++) {
        const r = await engine.applyAction(P1, { actionType: 'process-batch' });
        expect(r.data?.defectsPassedToCustomer).toBe(0);
      }
    });

    it('rejects actions after isComplete', async () => {
      await engine.initialize({ rngSeed: 42, numBatches: 11 });
      await engine.applyAction(P1, { actionType: 'process-batch' });
      const r = await engine.applyAction(P1, { actionType: 'process-batch' });
      expect(r.success).toBe(false);
      expect(r.message).toContain('already complete');
    });

    it('rejects unknown actionType', async () => {
      await engine.initialize({ rngSeed: 42 });
      const r = await engine.applyAction(P1, { actionType: 'foo',  } as any);
      expect(r.success).toBe(false);
      expect(r.message).toContain('Unknown action type');
    });
  });

  // -------------------------------------------------------------------
  // computeMetrics shape
  // -------------------------------------------------------------------

  describe('computeMetrics shape', () => {
    it('returns expected fields including four-bucket cost breakdown', async () => {
      await engine.initialize({ rngSeed: 42 });
      await engine.applyAction(P1, { actionType: 'apply-qc-tool', tool: 'Control Chart' });
      await engine.applyAction(P1, { actionType: 'process-batch' });
      const m = await engine.computeMetrics();

      expect(m.defectRates.initial).toBe(8.0);
      expect(typeof m.defectRates.current).toBe('number');
      expect(m.targetAchieved).toBeDefined();
      expect(m.toolsAppliedCount).toBe(1);
      expect(m.toolsTotal).toBe(7);
      expect(m.costs.currency).toBe('₹');
      expect(typeof m.costs.total).toBe('number');
      expect(typeof m.costs.perBatch).toBe('number');
      expect(typeof m.costs.prevention).toBe('number');
      expect(typeof m.costs.appraisal).toBe('number');
      expect(typeof m.costs.internalFailure).toBe('number');
      expect(typeof m.costs.externalFailure).toBe('number');
      expect(m.performanceGrade).toBeDefined();
    });
  });
});
