import fs from 'fs/promises';
import path from 'path';
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
 * Base: ₹5,00,000 (varies by scenario)
 * + Expert Selection Score (0 to ₹50,000)
 * + Attribute Weight Score (0 to ₹1,00,000)
 * + Ranking Match Score (0 to ₹3,00,000)
 * Final Package: base to base + ₹4,50,000
 *
 * CONTENT:
 * Experts, attributes, candidates, and scenario presets are externalised in
 * `services/gameEngines/data/hrCompensation/`. The active scenario is selected
 * by `config.scenario` (defaults to "default"); facilitators may also pass
 * raw `experts` / `attributes` / `candidates` arrays in the session
 * configuration to override the scenario content directly.
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

interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  baseSalary: number;
  expertSet: string;
  attributeSet: string;
  candidateSet: string;
}

interface HRCompensationConfig {
  experts: Expert[];
  attributes: Attribute[];
  candidates: Candidate[];
  baseSalary: number;
  scenarioId?: string;
  scenarioName?: string;
}

interface HRCompensationInitOptions extends Partial<HRCompensationConfig> {
  scenario?: string;
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

const DATA_DIR = path.join(__dirname, 'data', 'hrCompensation');

export class HRCompensationEngine extends BaseGameEngine {
  private state!: HRCompensationGameState;

  constructor(sessionId: string) {
    super(sessionId, 'hr-compensation');
  }

  async initialize(config: HRCompensationInitOptions = {}): Promise<void> {
    this.log('Initializing HR Compensation simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    const scenarioId = config.scenario || 'default';
    const scenario = await this.loadScenarioMeta(scenarioId);

    const experts = config.experts ?? (await this.loadContent<Expert[]>('experts.json', scenario.expertSet));
    const attributes =
      config.attributes ?? (await this.loadContent<Attribute[]>('attributes.json', scenario.attributeSet));
    const candidates =
      config.candidates ?? (await this.loadContent<Candidate[]>('candidates.json', scenario.candidateSet));

    const finalConfig: HRCompensationConfig = {
      baseSalary: config.baseSalary ?? scenario.baseSalary,
      experts,
      attributes,
      candidates,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
    };

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: finalConfig,
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
      finalCompensation: finalConfig.baseSalary,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log(`HR Compensation initialized successfully (scenario: ${scenario.id})`);
  }

  async applyAction(_participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    // Canonical contract (CLAUDE.md §5.2): action = { actionType, ...payload }.
    // HRComp uses `stage` as its sim-specific discriminator (lives at the top
    // level of the payload alongside actionType); per-stage payload fields
    // (expertIds, weights, ranking) likewise live at the top level — no
    // nested `data` wrapper.
    const { actionType: _actionType, stage, ...payload } = action || {};

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    switch (stage) {
      case 'expert-selection':
        return await this.handleExpertSelection(payload);

      case 'attribute-weighting':
        return await this.handleAttributeWeighting(payload);

      case 'candidate-ranking':
        return await this.handleCandidateRanking(payload);

      default:
        return {
          success: false,
          message: 'Invalid stage',
        };
    }
  }

  private async handleExpertSelection(data: any): Promise<ActionResult> {
    if (this.state.currentStage !== 'expert-selection') {
      return {
        success: false,
        message: `Not in expert-selection stage (current: ${this.state.currentStage})`,
      };
    }

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
    if (this.state.currentStage !== 'attribute-weighting') {
      return {
        success: false,
        message: `Not in attribute-weighting stage (current: ${this.state.currentStage})`,
      };
    }

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
    if (this.state.currentStage !== 'candidate-ranking') {
      return {
        success: false,
        message: `Not in candidate-ranking stage (current: ${this.state.currentStage})`,
      };
    }

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

  /**
   * Stage-based simulation: rounds are not used. `advanceRound` is intentionally
   * a no-op that mirrors the current `isComplete` flag so callers (the
   * `facilitator_advance_round` socket handler, lazy re-init flows) get a
   * well-formed RoundResult.
   *
   * Re: sockets/index.ts auto-advance — that branch fires only when
   * `playerDecision` row count for the next round equals the participant
   * count. This engine never writes to `playerDecision` (state lives in
   * `sessionStateCache`), so the auto-advance condition is never satisfied
   * for `hr-compensation`. No guard needed.
   *
   * The session's `max_rounds` (typically 1) is informational: enforcement
   * lives at the session/facilitator layer, not in the engine. Stage gating
   * (`isComplete` and the `currentStage` machine) is what actually prevents
   * extra actions after completion. Each stage handler additionally guards
   * `state.currentStage` so out-of-order socket actions are rejected
   * deterministically.
   */
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

    const maxFinal = this.state.config.baseSalary + 450000;
    return {
      finalCompensation: `₹${this.state.finalCompensation.toLocaleString('en-IN')}`,
      scoreBreakdown: {
        expertSelection: `₹${this.state.scores.expertSelectionScore.toLocaleString('en-IN')}`,
        attributeWeighting: `₹${this.state.scores.attributeWeightScore.toLocaleString('en-IN')}`,
        candidateRanking: `₹${this.state.scores.rankingMatchScore.toLocaleString('en-IN')}`,
      },
      percentageOfMax: ((this.state.finalCompensation / maxFinal) * 100).toFixed(2) + '%',
      expertiseLevel: this.getExpertiseLevel(),
      scenario: this.state.config.scenarioId,
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      currentStage: this.state.currentStage,
      baseSalary: this.state.config.baseSalary,
      scenarioId: this.state.config.scenarioId,
      scenarioName: this.state.config.scenarioName,
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

  getParticipantState(_participantId: string): any {
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
        optimalRanking: this.state.config.candidates.slice().sort((a, b) => a.optimalRank - b.optimalRank).map(c => c.id),
      } : undefined,
    };
  }

  // ===== HELPER METHODS =====

  private async loadScenarioMeta(scenarioId: string): Promise<ScenarioMeta> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'scenarios.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { scenarios: Record<string, ScenarioMeta>; defaultScenario: string };
    const scenario = parsed.scenarios[scenarioId];
    if (!scenario) {
      const known = Object.keys(parsed.scenarios).join(', ');
      throw new Error(`Unknown HR Compensation scenario: "${scenarioId}". Known scenarios: ${known}`);
    }
    return scenario;
  }

