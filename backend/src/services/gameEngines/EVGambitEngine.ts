import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * EV Gambit - Strategic Management Simulation
 * Based on Porter's Five Forces Framework
 * 
 * PURPOSE:
 * - Apply Michael Porter's Five Forces Framework to competitive strategy
 * - Understand industry structure analysis and competitive dynamics
 * - Teach strategic decision-making in dynamic markets
 * - Demonstrate how external forces shape business strategy
 * 
 * THE FIVE FORCES:
 * 1. Competitive Rivalry (High in EV industry)
 * 2. Threat of New Entrants (Medium-High)
 * 3. Bargaining Power of Suppliers (High)
 * 4. Bargaining Power of Buyers (Medium)
 * 5. Threat of Substitutes (Medium-High)
 * 
 * CONTEXT: Indian Electric Vehicle (EV) industry
 */

interface Company {
  name: string;
  marketShare: number;
  cash: number;
  brandValue: number;
  technology: number;
  production: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct answer (0-based)
  explanation?: string;
}

interface IndustryEvent {
  round: number;
  title: string;
  description: string;
  forceAffected: 'rivalry' | 'newEntrants' | 'suppliers' | 'buyers' | 'substitutes';
  impact: number; // -1 to 1 (negative means weakens force, positive strengthens)
  quizQuestions: QuizQuestion[];
}

interface Decision {
  type: 'business' | 'operations' | 'corporate' | 'marketing' | 'sales';
  name: string;
  cost: number; // Can be negative for cost-saving decisions
  expectedImpact: {
    marketShare?: number;
    brandValue?: number;
    technology?: number;
    production?: number;
    supplierPower?: number;
    buyerPower?: number;
    substituteThreat?: number;
    rivalry?: number; // Competitive rivalry impact
    newEntrants?: number; // New entrant threat impact
    cash?: number; // Revenue impact (negative = reduced revenue)
  };
}

interface EVGambitConfig {
  numRounds: number;
  startingCash: number;
  competitors: Company[];
  events: IndustryEvent[];
}

interface QuizSubmission {
  round: number;
  answers: number[]; // Array of selected answer indices
  score: number; // 0-100
  submittedAt: Date;
}

interface EVGambitGameState {
  sessionId: string;
  participantId: string;
  config: EVGambitConfig;
  playerCompany: Company;
  currentRound: number;
  events: IndustryEvent[];
  decisions: {
    round: number;
    decision: Decision;
    outcome: string;
    rationale?: string;
    alternatives?: string;
  }[];
  quizSubmissions: QuizSubmission[];
  currentQuiz?: {
    round: number;
    questions: QuizQuestion[];
  };
  hasSubmittedDecision: boolean; // Track if decision submitted for current round
  hasSubmittedQuiz: boolean; // Track if quiz submitted for current round
  scores: {
    decisionScore: number; // Based on decision quality
    quizScore: number; // Based on quiz answers
    totalScore: number; // Combined score
  };
  fiveForces: {
    rivalry: number;          // 0-100
    newEntrants: number;
    suppliers: number;
    buyers: number;
    substitutes: number;
  };
  industryAttractiveness: number; // Calculated from forces
  isComplete: boolean;
  // Additional state for workflow-specific mechanics
  suppliers: {
    liOn: { available: boolean; share: number }; // 60% initially, then 0% after import ban
    rusloth: { available: boolean; share: number }; // 40% initially
    indiaMines: { available: boolean; share: number; yearsRemaining: number }; // Available in 2 years
  };
  buyers: {
    rexa: { share: number; acquired: boolean }; // 50% initially, acquires Ushuttle
    ushuttle: { share: number; acquired: boolean }; // Second biggest, acquired by Rexa
  };
}

export class EVGambitEngine extends BaseGameEngine {
  private state!: EVGambitGameState;
  // Store participant states separately - key is participantId
  private participantStates: Map<string, EVGambitGameState> = new Map();

  constructor(sessionId: string) {
    super(sessionId, 'ev-gambit');
  }

