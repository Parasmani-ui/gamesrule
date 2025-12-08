import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * HR Compensation - "To Pay or Not to Pay" Simulation
 * 
 * PURPOSE:
 * - Teach Multi-Criteria Decision Making (MCDM) in HR context
 * - Demonstrate expert system design and weight elicitation
 * - Show how subjective judgments can be systematized
 * - Illustrate the complexity of compensation decisions
 * 
 * STAGES:
 * 1. Expert Selection: Choose domain experts for advice
 * 2. Attribute Weighting: Select and weight evaluation criteria
 * 3. Candidate Ranking: Rank candidates based on weighted criteria
 * 
 * COMPENSATION CALCULATION:
 * Base: ₹5,00,000
 * + Expert Selection Score (0 to ₹50,000)
 * + Attribute Weight Score (0 to ₹1,00,000)
 * + Ranking Match Score (0 to ₹3,00,000)
 * Final Package: ₹5,00,000 to ₹9,50,000
 */

interface Expert {
  id: string;
  name: string;
  specialty: string;
  credibility: number; // 0-1
  cost: number;
}

interface Attribute {
  id: string;
  name: string;
  importance: number; // Player assigned (0-1)
  optimalWeight: number; // Hidden optimal weight
}

interface Candidate {
  id: string;
  name: string;
  scores: { [attributeId: string]: number }; // 0-100
  optimalRank: number; // Hidden correct ranking
}

interface HRCompensationConfig {
  experts: Expert[];
  attributes: Attribute[];
  candidates: Candidate[];
  baseSalary: number;
}

interface HRCompensationGameState {
  sessionId: string;
  participantId: string;
  config: HRCompensationConfig;
  currentStage: 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete';
  selectedExperts: string[];
  attributeWeights: { [attributeId: string]: number };
  candidateRanking: string[];
  scores: {
    expertSelectionScore: number;
    attributeWeightScore: number;
    rankingMatchScore: number;
    totalScore: number;
  };
  finalCompensation: number;
  isComplete: boolean;
}

export class HRCompensationEngine extends BaseGameEngine {
  private state!: HRCompensationGameState;

  constructor(sessionId: string) {
    super(sessionId, 'hr-compensation');
  }

