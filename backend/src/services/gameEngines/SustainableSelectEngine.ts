import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Sustainable Select - Multi-Attribute Decision Making (MADM) Simulation
 * 
 * PURPOSE:
 * - Teach advanced MADM algorithms (WSM, WPM, TOPSIS, MOORA)
 * - Demonstrate trade-offs between conflicting criteria
 * - Show how different methods can yield different rankings
 * - Apply decision theory to sustainability challenges
 * 
 * THE FOUR MADM METHODS:
 * 1. WSM (Weighted Sum Model): Score(i) = Σ [w(j) × r(i,j)]
 * 2. WPM (Weighted Product Model): Score(i) = Π [r(i,j)^w(j)]
 * 3. TOPSIS: Distance to ideal best and worst
 * 4. MOORA: Benefits - Costs ratio analysis
 * 
 * CONTEXT: Sustainable product selection (e.g., vehicle choice)
 */

interface Alternative {
  id: string;
  name: string;
  attributes: { [attributeId: string]: number }; // Raw values
}

interface Attribute {
  id: string;
  name: string;
  type: 'benefit' | 'cost'; // Benefit: higher is better, Cost: lower is better
  weight: number;
  unit: string;
}

interface SustainableSelectConfig {
  scenario: string;
  alternatives: Alternative[];
  attributes: Attribute[];
  methods: ('WSM' | 'WPM' | 'TOPSIS' | 'MOORA')[];
}

interface MethodResult {
  method: string;
  scores: { [alternativeId: string]: number };
  ranking: string[]; // Alternative IDs in rank order
  explanation: string;
}

interface SustainableSelectGameState {
  sessionId: string;
  participantId: string;
  config: SustainableSelectConfig;
  currentStage: 'setup' | 'selecting-methods' | 'results' | 'complete';
  selectedMethods: string[];
  results: MethodResult[];
  playerRanking?: string[]; // Player's intuitive ranking
  agreementScore: number;
  isComplete: boolean;
}

export class SustainableSelectEngine extends BaseGameEngine {
  private state!: SustainableSelectGameState;

  constructor(sessionId: string) {
    super(sessionId, 'sustainable-select');
  }

  async initialize(config: Partial<SustainableSelectConfig>): Promise<void> {
    this.log('Initializing Sustainable Select simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    const defaultConfig: SustainableSelectConfig = {
      scenario: config.scenario || 'Selecting a sustainable vehicle',
      alternatives: config.alternatives || this.generateDefaultAlternatives(),
      attributes: config.attributes || this.generateDefaultAttributes(),
      methods: config.methods || ['WSM', 'WPM', 'TOPSIS', 'MOORA'],
    };

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: defaultConfig,
      currentStage: 'setup',
      selectedMethods: [],
      results: [],
      agreementScore: 0,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Sustainable Select initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { actionType, data } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    switch (actionType) {
      case 'select-methods':
        return await this.selectMethods(data);
      
      case 'run-analysis':
        return await this.runAnalysis();
      
      case 'submit-ranking':
        return await this.submitRanking(data);
      
      default:
        return {
          success: false,
          message: 'Invalid action type',
        };
    }
  }

  private async selectMethods(data: any): Promise<ActionResult> {
    const { methods } = data;

    if (!Array.isArray(methods) || methods.length === 0) {
      return {
        success: false,
        message: 'Please select at least one method',
      };
    }

    // Validate methods
    const validMethods = ['WSM', 'WPM', 'TOPSIS', 'MOORA'];
    for (const method of methods) {
      if (!validMethods.includes(method)) {
        return {
          success: false,
          message: `Invalid method: ${method}`,
        };
      }
    }

    this.state.selectedMethods = methods;
    this.state.currentStage = 'selecting-methods';

    await this.saveGameState();

    return {
      success: true,
      message: `Selected ${methods.length} method(s) for analysis`,
      data: {
        selectedMethods: methods,
        nextAction: 'run-analysis',
      },
    };
  }

  private async runAnalysis(): Promise<ActionResult> {
    this.state.results = [];

    // Run each selected method
    for (const method of this.state.selectedMethods) {
      let result: MethodResult;

      switch (method) {
        case 'WSM':
          result = this.calculateWSM();
          break;
        case 'WPM':
          result = this.calculateWPM();
          break;
        case 'TOPSIS':
          result = this.calculateTOPSIS();
          break;
        case 'MOORA':
          result = this.calculateMOORA();
          break;
        default:
          continue;
      }

      this.state.results.push(result);
    }

    this.state.currentStage = 'results';

    await this.saveGameState();

    return {
      success: true,
      message: 'Analysis complete for all selected methods',
      data: {
        results: this.state.results,
        nextAction: 'Compare rankings or submit your intuitive ranking',
      },
    };
  }