  async initialize(config: Partial<EVGambitConfig>): Promise<void> {
    this.log('Initializing EV Gambit simulation', config);

    // Try to load existing participant states first
    const savedState = await prisma.sessionStateCache.findUnique({
      where: { session_id: this.sessionId },
    });

    if (savedState && savedState.state_data) {
      try {
        const savedData = savedState.state_data as any;
        // Check if it's the new format with participant states map
        if (savedData.participantStates && typeof savedData.participantStates === 'object') {
          // Load all participant states
          for (const [participantId, state] of Object.entries(savedData.participantStates)) {
            this.participantStates.set(participantId, state as EVGambitGameState);
          }
          this.isInitialized = true;
          this.log(`Loaded ${this.participantStates.size} participant states from cache`);
          return;
        } else {
          // Legacy format - single state, convert to participant-based
          const legacyState = savedData as EVGambitGameState;
          if (legacyState.participantId) {
            this.participantStates.set(legacyState.participantId, legacyState);
            this.isInitialized = true;
            this.log('Loaded legacy game state and converted to participant-based');
            return;
          }
        }
      } catch (error) {
        this.log('Failed to load saved state, initializing fresh', error);
      }
    }

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const defaultConfig: EVGambitConfig = {
      numRounds: config.numRounds || 5, // 5 events = 5 rounds
      startingCash: config.startingCash || 100000000, // INR 100 cr context
      competitors: config.competitors || this.generateCompetitors(),
      events: config.events || this.generateEvents(5),
    };

    // Initialize state for each participant
    for (const participant of participants) {
      if (!this.participantStates.has(participant.id)) {
        const participantState: EVGambitGameState = {
          sessionId: this.sessionId,
          participantId: participant.id,
          config: defaultConfig,
          playerCompany: {
            name: 'EVans',
            marketShare: 5, // 5% total market share, 35% in EV segment
            cash: defaultConfig.startingCash,
            brandValue: 50,
            technology: 50,
            production: 50,
          },
          currentRound: 0,
          events: [],
          decisions: [],
          quizSubmissions: [],
          hasSubmittedDecision: false,
          hasSubmittedQuiz: false,
          scores: {
            decisionScore: 0,
            quizScore: 0,
            totalScore: 0,
          },
          fiveForces: {
            rivalry: 70, // High competition with Electrify Inc.
            newEntrants: 60, // Tesla entering in 5 years
            suppliers: 75, // High - dependent on LiOn (60%) and Rusloth (40%)
            buyers: 65, // Medium-High - Rexa (50% of sales) + Ushuttle
            substitutes: 70, // Medium-High - SmartRide promoting ride-sharing
          },
          industryAttractiveness: 50,
          isComplete: false,
          suppliers: {
            liOn: { available: true, share: 60 },
            rusloth: { available: true, share: 40 },
            indiaMines: { available: false, share: 0, yearsRemaining: 2 },
          },
          buyers: {
            rexa: { share: 50, acquired: false }, // 50% of EVans' sales
            ushuttle: { share: 30, acquired: false }, // Second biggest buyer
          },
        };

        // Calculate industry attractiveness using this participant's state
        const originalState = this.state;
        this.state = participantState;
        participantState.industryAttractiveness = this.calculateIndustryAttractiveness();
        this.state = originalState;
        this.participantStates.set(participant.id, participantState);
      }
    }

    // Set default state to first participant for backward compatibility
    const firstParticipant = participants[0];
    const firstState = this.participantStates.get(firstParticipant.id);
    if (firstState) {
      this.state = firstState;
    } else {
      // Fallback: create state if somehow missing
      this.log('Warning: First participant state missing, creating fallback');
      const fallbackState: EVGambitGameState = {
        sessionId: this.sessionId,
        participantId: firstParticipant.id,
        config: defaultConfig,
        playerCompany: {
          name: 'EVans',
          marketShare: 5,
          cash: defaultConfig.startingCash,
          brandValue: 50,
          technology: 50,
          production: 50,
        },
        currentRound: 0,
        events: [],
        decisions: [],
        quizSubmissions: [],
        hasSubmittedDecision: false,
        hasSubmittedQuiz: false,
        scores: {
          decisionScore: 0,
          quizScore: 0,
          totalScore: 0,
        },
        fiveForces: {
          rivalry: 70,
          newEntrants: 60,
          suppliers: 75,
          buyers: 65,
          substitutes: 70,
        },
        industryAttractiveness: 50,
        isComplete: false,
        suppliers: {
          liOn: { available: true, share: 60 },
          rusloth: { available: true, share: 40 },
          indiaMines: { available: false, share: 0, yearsRemaining: 2 },
        },
        buyers: {
          rexa: { share: 50, acquired: false },
          ushuttle: { share: 30, acquired: false },
        },
      };
      fallbackState.industryAttractiveness = this.calculateIndustryAttractiveness();
      this.participantStates.set(firstParticipant.id, fallbackState);
      this.state = fallbackState;
    }

    await this.saveGameState();
    this.isInitialized = true;
    this.log(`EV Gambit initialized successfully for ${participants.length} participant(s)`);
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    // Get or create participant-specific state
    if (!this.participantStates.has(participantId)) {
      // Initialize state for new participant
      const participants = await prisma.sessionParticipant.findMany({
        where: { session_id: this.sessionId },
      });
      const participant = participants.find(p => p.id === participantId);
      if (!participant) {
        return {
          success: false,
          message: 'Participant not found',
        };
      }
      
      // Create initial state for this participant
      const existingState = this.participantStates.values().next().value;
      if (existingState) {
        const newState: EVGambitGameState = {
          ...existingState,
          participantId: participant.id,
          decisions: [],
          quizSubmissions: [],
          hasSubmittedDecision: false,
          hasSubmittedQuiz: false,
          scores: {
            decisionScore: 0,
            quizScore: 0,
            totalScore: 0,
          },
          currentRound: 0,
          isComplete: false,
        };
        this.participantStates.set(participantId, newState);
      }
    }

    // Get participant-specific state
    this.state = this.participantStates.get(participantId)!;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    const actionType = action.actionType || 'make-decision';

    // Handle continue to next event
    if (actionType === 'continue-to-next-event') {
      return this.handleContinueToNextEvent();
    }

    // Handle quiz submission
    if (actionType === 'submit-quiz') {
      return this.handleQuizSubmission(action);
    }

    // Handle decision submission
    if (actionType === 'make-decision') {
      return this.handleDecisionSubmission(action);
    }

    return {
      success: false,
      message: 'Unknown action type',
    };
  }

  private async handleDecisionSubmission(action: any): Promise<ActionResult> {
    const { decision, rationale, alternatives } = action;

    // Check if decision already submitted for this round
    if (this.state.hasSubmittedDecision) {
      return {
        success: false,
        message: 'Decision already submitted for this round',
      };
    }

    // Check for events at the START of the round (before decision)
    const roundEvents = this.state.config.events.filter(e => e.round === this.state.currentRound + 1);
    for (const event of roundEvents) {
      if (!this.state.events.find(e => e.round === event.round && e.title === event.title)) {
        this.state.events.push(event);
        this.applyEventToForces(event);
        this.applyEventEffects(event);
        // Set current quiz for this event (will be shown after decision)
        if (event.quizQuestions) {
          this.state.currentQuiz = {
            round: this.state.currentRound + 1,
            questions: event.quizQuestions,
          };
        }
      }
    }

    if (!decision || !decision.type) {
      return {
        success: false,
        message: 'Invalid decision',
      };
    }

    // Check if can afford (negative cost means saving money, so always allowed)
    if (decision.cost > 0 && this.state.playerCompany.cash < decision.cost) {
      return {
        success: false,
        message: 'Insufficient funds for this decision',
      };
    }

    // Deduct cost (negative cost adds money)
    this.state.playerCompany.cash -= decision.cost;

    // Apply decision impact
    const outcome = this.applyDecisionImpact(decision);

    // Calculate decision score (based on decision quality - simplified for now)
    const decisionScore = this.calculateDecisionScore(decision, this.state.currentRound + 1);

    // Record decision
    this.state.decisions.push({
      round: this.state.currentRound + 1,
      decision,
      outcome,
      rationale,
      alternatives,
    });

    this.state.hasSubmittedDecision = true;
    this.state.scores.decisionScore += decisionScore;

    await this.saveGameState();

    return {
      success: true,
      message: `Decision "${decision.name}" submitted successfully. Please answer the quiz questions.`,
      updatedState: {
        outcome,
        newMarketShare: this.state.playerCompany.marketShare.toFixed(2) + '%',
        cash: this.state.playerCompany.cash,
        industryAttractiveness: this.state.industryAttractiveness,
        hasSubmittedDecision: true,
        currentQuiz: this.state.currentQuiz,
        decisionScore,
      },
    };
  }