  private async loadContent<T>(fileName: string, setKey: string): Promise<T> {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, T>;
    const set = parsed[setKey];
    if (!set) {
      throw new Error(`Content set "${setKey}" not found in ${fileName}`);
    }
    return set;
  }

  private calculateRankCorrelation(): number {
    // Spearman's rank correlation coefficient
    const n = this.state.candidateRanking.length;

    // Get optimal ranking
    const optimalRanking = this.state.config.candidates
      .slice()
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
    const maxFinal = this.state.config.baseSalary + 450000;
    const percentage = (this.state.finalCompensation / maxFinal) * 100;

    if (percentage >= 90) return 'Expert Level ⭐⭐⭐⭐⭐';
    if (percentage >= 80) return 'Advanced ⭐⭐⭐⭐';
    if (percentage >= 70) return 'Proficient ⭐⭐⭐';
    if (percentage >= 60) return 'Intermediate ⭐⭐';
    return 'Beginner ⭐';
  }

  private async saveGameState(): Promise<void> {
    // Use sessionStateCache instead of gameState for state persistence
    // This allows the HR Compensation engine to work without needing the GameState table
    try {
      await prisma.sessionStateCache.upsert({
        where: { session_id: this.sessionId },
        update: { state_data: this.state as any },
        create: {
          session_id: this.sessionId,
          state_data: this.state as any,
        },
      });
    } catch (error) {
      // Log but don't fail - state is also kept in memory
      this.log(`Warning: Could not persist state to DB: ${error}`);
    }
  }
}
