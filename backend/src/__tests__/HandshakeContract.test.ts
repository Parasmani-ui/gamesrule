/**
 * Handshake contract integration tests (Session HS-1).
 *
 * Existing per-engine test files call `engine.applyAction(pid, action)` with
 * hand-built action objects — they verify whatever shape the test author
 * typed, not the shape the production bridge actually delivers. This file
 * fills that gap with one per-Phase-1-sim test that builds the action object
 * exactly the way `backend/src/sockets/index.ts:225-228` does, given the
 * same `(actionType, payload)` pair that the UI hands to `onAction`.
 *
 * The bridge formula (CLAUDE.md §5.2) is:
 *
 *     engine.applyAction(participantId, { actionType, ...payload })
 *
 * Each test takes the literal UI payload from the corresponding
 * `components/games/<Sim>/index.tsx` call site and runs it through
 * `buildAction` (which mirrors the socket handler) before calling
 * applyAction. Any future drift between UI shape and engine destructure
 * will trip the matching test.
 */

import { FruitBeerEngine } from '../services/gameEngines/FruitBeerEngine';
import { CustomerInStoreEngine } from '../services/gameEngines/CustomerInStoreEngine';
import { EVGambitEngine } from '../services/gameEngines/EVGambitEngine';
import { DefectDetectivesEngine } from '../services/gameEngines/DefectDetectivesEngine';
import { DemandForecastEngine } from '../services/gameEngines/DemandForecastEngine';
import { HRCompensationEngine } from '../services/gameEngines/HRCompensationEngine';

jest.mock('../db', () => {
  const sessionParticipant = { findMany: jest.fn() };
  const sessionStateCache = {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
  };
  const gameState = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const playerDecision = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const fruitBeerGameState = {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  };
  return {
    prisma: {
      sessionParticipant,
      sessionStateCache,
      gameState,
      playerDecision,
      fruitBeerGameState,
    },
  };
});

import { prisma } from '../db';

const SESSION = 'handshake-session';
const P1 = 'handshake-p1';

/**
 * Mirrors the bridge in `backend/src/sockets/index.ts:225-228`. Build the
 * action object the same way the socket handler does, given the same
 * (actionType, payload) the UI hands to `onAction`.
 */
function buildAction(actionType: string, payload: Record<string, unknown>) {
  return { actionType, ...payload };
}

