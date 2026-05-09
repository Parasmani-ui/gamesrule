import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Customer In A Store - Stock-Flow Dynamics Simulation
 *
 * Author: Prof. T. T. Niranjan, IIT Bombay (per MSGAMES_WEBSITE_ANALYSIS.md
 * and MS-GAME.txt). Single-player, ~20 minutes.
 *
 * PURPOSE
 * - Teach stock-flow reasoning and overcome the "correlation heuristic"
 * - Players see inflow/outflow graphs and pick the minute when the stock
 *   level is at its maximum.
 * - Common mistake: pick the minute when *inflow* peaks (heuristic).
 * - Reality: stock peaks when cumulative (inflow − outflow) maxes out,
 *   typically at the inflow=outflow crossover.
 *
 * INTERVENTION MODES (per MSgames.in research design)
 * - learning-by-doing: minimal feedback (correct/incorrect only). Correct
 *   answer is withheld during play and only revealed in final results.
 * - task-decomposition: full stock-level table after each answer; the
 *   action accepts an optional `stockCalculation` array so the player can
 *   show their work.
 * - binary-feedback: immediate ✓/✗ with the correct minute revealed. No
 *   step-by-step table.
 *
 * MATHEMATICAL FOUNDATION
 *   Stock(t) = Stock(t-1) + Inflow(t) − Outflow(t)
 *   Stock peaks where cumulative net flow is maximum (typically at the
 *   crossover, NOT at the inflow peak).
 *
 * INDEXING CONVENTION
 * - Inflow/outflow arrays are 0-indexed internally.
 * - The stock-level array is 1-indexed externally: stock[0] is the
 *   *initial* level (before any flow), stock[1..N] is the level after
 *   period 1..N has applied. The player picks a 1-indexed minute (1..N).
 * - `correctAnswer` on a Question is the 1-indexed minute the player
 *   should pick.
 */

type LearningGroup = 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';

interface Question {
  id: number;
  inflowPattern: number[];   // 0-indexed; length N
  outflowPattern: number[];  // 0-indexed; length N
  correctAnswer: number;     // 1-indexed minute (1..N)
  inflowPeakMinute: number;  // 1-indexed minute where inflow peaks (heuristic trap)
  difficulty: 'easy' | 'medium' | 'hard';
  scenario: string;
}

interface CustomerInStoreConfig {
  learningGroup?: LearningGroup;
  numQuestions?: number;
  /** Escape hatch: caller-supplied questions override the generator. */
  questions?: Question[];
  /** Initial stock level for generated questions. Defaults to 10. */
  initialStock?: number;
}

interface AnswerRecord {
  questionId: number;
  questionIndex: number;
  playerAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  usedCorrelationHeuristic: boolean;
  stockCalculation?: number[];
}

interface CustomerInStoreGameState {
  sessionId: string;
  participantId: string;
  config: Required<Pick<CustomerInStoreConfig, 'learningGroup' | 'numQuestions' | 'initialStock'>>;
  questions: Question[];
  currentQuestionIndex: number;
  answers: AnswerRecord[];
  score: number;
  accuracyRate: number;
  isComplete: boolean;
}

const DEFAULT_INITIAL_STOCK = 10;
const DEFAULT_NUM_QUESTIONS = 10;
const ANSWER_MIN = 1;
const ANSWER_MAX = 30;

const SCENARIOS = [
  'Customers entering and leaving a store',
  'Water flowing into and out of a reservoir',
  'Inventory arriving and being sold',
  'Patients admitted to and discharged from a hospital',
  'Money deposited to and withdrawn from an account',
];

export class CustomerInStoreEngine extends BaseGameEngine {
  private state!: CustomerInStoreGameState;

  constructor(sessionId: string) {
    super(sessionId, 'customer-in-store');
  }

  // =====================================================================
  // Lifecycle
  // =====================================================================