  async initialize(config: Partial<HRCompensationConfig>): Promise<void> {
    this.log('Initializing HR Compensation simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    // Default configuration
    const defaultConfig: HRCompensationConfig = {
      baseSalary: 500000,
      experts: config.experts || this.generateExperts(),
      attributes: config.attributes || this.generateAttributes(),
      candidates: config.candidates || this.generateCandidates(),
    };

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: defaultConfig,
      currentStage: 'expert-selection',
      selectedExperts: [],
      attributeWeights: {},
      candidateRanking: [],
      scores: {
        expertSelectionScore: 0,
        attributeWeightScore: 0,
        rankingMatchScore: 0,
        totalScore: 0,
      },
      finalCompensation: defaultConfig.baseSalary,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('HR Compensation initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { stage, data } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    switch (stage) {
      case 'expert-selection':
        return await this.handleExpertSelection(data);
      
      case 'attribute-weighting':
        return await this.handleAttributeWeighting(data);
      
      case 'candidate-ranking':
        return await this.handleCandidateRanking(data);
      
      default:
        return {
          success: false,
          message: 'Invalid stage',
        };
    }
  }

  private async handleExpertSelection(data: any): Promise<ActionResult> {
    const { expertIds } = data;

    if (!Array.isArray(expertIds) || expertIds.length === 0) {
      return {
        success: false,
        message: 'Please select at least one expert',
      };
    }

    this.state.selectedExperts = expertIds;

    // Calculate expert selection score
    const selectedExperts = this.state.config.experts.filter(e => expertIds.includes(e.id));
    const avgCredibility = selectedExperts.reduce((sum, e) => sum + e.credibility, 0) / selectedExperts.length;
    this.state.scores.expertSelectionScore = Math.round(avgCredibility * 50000);

    // Move to next stage
    this.state.currentStage = 'attribute-weighting';

    await this.saveGameState();

    return {
      success: true,
      message: 'Experts selected successfully',
      data: {
        selectedExperts: selectedExperts.map(e => ({ id: e.id, name: e.name, specialty: e.specialty })),
        expertScore: this.state.scores.expertSelectionScore,
        nextStage: 'attribute-weighting',
      },
    };
  }

  private async handleAttributeWeighting(data: any): Promise<ActionResult> {
    const { weights } = data;

    if (!weights || typeof weights !== 'object') {
      return {
        success: false,
        message: 'Invalid weights provided',
      };
    }

    // Validate weights sum to 1.0 (or 100%)
    const totalWeight = Object.values(weights).reduce((sum: number, w: any) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return {
        success: false,
        message: 'Weights must sum to 1.0 (100%)',
      };
    }

    this.state.attributeWeights = weights;

    // Calculate attribute weight score (how close to optimal)
    let weightDifference = 0;
    for (const attr of this.state.config.attributes) {
      const playerWeight = weights[attr.id] || 0;
      weightDifference += Math.abs(playerWeight - attr.optimalWeight);
    }

    // Score: 100% match = 100,000, linear penalty for deviation
    this.state.scores.attributeWeightScore = Math.max(0, Math.round((1 - weightDifference) * 100000));

    // Move to next stage
    this.state.currentStage = 'candidate-ranking';

    await this.saveGameState();

    return {
      success: true,
      message: 'Attribute weights set successfully',
      data: {
        attributeWeightScore: this.state.scores.attributeWeightScore,
        nextStage: 'candidate-ranking',
      },
    };
  }

  private async handleCandidateRanking(data: any): Promise<ActionResult> {
    const { ranking } = data;

    if (!Array.isArray(ranking) || ranking.length !== this.state.config.candidates.length) {
      return {
        success: false,
        message: 'Invalid ranking provided',
      };
    }

    this.state.candidateRanking = ranking;

    // Calculate ranking match score using Spearman's Rank Correlation
    const correlation = this.calculateRankCorrelation();
    this.state.scores.rankingMatchScore = Math.round((correlation + 1) / 2 * 300000); // Map [-1,1] to [0, 300000]

    // Calculate final compensation
    this.state.scores.totalScore = 
      this.state.scores.expertSelectionScore +
      this.state.scores.attributeWeightScore +
      this.state.scores.rankingMatchScore;

    this.state.finalCompensation = this.state.config.baseSalary + this.state.scores.totalScore;

    // Complete simulation
    this.state.currentStage = 'complete';
    this.state.isComplete = true;

    await this.saveGameState();

    return {
      success: true,
      message: 'Ranking submitted. Compensation calculated!',
      data: {
        rankingMatchScore: this.state.scores.rankingMatchScore,
        correlation: correlation.toFixed(3),
        totalScore: this.state.scores.totalScore,
        finalCompensation: this.state.finalCompensation,
        breakdown: this.state.scores,
        isComplete: true,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    // Not applicable for this simulation (stage-based)
    return {
      success: true,
      message: 'Stage-based simulation',
      roundNumber: 0,
      isComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    return {
      finalCompensation: `₹${this.state.finalCompensation.toLocaleString('en-IN')}`,
      scoreBreakdown: {
        expertSelection: `₹${this.state.scores.expertSelectionScore.toLocaleString('en-IN')}`,
        attributeWeighting: `₹${this.state.scores.attributeWeightScore.toLocaleString('en-IN')}`,
        candidateRanking: `₹${this.state.scores.rankingMatchScore.toLocaleString('en-IN')}`,
      },
      percentageOfMax: ((this.state.finalCompensation / 950000) * 100).toFixed(2) + '%',
      expertiseLevel: this.getExpertiseLevel(),
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      currentStage: this.state.currentStage,
      baseSalary: this.state.config.baseSalary,
      experts: this.state.config.experts.map(e => ({
        id: e.id,
        name: e.name,
        specialty: e.specialty,
        cost: e.cost,
        // Hide credibility until after selection
      })),
      attributes: this.state.config.attributes.map(a => ({
        id: a.id,
        name: a.name,
        // Hide optimal weight
      })),
      candidates: this.state.config.candidates.map(c => ({
        id: c.id,
        name: c.name,
        scores: c.scores,
        // Hide optimal rank
      })),
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      selectedExperts: this.state.selectedExperts,
      attributeWeights: this.state.attributeWeights,
      candidateRanking: this.state.candidateRanking,
      scores: this.state.scores,
      finalCompensation: this.state.finalCompensation,
      metrics: this.state.isComplete ? this.computeMetrics() : undefined,
      // Reveal optimal values after completion
      optimalValues: this.state.isComplete ? {
        expertCredibilities: this.state.config.experts.map(e => ({ id: e.id, credibility: e.credibility })),
        optimalWeights: this.state.config.attributes.map(a => ({ id: a.id, optimalWeight: a.optimalWeight })),
        optimalRanking: this.state.config.candidates.sort((a, b) => a.optimalRank - b.optimalRank).map(c => c.id),
      } : undefined,
    };
  }

  // ===== HELPER METHODS =====

  private generateExperts(): Expert[] {
    return [
      {
        id: 'exp1',
        name: 'Dr. Sarah Johnson',
        specialty: 'Compensation Strategy',
        credibility: 0.9,
        cost: 5000,
      },
      {
        id: 'exp2',
        name: 'Prof. Raj Patel',
        specialty: 'Talent Acquisition',
        credibility: 0.85,
        cost: 4000,
      },
      {
        id: 'exp3',
        name: 'Ms. Emily Chen',
        specialty: 'Market Analysis',
        credibility: 0.7,
        cost: 3000,
      },
      {
        id: 'exp4',
        name: 'Mr. David Brown',
        specialty: 'Performance Metrics',
        credibility: 0.6,
        cost: 2000,
      },
    ];
  }

  private generateAttributes(): Attribute[] {
    return [
      {
        id: 'tech',
        name: 'Technical Skills',
        importance: 0,
        optimalWeight: 0.35,
      },
      {
        id: 'leadership',
        name: 'Leadership Ability',
        importance: 0,
        optimalWeight: 0.25,
      },
      {
        id: 'experience',
        name: 'Experience (Years)',
        importance: 0,
        optimalWeight: 0.20,
      },
      {
        id: 'education',
        name: 'Education',
        importance: 0,
        optimalWeight: 0.10,
      },
      {
        id: 'cultural',
        name: 'Cultural Fit',
        importance: 0,
        optimalWeight: 0.10,
      },
    ];
  }

  private generateCandidates(): Candidate[] {
    return [
      {
        id: 'cand1',
        name: 'Alice Kumar',
        scores: {
          tech: 92,
          leadership: 85,
          experience: 78,
          education: 90,
          cultural: 88,
        },
        optimalRank: 1,
      },
      {
        id: 'cand2',
        name: 'Bob Martinez',
        scores: {
          tech: 88,
          leadership: 90,
          experience: 85,
          education: 82,
          cultural: 85,
        },
        optimalRank: 2,
      },
      {
        id: 'cand3',
        name: 'Carol Lee',
        scores: {
          tech: 85,
          leadership: 75,
          experience: 90,
          education: 88,
          cultural: 80,
        },
        optimalRank: 3,
      },
      {
        id: 'cand4',
        name: 'Dan Wilson',
        scores: {
          tech: 78,
          leadership: 82,
          experience: 75,
          education: 85,
          cultural: 90,
        },
        optimalRank: 4,
      },
    ];
  }

  private calculateRankCorrelation(): number {
    // Spearman's rank correlation coefficient
    const n = this.state.candidateRanking.length;
    
    // Get optimal ranking
    const optimalRanking = this.state.config.candidates
      .sort((a, b) => a.optimalRank - b.optimalRank)
      .map(c => c.id);

    // Calculate d² (squared difference in ranks)
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
      const playerRank = this.state.candidateRanking.indexOf(optimalRanking[i]);
      const d = i - playerRank;
      sumD2 += d * d;
    }

    // Spearman's rho formula
    const rho = 1 - (6 * sumD2) / (n * (n * n - 1));
    return rho;
  }

  private getExpertiseLevel(): string {
    const percentage = (this.state.finalCompensation / 950000) * 100;
    
    if (percentage >= 90) return 'Expert Level ⭐⭐⭐⭐⭐';
    if (percentage >= 80) return 'Advanced ⭐⭐⭐⭐';
    if (percentage >= 70) return 'Proficient ⭐⭐⭐';
    if (percentage >= 60) return 'Intermediate ⭐⭐';
    return 'Beginner ⭐';
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: 0,
        state_data: this.state as any,
      },
    });
  }
}