describe('handshake contract — bridge-built action routes correctly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
      { id: P1, role: 'RETAILER', joined_at: new Date() },
    ]);
    (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.sessionStateCache.upsert as jest.Mock).mockResolvedValue({});
  });

  describe('FruitBeer', () => {
    it("UI's onAction('place_order', { orderQuantity }) routes through the bridge", async () => {
      const engine = new FruitBeerEngine(SESSION + '-fb');
      await engine.initialize({
        leadTime: 2,
        initialInventory: 12,
        initialBackorder: 0,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 20,
      });

      // Mirror the production bridge — the action object delivered to
      // applyAction is { actionType, ...payload }.
      const action = buildAction('place_order', { orderQuantity: 5 });
      const result = await engine.applyAction(P1, action);

      // The engine destructures `orderQuantity` flat off `action`. If the
      // UI ever sent `{ data: { orderQuantity } }` instead, the engine
      // would see `action.orderQuantity === undefined` and reject with
      // "Invalid order quantity". The bridge contract holds when that
      // rejection does NOT fire.
      expect(result.success).toBe(true);
      expect(result.message).not.toMatch(/Invalid order quantity/);
    });
  });

  describe('CustomerInStore', () => {
    it("UI's onAction('submit_answer', { questionIndex, answer, timeSpent }) routes through the bridge", async () => {
      const engine = new CustomerInStoreEngine(SESSION + '-cis');
      await engine.initialize({});

      const action = buildAction('submit_answer', {
        questionIndex: 0,
        answer: 0,
        timeSpent: 10,
      });
      const result = await engine.applyAction(P1, action);

      // Engine destructures `{ answer, questionIndex, ... }` flat. Wire
      // failure looks like "questionIndex (integer) is required" because
      // the field would be undefined; we only care that the engine SAW
      // the field, not whether the answer is correct.
      expect(result.message).not.toMatch(/questionIndex .* required/);
      expect(result.message).not.toMatch(/Out-of-order submission/);
    });
  });

  describe('EVGambit', () => {
    it("UI's onAction('make-decision', { round, decisionId }) routes through the bridge", async () => {
      const engine = new EVGambitEngine(SESSION + '-ev');
      await engine.initialize({});

      // EVGambit starts at round=1 after initialize (1-indexed). The
      // engine's round-binding gate compares action.round to the engine's
      // currentRound — match it here so the gate doesn't trip and we
      // exercise the actionType-switch routing edge instead.
      const currentRound = engine.getPublicState().currentRound;
      const action = buildAction('make-decision', {
        round: currentRound,
        decisionId: 'no-such-decision',
      });
      const result = await engine.applyAction(P1, action);

      // Engine switches on `action.actionType` and gates on `action.round`.
      // A routing miss would surface as "Action targets round X" mismatch
      // (because round arrived undefined) — assert against that.
      expect(result.message).not.toMatch(/Action targets round/);
    });
  });

  describe('DefectDetectives', () => {
    it("UI's onAction('apply-qc-tool', { tool }) routes through the bridge", async () => {
      const engine = new DefectDetectivesEngine(SESSION + '-dd');
      await engine.initialize({ rngSeed: 1 });

      const action = buildAction('apply-qc-tool', { tool: 'Pareto Analysis' });
      const result = await engine.applyAction(P1, action);

      // Pre-Session-HS-1 the engine read `action.data.tool`. Under the
      // canonical flat contract `tool` arrives at the top level of the
      // action; success here proves the routing edge is correct.
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Pareto Analysis applied successfully/);
    });
  });

  describe('DemandForecast', () => {
    it("UI's onAction('infer-pattern' / 'forecast', ...) routes through the bridge", async () => {
      const engine = new DemandForecastEngine(SESSION + '-df');
      await engine.initialize({
        scenario: 'default',
        numPeriods: 12,
        warmupPeriods: 5,
      });

      // Pattern inference first — Pattern C ordering requires it.
      const inferResult = await engine.applyAction(
        P1,
        buildAction('infer-pattern', { phase: 'pattern-inference', guess: 'stationary' })
      );
      expect(inferResult.success).toBe(true);
      expect(inferResult.message).not.toMatch(/Unknown action shape/);

      const forecastResult = await engine.applyAction(
        P1,
        buildAction('forecast', { method: 'naive', params: {} })
      );
      // Engine routes by `typeof action.method === 'string'`; if the
      // payload had been nested under `data`, the engine would emit the
      // "Unknown action shape" reject.
      expect(forecastResult.success).toBe(true);
      expect(forecastResult.message).not.toMatch(/Unknown action shape/);
    });
  });

  describe('HRCompensation', () => {
    it("UI's onAction('select_experts', { stage, expertIds }) routes through the bridge", async () => {
      const engine = new HRCompensationEngine(SESSION + '-hr');
      await engine.initialize({});

      // HRComp's engine ignores the top-level `actionType` and uses
      // `action.stage` as its discriminator. Per CLAUDE.md §5.2 every
      // top-level field of the action object is part of the canonical
      // contract — `stage` and `expertIds` BOTH live at the top.
      const action = buildAction('select_experts', {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      const result = await engine.applyAction(P1, action);

      expect(result.success).toBe(true);
      // Pre-Session-HS-1 the engine read `action.data.expertIds`. If the
      // shape had not been flattened, expertIds would arrive undefined
      // and the engine would emit "Please select at least one expert".
      expect(result.message).not.toMatch(/Please select at least one expert/);
      expect(result.message).toMatch(/Experts selected successfully/);
    });
  });
});