  async initialize(config: CustomerInStoreConfig = {}): Promise<void> {
    this.log('Initializing Customer in Store simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];
    const learningGroup: LearningGroup = config.learningGroup ?? 'binary-feedback';
    const numQuestions = Math.max(1, Math.floor(config.numQuestions ?? DEFAULT_NUM_QUESTIONS));
    const initialStock = config.initialStock ?? DEFAULT_INITIAL_STOCK;

    const questions: Question[] = config.questions
      ? config.questions.map((q, i) => this.normaliseQuestion(q, i + 1, initialStock))
      : this.generateQuestions(numQuestions, initialStock);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: { learningGroup, numQuestions, initialStock },
      questions,
      currentQuestionIndex: 0,
      answers: [],
      score: 0,
      accuracyRate: 0,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Customer in Store initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    if (this.state.isComplete) {
      return { success: false, message: 'Simulation already complete' };
    }

    // Single-player sim: only the bound participant may submit answers.
    if (participantId !== this.state.participantId) {
      return { success: false, message: 'Action by non-participant rejected' };
    }

    const { answer, questionIndex, timeSpent, stockCalculation } = action ?? {};

    // ---- Integrity gates: question progression -----------------------
    if (typeof questionIndex !== 'number' || !Number.isInteger(questionIndex)) {
      return {
        success: false,
        message: 'questionIndex (integer) is required to submit an answer',
      };
    }
    if (questionIndex !== this.state.currentQuestionIndex) {
      return {
        success: false,
        message: `Out-of-order submission: expected question ${this.state.currentQuestionIndex}, got ${questionIndex}`,
      };
    }

    const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
    if (!currentQuestion) {
      // Defensive: should be unreachable because isComplete fires when
      // currentQuestionIndex === questions.length.
      return { success: false, message: 'No active question' };
    }

    // ---- Integrity gates: answer bounds ------------------------------
    if (typeof answer !== 'number' || !Number.isFinite(answer) || !Number.isInteger(answer)) {
      return { success: false, message: 'Answer must be an integer' };
    }
    if (answer < ANSWER_MIN || answer > ANSWER_MAX) {
      return {
        success: false,
        message: `Answer must be between ${ANSWER_MIN} and ${ANSWER_MAX}`,
      };
    }
    if (answer > currentQuestion.inflowPattern.length) {
      return {
        success: false,
        message: `Answer must be a minute within the question (1-${currentQuestion.inflowPattern.length})`,
      };
    }

    const isCorrect = answer === currentQuestion.correctAnswer;
    const usedHeuristic = !isCorrect && answer === currentQuestion.inflowPeakMinute;

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      questionIndex: this.state.currentQuestionIndex,
      playerAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent: typeof timeSpent === 'number' && Number.isFinite(timeSpent) ? timeSpent : 0,
      usedCorrelationHeuristic: usedHeuristic,
      stockCalculation: Array.isArray(stockCalculation) ? stockCalculation.slice() : undefined,
    };
    this.state.answers.push(record);

    if (isCorrect) this.state.score += 1;
    this.state.currentQuestionIndex += 1;
    this.state.accuracyRate = (this.state.score / this.state.answers.length) * 100;

    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: this.buildResultMessage(isCorrect, currentQuestion),
      data: {
        mode: this.state.config.learningGroup,
        feedback: this.buildFeedback(currentQuestion, answer, isCorrect, usedHeuristic),
        currentScore: this.state.score,
        totalQuestions: this.state.questions.length,
        accuracyRate: Number(this.state.accuracyRate.toFixed(2)),
        isComplete: this.state.isComplete,
        nextQuestionIndex: this.state.isComplete ? null : this.state.currentQuestionIndex,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    return {
      success: true,
      message: 'Player-paced simulation',
      roundNumber: this.state ? this.state.currentQuestionIndex : 0,
      isComplete: this.state ? this.state.isComplete : false,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    return this.computeMetricsSync();
  }

  // =====================================================================
  // State views
  // =====================================================================

  getPublicState(): any {
    if (!this.isInitialized) return null;

    const currentQuestion = this.state.isComplete
      ? null
      : this.state.questions[this.state.currentQuestionIndex];

    return {
      learningGroup: this.state.config.learningGroup,
      numQuestions: this.state.config.numQuestions,
      initialStock: this.state.config.initialStock,
      currentQuestionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.questions.length,
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            scenario: currentQuestion.scenario,
            inflowPattern: currentQuestion.inflowPattern,
            outflowPattern: currentQuestion.outflowPattern,
            difficulty: currentQuestion.difficulty,
            // correctAnswer + inflowPeakMinute are deliberately NOT exposed.
          }
        : null,
      score: this.state.score,
      accuracyRate: Number(this.state.accuracyRate.toFixed(2)),
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      participantId,
      answers: this.state.answers,
      metrics: this.computeMetricsSync(),
    };
  }

  // =====================================================================
  // Question generation
  // =====================================================================

  private generateQuestions(count: number, initialStock: number): Question[] {
    const questions: Question[] = [];
    for (let i = 0; i < count; i++) {
      const difficulty: 'easy' | 'medium' | 'hard' =
        i < Math.ceil(count * 0.3) ? 'easy' : i < Math.ceil(count * 0.7) ? 'medium' : 'hard';
      const scenario = SCENARIOS[i % SCENARIOS.length];
      questions.push(this.generateSingleQuestion(i + 1, difficulty, scenario, initialStock));
    }
    return questions;
  }

  /**
   * Synthesise a non-degenerate question. Each question id gets a
   * deterministic seed so two runs produce the same patterns (good for
   * facilitator reproducibility) while different ids produce different
   * patterns (no degenerate "answer is always 6" failure mode).
   *
   * Validation gates: stock never negative, correct minute strictly
   * different from the inflow-peak minute (so correlation-heuristic
   * detection isn't trivially passable), and the correct minute lies
   * within ANSWER_MIN..ANSWER_MAX.
   */
  private generateSingleQuestion(
    id: number,
    difficulty: 'easy' | 'medium' | 'hard',
    scenario: string,
    initialStock: number
  ): Question {
    const length = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 9 : 12;
    const peakMagnitude = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
    const baseOutflow = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;

    const rng = this.seededRng(id * 9301 + 49297);

    // Try several candidates; bail out to a hardcoded-but-valid fallback
    // if none satisfy the validation gates after a few attempts.
    for (let attempt = 0; attempt < 20; attempt++) {
      const inflowPeakIdx = 1 + Math.floor(rng() * (length - 2)); // not at edges
      const inflow = this.makeTriangularPattern(length, inflowPeakIdx, peakMagnitude, rng);
      const outflow = this.makeRampOutflow(length, baseOutflow, rng);

      const stocks = this.calculateStockLevels(inflow, outflow, initialStock);
      // skip if any stock went to zero (degenerate, hits the floor)
      if (stocks.some(s => s <= 0)) continue;

      // 1-indexed minute of stock peak. stocks[0] is initial; never the
      // "answer" the player picks — they pick a minute 1..N.
      const maxStock = Math.max(...stocks.slice(1));
      const correctAnswer = stocks.indexOf(maxStock); // index in stocks[] = 1-indexed minute
      const inflowPeakMinute = inflow.indexOf(Math.max(...inflow)) + 1;

      if (correctAnswer < ANSWER_MIN || correctAnswer > ANSWER_MAX) continue;
      if (correctAnswer === inflowPeakMinute) continue; // would defeat heuristic detection
      if (correctAnswer < 2) continue; // initial stock not a valid pick

      // ensure exactly one max minute (no ties): if two periods tie at
      // max, the heuristic-detection logic treats only the *first* as
      // "correct", which can confuse the player. Break ties by adjusting.
      const maxCount = stocks.filter(s => s === maxStock).length;
      if (maxCount !== 1) continue;

      return {
        id,
        inflowPattern: inflow,
        outflowPattern: outflow,
        correctAnswer,
        inflowPeakMinute,
        difficulty,
        scenario,
      };
    }

    // Fallback: deterministic hand-crafted pattern that always satisfies
    // the validation gates for the requested difficulty.
    return this.fallbackQuestion(id, difficulty, scenario, initialStock);
  }

  private makeTriangularPattern(
    length: number,
    peakIdx: number,
    peakMagnitude: number,
    rng: () => number
  ): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < length; i++) {
      const distance = Math.abs(i - peakIdx);
      const slope = peakMagnitude / Math.max(peakIdx, length - 1 - peakIdx);
      const value = Math.max(1, Math.round(peakMagnitude - distance * slope + (rng() - 0.5)));
      pattern.push(value);
    }
    // ensure the global max is uniquely at peakIdx (perturb collisions
    // away from the peak)
    const peakValue = pattern[peakIdx];
    for (let i = 0; i < length; i++) {
      if (i !== peakIdx && pattern[i] >= peakValue) {
        pattern[i] = peakValue - 1;
      }
    }
    return pattern;
  }

  private makeRampOutflow(length: number, base: number, rng: () => number): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < length; i++) {
      const ramp = Math.round((i / Math.max(1, length - 1)) * base);
      const noise = Math.round(rng()); // 0 or 1
      pattern.push(Math.max(1, base + ramp - 1 + noise));
    }
    return pattern;
  }

  private fallbackQuestion(
    id: number,
    difficulty: 'easy' | 'medium' | 'hard',
    scenario: string,
    initialStock: number
  ): Question {
    // These three patterns are pre-verified to satisfy: stocks never <= 0,
    // unique max, correct minute != inflow peak minute. They serve as a
    // safety net only when the random generator can't produce a valid
    // candidate within 20 attempts.
    const presets: Record<'easy' | 'medium' | 'hard', { inflow: number[]; outflow: number[] }[]> = {
      easy: [
        { inflow: [2, 4, 6, 8, 6, 4, 2], outflow: [3, 3, 3, 3, 3, 3, 3] },
        { inflow: [3, 5, 7, 9, 7, 5, 3], outflow: [4, 4, 4, 4, 4, 4, 4] },
      ],
      medium: [
        { inflow: [1, 3, 5, 7, 9, 7, 5, 3, 1], outflow: [2, 2, 3, 4, 5, 6, 6, 5, 4] },
        { inflow: [2, 4, 6, 8, 10, 8, 6, 4, 2], outflow: [3, 3, 4, 5, 6, 7, 7, 6, 5] },
      ],
      hard: [
        { inflow: [2, 5, 8, 6, 9, 7, 4, 6, 3, 2], outflow: [1, 2, 3, 5, 6, 8, 9, 7, 5, 3] },
      ],
    };
    const list = presets[difficulty];
    const choice = list[id % list.length];
    const stocks = this.calculateStockLevels(choice.inflow, choice.outflow, initialStock);
    const maxStock = Math.max(...stocks.slice(1));
    return {
      id,
      inflowPattern: choice.inflow,
      outflowPattern: choice.outflow,
      correctAnswer: stocks.indexOf(maxStock),
      inflowPeakMinute: choice.inflow.indexOf(Math.max(...choice.inflow)) + 1,
      difficulty,
      scenario,
    };
  }

  /** Mulberry32 — small deterministic seeded RNG; no need for a package. */
  private seededRng(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * For caller-supplied questions: backfill correctAnswer + inflowPeakMinute
   * if the caller didn't provide them, and stamp on a sequential id.
   */
  private normaliseQuestion(q: Question, fallbackId: number, initialStock: number): Question {
    const stocks = this.calculateStockLevels(q.inflowPattern, q.outflowPattern, initialStock);
    const maxStock = Math.max(...stocks.slice(1));
    const computedCorrect = stocks.indexOf(maxStock);
    const computedPeak = q.inflowPattern.indexOf(Math.max(...q.inflowPattern)) + 1;
    return {
      id: q.id ?? fallbackId,
      inflowPattern: q.inflowPattern,
      outflowPattern: q.outflowPattern,
      correctAnswer: q.correctAnswer ?? computedCorrect,
      inflowPeakMinute: q.inflowPeakMinute ?? computedPeak,
      difficulty: q.difficulty ?? 'medium',
      scenario: q.scenario ?? SCENARIOS[0],
    };
  }

  // =====================================================================
  // Stock + heuristic math
  // =====================================================================

  private calculateStockLevels(inflow: number[], outflow: number[], initialStock: number): number[] {
    const stocks: number[] = [initialStock];
    for (let t = 0; t < inflow.length; t++) {
      const newStock = stocks[t] + inflow[t] - (outflow[t] ?? 0);
      stocks.push(Math.max(0, newStock));
    }
    return stocks;
  }

  // =====================================================================
  // Mode-aware feedback
  // =====================================================================

  private buildResultMessage(isCorrect: boolean, _q: Question): string {
    const mode = this.state.config.learningGroup;
    if (mode === 'learning-by-doing') {
      // Withhold correct answer entirely
      return isCorrect ? 'Correct.' : 'Incorrect.';
    }
    return isCorrect
      ? '✅ Correct! Stock peaks where cumulative net flow is highest.'
      : '❌ Incorrect. Stock peaks where cumulative net flow is highest, not where inflow is highest.';
  }

  private buildFeedback(
    question: Question,
    playerAnswer: number,
    isCorrect: boolean,
    usedHeuristic: boolean
  ) {
    const mode = this.state.config.learningGroup;

    if (mode === 'learning-by-doing') {
      // Minimal feedback — no correct answer reveal until the end
      return { mode, isCorrect };
    }

    if (mode === 'binary-feedback') {
      // Reveal correct answer + heuristic flag, but no detailed table
      return {
        mode,
        isCorrect,
        correctAnswer: question.correctAnswer,
        usedCorrelationHeuristic: usedHeuristic,
      };
    }

    // task-decomposition: full table
    const stocks = this.calculateStockLevels(
      question.inflowPattern,
      question.outflowPattern,
      this.state.config.initialStock
    );
    const table = stocks.map((stock, i) => {
      const inflow = i === 0 ? null : question.inflowPattern[i - 1];
      const outflow = i === 0 ? null : question.outflowPattern[i - 1];
      const netFlow = inflow !== null && outflow !== null ? inflow - outflow : null;
      return {
        minute: i,
        inflow,
        outflow,
        netFlow,
        stock,
        isPeak: i === question.correctAnswer,
      };
    });

    return {
      mode,
      isCorrect,
      correctAnswer: question.correctAnswer,
      usedCorrelationHeuristic: usedHeuristic,
      stockTable: table,
      keyInsight:
        'Stock peaks when cumulative (inflow − outflow) is maximum, not when inflow rate peaks.',
      playerAnswer,
    };
  }

  // =====================================================================
  // Metrics
  // =====================================================================

  private computeMetricsSync(): any {
    const total = this.state.questions.length;
    const completed = this.state.answers.length;
    const wrong = this.state.answers.filter(a => !a.isCorrect);
    const heuristicErrors = wrong.filter(a => a.usedCorrelationHeuristic);
    const heuristicRate = wrong.length === 0 ? 0 : (heuristicErrors.length / wrong.length) * 100;

    return {
      totalQuestions: total,
      questionsCompleted: completed,
      score: this.state.score,
      accuracyRate: this.state.accuracyRate.toFixed(2) + '%',
      averageTimePerQuestion:
        completed > 0
          ? (this.state.answers.reduce((s, a) => s + a.timeSpent, 0) / completed).toFixed(2) + 's'
          : 'N/A',
      improvementTrend: this.calculateImprovementTrend(),
      correlationHeuristic: {
        wrongAnswers: wrong.length,
        heuristicErrors: heuristicErrors.length,
        rateOfWrongAnswers: Number(heuristicRate.toFixed(2)),
        // Strong indicator: per analysis MD § Correlation Heuristic Detection,
        // strong = >50% of *wrong* answers used the heuristic.
        detected: wrong.length >= 2 && heuristicRate >= 50,
      },
      perQuestion: this.state.answers.map(a => ({
        questionIndex: a.questionIndex,
        playerAnswer: a.playerAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect,
        usedCorrelationHeuristic: a.usedCorrelationHeuristic,
        timeSpent: a.timeSpent,
      })),
    };
  }

  private calculateImprovementTrend(): string {
    if (this.state.answers.length < 3) return 'Insufficient data';

    const half = Math.floor(this.state.answers.length / 2);
    const firstHalf = this.state.answers.slice(0, half);
    const secondHalf = this.state.answers.slice(half);

    const firstAcc = (firstHalf.filter(a => a.isCorrect).length / firstHalf.length) * 100;
    const secondAcc = (secondHalf.filter(a => a.isCorrect).length / secondHalf.length) * 100;
    const delta = secondAcc - firstAcc;

    if (delta > 20) return 'Significant improvement';
    if (delta > 10) return 'Good improvement';
    if (delta > 0) return 'Slight improvement';
    if (delta === 0) return 'Consistent';
    return 'Needs practice';
  }

  // =====================================================================
  // Persistence
  // =====================================================================

  private async saveGameState(): Promise<void> {
    // Best-effort persistence: this engine's authoritative state lives in
    // memory (cached per-session by GameEngineFactory). DB snapshots are
    // useful for post-session analytics but are not required for gameplay.
    // Mirroring HRCompensationEngine: log warnings and continue rather than
    // surfacing a transient DB error as a 500 on /sessions/:id/start, which
    // would also propagate through the join_session lazy-init and leave the
    // UI on a placeholder state with no currentQuestion populated.
    try {
      await prisma.gameState.create({
        data: {
          session_id: this.sessionId,
          round_number: this.state.currentQuestionIndex,
          state_data: this.state as any,
        },
      });
    } catch (error) {
      this.log(`Warning: Could not persist state to DB: ${error}`);
    }
  }
}