  private async submitRanking(data: any): Promise<ActionResult> {
    const { ranking } = data;

    if (!Array.isArray(ranking) || ranking.length !== this.state.config.alternatives.length) {
      return {
        success: false,
        message: 'Invalid ranking submitted',
      };
    }

    this.state.playerRanking = ranking;

    // Calculate agreement score (how well player's ranking matches method results)
    this.state.agreementScore = this.calculateAgreementScore();

    this.state.currentStage = 'complete';
    this.state.isComplete = true;

    await this.saveGameState();

    return {
      success: true,
      message: 'Ranking submitted successfully',
      data: {
        playerRanking: ranking,
        agreementScore: this.state.agreementScore,
        comparison: this.compareRankings(),
        isComplete: true,
      },
    };
  }

  // ===== MADM CALCULATION METHODS =====

  private calculateWSM(): MethodResult {
    const normalizedMatrix = this.normalizeMatrix();
    const scores: { [id: string]: number } = {};

    for (const alt of this.state.config.alternatives) {
      let score = 0;
      
      for (const attr of this.state.config.attributes) {
        const normalized = normalizedMatrix[alt.id][attr.id];
        score += attr.weight * normalized;
      }

      scores[alt.id] = score;
    }

    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    return {
      method: 'WSM',
      scores,
      ranking,
      explanation: 'Weighted Sum Model: Simple additive aggregation. Best for criteria with similar units.',
    };
  }

  private calculateWPM(): MethodResult {
    const normalizedMatrix = this.normalizeMatrix();
    const scores: { [id: string]: number } = {};

    for (const alt of this.state.config.alternatives) {
      let score = 1;
      
      for (const attr of this.state.config.attributes) {
        const normalized = normalizedMatrix[alt.id][attr.id];
        score *= Math.pow(normalized, attr.weight);
      }

      scores[alt.id] = score;
    }

    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    return {
      method: 'WPM',
      scores,
      ranking,
      explanation: 'Weighted Product Model: Multiplicative aggregation. Dimensionless comparison.',
    };
  }

  private calculateTOPSIS(): MethodResult {
    const normalizedMatrix = this.normalizeMatrix();
    
    // Find ideal best and worst
    const idealBest: { [attrId: string]: number } = {};
    const idealWorst: { [attrId: string]: number } = {};

    for (const attr of this.state.config.attributes) {
      const values = this.state.config.alternatives.map(alt => normalizedMatrix[alt.id][attr.id]);
      
      if (attr.type === 'benefit') {
        idealBest[attr.id] = Math.max(...values);
        idealWorst[attr.id] = Math.min(...values);
      } else {
        idealBest[attr.id] = Math.min(...values);
        idealWorst[attr.id] = Math.max(...values);
      }
    }

    // Calculate distances
    const scores: { [id: string]: number } = {};

    for (const alt of this.state.config.alternatives) {
      let distToBest = 0;
      let distToWorst = 0;

      for (const attr of this.state.config.attributes) {
        const value = normalizedMatrix[alt.id][attr.id];
        distToBest += Math.pow(value - idealBest[attr.id], 2);
        distToWorst += Math.pow(value - idealWorst[attr.id], 2);
      }

      distToBest = Math.sqrt(distToBest);
      distToWorst = Math.sqrt(distToWorst);

      // Relative closeness to ideal best
      scores[alt.id] = distToWorst / (distToBest + distToWorst);
    }

    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    return {
      method: 'TOPSIS',
      scores,
      ranking,
      explanation: 'TOPSIS: Ranks by closeness to ideal best and distance from ideal worst.',
    };
  }

  private calculateMOORA(): MethodResult {
    const normalizedMatrix = this.normalizeMatrix();
    const scores: { [id: string]: number } = {};

    for (const alt of this.state.config.alternatives) {
      let benefitSum = 0;
      let costSum = 0;

      for (const attr of this.state.config.attributes) {
        const value = normalizedMatrix[alt.id][attr.id];
        
        if (attr.type === 'benefit') {
          benefitSum += value;
        } else {
          costSum += value;
        }
      }

      scores[alt.id] = benefitSum - costSum;
    }

    const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    return {
      method: 'MOORA',
      scores,
      ranking,
      explanation: 'MOORA: Sum of benefits minus sum of costs. Simple ratio-based approach.',
    };
  }

  // ===== HELPER METHODS =====

