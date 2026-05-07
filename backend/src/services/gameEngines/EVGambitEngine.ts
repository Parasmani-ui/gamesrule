import fs from 'fs/promises';
import path from 'path';
import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * The EV Gambit: A Strategy Simulation
 * Author: Prof. Devasheesh Mathur, IMI New Delhi
 *
 * Single-player, 5-event scripted simulation grounded in Porter's Five Forces.
 * Player runs EVans through Government Push -> Import Ban -> Buyer Acquisition
 * -> Emission Norms -> Tesla Coming. Each round: an event fires, player picks
 * a canonical decision, then answers a 4-question quiz.
 *
 * Events, decisions and quizzes are externalised to
 * `services/gameEngines/data/evGambit/`. The active scenario is selected by
 * `config.scenario` (defaults to "default"). Facilitators may also pass raw
 * `events` / `decisionsByEvent` / `quizzesByEvent` overrides directly.
 */

type ForceKey = 'rivalry' | 'newEntrants' | 'suppliers' | 'buyers' | 'substitutes';

interface Company {
  name: string;
  marketShare: number;
  cash: number;
  brandValue: number;
  technology: number;
  production: number;
}

interface ImpactMap {
  marketShare?: number;
  brandValue?: number;
  technology?: number;
  production?: number;
  supplierPower?: number;
  buyerPower?: number;
  substituteThreat?: number;
  rivalry?: number;
  newEntrants?: number;
  cash?: number;
}

interface DecisionOption {
  id: string;
  type: 'business' | 'operations' | 'corporate' | 'marketing' | 'sales';
  name: string;
  cost: number;
  expectedImpact: ImpactMap;
  effects?: string[];
  roundModifiers?: Record<string, number>;
}

interface DecisionCategory {
  category: string;
  decisions: DecisionOption[];
}

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswerId: string; // server-only — see stripQuiz()
}

interface IndustryEvent {
  id: string;
  round: number;
  title: string;
  description: string;
  primaryForce: ForceKey;
  forceDeltas: Partial<Record<ForceKey, number>>;
  stateChanges?: {
    importBan?: boolean;
    rexaAcquisition?: boolean;
  };
}

interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  startingCash: number;
  numRounds: number;
  eventSet: string;
  decisionSet: string;
  quizSet: string;
}

interface EVGambitContent {
  scenarioId: string;
  scenarioName: string;
  startingCash: number;
  numRounds: number;
  competitors: Company[];
  events: IndustryEvent[];
  decisionsByEvent: Record<string, DecisionCategory[]>;
  quizzesByEvent: Record<string, QuizQuestion[]>;
}

interface EVGambitInitOptions {
  scenario?: string;
  numRounds?: number;
  startingCash?: number;
  competitors?: Company[];
  events?: IndustryEvent[];
  decisionsByEvent?: Record<string, DecisionCategory[]>;
  quizzesByEvent?: Record<string, QuizQuestion[]>;
}

interface DecisionRecord {
  round: number;
  eventId: string;
  decisionId: string;
  decisionName: string;
  category: string;
  type: string;
  cost: number;
  outcome: string;
  rationale?: string;
  alternatives?: string;
  decisionScore: number;
}

interface QuizSubmission {
  round: number;
  eventId: string;
  answers: string[];
  correct: number;
  total: number;
  scorePercent: number;
  submittedAt: Date;
}

interface ActiveQuiz {
  round: number;
  eventId: string;
  questions: QuizQuestion[];
}

interface EVGambitParticipantState {
  sessionId: string;
  participantId: string;
  currentRound: number; // 1-indexed
  triggeredEventIds: string[];
  playerCompany: Company;
  fiveForces: Record<ForceKey, number>;
  industryAttractiveness: number;
  suppliers: {
    liOn: { available: boolean; share: number };
    rusloth: { available: boolean; share: number };
    indiaMines: { available: boolean; share: number; yearsRemaining: number };
  };
  buyers: {
    rexa: { share: number; acquired: boolean };
    ushuttle: { share: number; acquired: boolean };
  };
  decisions: DecisionRecord[];
  quizSubmissions: QuizSubmission[];
  currentQuiz?: ActiveQuiz;
  hasSubmittedDecision: boolean;
  hasSubmittedQuiz: boolean;
  scores: { decisionScore: number; quizScore: number; totalScore: number };
  isComplete: boolean;
}