  private async handleQuizSubmission(action: any): Promise<ActionResult> {
    // Get answers from action - socket spreads payload into action object
    // Backend receives: { actionType: 'submit-quiz', ...actionPayload }
    // So if payload is { answers: [0,1,2,3] }, it becomes action.answers
    const answers = action.answers; // Array of answer indices
    
    this.log('Quiz submission received', { 
      answers, 
      answersType: typeof answers,
      isArray: Array.isArray(answers),
      actionKeys: Object.keys(action),
      actionType: action.actionType,
      fullAction: JSON.stringify(action).substring(0, 500)
    });

    if (!this.state.hasSubmittedDecision) {
      return {
        success: false,
        message: 'Please submit a decision first',
      };
    }

    if (this.state.hasSubmittedQuiz) {
      return {
        success: false,
        message: 'Quiz already submitted for this round',
      };
    }

    if (!this.state.currentQuiz || !this.state.currentQuiz.questions) {
      return {
        success: false,
        message: 'No quiz available for this round',
      };
    }

    // Validate answers
    if (!answers) {
      return {
        success: false,
        message: 'Answers not provided',
      };
    }
    
    if (!Array.isArray(answers)) {
      this.log('Answers is not an array', { answers, type: typeof answers });
      return {
        success: false,
        message: `Invalid quiz answers format. Expected array, got ${typeof answers}`,
      };
    }
    
    if (answers.length !== this.state.currentQuiz.questions.length) {
      return {
        success: false,
        message: `Invalid number of answers. Expected ${this.state.currentQuiz.questions.length}, got ${answers.length}`,
      };
    }

    // Calculate quiz score
    let correctAnswers = 0;
    const questionResults: { question: string; correct: boolean; selected: number; correctAnswer: number }[] = [];

    this.state.currentQuiz.questions.forEach((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      questionResults.push({
        question: question.question,
        correct: isCorrect,
        selected: answers[index],
        correctAnswer: question.correctAnswer,
      });
    });

    const quizScore = (correctAnswers / this.state.currentQuiz.questions.length) * 100;

    // Record quiz submission
    this.state.quizSubmissions.push({
      round: this.state.currentRound + 1,
      answers,
      score: quizScore,
      submittedAt: new Date(),
    });

    this.state.hasSubmittedQuiz = true;
    // Quiz score is per round (out of 20), accumulate across rounds
    // Each round has quiz questions, score is calculated as percentage then scaled to 20 points per round
    const roundQuizScore = (quizScore / 100) * 20; // Convert percentage to points (20 per round)
    this.state.scores.quizScore += roundQuizScore;
    // Total score will be calculated at the end (decisionScore + quizScore, max 100)
    // Don't update totalScore until all rounds are complete

    // Don't advance round automatically - wait for continue button
    // Round will advance when user clicks "Continue to Next Event"

    await this.saveGameState();

    return {
      success: true,
      message: `Quiz submitted successfully! You got ${correctAnswers} out of ${this.state.currentQuiz.questions.length} correct (${quizScore.toFixed(1)}%)`,
      updatedState: {
        quizScore,
        // Only show totalScore if game is complete
        totalScore: this.state.isComplete ? this.state.scores.totalScore : undefined,
        questionResults,
        isComplete: this.state.isComplete,
        currentRound: this.state.currentRound,
        hasSubmittedQuiz: true,
        showContinueButton: !this.state.isComplete,
        // Keep current quiz visible for results display
        currentQuiz: this.state.currentQuiz,
        // Include quiz submissions in updated state so frontend can show results immediately
        quizSubmissions: this.state.quizSubmissions,
        // Only include scores if game is complete
        scores: this.state.isComplete ? this.state.scores : undefined,
      },
    };
  }

  private async handleContinueToNextEvent(): Promise<ActionResult> {
    if (!this.state.hasSubmittedQuiz) {
      return {
        success: false,
        message: 'Please submit the quiz first',
      };
    }

    // Check if we're already at the last round before processing
    if (this.state.currentRound >= this.state.config.numRounds - 1) {
      // We're at round 5 (0-indexed = 4), mark as complete
      this.state.isComplete = true;
      // Calculate final total score (max 100)
      const decisionScoreNormalized = Math.min(100, this.state.scores.decisionScore);
      const quizScoreNormalized = Math.min(100, this.state.scores.quizScore);
      this.state.scores.totalScore = Math.min(100, (decisionScoreNormalized + quizScoreNormalized) / 2);
      
      await this.saveGameState();
      
      return {
        success: true,
        message: 'Simulation complete! All 5 rounds finished.',
        updatedState: {
          isComplete: true,
          currentRound: this.state.currentRound, // Keep at round 5 (0-indexed = 4)
          currentEvent: null,
          hasSubmittedDecision: false,
          hasSubmittedQuiz: false,
          showContinueButton: false,
          scores: this.state.scores, // Include final scores
        },
      };
    }

    // Now advance to next round (only if not at last round)
    await this.processRound();

    // Get next event if available
    const nextEvent = !this.state.isComplete 
      ? this.state.config.events.find(e => e.round === this.state.currentRound + 1)
      : null;

    await this.saveGameState();

    return {
      success: true,
      message: this.state.isComplete 
        ? 'Simulation complete!'
        : 'Moving to next event...',
      updatedState: {
        isComplete: this.state.isComplete,
        currentRound: this.state.currentRound,
        currentEvent: nextEvent || null,
        hasSubmittedDecision: false, // Reset for next round
        hasSubmittedQuiz: false, // Reset for next round
        showContinueButton: !this.state.isComplete,
      },
    };
  }

  private calculateDecisionScore(decision: Decision, round: number): number {
    // Scoring per round: Each decision is scored out of 20 points (5 rounds * 20 = 100 max)
    // Base score for making a decision
    let score = 10; // Base score for making any decision

    // Add points based on positive impacts (max 10 additional points)
    let positivePoints = 0;
    if (decision.expectedImpact.marketShare && decision.expectedImpact.marketShare > 0) {
      positivePoints += Math.min(4, decision.expectedImpact.marketShare * 2);
    }
    if (decision.expectedImpact.brandValue && decision.expectedImpact.brandValue > 0) {
      positivePoints += Math.min(3, decision.expectedImpact.brandValue * 1.5);
    }
    if (decision.expectedImpact.technology && decision.expectedImpact.technology > 0) {
      positivePoints += Math.min(3, decision.expectedImpact.technology * 1.5);
    }

    // Reduce score for negative impacts
    if (decision.expectedImpact.marketShare && decision.expectedImpact.marketShare < 0) {
      positivePoints -= Math.abs(decision.expectedImpact.marketShare * 2);
    }

    score += Math.max(0, Math.min(10, positivePoints));

    // Each round's decision score is out of 20, so total across 5 rounds = 100 max
    return Math.max(0, Math.min(20, score));
  }

