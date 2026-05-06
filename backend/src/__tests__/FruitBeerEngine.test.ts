import { FruitBeerEngine } from '../services/gameEngines/FruitBeerEngine';
import { prisma } from '../db';

// Mock Prisma
jest.mock('../db', () => ({
  prisma: {
    sessionParticipant: {
      findMany: jest.fn(),
    },
    playerDecision: {
      create: jest.fn(),
    },
    gameSession: {
      update: jest.fn(),
    },
    fruitBeerGameState: {
      create: jest.fn(),
    },
  },
}));

describe('FruitBeerEngine', () => {
  let engine: FruitBeerEngine;
  const mockSessionId = 'test-session-123';

  beforeEach(() => {
    engine = new FruitBeerEngine(mockSessionId);
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize game with default configuration', async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
        { id: 'p2', role: 'WHOLESALER', joined_at: new Date() },
        { id: 'p3', role: 'DISTRIBUTOR', joined_at: new Date() },
        { id: 'p4', role: 'MANUFACTURER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});

      const config = {
        leadTime: 2,
        initialInventory: 12,
        initialBackorder: 0,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 20,
      };

      await engine.initialize(config);

      const publicState = engine.getPublicState();
      expect(publicState.currentWeek).toBe(0);
      expect(publicState.maxWeeks).toBe(20);
      expect(publicState.isComplete).toBe(false);
    });

    it('should generate demand pattern if not provided', async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});

      const config = {
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 10,
      };

      await engine.initialize(config);
      const publicState = engine.getPublicState();
      expect(publicState.config.demandPattern).toBeDefined();
    });
  });

  describe('applyAction', () => {
    beforeEach(async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});
      (prisma.playerDecision.create as jest.Mock).mockResolvedValue({});

      await engine.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 10,
      });
    });

    it('should accept valid order quantity', async () => {
      const result = await engine.applyAction('p1', { orderQuantity: 5 });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Order placed successfully');
    });

    it('should reject negative order quantity', async () => {
      const result = await engine.applyAction('p1', { orderQuantity: -5 });
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid order quantity');
    });

    it('should reject duplicate order in same round', async () => {
      await engine.applyAction('p1', { orderQuantity: 5 });
      const result = await engine.applyAction('p1', { orderQuantity: 3 });
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Order already placed for this week');
    });
  });

  describe('advanceRound', () => {
    beforeEach(async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
        { id: 'p2', role: 'WHOLESALER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});
      (prisma.gameSession.update as jest.Mock).mockResolvedValue({});

      await engine.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 5,
        demandPattern: [4, 4, 4, 8, 8],
      });
    });

    it('should advance game to next round', async () => {
      const result = await engine.advanceRound();
      
      expect(result.roundNumber).toBe(1);
      expect(result.isGameComplete).toBe(false);
      
      const publicState = engine.getPublicState();
      expect(publicState.currentWeek).toBe(1);
    });

    it('should complete game after max weeks', async () => {
      // Advance through all weeks
      for (let i = 0; i < 5; i++) {
        await engine.advanceRound();
      }

      const publicState = engine.getPublicState();
      expect(publicState.isComplete).toBe(true);
      expect(publicState.currentWeek).toBe(5);
    });

    it('should calculate costs correctly', async () => {
      const result = await engine.advanceRound();

      const participantResults = result.participantResults!;
      expect(participantResults.size).toBeGreaterThan(0);

      // Each participant should have cost calculated
      for (const [_, playerResult] of participantResults) {
        expect(playerResult.totalCost).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('computeMetrics', () => {
    beforeEach(async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
        { id: 'p2', role: 'WHOLESALER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});
      (prisma.gameSession.update as jest.Mock).mockResolvedValue({});

      await engine.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 5,
      });

      // Advance a few rounds
      await engine.advanceRound();
      await engine.advanceRound();
    });

    it('should compute game metrics', async () => {
      const metrics = await engine.computeMetrics();
      
      expect(metrics).toHaveProperty('totalCosts');
      expect(metrics).toHaveProperty('bullwhipEffect');
      expect(metrics).toHaveProperty('inventoryVariance');
      expect(metrics).toHaveProperty('serviceLevel');
    });

    it('should have costs for all players', async () => {
      const metrics = await engine.computeMetrics();

      expect(metrics.totalCosts.RETAILER).toBeGreaterThanOrEqual(0);
      expect(metrics.totalCosts.WHOLESALER).toBeGreaterThanOrEqual(0);
    });

    it('should return per-role bullwhip ratios, not a single number', async () => {
      const metrics = await engine.computeMetrics();

      // Bullwhip is a record keyed by role, populated for each player in the session
      expect(typeof metrics.bullwhipEffect).toBe('object');
      expect(metrics.bullwhipEffect).toHaveProperty('RETAILER');
      expect(metrics.bullwhipEffect).toHaveProperty('WHOLESALER');
      expect(typeof metrics.bullwhipEffect.RETAILER).toBe('number');
      expect(metrics.bullwhipEffect.RETAILER).toBeGreaterThanOrEqual(0);
    });

    it('should report 1.0 bullwhip ratio when demand is constant', async () => {
      // Constant demand → demand variance is 0, ratios should fall back to 1.0
      const flatEngine = new FruitBeerEngine('flat-session');
      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
        { id: 'r', role: 'RETAILER', joined_at: new Date() },
      ]);
      await flatEngine.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 4,
        demandPattern: [4, 4, 4, 4],
      });
      await flatEngine.advanceRound();
      await flatEngine.advanceRound();
      const flatMetrics = await flatEngine.computeMetrics();
      expect(flatMetrics.bullwhipEffect.RETAILER).toBeCloseTo(1.0);
    });
  });

  describe('weekly stats recording', () => {
    it('should populate demand/received/shipped on weeklyStats (not zero)', async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
        { id: 'p2', role: 'WHOLESALER', joined_at: new Date() },
        { id: 'p3', role: 'DISTRIBUTOR', joined_at: new Date() },
        { id: 'p4', role: 'MANUFACTURER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});
      (prisma.gameSession.update as jest.Mock).mockResolvedValue({});
      (prisma.playerDecision.create as jest.Mock).mockResolvedValue({});

      const e = new FruitBeerEngine('stats-session');
      await e.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 6,
        demandPattern: [4, 4, 4, 8, 8, 8],
      });

      // Run a few rounds so the supply chain has shipments and orders flowing
      for (let i = 0; i < 5; i++) {
        await e.applyAction('p1', { orderQuantity: 4 });
        await e.applyAction('p2', { orderQuantity: 4 });
        await e.applyAction('p3', { orderQuantity: 4 });
        await e.applyAction('p4', { orderQuantity: 4 });
        await e.advanceRound();
      }

      const retailerState = e.getParticipantState('p1');
      const wholesalerState = e.getParticipantState('p2');

      // Retailer always sees customer demand
      expect(retailerState.weeklyStats[0].demand).toBe(4);
      // Retailer should have received shipments by week 3 (after lead time)
      const retailerReceivedAny = retailerState.weeklyStats.some((w: any) => w.shipped > 0);
      expect(retailerReceivedAny).toBe(true);

      // Wholesaler must see real downstream demand at some point — the bug
      // would have left demand=0 across the entire history
      const wholesalerSawDemand = wholesalerState.weeklyStats.some((w: any) => w.demand > 0);
      expect(wholesalerSawDemand).toBe(true);
      const wholesalerShippedSomething = wholesalerState.weeklyStats.some((w: any) => w.shipped > 0);
      expect(wholesalerShippedSomething).toBe(true);
    });
  });

  describe('getParticipantState', () => {
    beforeEach(async () => {
      const mockParticipants = [
        { id: 'p1', role: 'RETAILER', joined_at: new Date() },
      ];

      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue(mockParticipants);
      (prisma.fruitBeerGameState.create as jest.Mock).mockResolvedValue({});

      await engine.initialize({
        leadTime: 2,
        initialInventory: 12,
        holdingCost: 0.5,
        stockoutCost: 1.0,
        numWeeks: 10,
      });
    });

    it('should return participant-specific state', async () => {
      const state = engine.getParticipantState('p1');
      
      expect(state).toHaveProperty('role');
      expect(state).toHaveProperty('inventory');
      expect(state).toHaveProperty('backorder');
      expect(state).toHaveProperty('weeklyStats');
      expect(state.role).toBe('RETAILER');
    });

    it('should return null for non-existent participant', async () => {
      const state = engine.getParticipantState('non-existent');
      expect(state).toBeNull();
    });
  });
});