  private normalizeMatrix(): { [altId: string]: { [attrId: string]: number } } {
    const normalized: { [altId: string]: { [attrId: string]: number } } = {};

    for (const alt of this.state.config.alternatives) {
      normalized[alt.id] = {};
    }

    for (const attr of this.state.config.attributes) {
      const values = this.state.config.alternatives.map(alt => alt.attributes[attr.id]);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min;

      for (const alt of this.state.config.alternatives) {
        const value = alt.attributes[attr.id];
        
        // Normalize to 0-1 scale
        if (range === 0) {
          normalized[alt.id][attr.id] = 0.5;
        } else if (attr.type === 'benefit') {
          normalized[alt.id][attr.id] = (value - min) / range;
        } else {
          // For cost attributes, invert
          normalized[alt.id][attr.id] = (max - value) / range;
        }
      }
    }

    return normalized;
  }

  private calculateAgreementScore(): number {
    if (!this.state.playerRanking || this.state.results.length === 0) {
      return 0;
    }

    // Calculate Spearman correlation with each method
    let totalCorrelation = 0;

    for (const result of this.state.results) {
      const correlation = this.spearmanCorrelation(this.state.playerRanking, result.ranking);
      totalCorrelation += correlation;
    }

    // Average correlation, mapped to 0-100 score
    const avgCorrelation = totalCorrelation / this.state.results.length;
    return Math.round(((avgCorrelation + 1) / 2) * 100);
  }

  private spearmanCorrelation(ranking1: string[], ranking2: string[]): number {
    const n = ranking1.length;
    let sumD2 = 0;

    for (let i = 0; i < n; i++) {
      const rank1 = ranking1.indexOf(ranking2[i]);
      const d = i - rank1;
      sumD2 += d * d;
    }

    return 1 - (6 * sumD2) / (n * (n * n - 1));
  }

  private compareRankings(): any {
    const comparison: any = {};

    for (const result of this.state.results) {
      comparison[result.method] = {
        methodRanking: result.ranking.map(id => 
          this.state.config.alternatives.find(a => a.id === id)?.name
        ),
        agreement: this.state.playerRanking ? 
          this.spearmanCorrelation(this.state.playerRanking, result.ranking).toFixed(3) : 
          'N/A',
      };
    }

    return comparison;
  }

  private generateDefaultAlternatives(): Alternative[] {
    return [
      {
        id: 'ev',
        name: 'Electric Vehicle',
        attributes: {
          cost: 2500000, // ₹25L
          co2: 0,
          range: 400,
          fuel_eff: 120, // km per charge equivalent
          tech: 90,
        },
      },
      {
        id: 'hybrid',
        name: 'Hybrid Vehicle',
        attributes: {
          cost: 2000000,
          co2: 80,
          range: 800,
          fuel_eff: 30,
          tech: 75,
        },
      },
      {
        id: 'gasoline',
        name: 'Gasoline Vehicle',
        attributes: {
          cost: 1500000,
          co2: 150,
          range: 600,
          fuel_eff: 15,
          tech: 60,
        },
      },
    ];
  }

  private generateDefaultAttributes(): Attribute[] {
    return [
      {
        id: 'cost',
        name: 'Purchase Cost (₹)',
        type: 'cost',
        weight: 0.25,
        unit: '₹',
      },
      {
        id: 'co2',
        name: 'CO₂ Emissions (g/km)',
        type: 'cost',
        weight: 0.30,
        unit: 'g/km',
      },
      {
        id: 'range',
        name: 'Range (km)',
        type: 'benefit',
        weight: 0.20,
        unit: 'km',
      },
      {
        id: 'fuel_eff',
        name: 'Fuel Efficiency',
        type: 'benefit',
        weight: 0.15,
        unit: 'km/L or km/charge',
      },
      {
        id: 'tech',
        name: 'Technology Score',
        type: 'benefit',
        weight: 0.10,
        unit: 'points',
      },
    ];
  }

  async advanceRound(): Promise<RoundResult> {
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
      methodsUsed: this.state.selectedMethods.join(', '),
      agreementScore: this.state.agreementScore + '%',
      rankingComparison: this.compareRankings(),
      methodConsensus: this.calculateMethodConsensus(),
    };
  }

  private calculateMethodConsensus(): string {
    if (this.state.results.length < 2) return 'N/A (single method used)';

    // Check if all methods agree on top choice
    const topChoices = this.state.results.map(r => r.ranking[0]);
    const allAgree = topChoices.every(choice => choice === topChoices[0]);

    if (allAgree) {
      return `All methods agree: ${this.state.config.alternatives.find(a => a.id === topChoices[0])?.name}`;
    }

    return 'Methods disagree - sensitivity to method choice';
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      scenario: this.state.config.scenario,
      alternatives: this.state.config.alternatives,
      attributes: this.state.config.attributes,
      currentStage: this.state.currentStage,
      selectedMethods: this.state.selectedMethods,
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      results: this.state.results,
      playerRanking: this.state.playerRanking,
      agreementScore: this.state.agreementScore,
      metrics: this.state.isComplete ? this.computeMetrics() : undefined,
    };
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

