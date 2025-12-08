import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Customer In A Store - Stock-Flow Dynamics Simulation
 * 
 * PURPOSE:
 * - Teach stock-flow reasoning and overcome the "correlation heuristic"
 * - Players see inflow/outflow graphs and must determine when stock is maximum
 * - Common mistake: Thinking stock peaks when inflow peaks
 * - Reality: Stock peaks when inflow = outflow (integral, not correlation)
 * 
 * LEARNING INTERVENTIONS:
 * 1. Learning-by-Doing: Multiple variations with implicit learning
 * 2. Task Decomposition: Step-by-step reasoning
 * 3. Binary Feedback: Immediate right/wrong feedback
 * 
 * MATHEMATICAL FOUNDATION:
 * Stock(t) = Stock(t-1) + Inflow(t) - Outflow(t)
 * Max Stock occurs when: Inflow = Outflow (crossover point)
 */

interface Question {
  id: number;
  inflowPattern: number[];  // Inflow rate per time period
  outflowPattern: number[]; // Outflow rate per time period
  correctAnswer: number;    // Time period when stock is maximum
  difficulty: 'easy' | 'medium' | 'hard';
  scenario: string;         // Context (store, reservoir, inventory, etc.)
}

interface CustomerInStoreConfig {
  learningGroup: 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';
  numQuestions: number;
}

interface CustomerInStoreGameState {
  sessionId: string;
  participantId: string;
  config: CustomerInStoreConfig;
  questions: Question[];
  currentQuestionIndex: number;
  answers: {
    questionId: number;
    playerAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    stockCalculation?: number[]; // For task-decomposition group
  }[];
  score: number;
  accuracyRate: number;
  isComplete: boolean;
}

export class CustomerInStoreEngine extends BaseGameEngine {
  private state!: CustomerInStoreGameState;

  constructor(sessionId: string) {
    super(sessionId, 'customer-in-store');
  }

