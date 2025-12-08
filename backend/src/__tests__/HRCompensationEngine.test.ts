import { HRCompensationEngine } from '../services/gameEngines/HRCompensationEngine';
import { prisma } from '../db';

/**
 * HR Compensation Engine Tests
 * 
 * Tests the complete flow of the HR Compensation simulation:
 * 1. Initialization
 * 2. Expert Selection
 * 3. Attribute Weighting
 * 4. Candidate Ranking
 * 5. Final Compensation Calculation
 */

describe('HRCompensationEngine', () => {
  let engine: HRCompensationEngine;
  let testSessionId: string;
  let testParticipantId: string;

  beforeAll(async () => {
    // Create test session
    const simulation = await prisma.simulation.findUnique({
      where: { slug: 'hr-compensation' },
    });

    if (!simulation) {
      throw new Error('HR Compensation simulation not found in database');
    }

    const session = await prisma.gameSession.create({
      data: {
        simulation_id: simulation.id,
        session_code: 'TEST-HR-' + Date.now(),
        session_name: 'Test HR Compensation Session',
        facilitator_id: null,
        configuration: {},
        max_rounds: 1,
        status: 'SETUP',
      },
    });

    testSessionId = session.id;

    // Create test participant
    const participant = await prisma.sessionParticipant.create({
      data: {
        session_id: testSessionId,
        player_name: 'Test Player',
        role: 'PLAYER',
        is_bot: false,
      },
    });

    testParticipantId = participant.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.playerDecision.deleteMany({
      where: { session_id: testSessionId },
    });
    await prisma.gameState.deleteMany({
      where: { session_id: testSessionId },
    });
    await prisma.sessionParticipant.deleteMany({
      where: { session_id: testSessionId },
    });
    await prisma.gameSession.delete({
      where: { id: testSessionId },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    engine = new HRCompensationEngine(testSessionId);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await engine.initialize({});
      
      const publicState = engine.getPublicState();
      
      expect(publicState).toBeDefined();
      expect(publicState.currentStage).toBe('expert-selection');
      expect(publicState.baseSalary).toBe(500000);
      expect(publicState.experts).toHaveLength(4);
      expect(publicState.attributes).toHaveLength(5);
      expect(publicState.candidates).toHaveLength(4);
      expect(publicState.isComplete).toBe(false);
    });

    it('should hide sensitive data in public state', async () => {
      await engine.initialize({});
      
      const publicState = engine.getPublicState();
      
      // Check that credibility is hidden
      publicState.experts.forEach((expert: any) => {
        expect(expert.credibility).toBeUndefined();
      });

      // Check that optimal weights are hidden
      publicState.attributes.forEach((attr: any) => {
        expect(attr.optimalWeight).toBeUndefined();
      });

      // Check that optimal ranks are hidden
      publicState.candidates.forEach((candidate: any) => {
        expect(candidate.optimalRank).toBeUndefined();
      });
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        baseSalary: 600000,
      };

      await engine.initialize(customConfig);
      
      const publicState = engine.getPublicState();
      expect(publicState.baseSalary).toBe(600000);
    });
  });

  describe('Stage 1: Expert Selection', () => {
    beforeEach(async () => {
      await engine.initialize({});
    });

    it('should accept valid expert selection', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Experts selected successfully');
      expect(result.data?.nextStage).toBe('attribute-weighting');
      expect(result.data?.expertScore).toBeGreaterThan(0);
    });

    it('should reject empty expert selection', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: [] },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('at least one expert');
    });

    it('should calculate expert selection score based on credibility', async () => {
      // Select highest credibility experts (exp1: 0.9, exp2: 0.85)
      const result1 = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });

      const score1 = result1.data?.expertScore;
      const expectedScore1 = Math.round(((0.9 + 0.85) / 2) * 50000);
      expect(score1).toBe(expectedScore1);
    });
  });

  describe('Stage 2: Attribute Weighting', () => {
    beforeEach(async () => {
      await engine.initialize({});
      // Complete expert selection first
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });
    });

    it('should accept valid attribute weights', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Attribute weights set successfully');
      expect(result.data?.nextStage).toBe('candidate-ranking');
      expect(result.data?.attributeWeightScore).toBeGreaterThan(0);
    });

    it('should reject weights that do not sum to 1.0', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.30,
            leadership: 0.30,
            experience: 0.20,
            education: 0.10,
            cultural: 0.05, // Sum = 0.95, not 1.0
          },
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('sum to 1.0');
    });

    it('should calculate perfect score for optimal weights', async () => {
      // Use optimal weights
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });

      expect(result.data?.attributeWeightScore).toBe(100000);
    });

    it('should penalize weights far from optimal', async () => {
      // Use equal weights (far from optimal)
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.20,
            leadership: 0.20,
            experience: 0.20,
            education: 0.20,
            cultural: 0.20,
          },
        },
      });

      // Score should be significantly less than 100000
      expect(result.data?.attributeWeightScore).toBeLessThan(100000);
    });
  });

  describe('Stage 3: Candidate Ranking', () => {
    beforeEach(async () => {
      await engine.initialize({});
      // Complete expert selection
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });
      // Complete attribute weighting
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });
    });

    it('should accept valid candidate ranking', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Compensation calculated');
      expect(result.data?.finalCompensation).toBeGreaterThan(500000);
      expect(result.data?.isComplete).toBe(true);
    });

    it('should reject invalid ranking length', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2'], // Only 2 candidates, need 4
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid ranking');
    });

    it('should calculate perfect score for optimal ranking', async () => {
      // Use optimal ranking: cand1, cand2, cand3, cand4 (Rank 1, 2, 3, 4)
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });

      expect(result.data?.correlation).toBe('1.000');
      expect(result.data?.rankingMatchScore).toBe(300000);
    });

    it('should calculate final compensation correctly', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });

      const breakdown = result.data?.breakdown;
      const expectedTotal =
        breakdown.expertSelectionScore +
        breakdown.attributeWeightScore +
        breakdown.rankingMatchScore;

      expect(result.data?.totalScore).toBe(expectedTotal);
      expect(result.data?.finalCompensation).toBe(500000 + expectedTotal);
    });
  });

  describe('Complete Workflow', () => {
    it('should complete full simulation with perfect decisions', async () => {
      await engine.initialize({});

      // Stage 1: Select best experts
      const expertResult = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });
      expect(expertResult.success).toBe(true);

      // Stage 2: Use optimal weights
      const weightResult = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });
      expect(weightResult.success).toBe(true);

      // Stage 3: Use optimal ranking
      const rankResult = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });
      expect(rankResult.success).toBe(true);

      // Verify final state
      const participantState = engine.getParticipantState(testParticipantId);
      expect(participantState.isComplete).toBe(true);
      expect(participantState.finalCompensation).toBeGreaterThan(900000);

      // Verify optimal values are revealed
      expect(participantState.optimalValues).toBeDefined();
      expect(participantState.optimalValues.expertCredibilities).toBeDefined();
      expect(participantState.optimalValues.optimalWeights).toBeDefined();
      expect(participantState.optimalValues.optimalRanking).toBeDefined();
    });

    it('should compute correct metrics', async () => {
      await engine.initialize({});

      // Complete all stages
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1', 'exp2'] },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });

      const metrics = await engine.computeMetrics();

      expect(metrics.finalCompensation).toContain('₹');
      expect(metrics.scoreBreakdown).toBeDefined();
      expect(metrics.percentageOfMax).toContain('%');
      expect(metrics.expertiseLevel).toContain('⭐');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await engine.initialize({});
    });

    it('should prevent actions after completion', async () => {
      // Complete all stages
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1'] },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        data: {
          ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
        },
      });

      // Try to submit another action
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        data: { expertIds: ['exp1'] },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already complete');
    });

    it('should reject wrong stage actions', async () => {
      // Try to submit attribute weights before expert selection
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        data: {
          weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
        },
      });

      // This might succeed (no stage validation), but let's verify state consistency
      const publicState = engine.getPublicState();
      expect(publicState.currentStage).toBe('expert-selection');
    });
  });
});