const DATA_DIR = path.join(__dirname, 'data', 'evGambit');

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class EVGambitEngine extends BaseGameEngine {
  private content!: EVGambitContent;
  private participantStates: Map<string, EVGambitParticipantState> = new Map();
  private activeParticipantId: string | null = null;

  constructor(sessionId: string) {
    super(sessionId, 'ev-gambit');
  }

  // =========================================================================
  // INITIALIZE
  // =========================================================================

  async initialize(options: EVGambitInitOptions = {}): Promise<void> {
    this.log('Initializing EV Gambit', options);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });
    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const scenarioId = options.scenario || 'default';
    const scenario = await this.loadScenarioMeta(scenarioId);

    const events = options.events ?? (await this.loadContent<IndustryEvent[]>('events.json', scenario.eventSet));
    const decisionsByEvent =
      options.decisionsByEvent ??
      (await this.loadContent<Record<string, DecisionCategory[]>>('decisions.json', scenario.decisionSet));
    const quizzesByEvent =
      options.quizzesByEvent ??
      (await this.loadContent<Record<string, QuizQuestion[]>>('quizzes.json', scenario.quizSet));

    this.content = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startingCash: options.startingCash ?? scenario.startingCash,
      numRounds: options.numRounds ?? scenario.numRounds ?? events.length,
      competitors: options.competitors ?? this.defaultCompetitors(),
      events,
      decisionsByEvent,
      quizzesByEvent,
    };

    // Try to restore per-participant state from cache. Old cached payloads
    // (pre-Session-6 shape) lack `triggeredEventIds`; treat those as stale
    // and fall back to fresh state.
    let restored = false;
    try {
      const cached = await prisma.sessionStateCache.findUnique({
        where: { session_id: this.sessionId },
      });
      const map = (cached?.state_data as any)?.participantStates;
      if (map && typeof map === 'object') {
        for (const [pid, st] of Object.entries(map)) {
          const candidate = st as Partial<EVGambitParticipantState>;
          if (Array.isArray(candidate.triggeredEventIds)) {
            this.participantStates.set(pid, candidate as EVGambitParticipantState);
            restored = true;
          }
        }
        if (restored) this.log(`Loaded ${this.participantStates.size} participant states from cache`);
      }
    } catch (err) {
      this.log('Cache restore failed; starting fresh', err);
    }

    for (const p of participants) {
      if (!this.participantStates.has(p.id)) {
        this.participantStates.set(p.id, this.makeFreshState(p.id));
      }
    }

    // Fire round-1 event for any participant that hasn't entered round 1 yet.
    for (const [pid, state] of this.participantStates.entries()) {
      if (state.triggeredEventIds.length === 0) {
        this.scopeTo(pid);
        this.enterCurrentRound();
      }
    }
    this.scopeTo(null);

    await this.saveGameState();
    this.isInitialized = true;
    this.log(`Initialized (scenario=${scenario.id}, participants=${this.participantStates.size})`);
  }

  private makeFreshState(participantId: string): EVGambitParticipantState {
    return {
      sessionId: this.sessionId,
      participantId,
      currentRound: 1,
      triggeredEventIds: [],
      playerCompany: {
        name: 'EVans',
        marketShare: 5,
        cash: this.content.startingCash,
        brandValue: 50,
        technology: 50,
        production: 50,
      },
      fiveForces: { rivalry: 70, newEntrants: 60, suppliers: 75, buyers: 65, substitutes: 70 },
      industryAttractiveness: 0,
      suppliers: {
        liOn: { available: true, share: 60 },
        rusloth: { available: true, share: 40 },
        indiaMines: { available: false, share: 0, yearsRemaining: 2 },
      },
      buyers: {
        rexa: { share: 50, acquired: false },
        ushuttle: { share: 30, acquired: false },
      },
      decisions: [],
      quizSubmissions: [],
      hasSubmittedDecision: false,
      hasSubmittedQuiz: false,
      scores: { decisionScore: 0, quizScore: 0, totalScore: 0 },
      isComplete: false,
    };
  }

  private scopeTo(participantId: string | null): void {
    this.activeParticipantId = participantId;
  }

  private state(): EVGambitParticipantState {
    if (!this.activeParticipantId) {
      throw new Error('EVGambitEngine: no active participant scope');
    }
    const s = this.participantStates.get(this.activeParticipantId);
    if (!s) throw new Error(`EVGambitEngine: no state for ${this.activeParticipantId}`);
    return s;
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    if (!this.participantStates.has(participantId)) {
      this.participantStates.set(participantId, this.makeFreshState(participantId));
      this.scopeTo(participantId);
      this.enterCurrentRound();
    } else {
      this.scopeTo(participantId);
    }

    const state = this.state();
    if (state.isComplete) {
      return { success: false, message: 'Simulation already complete' };
    }

    // Round-binding gate: if the client signals a target round, it must
    // match the engine's currentRound. Prevents replay / skip-ahead.
    if (action?.round !== undefined && action.round !== state.currentRound) {
      return {
        success: false,
        message: `Action targets round ${action.round}, engine is on round ${state.currentRound}`,
      };
    }

    switch (action?.actionType) {
      case 'make-decision':
        return this.handleDecisionSubmission(action);
      case 'submit-quiz':
        return this.handleQuizSubmission(action);
      case 'continue-to-next-event':
        return this.handleContinueToNextEvent();
      default:
        return { success: false, message: `Unknown action type: ${action?.actionType}` };
    }
  }

  /**
   * Fire the event for the player's current round: apply force deltas,
   * apply state-shape changes (supplier availability, buyer acquisition),
   * and load the active quiz. Single canonical place where event impacts
   * are applied — see DEFECT 3 (no double-counting).
   */
  private enterCurrentRound(): void {
    const state = this.state();
    const event = this.content.events.find(e => e.round === state.currentRound);
    if (!event) return;
    if (state.triggeredEventIds.includes(event.id)) return;

    for (const [k, dv] of Object.entries(event.forceDeltas)) {
      const key = k as ForceKey;
      state.fiveForces[key] = clamp(state.fiveForces[key] + (dv as number), 0, 100);
    }

    if (event.stateChanges?.importBan) {
      state.suppliers.liOn.available = false;
      state.suppliers.liOn.share = 0;
      if (state.suppliers.rusloth.available) state.suppliers.rusloth.share = 100;
    }
    if (event.stateChanges?.rexaAcquisition) {
      state.buyers.rexa.acquired = true;
      state.buyers.rexa.share = 80;
      state.buyers.ushuttle.acquired = true;
      state.buyers.ushuttle.share = 0;
    }

    state.industryAttractiveness = this.calcIndustryAttractiveness(state);
    state.currentQuiz = {
      round: state.currentRound,
      eventId: event.id,
      questions: this.content.quizzesByEvent[event.id] || [],
    };
    state.hasSubmittedDecision = false;
    state.hasSubmittedQuiz = false;
    state.triggeredEventIds.push(event.id);
  }

  /**
   * DEFECT 2 (integrity): forged decision payload.
   * The client supplies only `decisionId`. We look the decision up in the
   * canonical content (decisions.json) and use ENGINE-side cost / impact /
   * effects. Client-supplied cost / expectedImpact / effects fields are
   * ignored, so a tampered client cannot grant itself free score.
   */
  private async handleDecisionSubmission(action: any): Promise<ActionResult> {
    const state = this.state();

    if (state.hasSubmittedDecision) {
      return { success: false, message: 'Decision already submitted for this round' };
    }

    const decisionId: string | undefined = action.decisionId ?? action.decision?.id;
    if (!decisionId || typeof decisionId !== 'string') {
      return { success: false, message: 'Decision id is required' };
    }

    const event = this.content.events.find(e => e.round === state.currentRound);
    if (!event) {
      return { success: false, message: `No event for round ${state.currentRound}` };
    }

    const categories = this.content.decisionsByEvent[event.id] || [];
    let canonical: DecisionOption | null = null;
    let category = '';
    for (const cat of categories) {
      const found = cat.decisions.find(d => d.id === decisionId);
      if (found) {
        canonical = found;
        category = cat.category;
        break;
      }
    }
    if (!canonical) {
      return {
        success: false,
        message: `Decision "${decisionId}" is not in the available pool for event "${event.id}"`,
      };
    }

    if (canonical.cost > 0 && state.playerCompany.cash < canonical.cost) {
      return { success: false, message: 'Insufficient funds for this decision' };
    }

    state.playerCompany.cash -= canonical.cost;
    const outcome = this.applyDecisionImpact(canonical);
    const decisionScore = this.calculateDecisionScore(canonical, state.currentRound, event);

    state.decisions.push({
      round: state.currentRound,
      eventId: event.id,
      decisionId: canonical.id,
      decisionName: canonical.name,
      category,
      type: canonical.type,
      cost: canonical.cost,
      outcome,
      rationale: typeof action.rationale === 'string' ? action.rationale : undefined,
      alternatives: typeof action.alternatives === 'string' ? action.alternatives : undefined,
      decisionScore,
    });
    state.scores.decisionScore = clamp(state.scores.decisionScore + decisionScore, 0, 100);
    state.hasSubmittedDecision = true;
    state.industryAttractiveness = this.calcIndustryAttractiveness(state);

    await this.saveGameState();

    return {
      success: true,
      message: `Decision "${canonical.name}" submitted. Please answer the quiz.`,
      updatedState: {
        outcome,
        cash: state.playerCompany.cash,
        marketShare: state.playerCompany.marketShare,
        industryAttractiveness: state.industryAttractiveness,
        hasSubmittedDecision: true,
        decisionScore,
      },
    };
  }

  private async handleQuizSubmission(action: any): Promise<ActionResult> {
    const state = this.state();
    if (!state.hasSubmittedDecision) {
      return { success: false, message: 'Please submit a decision first' };
    }
    if (state.hasSubmittedQuiz) {
      return { success: false, message: 'Quiz already submitted for this round' };
    }
    const quiz = state.currentQuiz;
    if (!quiz) {
      return { success: false, message: 'No active quiz' };
    }

    const answers = action.answers;
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return {
        success: false,
        message: `Expected ${quiz.questions.length} answers, got ${
          Array.isArray(answers) ? answers.length : 'non-array'
        }`,
      };
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const ans = answers[i];
      if (typeof ans !== 'string') {
        return { success: false, message: `Answer ${i + 1} must be an option id string` };
      }
      if (!q.options.some(o => o.id === ans)) {
        return { success: false, message: `Answer ${i + 1} ("${ans}") is not a valid option for this question` };
      }
    }

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerId) correct++;
    });
    const total = quiz.questions.length;
    const percent = (correct / total) * 100;
    const roundQuizScore = (correct / total) * 20; // 20 pts/round * 5 rounds = 100 max

    state.quizSubmissions.push({
      round: state.currentRound,
      eventId: quiz.eventId,
      answers,
      correct,
      total,
      scorePercent: percent,
      submittedAt: new Date(),
    });
    state.scores.quizScore = clamp(state.scores.quizScore + roundQuizScore, 0, 100);
    state.hasSubmittedQuiz = true;

    await this.saveGameState();

    return {
      success: true,
      message: `Quiz submitted: ${correct}/${total} correct (${percent.toFixed(1)}%)`,
      updatedState: {
        correct,
        total,
        percent,
        hasSubmittedQuiz: true,
        showContinueButton: !state.isComplete,
      },
    };
  }

  private async handleContinueToNextEvent(): Promise<ActionResult> {
    const state = this.state();
    if (!state.hasSubmittedQuiz) {
      return { success: false, message: 'Please submit the quiz first' };
    }

    if (state.currentRound >= this.content.numRounds) {
      state.isComplete = true;
      this.simulateCompetitorActions(state);
      state.scores.totalScore = clamp((state.scores.decisionScore + state.scores.quizScore) / 2, 0, 100);
      await this.saveGameState();
      return {
        success: true,
        message: 'Simulation complete!',
        updatedState: {
          isComplete: true,
          currentRound: state.currentRound,
          scores: state.scores,
        },
      };
    }

    this.simulateCompetitorActions(state);
    state.currentRound++;
    state.currentQuiz = undefined;
    this.enterCurrentRound();
    await this.saveGameState();

    return {
      success: true,
      message: `Advanced to round ${state.currentRound}`,
      updatedState: {
        currentRound: state.currentRound,
        hasSubmittedDecision: false,
        hasSubmittedQuiz: false,
        showContinueButton: false,
      },
    };
  }

  /**
   * DEFECT 4 (correctness): scoring rubric must consider round + event.
   * Each decision option carries a `roundModifiers` map keyed by the round
   * number; the score is multiplied by that modifier (default 1.0).
   *
   * This is the "timing matters" pedagogical hook: picking
   * "Reach out to Tesla for a possible JV" in round 1 (Tesla 5 years out)
   * scores lower (0.7x) than picking the same kind of decision in round 5
   * (Tesla arriving). Without this hook, students could chase positive
   * impact numbers regardless of strategic context.
   */
  private calculateDecisionScore(decision: DecisionOption, round: number, _event: IndustryEvent): number {
    let positive = 0;
    const ei = decision.expectedImpact;
    if (ei.marketShare && ei.marketShare > 0) positive += Math.min(4, ei.marketShare * 2);
    if (ei.brandValue && ei.brandValue > 0) positive += Math.min(3, ei.brandValue * 1.5);
    if (ei.technology && ei.technology > 0) positive += Math.min(3, ei.technology * 1.5);
    if (ei.marketShare && ei.marketShare < 0) positive -= Math.abs(ei.marketShare * 2);

    const raw = clamp(10 + clamp(positive, 0, 10), 0, 20);
    const modifier = decision.roundModifiers?.[String(round)] ?? 1.0;
    return clamp(raw * modifier, 0, 20);
  }

  private applyDecisionImpact(decision: DecisionOption): string {
    const state = this.state();
    const parts: string[] = [];
    const ei = decision.expectedImpact;

    const applyCompany = (key: keyof Company, delta: number, label: string) => {
      const cur = state.playerCompany[key] as number;
      (state.playerCompany[key] as any) = clamp(cur + delta, 0, 100);
      const sign = delta >= 0 ? 'increased' : 'decreased';
      parts.push(`${label} ${sign} by ${Math.abs(delta).toFixed(2)}`);
    };

    if (ei.marketShare !== undefined) applyCompany('marketShare', ei.marketShare, 'Market share');
    if (ei.brandValue !== undefined) applyCompany('brandValue', ei.brandValue, 'Brand value');
    if (ei.technology !== undefined) applyCompany('technology', ei.technology, 'Technology');
    if (ei.production !== undefined) applyCompany('production', ei.production, 'Production capacity');

    const applyForce = (key: ForceKey, delta: number, label: string) => {
      state.fiveForces[key] = clamp(state.fiveForces[key] + delta, 0, 100);
      const sign = delta >= 0 ? 'increased' : 'decreased';
      parts.push(`${label} ${sign} by ${Math.abs(delta).toFixed(2)} pts`);
    };

    if (ei.supplierPower !== undefined) applyForce('suppliers', ei.supplierPower, 'Supplier power');
    if (ei.buyerPower !== undefined) applyForce('buyers', ei.buyerPower, 'Buyer power');
    if (ei.substituteThreat !== undefined) applyForce('substitutes', ei.substituteThreat, 'Substitute threat');
    if (ei.rivalry !== undefined) applyForce('rivalry', ei.rivalry, 'Competitive rivalry');
    if (ei.newEntrants !== undefined) applyForce('newEntrants', ei.newEntrants, 'New entrant threat');

    if (ei.cash !== undefined) {
      state.playerCompany.cash += ei.cash;
      const sign = ei.cash >= 0 ? 'increased' : 'decreased';
      parts.push(`Cash ${sign} by ₹${(Math.abs(ei.cash) / 10000000).toFixed(2)} cr`);
    }

    for (const eff of decision.effects ?? []) {
      if (eff === 'expedite-india-mines') {
        state.suppliers.indiaMines.yearsRemaining = Math.max(
          0,
          state.suppliers.indiaMines.yearsRemaining - 1
        );
        if (state.suppliers.indiaMines.yearsRemaining === 0) {
          state.suppliers.indiaMines.available = true;
          state.suppliers.indiaMines.share = 30;
          parts.push('India Mines is now available for battery supply');
        }
      }
    }

    return parts.length ? parts.join('. ') + '.' : '';
  }

  private simulateCompetitorActions(state: EVGambitParticipantState): void {
    for (const c of this.content.competitors) {
      c.marketShare = clamp(c.marketShare + (Math.random() - 0.5) * 2, 0, 100);
    }
    const total =
      state.playerCompany.marketShare + this.content.competitors.reduce((s, c) => s + c.marketShare, 0);
    if (total > 0 && Math.abs(total - 100) > 0.001) {
      const k = 100 / total;
      state.playerCompany.marketShare = clamp(state.playerCompany.marketShare * k, 0, 100);
      this.content.competitors.forEach(c => (c.marketShare = clamp(c.marketShare * k, 0, 100)));
    }
  }

  private calcIndustryAttractiveness(state: EVGambitParticipantState): number {
    const f = state.fiveForces;
    return 100 - (f.rivalry + f.newEntrants + f.suppliers + f.buyers + f.substitutes) / 5;
  }

  // =========================================================================
  // STATE VIEWS
  //
  // SECURITY-CRITICAL SANITIZATION BOUNDARY
  // ---------------------------------------
  // Quiz `correctAnswerId` and decision `expectedImpact` numerics live only
  // in the engine. Anything returned to the client must pass through
  // `stripQuiz` and `publicDecisions` (or include the explicit reveal logic
  // in `getParticipantState`). A non-UI socket client reading any
  // session_update payload must not be able to recover the answer key.
  // =========================================================================

  private stripQuiz(quiz: ActiveQuiz | undefined): any {
    if (!quiz) return undefined;
    return {
      round: quiz.round,
      eventId: quiz.eventId,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        // correctAnswerId DELIBERATELY OMITTED
      })),
    };
  }

  private publicDecisions(eventId: string): { category: string; decisions: any[] }[] {
    const cats = this.content.decisionsByEvent[eventId] || [];
    return cats.map(c => ({
      category: c.category,
      decisions: c.decisions.map(d => ({
        id: d.id,
        type: d.type,
        name: d.name,
        cost: d.cost,
        // expectedImpact / roundModifiers / effects DELIBERATELY OMITTED
      })),
    }));
  }

  private publicEvent(e: IndustryEvent): any {
    return {
      id: e.id,
      round: e.round,
      title: e.title,
      description: e.description,
      primaryForce: e.primaryForce,
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;
    const anyState = this.participantStates.values().next().value;

    const baseline = {
      maxRounds: this.content.numRounds,
      scenarioId: this.content.scenarioId,
      scenarioName: this.content.scenarioName,
      simulationSlug: this.simulationSlug,
    };

    if (!anyState) {
      return { ...baseline, currentRound: 0, isComplete: false };
    }

    const event = this.content.events.find(e => e.round === anyState.currentRound) || null;
    return {
      ...baseline,
      currentRound: anyState.currentRound,
      playerCompany: anyState.playerCompany,
      competitors: this.content.competitors.filter(c => c.marketShare > 0 || c.name === 'Tesla Motors'),
      fiveForces: anyState.fiveForces,
      industryAttractiveness: anyState.industryAttractiveness,
      currentEvent: event ? this.publicEvent(event) : null,
      recentEvents: anyState.triggeredEventIds
        .map(id => this.content.events.find(ev => ev.id === id))
        .filter((e): e is IndustryEvent => Boolean(e))
        .map(e => this.publicEvent(e)),
      currentQuiz: this.stripQuiz(anyState.currentQuiz),
      availableDecisions: event ? this.publicDecisions(event.id) : [],
      suppliers: anyState.suppliers,
      buyers: anyState.buyers,
      isComplete: false,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    if (!this.participantStates.has(participantId)) {
      this.participantStates.set(participantId, this.makeFreshState(participantId));
      this.scopeTo(participantId);
      this.enterCurrentRound();
      this.scopeTo(null);
      this.saveGameState().catch(err => this.log('saveGameState failed', err));
    }

    const state = this.participantStates.get(participantId)!;
    const event = this.content.events.find(e => e.round === state.currentRound) || null;

    // DEFECT 1 reveal logic: include correctAnswerId on the active quiz
    // ONLY if the participant has already submitted answers for that quiz.
    // Same answers also surface in the historical quizSubmissions view
    // below (joined with correct ids by event id).
    const activeQuiz = state.currentQuiz;
    let activeQuizView: any;
    if (activeQuiz) {
      const alreadySubmittedThis = state.quizSubmissions.some(
        q => q.eventId === activeQuiz.eventId && q.round === activeQuiz.round
      );
      activeQuizView = alreadySubmittedThis
        ? {
            round: activeQuiz.round,
            eventId: activeQuiz.eventId,
            questions: activeQuiz.questions.map(q => ({
              id: q.id,
              question: q.question,
              options: q.options,
              correctAnswerId: q.correctAnswerId,
            })),
          }
        : this.stripQuiz(activeQuiz);
    }

    // Historical quiz submissions: enrich with the correct answer ids so
    // the UI can render "you picked B, correct was D" feedback. Safe
    // because the participant has already submitted these answers.
    const enrichedSubmissions = state.quizSubmissions.map(sub => ({
      ...sub,
      questions: (this.content.quizzesByEvent[sub.eventId] || []).map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswerId: q.correctAnswerId,
      })),
    }));

    return {
      ...this.getPublicState(),
      participantId,
      currentRound: state.currentRound,
      currentEvent: event ? this.publicEvent(event) : null,
      decisions: state.decisions,
      quizSubmissions: enrichedSubmissions,
      currentQuiz: activeQuizView,
      availableDecisions: event ? this.publicDecisions(event.id) : [],
      hasSubmittedDecision: state.hasSubmittedDecision,
      hasSubmittedQuiz: state.hasSubmittedQuiz,
      hasPlacedDecision: state.hasSubmittedDecision,
      showContinueButton: !state.isComplete && state.hasSubmittedQuiz,
      playerCompany: state.playerCompany,
      fiveForces: state.fiveForces,
      industryAttractiveness: state.industryAttractiveness,
      suppliers: state.suppliers,
      buyers: state.buyers,
      isComplete: state.isComplete,
      scores: state.isComplete ? state.scores : undefined,
      // DEFECT 5 fix: synchronous computation — `metrics` is the resolved
      // object, not a Promise. The async `computeMetrics` wrapper exists
      // for the BaseGameEngine contract.
      metrics: state.isComplete ? this.computeMetricsSyncFor(state) : undefined,
    };
  }

  // =========================================================================
  // METRICS
  // =========================================================================

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();
    const anyState = this.participantStates.values().next().value;
    if (!anyState) return {};
    return this.computeMetricsSyncFor(anyState);
  }

  private computeMetricsSyncFor(state: EVGambitParticipantState): any {
    const marketShareGrowth = state.playerCompany.marketShare - 5;
    return {
      finalMarketShare: state.playerCompany.marketShare.toFixed(2) + '%',
      marketShareGrowth: marketShareGrowth.toFixed(2) + '%',
      brandValue: state.playerCompany.brandValue.toFixed(0),
      technology: state.playerCompany.technology.toFixed(0),
      production: state.playerCompany.production.toFixed(0),
      cashRemaining: `₹${(state.playerCompany.cash / 10000000).toFixed(2)} cr`,
      competitivePosition: this.competitivePosition(state.playerCompany.marketShare),
      industryAttractiveness: state.industryAttractiveness.toFixed(0),
      decisionsCount: state.decisions.length,
      evMarketShare: (state.playerCompany.marketShare * 7).toFixed(2) + '%',
      scenario: this.content.scenarioId,
    };
  }

  // =========================================================================
  // ROUND CONTRACT
  // EV Gambit progresses by player action (decision -> quiz -> continue),
  // not by an external `advanceRound`. The contract still requires this
  // method; mirror state without mutating it.
  // =========================================================================

  async advanceRound(): Promise<RoundResult> {
    this.ensureInitialized();
    const anyState = this.participantStates.values().next().value;
    return {
      roundNumber: anyState ? anyState.currentRound : 0,
      summary: { message: 'EV Gambit advances by player action; advanceRound is a no-op' },
      participantResults: new Map(),
      isGameComplete: anyState ? anyState.isComplete : false,
      isComplete: anyState ? anyState.isComplete : false,
    };
  }

  // =========================================================================
  // PUBLIC HELPERS
  // =========================================================================

  getAvailableDecisions(): { category: string; decisions: DecisionOption[] }[] {
    if (!this.isInitialized) return [];
    const anyState = this.participantStates.values().next().value;
    if (!anyState) return [];
    const event = this.content.events.find(e => e.round === anyState.currentRound);
    if (!event) return [];
    return this.content.decisionsByEvent[event.id] || [];
  }

  getAllParticipantsState(): any {
    if (!this.isInitialized) return null;
    const summary = Array.from(this.participantStates.entries()).map(([pid, st]) => ({
      participantId: pid,
      currentRound: st.currentRound,
      isComplete: st.isComplete,
      decisionScore: st.scores.decisionScore,
      quizScore: st.scores.quizScore,
      totalScore: st.scores.totalScore,
      decisionsCount: st.decisions.length,
      quizzesCount: st.quizSubmissions.length,
    }));
    return {
      maxRounds: this.content.numRounds,
      scenarioId: this.content.scenarioId,
      participants: summary,
    };
  }

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  private competitivePosition(marketShare: number): string {
    if (marketShare >= 15) return 'Market Leader 👑';
    if (marketShare >= 10) return 'Strong Challenger 🚀';
    if (marketShare >= 5) return 'Holding Ground ⚖️';
    if (marketShare >= 3) return 'Struggling 📉';
    return 'Losing Ground 🔻';
  }

  private defaultCompetitors(): Company[] {
    return [
      { name: 'Electrify Inc.', marketShare: 12, cash: 500000000, brandValue: 75, technology: 70, production: 80 },
      { name: 'Tesla Motors', marketShare: 0, cash: 1000000000, brandValue: 90, technology: 95, production: 70 },
      { name: 'Other Competitors', marketShare: 83, cash: 200000000, brandValue: 60, technology: 55, production: 70 },
    ];
  }

  private async loadScenarioMeta(scenarioId: string): Promise<ScenarioMeta> {
    const raw = await fs.readFile(path.join(DATA_DIR, 'scenarios.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { scenarios: Record<string, ScenarioMeta>; defaultScenario: string };
    const scenario = parsed.scenarios[scenarioId];
    if (!scenario) {
      const known = Object.keys(parsed.scenarios).join(', ');
      throw new Error(`Unknown EV Gambit scenario: "${scenarioId}". Known scenarios: ${known}`);
    }
    return scenario;
  }

  private async loadContent<T>(fileName: string, setKey: string): Promise<T> {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, T>;
    const set = parsed[setKey];
    if (set === undefined) {
      throw new Error(`Content set "${setKey}" not found in ${fileName}`);
    }
    return set;
  }

  private async saveGameState(): Promise<void> {
    try {
      const obj: Record<string, EVGambitParticipantState> = {};
      this.participantStates.forEach((s, pid) => (obj[pid] = s));
      await prisma.sessionStateCache.upsert({
        where: { session_id: this.sessionId },
        update: { state_data: { participantStates: obj } as any, updated_at: new Date() },
        create: { session_id: this.sessionId, state_data: { participantStates: obj } as any },
      });
    } catch (err) {
      this.log('Warning: could not persist state', err);
    }
  }
}
