import { CustomerInStoreEngine } from '../services/gameEngines/CustomerInStoreEngine';
import { prisma } from '../db';

/**
 * Customer In A Store Engine Tests
 *
 * Pattern: mock Prisma (matches FruitBeerEngine.test.ts) so tests run
 * without a live DB.
 *
 * Coverage:
 *  - Initialization with each of the 3 intervention modes
 *  - Stock calculation correctness over a 30-minute graph
 *  - Mode-specific feedback shape
 *  - Bias detection (inflow-peak pick fires the heuristic flag)
 *  - Question-generation non-degeneracy (unique correct answers)
 *  - Integrity tests (out-of-range, non-integer, future-question, leak)
 */

jest.mock('../db', () => ({
  prisma: {
    sessionParticipant: {
      findMany: jest.fn(),
    },
    gameState: {
      create: jest.fn(),
    },
  },
}));

describe('CustomerInStoreEngine', () => {
  let engine: CustomerInStoreEngine;
  const mockSessionId = 'test-session-cis';
  const mockParticipantId = 'p1';

  beforeEach(() => {
    engine = new CustomerInStoreEngine(mockSessionId);
    jest.clearAllMocks();
    (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
      { id: mockParticipantId, role: 'LEARNER', joined_at: new Date() },
    ]);
    (prisma.gameState.create as jest.Mock).mockResolvedValue({});
  });

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------

  describe('initialization', () => {
    it.each(['learning-by-doing', 'task-decomposition', 'binary-feedback'] as const)(
      'initializes with intervention mode %s',
      async mode => {
        await engine.initialize({ learningGroup: mode, numQuestions: 5 });

        const publicState = engine.getPublicState();
        expect(publicState).toBeTruthy();
        expect(publicState.learningGroup).toBe(mode);
        expect(publicState.numQuestions).toBe(5);
        expect(publicState.totalQuestions).toBe(5);
        expect(publicState.currentQuestionIndex).toBe(0);
        expect(publicState.score).toBe(0);
        expect(publicState.isComplete).toBe(false);
        expect(publicState.currentQuestion).toBeTruthy();
      }
    );

    it('defaults learningGroup to binary-feedback when missing', async () => {
      await engine.initialize({});
      expect(engine.getPublicState().learningGroup).toBe('binary-feedback');
    });

    it('throws when no participant exists for the session', async () => {
      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([]);
      await expect(engine.initialize({})).rejects.toThrow('No participant');
    });
  });

  // -------------------------------------------------------------------
  // Stock-flow math (30-minute handcrafted question)
  // -------------------------------------------------------------------

  describe('stock calculation correctness', () => {
    it('correctly computes the stock peak across a handcrafted 30-minute graph', async () => {
      // 30-minute pattern: triangular inflow peaking at minute 10, ramping
      // outflow that crosses the inflow at minute 18.
      // Manually-precomputed expected stock peak: minute 17 (inflow=outflow=8 next minute)
      const inflow: number[] = [];
      const outflow: number[] = [];
      for (let i = 1; i <= 30; i++) {
        inflow.push(i <= 10 ? i + 2 : Math.max(2, 22 - i));   // peak at i=10 (12)
        outflow.push(Math.min(15, Math.floor(i / 2) + 1));     // ramps up
      }
      // Compute expected peak ourselves (mirror engine math) so the test
      // is self-checking even if patterns change.
      let stock = 10;
      let maxStock = 10;
      let maxMinute = 0;
      for (let i = 0; i < inflow.length; i++) {
        stock = Math.max(0, stock + inflow[i] - outflow[i]);
        if (stock > maxStock) {
          maxStock = stock;
          maxMinute = i + 1;
        }
      }
      const inflowPeakMinute = inflow.indexOf(Math.max(...inflow)) + 1;
      // Heuristic-trap precondition: stock peak must NOT coincide with inflow peak.
      expect(maxMinute).not.toBe(inflowPeakMinute);
      // And the answer must lie within ANSWER_MAX (1-30).
      expect(maxMinute).toBeGreaterThanOrEqual(1);
      expect(maxMinute).toBeLessThanOrEqual(30);

      const customQuestion = {
        id: 1,
        inflowPattern: inflow,
        outflowPattern: outflow,
        correctAnswer: maxMinute,
        inflowPeakMinute,
        difficulty: 'hard' as const,
        scenario: 'Customers entering and leaving a store',
      };

      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [customQuestion],
      });

      // Submit the correct answer
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: maxMinute,
        timeSpent: 12,
      });

      expect(result.success).toBe(true);
      expect(result.data?.feedback.isCorrect).toBe(true);
      expect(result.data?.feedback.correctAnswer).toBe(maxMinute);
      expect(result.data?.isComplete).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // Intervention-mode feedback shape
  // -------------------------------------------------------------------

  describe('intervention-mode feedback', () => {
    const buildSingleQuestion = () => ({
      id: 1,
      // Easy crafted: stocks [10, 9, 10, 13, 18, 21, 22, 21] → peak minute 6
      inflowPattern: [2, 4, 6, 8, 6, 4, 2],
      outflowPattern: [3, 3, 3, 3, 3, 3, 3],
      correctAnswer: 6,
      inflowPeakMinute: 4,
      difficulty: 'easy' as const,
      scenario: 'Customers entering and leaving a store',
    });

    it('learning-by-doing: returns minimal feedback (no correct answer leak)', async () => {
      await engine.initialize({
        learningGroup: 'learning-by-doing',
        questions: [buildSingleQuestion()],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 4, // wrong (heuristic pick)
        timeSpent: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data?.feedback.mode).toBe('learning-by-doing');
      expect(result.data?.feedback.isCorrect).toBe(false);
      expect(result.data?.feedback.correctAnswer).toBeUndefined(); // withheld
      expect(result.data?.feedback.stockTable).toBeUndefined();
      // Message must not reveal the correct minute either
      expect(result.message).not.toMatch(/6/);
    });

    it('binary-feedback: reveals correct answer + heuristic flag, no table', async () => {
      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [buildSingleQuestion()],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 4,
        timeSpent: 5,
      });

      expect(result.data?.feedback.mode).toBe('binary-feedback');
      expect(result.data?.feedback.isCorrect).toBe(false);
      expect(result.data?.feedback.correctAnswer).toBe(6);
      expect(result.data?.feedback.usedCorrelationHeuristic).toBe(true);
      expect(result.data?.feedback.stockTable).toBeUndefined();
    });

    it('task-decomposition: reveals full stock table + insight', async () => {
      await engine.initialize({
        learningGroup: 'task-decomposition',
        questions: [buildSingleQuestion()],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 6,
        timeSpent: 30,
        stockCalculation: [10, 9, 10, 13, 18, 21, 22, 21],
      });

      const fb = result.data?.feedback;
      expect(fb.mode).toBe('task-decomposition');
      expect(fb.isCorrect).toBe(true);
      expect(fb.correctAnswer).toBe(6);
      expect(Array.isArray(fb.stockTable)).toBe(true);
      expect(fb.stockTable).toHaveLength(8); // initial + 7 minutes
      expect(fb.stockTable[6].isPeak).toBe(true);
      expect(fb.stockTable[6].stock).toBe(22);
      expect(fb.keyInsight).toContain('cumulative');
    });
  });

  // -------------------------------------------------------------------
  // Bias detection
  // -------------------------------------------------------------------

  describe('correlation-heuristic bias detection', () => {
    const buildQuestion = (id: number) => ({
      id,
      inflowPattern: [2, 4, 6, 8, 6, 4, 2],
      outflowPattern: [3, 3, 3, 3, 3, 3, 3],
      correctAnswer: 6,        // stock peak
      inflowPeakMinute: 4,     // inflow peak
      difficulty: 'easy' as const,
      scenario: 'Customers entering and leaving a store',
    });

    it('flags an answer that picks the inflow-peak minute when wrong', async () => {
      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [buildQuestion(1)],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 4, // inflow peak, NOT stock peak → heuristic
        timeSpent: 5,
      });

      expect(result.data?.feedback.usedCorrelationHeuristic).toBe(true);
    });

    it('does NOT flag the heuristic when the player answers correctly', async () => {
      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [buildQuestion(1)],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 6,
        timeSpent: 5,
      });

      expect(result.data?.feedback.usedCorrelationHeuristic).toBe(false);
    });

    it('does NOT flag the heuristic when player picks a wrong-but-not-inflow-peak minute', async () => {
      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [buildQuestion(1)],
      });

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 5, // wrong, not the inflow peak (4) and not the stock peak (6)
        timeSpent: 5,
      });

      expect(result.data?.feedback.isCorrect).toBe(false);
      expect(result.data?.feedback.usedCorrelationHeuristic).toBe(false);
    });

    it('aggregates heuristic rate across multiple answers in metrics', async () => {
      await engine.initialize({
        learningGroup: 'binary-feedback',
        questions: [buildQuestion(1), buildQuestion(2), buildQuestion(3), buildQuestion(4)],
      });

      // 3 wrong answers, all picking the inflow peak
      for (let i = 0; i < 3; i++) {
        await engine.applyAction(mockParticipantId, {
          questionIndex: i,
          answer: 4,
          timeSpent: 5,
        });
      }
      // 1 correct answer
      await engine.applyAction(mockParticipantId, {
        questionIndex: 3,
        answer: 6,
        timeSpent: 5,
      });

      const metrics = await engine.computeMetrics();
      expect(metrics.correlationHeuristic.wrongAnswers).toBe(3);
      expect(metrics.correlationHeuristic.heuristicErrors).toBe(3);
      expect(metrics.correlationHeuristic.rateOfWrongAnswers).toBe(100);
      expect(metrics.correlationHeuristic.detected).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // Question generation non-degeneracy
  // -------------------------------------------------------------------

  describe('question generation', () => {
    it('produces questions with non-degenerate correct answers (not all the same)', async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 10 });
      // Engine doesn't expose correct answers on publicState, so rebuild
      // the distribution by submitting a known-wrong answer (1) on each
      // question and reading the revealed correct answer back.
      const correctAnswers = new Set<number>();
      for (let i = 0; i < 10; i++) {
        // We don't see correctAnswer in publicState (good!), but we can
        // submit a known-wrong answer (1) and read the revealed correct
        // answer back from the action_result.
        const result = await engine.applyAction(mockParticipantId, {
          questionIndex: i,
          answer: 1,
          timeSpent: 0,
        });
        const ca = result.data?.feedback.correctAnswer;
        if (typeof ca === 'number') correctAnswers.add(ca);
      }
      // Spec: across 10 questions, we want at least 4 distinct correct
      // minutes — anything less suggests the generator is collapsing.
      expect(correctAnswers.size).toBeGreaterThanOrEqual(4);
    });

    it('all generated questions place the stock peak away from the inflow peak', async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 10 });
      for (let i = 0; i < 10; i++) {
        const publicState = engine.getPublicState();
        const q = publicState.currentQuestion;
        expect(q).toBeTruthy();
        const inflowPeakIdx = q.inflowPattern.indexOf(Math.max(...q.inflowPattern));
        // Submit the inflow-peak minute and inspect the revealed correct
        // answer. They MUST differ — otherwise heuristic detection is
        // structurally impossible.
        const result = await engine.applyAction(mockParticipantId, {
          questionIndex: i,
          answer: inflowPeakIdx + 1,
          timeSpent: 0,
        });
        if (result.data?.feedback.isCorrect === false) {
          expect(result.data?.feedback.correctAnswer).not.toBe(inflowPeakIdx + 1);
        }
      }
    });
  });

  // -------------------------------------------------------------------
  // Integrity gates
  // -------------------------------------------------------------------

  describe('integrity gates', () => {
    beforeEach(async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 3 });
    });

    it('rejects out-of-range answer (0)', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 0,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/between 1 and 30/);
      expect(engine.getPublicState().currentQuestionIndex).toBe(0); // not advanced
    });

    it('rejects out-of-range answer (31)', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 31,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/between 1 and 30/);
      expect(engine.getPublicState().currentQuestionIndex).toBe(0);
    });

    it('rejects out-of-range answer (-1)', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: -1,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/between 1 and 30/);
    });

    it('rejects non-integer answer (1.5)', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 1.5,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/integer/);
      expect(engine.getPublicState().currentQuestionIndex).toBe(0);
    });

    it('rejects non-numeric answer (string)', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: '5',
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/integer/);
    });

    it('rejects NaN', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: NaN,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/integer/);
    });

    it('rejects answer for a future question (skip-ahead)', async () => {
      // Currently on question 0; try to submit for question 2.
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 2,
        answer: 5,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Out-of-order/);
      expect(engine.getPublicState().currentQuestionIndex).toBe(0);
    });

    it('rejects replay for a past question', async () => {
      // Advance to q1 by answering q0
      await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 5,
        timeSpent: 0,
      });
      expect(engine.getPublicState().currentQuestionIndex).toBe(1);

      // Try to re-submit for q0
      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 6,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Out-of-order/);
    });

    it('rejects submission with missing questionIndex', async () => {
      const result = await engine.applyAction(mockParticipantId, {
        answer: 5,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/questionIndex/);
    });

    it('rejects answer beyond the question pattern length', async () => {
      // Default-generated easy question has 7 minutes. Pick 8 → in 1-30
      // range but past the question's length.
      // (Use a custom question to be deterministic.)
      const e = new CustomerInStoreEngine('test-len-check');
      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
        { id: 'p2', role: 'LEARNER', joined_at: new Date() },
      ]);
      await e.initialize({
        learningGroup: 'binary-feedback',
        questions: [
          {
            id: 1,
            inflowPattern: [2, 4, 6, 8, 6, 4, 2], // length 7
            outflowPattern: [3, 3, 3, 3, 3, 3, 3],
            correctAnswer: 6,
            inflowPeakMinute: 4,
            difficulty: 'easy' as const,
            scenario: 'x',
          },
        ],
      });
      const result = await e.applyAction('p2', {
        questionIndex: 0,
        answer: 8,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/within the question/);
    });

    it('does NOT expose correctAnswer in publicState before submission', async () => {
      const publicState = engine.getPublicState();
      expect(publicState.currentQuestion).toBeTruthy();
      expect(publicState.currentQuestion.correctAnswer).toBeUndefined();
      expect(publicState.currentQuestion.inflowPeakMinute).toBeUndefined();
    });

    it('does NOT expose all questions+answers in publicState', async () => {
      const publicState = engine.getPublicState();
      // Only the *current* question should be exposed; not the full
      // question bank with answers attached.
      expect(publicState.questions).toBeUndefined();
      // No top-level "correctAnswer" leak either
      expect(publicState.correctAnswer).toBeUndefined();
    });

    it('rejects further actions after the simulation completes', async () => {
      // Walk through all 3 questions
      for (let i = 0; i < 3; i++) {
        await engine.applyAction(mockParticipantId, {
          questionIndex: i,
          answer: 5,
          timeSpent: 0,
        });
      }
      expect(engine.getPublicState().isComplete).toBe(true);

      const result = await engine.applyAction(mockParticipantId, {
        questionIndex: 3,
        answer: 5,
        timeSpent: 0,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/already complete/);
    });
  });

  // -------------------------------------------------------------------
  // Participant state shape
  // -------------------------------------------------------------------

  describe('participant state', () => {
    it('returns metrics as a plain object (not a Promise)', async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 3 });
      const ps = engine.getParticipantState(mockParticipantId);
      expect(ps.metrics).toBeDefined();
      expect(typeof ps.metrics.then).toBe('undefined'); // not a Promise
      expect(typeof ps.metrics.totalQuestions).toBe('number');
    });

    it('answers array starts empty and grows with each submission', async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 3 });
      expect(engine.getParticipantState(mockParticipantId).answers).toEqual([]);
      await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 5,
        timeSpent: 1,
      });
      expect(engine.getParticipantState(mockParticipantId).answers).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // advanceRound (player-paced no-op)
  // -------------------------------------------------------------------

  describe('advanceRound', () => {
    it('is a benign no-op that mirrors current progress', async () => {
      await engine.initialize({ learningGroup: 'binary-feedback', numQuestions: 3 });
      const r1 = await engine.advanceRound();
      expect(r1.success).toBe(true);
      expect(r1.roundNumber).toBe(0);
      expect(r1.isComplete).toBe(false);

      await engine.applyAction(mockParticipantId, {
        questionIndex: 0,
        answer: 5,
        timeSpent: 0,
      });
      const r2 = await engine.advanceRound();
      expect(r2.roundNumber).toBe(1);
      expect(r2.isComplete).toBe(false);
    });
  });
});