  async initialize(config: CustomerInStoreConfig): Promise<void> {
    this.log('Initializing Customer in Store simulation', config);

    // Get participant
    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    // Generate questions based on difficulty progression
    const questions = this.generateQuestions(config.numQuestions || 10);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config,
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

    const { answer, timeSpent, stockCalculation } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    const currentQuestion = this.state.questions[this.state.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    // Record answer
    this.state.answers.push({
      questionId: currentQuestion.id,
      playerAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent: timeSpent || 0,
      stockCalculation,
    });

    // Update score
    if (isCorrect) {
      this.state.score++;
    }

    // Calculate accuracy rate
    this.state.accuracyRate = (this.state.score / (this.state.currentQuestionIndex + 1)) * 100;

    // Move to next question
    this.state.currentQuestionIndex++;

    // Check if complete
    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: isCorrect 
        ? '✅ Correct! Stock peaks when inflow equals outflow.' 
        : `❌ Incorrect. Stock was maximum at period ${currentQuestion.correctAnswer}.`,
      data: {
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: this.getExplanation(currentQuestion, answer),
        currentScore: this.state.score,
        totalQuestions: this.state.questions.length,
        accuracyRate: this.state.accuracyRate,
        isComplete: this.state.isComplete,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    // Not applicable for this simulation (player-paced)
    return {
      success: true,
      message: 'Player-paced simulation',
      roundNumber: this.state.currentQuestionIndex,
      isComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    return {
      totalQuestions: this.state.questions.length,
      questionsCompleted: this.state.answers.length,
      score: this.state.score,
      accuracyRate: this.state.accuracyRate.toFixed(2) + '%',
      averageTimePerQuestion: this.state.answers.length > 0
        ? (this.state.answers.reduce((sum, a) => sum + a.timeSpent, 0) / this.state.answers.length).toFixed(2) + 's'
        : 'N/A',
      improvementTrend: this.calculateImprovementTrend(),
      correlationHeuristicDetected: this.detectCorrelationHeuristic(),
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    const currentQuestion = this.state.isComplete 
      ? null 
      : this.state.questions[this.state.currentQuestionIndex];

    return {
      currentQuestionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.questions.length,
      currentQuestion: currentQuestion ? {
        id: currentQuestion.id,
        scenario: currentQuestion.scenario,
        inflowPattern: currentQuestion.inflowPattern,
        outflowPattern: currentQuestion.outflowPattern,
        difficulty: currentQuestion.difficulty,
      } : null,
      score: this.state.score,
      accuracyRate: this.state.accuracyRate,
      isComplete: this.state.isComplete,
      learningGroup: this.state.config.learningGroup,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      answers: this.state.answers,
      metrics: this.computeMetrics(),
    };
  }

  // ===== HELPER METHODS =====

  private generateQuestions(count: number): Question[] {
    const questions: Question[] = [];
    const scenarios = [
      'Customers entering and leaving a store',
      'Water flowing into and out of a reservoir',
      'Inventory arriving and being sold',
      'Patients admitted to and discharged from a hospital',
      'Money deposited to and withdrawn from an account',
    ];

    for (let i = 0; i < count; i++) {
      const difficulty: 'easy' | 'medium' | 'hard' = 
        i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard';
      
      const question = this.generateSingleQuestion(i + 1, difficulty, scenarios[i % scenarios.length]);
      questions.push(question);
    }

    return questions;
  }

  private generateSingleQuestion(id: number, difficulty: string, scenario: string): Question {
    let inflowPattern: number[];
    let outflowPattern: number[];

    switch (difficulty) {
      case 'easy':
        // Simple triangular inflow, constant outflow
        inflowPattern = [2, 4, 6, 8, 6, 4, 2];
        outflowPattern = [3, 3, 3, 3, 3, 3, 3];
        break;
      case 'medium':
        // More complex patterns
        inflowPattern = [1, 3, 5, 7, 9, 7, 5, 3, 1];
        outflowPattern = [2, 2, 3, 4, 5, 6, 6, 5, 4];
        break;
      case 'hard':
        // Very complex with multiple peaks
        inflowPattern = [2, 5, 8, 6, 9, 7, 4, 6, 3, 2];
        outflowPattern = [1, 2, 3, 5, 6, 8, 9, 7, 5, 3];
        break;
      default:
        inflowPattern = [2, 4, 6, 4, 2];
        outflowPattern = [3, 3, 3, 3, 3];
    }

    // Calculate stock levels to find correct answer
    const stockLevels = this.calculateStockLevels(inflowPattern, outflowPattern);
    const maxStockIndex = stockLevels.indexOf(Math.max(...stockLevels));

    return {
      id,
      inflowPattern,
      outflowPattern,
      correctAnswer: maxStockIndex,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      scenario,
    };
  }

  private calculateStockLevels(inflow: number[], outflow: number[]): number[] {
    const stocks: number[] = [10]; // Initial stock

    for (let t = 0; t < inflow.length; t++) {
      const newStock = stocks[t] + inflow[t] - outflow[t];
      stocks.push(Math.max(0, newStock)); // Stock can't be negative
    }

    return stocks;
  }

  private getExplanation(question: Question, playerAnswer: number): string {
    const stocks = this.calculateStockLevels(question.inflowPattern, question.outflowPattern);
    const maxStock = Math.max(...stocks);
    const correctPeriod = question.correctAnswer;

    let explanation = `\n📊 **Understanding Stock-Flow Dynamics:**\n\n`;
    explanation += `The stock level is the **cumulative sum** of (inflow - outflow) over time.\n\n`;
    explanation += `Period | Inflow | Outflow | Net Flow | Stock Level\n`;
    explanation += `-------|--------|---------|----------|------------\n`;
    explanation += `   0   |   -    |    -    |    -     |    ${stocks[0]}\n`;

    for (let i = 0; i < question.inflowPattern.length; i++) {
      const netFlow = question.inflowPattern[i] - question.outflowPattern[i];
      explanation += `   ${i + 1}   |   ${question.inflowPattern[i]}    |    ${question.outflowPattern[i]}    |   ${netFlow >= 0 ? '+' : ''}${netFlow}    |    ${stocks[i + 1].toFixed(1)}${i === correctPeriod ? ' ⭐ MAX' : ''}\n`;
    }

    explanation += `\n🔑 **Key Insight:** Stock peaks when the **cumulative inflow exceeds cumulative outflow by the most**, not when inflow rate peaks!\n\n`;
    
    if (playerAnswer !== correctPeriod) {
      const inflowPeak = question.inflowPattern.indexOf(Math.max(...question.inflowPattern));
      if (playerAnswer === inflowPeak) {
        explanation += `⚠️ You fell for the **correlation heuristic**! Stock ≠ Flow rate.\n`;
      }
    }

    return explanation;
  }

  private calculateImprovementTrend(): string {
    if (this.state.answers.length < 3) return 'Insufficient data';

    const firstHalf = this.state.answers.slice(0, Math.floor(this.state.answers.length / 2));
    const secondHalf = this.state.answers.slice(Math.floor(this.state.answers.length / 2));

    const firstHalfAccuracy = (firstHalf.filter(a => a.isCorrect).length / firstHalf.length) * 100;
    const secondHalfAccuracy = (secondHalf.filter(a => a.isCorrect).length / secondHalf.length) * 100;

    const improvement = secondHalfAccuracy - firstHalfAccuracy;

    if (improvement > 20) return 'Significant improvement ⬆️⬆️';
    if (improvement > 10) return 'Good improvement ⬆️';
    if (improvement > 0) return 'Slight improvement ↗️';
    if (improvement === 0) return 'Consistent →';
    return 'Needs practice ⬇️';
  }

  private detectCorrelationHeuristic(): boolean {
    // Check if player frequently chose the period where inflow peaked
    let heuristicCount = 0;

    for (const answer of this.state.answers) {
      const question = this.state.questions.find(q => q.id === answer.questionId);
      if (question) {
        const inflowPeak = question.inflowPattern.indexOf(Math.max(...question.inflowPattern));
        if (answer.playerAnswer === inflowPeak && !answer.isCorrect) {
          heuristicCount++;
        }
      }
    }

    return heuristicCount >= this.state.answers.length * 0.5;
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: this.state.currentQuestionIndex,
        state_data: this.state as any,
      },
    });
  }
}