  private applyDecisionImpact(decision: Decision): string {
    let outcome = '';

    // Apply impacts based on decision type with randomization (80-120%)
    if (decision.expectedImpact.marketShare !== undefined) {
      const impact = decision.expectedImpact.marketShare * (0.8 + Math.random() * 0.4);
      this.state.playerCompany.marketShare = Math.max(0, Math.min(100, this.state.playerCompany.marketShare + impact));
      outcome += `Market share ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)}%. `;
    }

    if (decision.expectedImpact.brandValue !== undefined) {
      const impact = decision.expectedImpact.brandValue * (0.8 + Math.random() * 0.4);
      this.state.playerCompany.brandValue = Math.max(0, Math.min(100, this.state.playerCompany.brandValue + impact));
      outcome += `Brand value ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.technology !== undefined) {
      const impact = decision.expectedImpact.technology * (0.8 + Math.random() * 0.4);
      this.state.playerCompany.technology = Math.max(0, Math.min(100, this.state.playerCompany.technology + impact));
      outcome += `Technology level ${impact > 0 ? 'improved' : 'declined'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.production !== undefined) {
      const impact = decision.expectedImpact.production * (0.8 + Math.random() * 0.4);
      this.state.playerCompany.production = Math.max(0, Math.min(100, this.state.playerCompany.production + impact));
      outcome += `Production capacity ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    // Apply force impacts
    // Note: For forces, positive expectedImpact means the force INCREASES (bad for industry)
    // Negative expectedImpact means the force DECREASES (good for industry)
    if (decision.expectedImpact.supplierPower !== undefined) {
      const impact = decision.expectedImpact.supplierPower * (0.8 + Math.random() * 0.4);
      // Positive impact increases supplier power (bad), negative decreases (good)
      this.state.fiveForces.suppliers = Math.max(0, Math.min(100, 
        this.state.fiveForces.suppliers + impact
      ));
      outcome += `Supplier bargaining power ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.buyerPower !== undefined) {
      const impact = decision.expectedImpact.buyerPower * (0.8 + Math.random() * 0.4);
      // Positive impact increases buyer power (bad), negative decreases (good)
      this.state.fiveForces.buyers = Math.max(0, Math.min(100, 
        this.state.fiveForces.buyers + impact
      ));
      outcome += `Buyer bargaining power ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.substituteThreat !== undefined) {
      const impact = decision.expectedImpact.substituteThreat * (0.8 + Math.random() * 0.4);
      // Positive impact increases substitute threat (bad), negative decreases (good)
      this.state.fiveForces.substitutes = Math.max(0, Math.min(100, 
        this.state.fiveForces.substitutes + impact
      ));
      outcome += `Substitute threat ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.rivalry !== undefined) {
      const impact = decision.expectedImpact.rivalry * (0.8 + Math.random() * 0.4);
      // Positive impact increases rivalry (bad), negative decreases (good)
      this.state.fiveForces.rivalry = Math.max(0, Math.min(100, 
        this.state.fiveForces.rivalry + impact
      ));
      outcome += `Competitive rivalry ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    if (decision.expectedImpact.newEntrants !== undefined) {
      const impact = decision.expectedImpact.newEntrants * (0.8 + Math.random() * 0.4);
      // Positive impact increases new entrant threat (bad), negative decreases (good)
      this.state.fiveForces.newEntrants = Math.max(0, Math.min(100, 
        this.state.fiveForces.newEntrants + impact
      ));
      outcome += `New entrant threat ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
    }

    // Handle specific decision effects
    if (decision.name.includes('India Mines') || decision.name.includes('Expedite mining')) {
      this.state.suppliers.indiaMines.yearsRemaining = Math.max(0, this.state.suppliers.indiaMines.yearsRemaining - 1);
      if (this.state.suppliers.indiaMines.yearsRemaining === 0) {
        this.state.suppliers.indiaMines.available = true;
        this.state.suppliers.indiaMines.share = 30; // Gains share
        outcome += 'India Mines is now available for battery supply. ';
      }
    }

    // Handle revenue impact (negative cash from reduced prices)
    if (decision.expectedImpact.cash !== undefined) {
      const cashImpact = decision.expectedImpact.cash;
      this.state.playerCompany.cash += cashImpact; // Positive means adds money, negative reduces
      outcome += `Cash ${cashImpact > 0 ? 'increased' : 'decreased'} by ₹${Math.abs(cashImpact / 10000000).toFixed(2)} cr. `;
    }

    return outcome.trim();
  }

  private async processRound(): Promise<void> {
    // Competitor actions (simplified)
    this.simulateCompetitorActions();

    // Calculate industry attractiveness
    this.state.industryAttractiveness = this.calculateIndustryAttractiveness();

    // Check if we're already at the last round before incrementing
    if (this.state.currentRound >= this.state.config.numRounds - 1) {
      // We're completing the last round (round 5), mark as complete
      this.state.isComplete = true;
      // Calculate final total score (max 100)
      // Decision score: max 100 (20 points per round * 5 rounds)
      // Quiz score: max 100 (20 points per round * 5 rounds)
      // Total: average of both, capped at 100
      const decisionScoreNormalized = Math.min(100, this.state.scores.decisionScore);
      const quizScoreNormalized = Math.min(100, this.state.scores.quizScore);
      // Average of decision and quiz scores, capped at 100
      this.state.scores.totalScore = Math.min(100, (decisionScoreNormalized + quizScoreNormalized) / 2);
      // Don't increment round - stay at round 5 (0-indexed = 4, so currentRound should be 4 for round 5)
      // currentRound is 0-indexed, so round 5 = currentRound 4
    } else {
      // Reset flags for next round
      this.state.hasSubmittedDecision = false;
      this.state.hasSubmittedQuiz = false;
      this.state.currentQuiz = undefined;
      
      // Move to next round only if not complete
      this.state.currentRound++;
    }
    // Note: Next event will be loaded when user makes a decision for the new round
  }

  private applyEventEffects(event: IndustryEvent): void {
    switch (event.title) {
      case 'Government Push':
        // Government subsidies reduce buyer power (subsidies help buyers, but also reduce their price sensitivity)
        this.state.fiveForces.buyers = Math.max(0, this.state.fiveForces.buyers - 10);
        break;
      
      case 'Import Ban':
        // LiOn (Chinese) becomes unavailable
        this.state.suppliers.liOn.available = false;
        this.state.suppliers.liOn.share = 0;
        // Need to shift to Rusloth or India Mines
        if (this.state.suppliers.rusloth.available) {
          this.state.suppliers.rusloth.share = 100; // Now 100% dependent on Rusloth
        }
        // Supplier power increases significantly
        this.state.fiveForces.suppliers = Math.min(100, this.state.fiveForces.suppliers + 15);
        break;
      
      case 'Buyer Acquisition':
        // Rexa acquires Ushuttle
        this.state.buyers.rexa.acquired = true;
        this.state.buyers.ushuttle.acquired = true;
        // Rexa now controls 80% of sales (50% + 30%)
        this.state.buyers.rexa.share = 80;
        this.state.buyers.ushuttle.share = 0; // Merged into Rexa
        // Buyer power increases significantly
        this.state.fiveForces.buyers = Math.min(100, this.state.fiveForces.buyers + 20);
        break;
      
      case 'Emission Norms':
        // Electrify Inc. under scrutiny - opportunity for EVans
        // Competitive rivalry may decrease slightly as Electrify is weakened
        this.state.fiveForces.rivalry = Math.max(0, this.state.fiveForces.rivalry - 5);
        break;
      
      case 'Tesla Coming':
        // Tesla enters - increases new entrant threat and rivalry
        this.state.fiveForces.newEntrants = Math.min(100, this.state.fiveForces.newEntrants + 15);
        this.state.fiveForces.rivalry = Math.min(100, this.state.fiveForces.rivalry + 10);
        break;
    }
  }

  private applyEventToForces(event: IndustryEvent): void {
    const forceKey = event.forceAffected;
    
    // Apply event impact (impact is already in -2.0 to +2.0 range, multiply by 10 for 0-100 scale)
    this.state.fiveForces[forceKey] = Math.max(0, Math.min(100, 
      this.state.fiveForces[forceKey] + event.impact * 10
    ));
    
    // Recalculate industry attractiveness after force change
    this.state.industryAttractiveness = this.calculateIndustryAttractiveness();
  }

  private simulateCompetitorActions(): void {
    // Competitors adjust market share
    for (const competitor of this.state.config.competitors) {
      const change = (Math.random() - 0.5) * 2; // -1% to +1%
      competitor.marketShare += change;
    }

    // Normalize market shares
    const totalMarketShare = this.state.playerCompany.marketShare + 
      this.state.config.competitors.reduce((sum, c) => sum + c.marketShare, 0);
    
    if (totalMarketShare !== 100) {
      const factor = 100 / totalMarketShare;
      this.state.playerCompany.marketShare *= factor;
      this.state.config.competitors.forEach(c => c.marketShare *= factor);
    }
  }

  private calculateIndustryAttractiveness(): number {
    // Lower force intensity = More attractive industry
    // Invert and average the forces
    const avgForce = (
      this.state.fiveForces.rivalry +
      this.state.fiveForces.newEntrants +
      this.state.fiveForces.suppliers +
      this.state.fiveForces.buyers +
      this.state.fiveForces.substitutes
    ) / 5;

    return 100 - avgForce; // Invert: high forces = low attractiveness
  }

  async advanceRound(): Promise<RoundResult> {
    this.ensureInitialized();

    return {
      roundNumber: this.state.currentRound,
      summary: {
        message: `Round ${this.state.currentRound} completed`,
        industryAttractiveness: this.state.industryAttractiveness,
      },
      participantResults: new Map(),
      isGameComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    // This method uses this.state, which should be set to the participant's state before calling
    const marketShareGrowth = this.state.playerCompany.marketShare - 5; // Started at 5%
    const competitivePosition = this.determineCompetitivePosition();

    return {
      finalMarketShare: this.state.playerCompany.marketShare.toFixed(2) + '%',
      marketShareGrowth: marketShareGrowth.toFixed(2) + '%',
      brandValue: this.state.playerCompany.brandValue.toFixed(0),
      technology: this.state.playerCompany.technology.toFixed(0),
      production: this.state.playerCompany.production.toFixed(0),
      cashRemaining: `₹${(this.state.playerCompany.cash / 10000000).toFixed(2)} cr`,
      competitivePosition,
      industryAttractiveness: this.state.industryAttractiveness.toFixed(0),
      decisionsCount: this.state.decisions.length,
      evMarketShare: (this.state.playerCompany.marketShare * 7).toFixed(2) + '%', // Approximate EV segment share
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    // Public state uses the first participant's state as reference (shared game environment)
    const firstState = this.participantStates.values().next().value || this.state;
    const currentEventRound = firstState.currentRound + 1;
    const currentEvent = firstState.config.events.find((e: IndustryEvent) => e.round === currentEventRound);

    return {
      currentRound: firstState.currentRound,
      maxRounds: firstState.config.numRounds,
      playerCompany: firstState.playerCompany,
      competitors: firstState.config.competitors.filter((c: any) => c.marketShare > 0 || c.name === 'Tesla Motors'),
      fiveForces: firstState.fiveForces,
      industryAttractiveness: firstState.industryAttractiveness,
      currentEvent: currentEvent || null,
      recentEvents: firstState.events,
      allEvents: firstState.events, // Include all events for final display
      isComplete: false, // Public state doesn't show completion (participant-specific)
      suppliers: firstState.suppliers,
      buyers: firstState.buyers,
      availableDecisions: this.getAvailableDecisions(),
      hasSubmittedDecision: false, // Participant-specific - will be set in participantState
      hasSubmittedQuiz: false, // Participant-specific - will be set in participantState
      currentQuiz: firstState.currentQuiz, // Include currentQuiz in public state so frontend can access it
      // Don't include scores in public state (participant-specific)
      simulationSlug: this.simulationSlug,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    // Get participant-specific state
    let participantState = this.participantStates.get(participantId);
    if (!participantState) {
      // If participant state doesn't exist, create it from existing state or initialize new one
      this.log(`Participant state not found for ${participantId}, creating new state`);
      
      // Get first existing state as template, or use current state
      const templateState = this.participantStates.values().next().value || this.state;
      
      if (templateState) {
        participantState = {
          ...templateState,
          participantId: participantId,
          decisions: [],
          quizSubmissions: [],
          hasSubmittedDecision: false,
          hasSubmittedQuiz: false,
          scores: {
            decisionScore: 0,
            quizScore: 0,
            totalScore: 0,
          },
          currentRound: 0,
          isComplete: false,
          events: [], // Reset events for new participant
        };
        // Calculate industry attractiveness for new participant
        const originalState = this.state;
        this.state = participantState;
        participantState.industryAttractiveness = this.calculateIndustryAttractiveness();
        this.state = originalState;
        
        this.participantStates.set(participantId, participantState);
        // Save the new state
        this.saveGameState().catch(err => this.log('Error saving new participant state:', err));
      } else {
        // No template available, return null
        return null;
      }
    }

    const publicState = this.getPublicState();
    const currentEventRound = participantState.currentRound + 1;
    const currentEvent = participantState.config.events.find((e: IndustryEvent) => e.round === currentEventRound);
    
    return {
      ...publicState,
      currentRound: participantState.currentRound,
      currentEvent: currentEvent || null,
      decisions: participantState.decisions,
      allEvents: participantState.events,
      quizSubmissions: participantState.quizSubmissions,
      metrics: participantState.isComplete ? this.computeMetricsForParticipant(participantId) : undefined,
      hasPlacedDecision: participantState.hasSubmittedDecision,
      hasSubmittedDecision: participantState.hasSubmittedDecision, // Also include for compatibility
      hasSubmittedQuiz: participantState.hasSubmittedQuiz,
      showContinueButton: !participantState.isComplete && participantState.hasSubmittedQuiz, // Show continue button after quiz
      currentQuiz: participantState.currentQuiz, // Include currentQuiz in participantState
      isComplete: participantState.isComplete,
      // Only include scores if game is complete
      scores: participantState.isComplete ? participantState.scores : undefined,
    };
  }

  private computeMetricsForParticipant(participantId: string): any {
    const participantState = this.participantStates.get(participantId);
    if (!participantState) return undefined;

    // Use the participant's state for metrics calculation
    const originalState = this.state;
    this.state = participantState;
    const metrics = this.computeMetrics();
    this.state = originalState;
    return metrics;
  }

  /**
   * Get all participants' states for facilitator dashboard
   * Returns a summary of each participant's progress
   */
  getAllParticipantsState(): any {
    if (!this.isInitialized) return null;

    const publicState = this.getPublicState();
    
    return {
      currentRound: this.state.currentRound,
      maxRounds: this.state.config.numRounds,
      isComplete: this.state.isComplete,
      currentEvent: publicState.currentEvent,
      // Note: In EV Gambit, each participant has their own state
      // This returns the overall game state that applies to all participants
      // Individual participant progress is tracked in their decisions and quiz submissions
    };
  }

  // ===== HELPER METHODS =====

  private generateCompetitors(): Company[] {
    return [
      {
        name: 'Electrify Inc.',
        marketShare: 12, // 12% total market share, 35% in EV segment
        cash: 500000000, // Large established company
        brandValue: 75,
        technology: 70,
        production: 80,
      },
      {
        name: 'Tesla Motors',
        marketShare: 0, // Entering in 5 years (will be added in Event 5)
        cash: 1000000000, // Premium player
        brandValue: 90,
        technology: 95,
        production: 70,
      },
      {
        name: 'Other Competitors',
        marketShare: 83, // Remaining market share
        cash: 200000000,
        brandValue: 60,
        technology: 55,
        production: 70,
      },
    ];
  }

  private generateEvents(rounds: number): IndustryEvent[] {
    // 5 events matching the workflow, one per round (rounds 1-5)
    const events: IndustryEvent[] = [
      {
        round: 1,
        title: 'Government Push',
        description: 'The federal government has announced tax subsidies for EV manufactures worth INR 100 cr in order to promote sustainability in the mobility industry. EVans and other manufacturers will benefit from this scheme.',
        forceAffected: 'buyers',
        impact: -1.0,
        quizQuestions: [
          {
            question: 'How might the subsidy indirectly strengthen LiOn\'s bargaining power over EVans?',
            options: [
              'By increasing EVans\' production costs',
              'By raising demand for batteries, giving LiOn pricing leverage',
              'By reducing Electrify Inc.\'s market share',
              'By forcing EVans to rely solely on Rusloth'
            ],
            correctAnswer: 1,
          },
          {
            question: 'If Electrify Inc. matches EVans\' production scale-up, what is the most likely impact on EVans?',
            options: [
              'EVans\' market share gains would be halved',
              'EVans\' profit margin would increase',
              'SmartRide would lose customers',
              'LiOn would lower battery prices'
            ],
            correctAnswer: 0,
          },
          {
            question: 'Why does a marketing campaign have a stronger effect on SmartRide than discounts?',
            options: [
              'It reduces production costs',
              'It builds long-term EV adoption over short-term sales',
              'It directly competes with Electrify Inc.',
              'It increases supplier dependence'
            ],
            correctAnswer: 1,
          },
          {
            question: 'What risk does "Do Nothing" in Operations pose in this event?',
            options: [
              'Losing supplier contracts',
              'Missing a chance to outpace competitors in a growing market',
              'Reducing buyer confidence',
              'Increasing production costs'
            ],
            correctAnswer: 1,
          },
        ],
      },
      {
        round: 2,
        title: 'Import Ban',
        description: 'The relations with China have strained due to geopolitical tensions. Govt. of India has decided to impose a ban on all Chinese products, which means the batteries will not be available for Indian EV makers.',
        forceAffected: 'suppliers',
        impact: 2.0,
        quizQuestions: [
          {
            question: 'Why might shifting to 70% Rusloth sourcing not fully mitigate the tariff\'s impact?',
            options: [
              'Rusloth\'s prices are also affected by tariffs',
              'Rusloth has limited capacity compared to LiOn',
              'Electrify Inc. will retaliate with price cuts',
              'Rexa will demand more vehicles'
            ],
            correctAnswer: 1,
          },
          {
            question: 'How does expediting India Mines give EVans an edge over Electrify Inc.?',
            options: [
              'It immediately increases market share',
              'It reduces long-term dependence on LiOn, unlike Electrify',
              'It lowers production costs this year',
              'It attracts new buyers like SmartRide'
            ],
            correctAnswer: 1,
          },
          {
            question: 'Under what condition might reducing exports backfire?',
            options: [
              'If domestic demand drops due to SmartRide\'s growth',
              'If LiOn lowers prices again',
              'If Tesla enters earlier than expected',
              'If Rusloth increases supply'
            ],
            correctAnswer: 0,
          },
          {
            question: 'What external factor makes "Do Nothing" riskier here?',
            options: [
              'A global lithium shortage increasing battery costs',
              'EVans\' profit margin would increase',
              'SmartRide would lose customers',
              'LiOn would lower battery prices'
            ],
            correctAnswer: 0,
          },
        ],
      },
      {
        round: 3,
        title: 'Buyer Acquisition',
        description: 'Rexa has acquired Ushuttle. Your biggest buyer has gone on to acquire your second-biggest buyer. This changes the market dynamics.',
        forceAffected: 'buyers',
        impact: 2.0,
        quizQuestions: [
          {
            question: 'Why might stockpiling batteries fail to counter Rexa\'s increased buyer power?',
            options: [
              'It doesn\'t address Rexa\'s ability to demand lower prices',
              'It increases EVans\' production costs',
              'It reduces supply to other buyers',
              'It weakens EVans\' position against Electrify Inc.'
            ],
            correctAnswer: 0,
          },
          {
            question: 'What risk does reducing four-wheeler production pose if Rexa demands more four-wheelers?',
            options: [
              'EVans could lose market share to SmartRide',
              'EVans might fail to meet Rexa\'s needs, losing sales',
              'Profit margins would drop further',
              'LiOn would raise battery prices'
            ],
            correctAnswer: 1,
          },
          {
            question: 'What could undermine targeting logistics firms as a strategy?',
            options: [
              'Electrify Inc. offering cheaper EVs to logistics firms',
              'Tesla entering the logistics market',
              'Rusloth reducing battery supply',
              'SmartRide lowering ride-sharing rates'
            ],
            correctAnswer: 0,
          },
          {
            question: 'How might "Do Nothing" in Outbound signal weakness to Rexa?',
            options: [
              'It suggests EVans lacks alternative buyers',
              'It increases EVans\' production capacity',
              'It reduces EVans\' supplier costs',
              'It strengthens EVans\' rivalry with Electrify Inc.'
            ],
            correctAnswer: 0,
          },
        ],
      },
      {
        round: 4,
        title: 'Emission Norms',
        description: 'Electrify\'s highest selling petrol vehicle is under scrutiny for supposedly flouting emission norms. Ministry of Transport has taken cognizance of this due to some adverse newspaper reports and testing is underway. Is this a business opportunity for EVans?',
        forceAffected: 'rivalry',
        impact: -0.8,
        quizQuestions: [
          {
            question: 'Why does securing 1,500 batteries amplify EVans\' advantage more than shifting to Rusloth?',
            options: [
              'It directly supports higher production to exploit Electrify\'s weakness',
              'It reduces long-term supplier costs',
              'It attracts new buyers like Rexa',
              'It counters SmartRide\'s growth'
            ],
            correctAnswer: 0,
          },
          {
            question: 'What risk does launching a new eco-friendly EV face if SmartRide expands?',
            options: [
              'Higher production costs',
              'Delayed market share gains as substitutes grow',
              'Reduced supplier reliability',
              'Increased competition from Tesla'
            ],
            correctAnswer: 1,
          },
          {
            question: 'What could weaken the effectiveness of trade-in discounts?',
            options: [
              'Electrify Inc. offering its own EV trade-ins',
              'Rexa demanding lower prices',
              'LiOn raising battery prices',
              'SmartRide losing customers'
            ],
            correctAnswer: 0,
          },
          {
            question: 'How might "Do Nothing" in Operations limit EVans\' long-term gain?',
            options: [
              'It fails to build on Electrify\'s weakened eco-credentials',
              'It reduces EVans\' supplier options',
              'It increases buyer power',
              'It raises production costs'
            ],
            correctAnswer: 0,
          },
        ],
      },
      {
        round: 5,
        title: 'Tesla Coming',
        description: 'Elon Musk has announced setting up a manufacturing plant for EV cars in India. It is expected that their cars will be sold at a premium.',
        forceAffected: 'newEntrants',
        impact: 1.8,
        quizQuestions: [
          {
            question: 'Why is increasing battery orders insufficient against Tesla\'s threat?',
            options: [
              'It doesn\'t address Tesla\'s premium market focus',
              'It raises EVans\' production costs',
              'It weakens EVans\' position with Rexa',
              'It reduces Electrify Inc.\'s market share'
            ],
            correctAnswer: 0,
          },
          {
            question: 'What supply chain risk could undermine developing a premium EV?',
            options: [
              'Dependence on LiOn if India Mines isn\'t expedited',
              'Rusloth lowering battery prices',
              'SmartRide increasing ride-sharing rates',
              'Electrify Inc. scaling EV production'
            ],
            correctAnswer: 0,
          },
          {
            question: 'How might cutting prices by 10% hurt EVans when Tesla enters?',
            options: [
              'It reduces margins, limiting funds to compete in premium segment',
              'It increases market share too quickly',
              'It weakens supplier relationships',
              'It attracts more buyers like Rexa'
            ],
            correctAnswer: 0,
          },
          {
            question: 'What signal might "Do Nothing" in all categories send to investors?',
            options: [
              'EVans lacks a proactive strategy against Tesla',
              'EVans is focusing on profitability',
              'EVans is strengthening its supply chain',
              'EVans is targeting new buyers'
            ],
            correctAnswer: 0,
          },
        ],
      },
    ];

    return events.filter(e => e.round <= rounds);
  }

  private determineCompetitivePosition(): string {
    const marketShare = this.state.playerCompany.marketShare;
    
    if (marketShare >= 15) return 'Market Leader 👑';
    if (marketShare >= 10) return 'Strong Challenger 🚀';
    if (marketShare >= 5) return 'Holding Ground ⚖️';
    if (marketShare >= 3) return 'Struggling 📉';
    return 'Losing Ground 🔻';
  }

  private async saveGameState(): Promise<void> {
    // Save all participant states to SessionStateCache
    // Convert Map to object for JSON storage
    const participantStatesObj: Record<string, EVGambitGameState> = {};
    this.participantStates.forEach((state, participantId) => {
      participantStatesObj[participantId] = state;
    });

    await prisma.sessionStateCache.upsert({
      where: { session_id: this.sessionId },
      update: {
        state_data: { participantStates: participantStatesObj } as any,
        updated_at: new Date(),
      },
      create: {
        session_id: this.sessionId,
        state_data: { participantStates: participantStatesObj } as any,
      },
    });
  }

  /**
   * Get available decisions for the current round/event
   * Based on the workflow, each event has specific decision categories and options
   */
  getAvailableDecisions(): { category: string; decisions: Decision[] }[] {
    if (!this.isInitialized) return [];

    const currentEventRound = this.state.currentRound + 1;
    const currentEvent = this.state.config.events.find(e => e.round === currentEventRound);

    if (!currentEvent) return [];

    // Define event-specific decisions based on workflow
    switch (currentEvent.title) {
      case 'Government Push': // Event 1
        return [
          {
            category: 'Business Strategy',
            decisions: [
              {
                type: 'business',
                name: 'Scale up operations of existing product',
                cost: 20000000, // 2 cr
                expectedImpact: {
                  marketShare: 1.5,
                  production: 8,
                },
              },
              {
                type: 'business',
                name: 'Announce the launch of a new two-wheeler',
                cost: 30000000, // 3 cr
                expectedImpact: {
                  marketShare: 2.5,
                  brandValue: 5,
                  technology: 3,
                },
              },
            ],
          },
          {
            category: 'Operations Strategy',
            decisions: [
              {
                type: 'operations',
                name: 'Pre-order batteries and store in inventory from LiOn',
                cost: 15000000,
                expectedImpact: {
                  production: 5,
                  supplierPower: -5,
                },
              },
              {
                type: 'operations',
                name: 'Open more stores in the country',
                cost: 20000000,
                expectedImpact: {
                  marketShare: 1.5,
                  production: 3,
                },
              },
            ],
          },
          {
            category: 'Corporate Strategy',
            decisions: [
              {
                type: 'corporate',
                name: 'Partner with SmartRide',
                cost: 15000000,
                expectedImpact: {
                  marketShare: 1.0,
                  substituteThreat: -8,
                  buyerPower: -5,
                },
              },
              {
                type: 'corporate',
                name: 'Reach out to Tesla for a possible JV',
                cost: 20000000,
                expectedImpact: {
                  technology: 10,
                  brandValue: 5,
                  newEntrants: -8,
                },
              },
            ],
          },
        ];

      case 'Import Ban': // Event 2
        return [
          {
            category: 'Business Strategy',
            decisions: [
              {
                type: 'business',
                name: 'Increase sourcing from Rusloth',
                cost: 10000000,
                expectedImpact: {
                  supplierPower: -8,
                  production: 2,
                },
              },
              {
                type: 'business',
                name: 'Create a coalition with Electrify to negotiate with governments of India and China',
                cost: 25000000,
                expectedImpact: {
                  supplierPower: -10,
                  rivalry: -5,
                },
              },
            ],
          },
          {
            category: 'Operations Strategy',
            decisions: [
              {
                type: 'operations',
                name: 'Expedite mining of Indian Lithium',
                cost: 35000000,
                expectedImpact: {
                  supplierPower: -15,
                  technology: 3,
                },
              },
              {
                type: 'operations',
                name: 'Decrease production of four wheelers',
                cost: 0,
                expectedImpact: {
                  marketShare: -1.0,
                  production: -5,
                },
              },
              {
                type: 'operations',
                name: 'Increase your stake in India Mines',
                cost: 50000000,
                expectedImpact: {
                  supplierPower: -12,
                  production: 4,
                },
              },
            ],
          },
          {
            category: 'Corporate Strategy',
            decisions: [
              {
                type: 'corporate',
                name: 'Shut down retail stores',
                cost: -5000000, // Saves money
                expectedImpact: {
                  marketShare: -1.5,
                  production: -3,
                },
              },
              {
                type: 'corporate',
                name: 'Reduce exports till standoff ends',
                cost: 0,
                expectedImpact: {
                  marketShare: -0.5,
                },
              },
            ],
          },
        ];

      case 'Buyer Acquisition': // Event 3
        return [
          {
            category: 'Business Strategy',
            decisions: [
              {
                type: 'business',
                name: 'Explore opportunities to export',
                cost: 10000000,
                expectedImpact: {
                  marketShare: 1.5,
                  buyerPower: -5, // Reduces dependency on Rexa
                },
              },
              {
                type: 'business',
                name: 'Settle for lower prices from Rexa',
                cost: 0,
                expectedImpact: {
                  marketShare: 0.5,
                  buyerPower: 8,
                  cash: -5000000,
                },
              },
            ],
          },
          {
            category: 'Sales Strategy',
            decisions: [
              {
                type: 'sales',
                name: 'Scout for more domestic and international clients',
                cost: 15000000,
                expectedImpact: {
                  marketShare: 2.0,
                  buyerPower: -8,
                },
              },
              {
                type: 'sales',
                name: 'Offer discounts on non-best-selling products',
                cost: 5000000,
                expectedImpact: {
                  marketShare: 1.0,
                  cash: -2000000,
                },
              },
            ],
          },
          {
            category: 'Corporate Strategy',
            decisions: [
              {
                type: 'corporate',
                name: 'Reduce production of shuttles and buses',
                cost: 0,
                expectedImpact: {
                  marketShare: -1.5,
                  production: -8,
                },
              },
              {
                type: 'corporate',
                name: 'Increase production of shuttles and buses',
                cost: 25000000,
                expectedImpact: {
                  marketShare: 2.0,
                  production: 10,
                },
              },
            ],
          },
        ];

      case 'Emission Norms': // Event 4
        return [
          {
            category: 'Marketing Strategy',
            decisions: [
              {
                type: 'marketing',
                name: 'Create a marketing campaign maligning their actions',
                cost: 10000000,
                expectedImpact: {
                  brandValue: -2,
                  marketShare: 0.5,
                  rivalry: 3, // Increases rivalry
                },
              },
              {
                type: 'marketing',
                name: 'Launch a marketing campaign for EVans\' best selling EV',
                cost: 15000000,
                expectedImpact: {
                  brandValue: 6,
                  marketShare: 2.0,
                },
              },
            ],
          },
          {
            category: 'Sales Strategy',
            decisions: [
              {
                type: 'sales',
                name: 'Increase sales channels to sell EVans\' highest selling EVs',
                cost: 18000000,
                expectedImpact: {
                  marketShare: 2.5,
                  production: 3,
                },
              },
              {
                type: 'sales',
                name: 'Offer discounts and financing schemes for EVans EVs',
                cost: 12000000,
                expectedImpact: {
                  marketShare: 2.0,
                  brandValue: 1,
                  cash: -3000000,
                },
              },
            ],
          },
          {
            category: 'Corporate Strategy',
            decisions: [
              {
                type: 'corporate',
                name: 'Set up an EV research centre for future of transportation at a premier university',
                cost: 30000000,
                expectedImpact: {
                  technology: 8,
                  brandValue: 6,
                  marketShare: 1.0,
                },
              },
              {
                type: 'corporate',
                name: 'Report EVans\' Carbon Footprint and ESG numbers',
                cost: 5000000,
                expectedImpact: {
                  brandValue: 5,
                  marketShare: 0.5,
                },
              },
            ],
          },
        ];

      case 'Tesla Coming': // Event 5
        return [
          {
            category: 'Business Strategy',
            decisions: [
              {
                type: 'business',
                name: 'EVans should increase production to pre-emptively increase loyal customer base',
                cost: 25000000,
                expectedImpact: {
                  marketShare: 2.0,
                  production: 10,
                  newEntrants: -5,
                },
              },
              {
                type: 'business',
                name: 'Launch a range of premium offerings',
                cost: 40000000,
                expectedImpact: {
                  marketShare: 1.0,
                  brandValue: 8,
                  technology: 5,
                  newEntrants: -8,
                },
              },
            ],
          },
          {
            category: 'Corporate Strategy',
            decisions: [
              {
                type: 'corporate',
                name: 'Offer a partnership to Electrify for a JV',
                cost: 30000000,
                expectedImpact: {
                  rivalry: -10,
                  technology: 5,
                  marketShare: 1.0,
                  newEntrants: -5,
                },
              },
              {
                type: 'corporate',
                name: 'Ask the government to negotiate with governments to lower tariffs so EVans can export more',
                cost: 10000000,
                expectedImpact: {
                  marketShare: 1.5,
                  cash: 5000000,
                },
              },
            ],
          },
        ];

      default:
        return [];
    }
  }
}

