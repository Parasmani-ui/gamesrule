import { EVGambitEngine } from '../services/gameEngines/EVGambitEngine';
import { prisma } from '../db';

jest.mock('../db', () => ({
  prisma: {
    sessionParticipant: { findMany: jest.fn() },
    sessionStateCache: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const SESSION_ID = 'test-session-evg';
const P1 = 'p1';
const P2 = 'p2';

const ALL_EVENT_IDS = [
  'event-1-government-push',
  'event-2-import-ban',
  'event-3-buyer-acquisition',
  'event-4-emission-norms',
  'event-5-tesla-coming',
];

/**
 * Build a fixture with no-op decisions and trivial quizzes so tests that
 * inspect event-only force impacts aren't polluted by decision side-effects.
 * Force deltas + state changes match the canonical events.json so the
 * fixture reproduces the spec under test.
 */
function makeNoOpContent(): any {
  const events = [
    {
      id: 'event-1-government-push',
      round: 1,
      title: 'E1',
      description: '',
      primaryForce: 'buyers',
      forceDeltas: { buyers: -10 },
    },
    {
      id: 'event-2-import-ban',
      round: 2,
      title: 'E2',
      description: '',
      primaryForce: 'suppliers',
      forceDeltas: { suppliers: 20 },
      stateChanges: { importBan: true },
    },
    {
      id: 'event-3-buyer-acquisition',
      round: 3,
      title: 'E3',
      description: '',
      primaryForce: 'buyers',
      forceDeltas: { buyers: 20 },
      stateChanges: { rexaAcquisition: true },
    },
    {
      id: 'event-4-emission-norms',
      round: 4,
      title: 'E4',
      description: '',
      primaryForce: 'rivalry',
      forceDeltas: { rivalry: -8 },
    },
    {
      id: 'event-5-tesla-coming',
      round: 5,
      title: 'E5',
      description: '',
      primaryForce: 'newEntrants',
      forceDeltas: { newEntrants: 18, rivalry: 10 },
    },
  ];
  const decisionsByEvent: any = {};
  const quizzesByEvent: any = {};
  for (const eid of ALL_EVENT_IDS) {
    decisionsByEvent[eid] = [
      {
        category: 'NoOp',
        decisions: [
          {
            id: 'noop',
            type: 'business',
            name: 'NoOp',
            cost: 0,
            expectedImpact: {},
            roundModifiers: { '1': 1.0, '2': 1.0, '3': 1.0, '4': 1.0, '5': 1.0 },
          },
        ],
      },
    ];
    quizzesByEvent[eid] = [
      {
        id: `${eid}-q1`,
        question: 'Pick',
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        correctAnswerId: 'a',
      },
    ];
  }
  return { events, decisionsByEvent, quizzesByEvent };
}

async function walkRound(engine: EVGambitEngine, opts: { decisionId?: string; answers?: string[]; participantId?: string } = {}) {
  const pid = opts.participantId ?? P1;
  await engine.applyAction(pid, { actionType: 'make-decision', decisionId: opts.decisionId ?? 'noop' });
  await engine.applyAction(pid, { actionType: 'submit-quiz', answers: opts.answers ?? ['a'] });
  await engine.applyAction(pid, { actionType: 'continue-to-next-event' });
}

describe('EVGambitEngine', () => {
  let engine: EVGambitEngine;

  beforeEach(() => {
    engine = new EVGambitEngine(SESSION_ID);
    jest.clearAllMocks();
    (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
      { id: P1, role: 'PLAYER', joined_at: new Date() },
    ]);
    (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.sessionStateCache.upsert as jest.Mock).mockResolvedValue({});
  });

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------

  describe('initialization', () => {
    it('loads the default scenario from JSON and fires event 1 on init', async () => {
      await engine.initialize({});
      const pub = engine.getPublicState();
      expect(pub.scenarioId).toBe('default');
      expect(pub.maxRounds).toBe(5);
      expect(pub.currentRound).toBe(1);
      expect(pub.currentEvent.id).toBe('event-1-government-push');
    });

    it('loads the delhi-startup alt scenario when requested', async () => {
      await engine.initialize({ scenario: 'delhi-startup' });
      const pub = engine.getPublicState();
      expect(pub.scenarioId).toBe('delhi-startup');
      expect(pub.playerCompany.cash).toBe(60000000);
    });

    it('rejects unknown scenarios with a list of known ids', async () => {
      await expect(engine.initialize({ scenario: 'does-not-exist' })).rejects.toThrow(/Unknown EV Gambit scenario/);
    });

    it('exposes 5 events generated in canonical order', async () => {
      await engine.initialize({});
      // recentEvents only contains triggered events; after init, only event 1 is triggered.
      // Use availableDecisions / currentEvent + walk through to verify ordering.
      const expectedTitles = [
        'Government Push',
        'Import Ban',
        'Buyer Acquisition',
        'Emission Norms',
        'Tesla Coming',
      ];
      const ids: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const ps = engine.getParticipantState(P1);
        expect(ps.currentEvent.title).toBe(expectedTitles[i - 1]);
        ids.push(ps.currentEvent.id);
        if (i < 5) {
          // Use canonical content's first decision so the walk succeeds
          const cats = engine.getAvailableDecisions();
          const did = cats[0].decisions[0].id;
          const ans = ps.currentQuiz.questions.map(() => ps.currentQuiz.questions[0].options[0].id);
          await engine.applyAction(P1, { actionType: 'make-decision', decisionId: did });
          await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ans });
          await engine.applyAction(P1, { actionType: 'continue-to-next-event' });
        }
      }
      expect(ids).toEqual([
        'event-1-government-push',
        'event-2-import-ban',
        'event-3-buyer-acquisition',
        'event-4-emission-norms',
        'event-5-tesla-coming',
      ]);
    });

    it('throws when no participant exists for the session', async () => {
      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([]);
      await expect(engine.initialize({})).rejects.toThrow(/No participant/);
    });
  });

  // -------------------------------------------------------------------
  // Game flow
  // -------------------------------------------------------------------

  describe('game flow', () => {
    it('walks through all 5 events with decision -> quiz -> continue and completes', async () => {
      await engine.initialize(makeNoOpContent());
      for (let r = 1; r <= 5; r++) {
        const psBefore = engine.getParticipantState(P1);
        expect(psBefore.currentRound).toBe(r);
        expect(psBefore.isComplete).toBe(false);
        await walkRound(engine);
      }
      const ps = engine.getParticipantState(P1);
      expect(ps.isComplete).toBe(true);
      expect(ps.currentRound).toBe(5); // stays at 5; isComplete signals end
      expect(ps.scores).toBeDefined();
      expect(ps.scores.totalScore).toBeGreaterThan(0);
    });

    it('marks the simulation complete after event 5 and refuses further actions', async () => {
      await engine.initialize(makeNoOpContent());
      for (let r = 0; r < 5; r++) await walkRound(engine);
      const result = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/already complete/i);
    });

    it('computes a final score that combines decision quality + quiz quality', async () => {
      await engine.initialize(makeNoOpContent());
      for (let r = 0; r < 5; r++) await walkRound(engine, { answers: ['a'] }); // all correct
      const ps = engine.getParticipantState(P1);
      // 5 decisions @ 10 base each (no expectedImpact) = 50 decision pts
      // 5 quizzes @ 100% (1/1) -> 20 pts each = 100 quiz pts
      expect(ps.scores.decisionScore).toBe(50);
      expect(ps.scores.quizScore).toBe(100);
      expect(ps.scores.totalScore).toBe(75); // (50 + 100) / 2
    });
  });

  // -------------------------------------------------------------------
  // Pedagogy correctness — force-impact spec, double-count regression, round-context
  // -------------------------------------------------------------------

  describe('pedagogy — force values match spec after each event (no double-count)', () => {
    it('event 1 (Government Push) moves buyers by exactly -10 from 65 to 55', async () => {
      await engine.initialize(makeNoOpContent());
      const ps = engine.getParticipantState(P1);
      expect(ps.fiveForces.buyers).toBe(55);
      expect(ps.fiveForces.suppliers).toBe(75);
      expect(ps.fiveForces.rivalry).toBe(70);
      expect(ps.fiveForces.newEntrants).toBe(60);
      expect(ps.fiveForces.substitutes).toBe(70);
    });

    it('event 2 (Import Ban) moves suppliers by +20 to 95 (NOT 100 from double-count)', async () => {
      await engine.initialize(makeNoOpContent());
      await walkRound(engine);
      const ps = engine.getParticipantState(P1);
      expect(ps.fiveForces.suppliers).toBe(95);
      expect(ps.suppliers.liOn.available).toBe(false);
      expect(ps.suppliers.rusloth.share).toBe(100);
    });

    it('event 3 (Buyer Acquisition) leaves buyers at 75 (55 from e1 + 20 from e3) and reshapes buyer state', async () => {
      await engine.initialize(makeNoOpContent());
      await walkRound(engine); // round 1 -> 2 (event 2 fires)
      await walkRound(engine); // round 2 -> 3 (event 3 fires)
      const ps = engine.getParticipantState(P1);
      expect(ps.fiveForces.buyers).toBe(75);
      expect(ps.buyers.rexa.acquired).toBe(true);
      expect(ps.buyers.rexa.share).toBe(80);
      expect(ps.buyers.ushuttle.share).toBe(0);
    });

    it('event 4 (Emission Norms) moves rivalry by exactly -8 from 70 to 62', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 3; i++) await walkRound(engine);
      const ps = engine.getParticipantState(P1);
      expect(ps.fiveForces.rivalry).toBe(62);
    });

    it('event 5 (Tesla Coming) adds +18 newEntrants and +10 rivalry exactly', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 4; i++) await walkRound(engine);
      const ps = engine.getParticipantState(P1);
      expect(ps.fiveForces.newEntrants).toBe(78); // 60 + 18
      expect(ps.fiveForces.rivalry).toBe(72); // 70 - 8 + 10
    });
  });

  describe('pedagogy — round-context modifies decision score', () => {
    /**
     * Inject a tiny scenario where the same decision id is offered in
     * round 1 AND round 5 with different roundModifiers. The "premature"
     * round-1 modifier (0.5) should produce a strictly lower score than
     * the "well-timed" round-5 modifier (1.5) for the same decision.
     */
    it('the same decision earns a different score in different rounds via roundModifiers', async () => {
      const events = [
        { id: 'e1', round: 1, title: 'E1', description: '', primaryForce: 'buyers', forceDeltas: {} },
        { id: 'e2', round: 2, title: 'E2', description: '', primaryForce: 'rivalry', forceDeltas: {} },
        { id: 'e3', round: 3, title: 'E3', description: '', primaryForce: 'rivalry', forceDeltas: {} },
        { id: 'e4', round: 4, title: 'E4', description: '', primaryForce: 'rivalry', forceDeltas: {} },
        { id: 'e5', round: 5, title: 'E5', description: '', primaryForce: 'rivalry', forceDeltas: {} },
      ];
      const decision = {
        id: 'tesla-jv',
        type: 'corporate',
        name: 'Tesla JV',
        cost: 0,
        // raw score = 10 + min(4, 1*2) = 12; r1 score = 12*0.5 = 6, r5 = 12*1.5 = 18 (no clamp)
        expectedImpact: { marketShare: 1 },
        // premature in round 1, well-timed in round 5
        roundModifiers: { '1': 0.5, '2': 1.0, '3': 1.0, '4': 1.0, '5': 1.5 },
      };
      const decisionsByEvent: any = {};
      const quizzesByEvent: any = {};
      for (const e of events) {
        decisionsByEvent[e.id] = [{ category: 'X', decisions: [decision] }];
        quizzesByEvent[e.id] = [
          {
            id: `${e.id}-q`,
            question: '?',
            options: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            correctAnswerId: 'a',
          },
        ];
      }

      await engine.initialize({ events: events as any, decisionsByEvent, quizzesByEvent });
      // Round 1 — pick the decision, capture its score
      const r1 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'tesla-jv' });
      const r1Score = r1.updatedState!.decisionScore;
      // walk to round 5
      await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['a'] });
      await engine.applyAction(P1, { actionType: 'continue-to-next-event' });
      for (let i = 0; i < 3; i++) await walkRound(engine, { decisionId: 'tesla-jv' });

      // Round 5 — same decision id, modifier=1.5
      const r5 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'tesla-jv' });
      const r5Score = r5.updatedState!.decisionScore;

      expect(r5Score).toBeGreaterThan(r1Score);
      // 1.5 / 0.5 = 3x ratio
      expect(r5Score / r1Score).toBeCloseTo(3.0, 1);
    });

    it('defaults roundModifier to 1.0 when not specified', async () => {
      const events = [
        { id: 'e1', round: 1, title: 'E1', description: '', primaryForce: 'buyers', forceDeltas: {} },
      ];
      const decisionsByEvent = {
        e1: [
          {
            category: 'X',
            decisions: [
              {
                id: 'no-modifier-decision',
                type: 'business' as const,
                name: 'No modifier',
                cost: 0,
                expectedImpact: { marketShare: 2 },
              },
            ],
          },
        ],
      };
      const quizzesByEvent = {
        e1: [
          {
            id: 'q1',
            question: '?',
            options: [
              { id: 'a', label: 'A' },
              { id: 'b', label: 'B' },
            ],
            correctAnswerId: 'a',
          },
        ],
      };
      await engine.initialize({
        events: events as any,
        decisionsByEvent: decisionsByEvent as any,
        quizzesByEvent,
        numRounds: 1,
      });
      const r = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'no-modifier-decision' });
      // raw = 10 + min(4, 2*2) = 14, modifier default 1.0, score = 14
      expect(r.updatedState!.decisionScore).toBeCloseTo(14, 5);
    });
  });

  // -------------------------------------------------------------------
  // Integrity — defects 1, 2, quiz validation, round-binding, single-player
  // -------------------------------------------------------------------

  describe('integrity — DEFECT 1: quiz answer-key leak in getPublicState', () => {
    it('strips correctAnswerId from getPublicState.currentQuiz', async () => {
      await engine.initialize({});
      const pub = engine.getPublicState();
      expect(pub.currentQuiz).toBeDefined();
      expect(pub.currentQuiz.questions.length).toBeGreaterThan(0);
      pub.currentQuiz.questions.forEach((q: any) => {
        expect(q.correctAnswerId).toBeUndefined();
        expect(q.correctAnswer).toBeUndefined();
      });
    });

    it('strips correctAnswerId from getParticipantState BEFORE the quiz is answered', async () => {
      await engine.initialize({});
      const ps = engine.getParticipantState(P1);
      expect(ps.currentQuiz).toBeDefined();
      ps.currentQuiz.questions.forEach((q: any) => {
        expect(q.correctAnswerId).toBeUndefined();
      });
    });

    it('reveals correctAnswerId on the active quiz AFTER the participant submits answers', async () => {
      await engine.initialize({});
      const cats = engine.getAvailableDecisions();
      const did = cats[0].decisions[0].id;
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: did });
      const psBefore = engine.getParticipantState(P1);
      const allAs = psBefore.currentQuiz.questions.map(() => 'a');
      await engine.applyAction(P1, { actionType: 'submit-quiz', answers: allAs });
      const psAfter = engine.getParticipantState(P1);
      psAfter.currentQuiz.questions.forEach((q: any) => {
        expect(q.correctAnswerId).toBeDefined();
      });
    });

    it('does NOT leak correctAnswerId for a future round even via getParticipantState', async () => {
      // After round 1 quiz is submitted, when we continue to round 2, the
      // round-2 quiz becomes active and is unanswered — its correct answers
      // must remain hidden.
      await engine.initialize(makeNoOpContent());
      await walkRound(engine); // submits + continues round 1
      const ps = engine.getParticipantState(P1);
      expect(ps.currentRound).toBe(2);
      ps.currentQuiz.questions.forEach((q: any) => {
        expect(q.correctAnswerId).toBeUndefined();
      });
    });
  });

  describe('integrity — DEFECT 2: forged decision payload', () => {
    it('rejects a decision id that is not in the canonical pool for the current event', async () => {
      await engine.initialize({});
      const r = await engine.applyAction(P1, {
        actionType: 'make-decision',
        decisionId: 'fake-totally-not-real',
      });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/not in the available pool/i);
    });

    it('rejects when decisionId is missing entirely', async () => {
      await engine.initialize({});
      const r = await engine.applyAction(P1, { actionType: 'make-decision' });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/required/i);
    });

    it('ignores client-supplied cost / expectedImpact / effects — uses content-file values', async () => {
      await engine.initialize({});
      const startingCash = engine.getParticipantState(P1).playerCompany.cash;
      const startingBrand = engine.getParticipantState(P1).playerCompany.brandValue;

      // canonical "scale-up-existing" costs 20cr (20_000_000)
      const r = await engine.applyAction(P1, {
        actionType: 'make-decision',
        decisionId: 'scale-up-existing',
        // forged inputs that should be IGNORED
        cost: -100000000,
        expectedImpact: { marketShare: 100, brandValue: 100, technology: 100, cash: 100000000 },
      });
      expect(r.success).toBe(true);

      const ps = engine.getParticipantState(P1);
      // Cash reflects canonical -20cr, not the forged refund
      expect(ps.playerCompany.cash).toBe(startingCash - 20000000);
      // Brand should not have jumped to 100; canonical impact is 0 for brandValue
      expect(ps.playerCompany.brandValue).toBe(startingBrand);
    });

    it('also accepts decision payload via legacy {decision: {id}} shape (back-compat)', async () => {
      await engine.initialize({});
      const r = await engine.applyAction(P1, {
        actionType: 'make-decision',
        decision: { id: 'scale-up-existing' },
      });
      expect(r.success).toBe(true);
    });
  });

  describe('integrity — quiz answer validation', () => {
    it("rejects answer 'd' for a 3-option question", async () => {
      const noOp = makeNoOpContent();
      // Override round-1 quiz with a 3-option question (a/b/c)
      noOp.quizzesByEvent['event-1-government-push'] = [
        {
          id: 'three-q',
          question: 'Pick',
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
            { id: 'c', label: 'C' },
          ],
          correctAnswerId: 'a',
        },
      ];
      await engine.initialize(noOp);
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      const r = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['d'] });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/not a valid option/i);
    });

    it('rejects when answers is not an array', async () => {
      await engine.initialize(makeNoOpContent());
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      const r = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: 'a' });
      expect(r.success).toBe(false);
    });

    it('rejects when answers length does not match question count', async () => {
      await engine.initialize({});
      const cats = engine.getAvailableDecisions();
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: cats[0].decisions[0].id });
      const r = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['a'] }); // canonical has 4 questions
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/Expected 4 answers/);
    });

    it('rejects non-string answer entries (numeric index)', async () => {
      await engine.initialize(makeNoOpContent());
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      const r = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: [0] as any });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/option id string/i);
    });
  });

  describe('integrity — round-binding gates', () => {
    it('rejects an action whose `round` field disagrees with the engine round (skip-ahead)', async () => {
      await engine.initialize({});
      const r = await engine.applyAction(P1, {
        actionType: 'make-decision',
        decisionId: 'scale-up-existing',
        round: 3, // engine is on round 1
      });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/targets round 3/);
    });

    it('rejects re-submitting a decision for the same round (replay)', async () => {
      await engine.initialize({});
      const cats = engine.getAvailableDecisions();
      const did = cats[0].decisions[0].id;
      const r1 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: did });
      expect(r1.success).toBe(true);
      const r2 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: did });
      expect(r2.success).toBe(false);
      expect(r2.message).toMatch(/already submitted/i);
    });

    it('rejects re-submitting a quiz for the same round', async () => {
      await engine.initialize(makeNoOpContent());
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      const r1 = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['a'] });
      expect(r1.success).toBe(true);
      const r2 = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['a'] });
      expect(r2.success).toBe(false);
      expect(r2.message).toMatch(/already submitted/i);
    });

    it('rejects continue-to-next-event before the quiz is submitted', async () => {
      await engine.initialize(makeNoOpContent());
      await engine.applyAction(P1, { actionType: 'make-decision', decisionId: 'noop' });
      const r = await engine.applyAction(P1, { actionType: 'continue-to-next-event' });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/quiz first/i);
    });

    it('rejects quiz submission before decision is submitted', async () => {
      await engine.initialize(makeNoOpContent());
      const r = await engine.applyAction(P1, { actionType: 'submit-quiz', answers: ['a'] });
      expect(r.success).toBe(false);
      expect(r.message).toMatch(/decision first/i);
    });
  });

  describe('integrity — single-player binding (per-participant state isolation)', () => {
    beforeEach(() => {
      (prisma.sessionParticipant.findMany as jest.Mock).mockResolvedValue([
        { id: P1, role: 'PLAYER', joined_at: new Date() },
        { id: P2, role: 'PLAYER', joined_at: new Date() },
      ]);
    });

    it('keeps participant states fully separate; an action by P1 does not advance P2', async () => {
      await engine.initialize(makeNoOpContent());
      // P1 advances to round 2
      await walkRound(engine, { participantId: P1 });

      const ps1 = engine.getParticipantState(P1);
      const ps2 = engine.getParticipantState(P2);
      expect(ps1.currentRound).toBe(2);
      expect(ps2.currentRound).toBe(1);
      expect(ps1.decisions.length).toBe(1);
      expect(ps2.decisions.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // Async/sync — DEFECT 5
  // -------------------------------------------------------------------

  describe('async/sync — DEFECT 5: getParticipantState.metrics is a value, not a Promise', () => {
    it('returns a plain object on completion', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 5; i++) await walkRound(engine);
      const ps = engine.getParticipantState(P1);
      expect(ps.isComplete).toBe(true);
      expect(ps.metrics).toBeDefined();
      // not a thenable
      expect(typeof (ps.metrics as any).then).not.toBe('function');
      expect(typeof ps.metrics).toBe('object');
      expect(ps.metrics.finalMarketShare).toMatch(/%$/);
    });

    it('returns undefined for metrics while in-progress', async () => {
      await engine.initialize(makeNoOpContent());
      const ps = engine.getParticipantState(P1);
      expect(ps.metrics).toBeUndefined();
    });

    it('async computeMetrics still resolves to the same shape', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 5; i++) await walkRound(engine);
      const m = await engine.computeMetrics();
      expect(m).toBeDefined();
      expect(m.finalMarketShare).toMatch(/%$/);
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  describe('edge cases', () => {
    it('round 1 with no prior state is correctly initialized', async () => {
      await engine.initialize({});
      const ps = engine.getParticipantState(P1);
      expect(ps.currentRound).toBe(1);
      expect(ps.decisions).toEqual([]);
      expect(ps.quizSubmissions).toEqual([]);
      // scores object is hidden from the view until the run completes
      expect(ps.scores).toBeUndefined();
      expect(ps.playerCompany.marketShare).toBe(5);
      expect(ps.playerCompany.cash).toBe(100000000);
    });

    it('all 5 quizzes correct -> max quiz score (100)', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 5; i++) await walkRound(engine, { answers: ['a'] });
      const ps = engine.getParticipantState(P1);
      expect(ps.scores.quizScore).toBe(100);
    });

    it('all 5 quizzes wrong -> min quiz score (0)', async () => {
      await engine.initialize(makeNoOpContent());
      for (let i = 0; i < 5; i++) await walkRound(engine, { answers: ['b'] });
      const ps = engine.getParticipantState(P1);
      expect(ps.scores.quizScore).toBe(0);
    });

    it('rejects empty / missing decisionId', async () => {
      await engine.initialize({});
      const r1 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: '' });
      expect(r1.success).toBe(false);
      const r2 = await engine.applyAction(P1, { actionType: 'make-decision', decisionId: null });
      expect(r2.success).toBe(false);
    });

    it('serialize -> deserialize: state survives a fake server-restart cycle via SessionStateCache', async () => {
      await engine.initialize(makeNoOpContent());
      // Walk through 2 rounds
      await walkRound(engine);
      await walkRound(engine);

      // Capture last upsert payload — this is what would be written to DB
      const upsertCalls = (prisma.sessionStateCache.upsert as jest.Mock).mock.calls;
      const lastCreate = upsertCalls[upsertCalls.length - 1][0].create;
      const stored = lastCreate.state_data;
      expect(stored.participantStates[P1].currentRound).toBe(3);
      expect(stored.participantStates[P1].decisions.length).toBe(2);

      // New engine instance reads this back via findUnique
      (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValueOnce({
        state_data: stored,
      });
      const engine2 = new EVGambitEngine(SESSION_ID);
      await engine2.initialize(makeNoOpContent());
      const ps = engine2.getParticipantState(P1);
      expect(ps.currentRound).toBe(3);
      expect(ps.decisions.length).toBe(2);
    });

    it('treats stale (pre-Session-6) cache shapes as invalid and starts fresh', async () => {
      // Old shape: per-participant state without `triggeredEventIds`
      (prisma.sessionStateCache.findUnique as jest.Mock).mockResolvedValueOnce({
        state_data: {
          participantStates: {
            [P1]: { currentRound: 99, decisions: [{ legacy: true }] },
          },
        },
      });
      await engine.initialize(makeNoOpContent());
      const ps = engine.getParticipantState(P1);
      expect(ps.currentRound).toBe(1);
      expect(ps.decisions.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // Round-contract no-op (mirrors HR Comp / Customer-In-Store pattern)
  // -------------------------------------------------------------------

  describe('round contract', () => {
    it('advanceRound is a benign mirror, not a state mutator', async () => {
      await engine.initialize(makeNoOpContent());
      const r1 = await engine.advanceRound();
      const r2 = await engine.advanceRound();
      expect(r1.roundNumber).toBe(1);
      expect(r1.isComplete).toBe(false);
      expect(r2.roundNumber).toBe(1); // unchanged
    });
  });
});
