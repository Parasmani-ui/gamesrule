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
    // Cleanup. HR Compensation persists state in `sessionStateCache`, not the
    // legacy `gameState` table — and some environments don't have
    // `game_states` migrated in. Guard each cleanup call so a failure of one
    // table doesn't block the others, and the suite always disconnects.
    const guard = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch {
        /* table may not exist in this environment */
      }
    };
    await guard(() => prisma.playerDecision.deleteMany({ where: { session_id: testSessionId } }));
    await guard(() => prisma.sessionStateCache.deleteMany({ where: { session_id: testSessionId } }));
    await guard(() => prisma.gameState.deleteMany({ where: { session_id: testSessionId } }));
    await guard(() => prisma.sessionParticipant.deleteMany({ where: { session_id: testSessionId } }));
    await guard(() => prisma.gameSession.delete({ where: { id: testSessionId } }));
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
        expertIds: ['exp1', 'exp2'],
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Experts selected successfully');
      expect(result.data?.nextStage).toBe('attribute-weighting');
      expect(result.data?.expertScore).toBeGreaterThan(0);
    });

    it('should reject empty expert selection', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('at least one expert');
    });

    it('should calculate expert selection score based on credibility', async () => {
      // Select highest credibility experts (exp1: 0.9, exp2: 0.85)
      const result1 = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
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
        expertIds: ['exp1', 'exp2'],
      });
    });

    it('should accept valid attribute weights', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
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
        weights: {
            tech: 0.30,
            leadership: 0.30,
            experience: 0.20,
            education: 0.10,
            cultural: 0.05, // Sum = 0.95, not 1.0
          },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('sum to 1.0');
    });

    it('should calculate perfect score for optimal weights', async () => {
      // Use optimal weights
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });

      expect(result.data?.attributeWeightScore).toBe(100000);
    });

    it('should penalize weights far from optimal', async () => {
      // Use equal weights (far from optimal)
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.20,
            leadership: 0.20,
            experience: 0.20,
            education: 0.20,
            cultural: 0.20,
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
        expertIds: ['exp1', 'exp2'],
      });
      // Complete attribute weighting
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });
    });

    it('should accept valid candidate ranking', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Compensation calculated');
      expect(result.data?.finalCompensation).toBeGreaterThan(500000);
      expect(result.data?.isComplete).toBe(true);
    });

    it('should reject invalid ranking length', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2'], // Only 2 candidates, need 4
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid ranking');
    });

    it('should calculate perfect score for optimal ranking', async () => {
      // Use optimal ranking: cand1, cand2, cand3, cand4 (Rank 1, 2, 3, 4)
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      expect(result.data?.correlation).toBe('1.000');
      expect(result.data?.rankingMatchScore).toBe(300000);
    });

    it('should calculate final compensation correctly', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
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
        expertIds: ['exp1', 'exp2'],
      });
      expect(expertResult.success).toBe(true);

      // Stage 2: Use optimal weights
      const weightResult = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });
      expect(weightResult.success).toBe(true);

      // Stage 3: Use optimal ranking
      const rankResult = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
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
        expertIds: ['exp1', 'exp2'],
      });

      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
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
        expertIds: ['exp1'],
      });

      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });

      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      // Try to submit another action
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already complete');
    });

    it('rejects a stage-2 action while currentStage=expert-selection', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in attribute-weighting stage');
      // State must not have advanced
      expect(engine.getPublicState().currentStage).toBe('expert-selection');
    });

    it('rejects a stage-3 action while currentStage=expert-selection', async () => {
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in candidate-ranking stage');
      const publicState = engine.getPublicState();
      expect(publicState.currentStage).toBe('expert-selection');
      expect(publicState.isComplete).toBe(false);
    });

    it('rejects a stage-1 action while currentStage=attribute-weighting', async () => {
      // Advance to stage 2 legitimately
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      expect(engine.getPublicState().currentStage).toBe('attribute-weighting');

      // Now try to re-submit stage 1
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp3'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in expert-selection stage');
      // State unchanged
      expect(engine.getPublicState().currentStage).toBe('attribute-weighting');
    });

    it('rejects a stage-3 action while currentStage=attribute-weighting', async () => {
      // Advance to stage 2 legitimately
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      expect(engine.getPublicState().currentStage).toBe('attribute-weighting');

      // Try to skip stage 2 by submitting candidate-ranking directly
      const result = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in candidate-ranking stage');
      const publicState = engine.getPublicState();
      expect(publicState.currentStage).toBe('attribute-weighting');
      expect(publicState.isComplete).toBe(false);
    });

    it('rejects a stage-1 action while currentStage=candidate-ranking', async () => {
      // Advance to stage 3 legitimately
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.35, leadership: 0.25, experience: 0.20, education: 0.10, cultural: 0.10 },
      });
      expect(engine.getPublicState().currentStage).toBe('candidate-ranking');

      // Try to re-submit stage 1
      const result = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp3'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in expert-selection stage');
      expect(engine.getPublicState().currentStage).toBe('candidate-ranking');
    });

    it('rejects a stage-2 action while currentStage=candidate-ranking', async () => {
      // Advance to stage 3 legitimately
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.35, leadership: 0.25, experience: 0.20, education: 0.10, cultural: 0.10 },
      });
      expect(engine.getPublicState().currentStage).toBe('candidate-ranking');

      // Try to re-submit stage 2
      const result = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.20, leadership: 0.20, experience: 0.20, education: 0.20, cultural: 0.20 },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not in attribute-weighting stage');
      expect(engine.getPublicState().currentStage).toBe('candidate-ranking');
    });

    it('still allows the legitimate forward path 1 -> 2 -> 3', async () => {
      const stage1 = await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      expect(stage1.success).toBe(true);
      expect(engine.getPublicState().currentStage).toBe('attribute-weighting');

      const stage2 = await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: {
            tech: 0.35,
            leadership: 0.25,
            experience: 0.20,
            education: 0.10,
            cultural: 0.10,
          },
      });
      expect(stage2.success).toBe(true);
      expect(engine.getPublicState().currentStage).toBe('candidate-ranking');

      const stage3 = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });
      expect(stage3.success).toBe(true);
      expect(stage3.data?.isComplete).toBe(true);
    });
  });

  describe('Scenario Loading', () => {
    it('should load the tech-startup scenario when requested', async () => {
      await engine.initialize({ scenario: 'tech-startup' });

      const publicState = engine.getPublicState();

      expect(publicState.scenarioId).toBe('tech-startup');
      expect(publicState.scenarioName).toContain('Startup');
      // tech-startup is documented as 5 experts / 4 candidates / leadership-weighted
      expect(publicState.experts).toHaveLength(5);
      expect(publicState.candidates).toHaveLength(4);
      expect(publicState.attributes).toHaveLength(5);
      // Distinct base salary from default
      expect(publicState.baseSalary).toBe(700000);
    });

    it('should load the manufacturing scenario when requested', async () => {
      await engine.initialize({ scenario: 'manufacturing' });

      const publicState = engine.getPublicState();

      expect(publicState.scenarioId).toBe('manufacturing');
      expect(publicState.experts).toHaveLength(4);
      expect(publicState.candidates).toHaveLength(4);
      expect(publicState.baseSalary).toBe(550000);
    });

    it('should reject an unknown scenario id', async () => {
      await expect(engine.initialize({ scenario: 'does-not-exist' })).rejects.toThrow(
        /Unknown HR Compensation scenario/
      );
    });

    it('should default to the "default" scenario when none is specified', async () => {
      await engine.initialize({});

      const publicState = engine.getPublicState();
      expect(publicState.scenarioId).toBe('default');
    });
  });

  describe('Round Mechanics (stage-based)', () => {
    /**
     * HR Compensation is stage-based, not round-based. The session is created
     * with max_rounds=1 (set at session creation in the beforeAll above), and
     * the engine itself does not track or enforce round counts — it gates
     * entirely on stage / `isComplete`. These tests verify that contract.
     */
    beforeEach(async () => {
      await engine.initialize({});
    });

    it('advanceRound should be a benign no-op before completion', async () => {
      const result = await engine.advanceRound();
      expect(result.success).toBe(true);
      expect(result.roundNumber).toBe(0);
      expect(result.isComplete).toBe(false);

      // Calling repeatedly must not advance internal state or break stage flow
      await engine.advanceRound();
      await engine.advanceRound();
      const publicState = engine.getPublicState();
      expect(publicState.currentStage).toBe('expert-selection');
      expect(publicState.isComplete).toBe(false);
    });

    it('advanceRound should reflect isComplete once all three stages are done', async () => {
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.35, leadership: 0.25, experience: 0.20, education: 0.10, cultural: 0.10 },
      });
      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });

      const result = await engine.advanceRound();
      expect(result.isComplete).toBe(true);
      // Still no actual round progression — roundNumber stays at 0
      expect(result.roundNumber).toBe(0);
    });

    it('session max_rounds is informational; engine does not enforce it', async () => {
      // The test session was created with max_rounds=1. The engine never
      // reads that value — it relies on stage gating. Verify that we can
      // still advance the stage machine through to completion regardless of
      // any round count that the session may carry.
      const session = await prisma.gameSession.findUnique({ where: { id: testSessionId } });
      expect(session?.max_rounds).toBe(1);

      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1'],
      });
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.35, leadership: 0.25, experience: 0.20, education: 0.10, cultural: 0.10 },
      });
      const finalAction = await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });
      expect(finalAction.success).toBe(true);
      expect(finalAction.data?.isComplete).toBe(true);
    });
  });

  describe('Information hiding', () => {
    it('should hide optimal values from participant state until isComplete', async () => {
      await engine.initialize({});

      // Before any action — pre-stage 1
      let participantState = engine.getParticipantState(testParticipantId);
      expect(participantState.isComplete).toBe(false);
      expect(participantState.optimalValues).toBeUndefined();

      // After expert selection — pre-stage 2
      await engine.applyAction(testParticipantId, {
        stage: 'expert-selection',
        expertIds: ['exp1', 'exp2'],
      });
      participantState = engine.getParticipantState(testParticipantId);
      expect(participantState.optimalValues).toBeUndefined();

      // After attribute weighting — pre-stage 3
      await engine.applyAction(testParticipantId, {
        stage: 'attribute-weighting',
        weights: { tech: 0.35, leadership: 0.25, experience: 0.20, education: 0.10, cultural: 0.10 },
      });
      participantState = engine.getParticipantState(testParticipantId);
      expect(participantState.optimalValues).toBeUndefined();

      // After candidate ranking — sim is now complete; optimal values revealed
      await engine.applyAction(testParticipantId, {
        stage: 'candidate-ranking',
        ranking: ['cand1', 'cand2', 'cand3', 'cand4'],
      });
      participantState = engine.getParticipantState(testParticipantId);
      expect(participantState.isComplete).toBe(true);
      expect(participantState.optimalValues).toBeDefined();
      expect(participantState.optimalValues.expertCredibilities).toHaveLength(4);
      expect(participantState.optimalValues.optimalWeights).toHaveLength(5);
      expect(participantState.optimalValues.optimalRanking).toEqual(['cand1', 'cand2', 'cand3', 'cand4']);
    });
  });
});
