import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { GameProps } from '../types';
import { socketService } from '../../../services/socket';
import { PortersForcesPanel } from './PortersForcesPanel';
import { EventBriefing } from './EventBriefing';
import { DecisionPanel } from './DecisionPanel';
import { Reflection } from './Reflection';
import { ReviewSummary } from './ReviewSummary';
import { Quiz } from './Quiz';
import { RoundComplete } from './RoundComplete';
import { FinalDebrief } from './FinalDebrief';

/**
 * EV Gambit — single-player, 5-event scripted strategy simulation.
 *
 * Engine state contract (from EVGambitEngine.getParticipantState):
 *   - currentRound: 1..5
 *   - currentEvent: { id, round, title, description, primaryForce } | null
 *   - currentQuiz: { round, eventId, questions: [{ id, question, options, correctAnswerId? }] }
 *       correctAnswerId is present ONLY for questions the participant has already answered.
 *   - availableDecisions: [{ category, decisions: [{ id, type, name, cost }] }]   (no impact)
 *   - decisions: history with { round, decisionName, category, decisionScore, outcome, ... }
 *   - quizSubmissions: history with { round, eventId, answers, correct, total, scorePercent,
 *                                     questions?: [{ id, question, options, correctAnswerId }] }
 *   - hasSubmittedDecision, hasSubmittedQuiz: per-round booleans
 *   - playerCompany, fiveForces, suppliers, buyers, industryAttractiveness
 *   - isComplete, scores, metrics
 *
 * The engine drives round/event/quiz state. Three local UI sub-phases sit on
 * top of the engine state for the pre-decision flow:
 *   briefing → decisions → reflection → review → (submit) → quiz → round-complete
 *
 * Integrity contract (Session 6 sanitization boundary):
 *   1. Quiz correctAnswerId is ONLY rendered for already-answered questions. We
 *      read it from `state.quizSubmissions[].questions[].correctAnswerId` and
 *      never fabricate or guess client-side.
 *   2. Decision submissions send ONLY decisionId. Cost / impact / effects come
 *      from the engine's decisions.json server-side.
 *   3. Per-round expected impact is intentionally NOT shown — the engine's
 *      stripQuiz / publicDecisions hide expectedImpact and roundModifiers, so
 *      no per-round score hint is exposed by the engine. We respect that.
 */

type LocalPhase = 'briefing' | 'decisions' | 'reflection' | 'review';

interface DecisionOption {
  id: string;
  type: string;
  name: string;
  cost: number;
}

export function EVGambitGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps) {
  const [localPhase, setLocalPhase] = useState<LocalPhase>('briefing');
  const [pickedDecisionId, setPickedDecisionId] = useState<string | null>(null);
  const [rationale, setRationale] = useState('');
  const [alternatives, setAlternatives] = useState('');

  const isComplete = Boolean(state?.isComplete);
  const currentRound: number = state?.currentRound ?? 1;
  const totalRounds: number = state?.maxRounds ?? 5;
  const currentEvent = state?.currentEvent ?? null;
  const fiveForces = state?.fiveForces ?? null;
  const industryAttractiveness: number = state?.industryAttractiveness ?? 0;
  const playerCompany = state?.playerCompany ?? null;
  const availableDecisions: { category: string; decisions: DecisionOption[] }[] =
    state?.availableDecisions ?? [];
  const hasSubmittedDecision: boolean = Boolean(state?.hasSubmittedDecision);
  const hasSubmittedQuiz: boolean = Boolean(state?.hasSubmittedQuiz);
  const currentQuiz = state?.currentQuiz ?? null;
  const decisionsHistory: any[] = state?.decisions ?? [];
  const quizSubmissions: any[] = state?.quizSubmissions ?? [];

  const pickedDecision: DecisionOption | null = useMemo(() => {
    if (!pickedDecisionId) return null;
    for (const cat of availableDecisions) {
      const found = cat.decisions.find(d => d.id === pickedDecisionId);
      if (found) return found;
    }
    return null;
  }, [pickedDecisionId, availableDecisions]);

  const pickedDecisionCategory: string = useMemo(() => {
    if (!pickedDecisionId) return '';
    for (const cat of availableDecisions) {
      if (cat.decisions.some(d => d.id === pickedDecisionId)) return cat.category;
    }
    return '';
  }, [pickedDecisionId, availableDecisions]);

  // Reset local phase when the engine moves to a new round.
  useEffect(() => {
    setLocalPhase('briefing');
    setPickedDecisionId(null);
    setRationale('');
    setAlternatives('');
  }, [currentRound]);

  // Subscribe locally to action_result so submission errors / round transitions
  // surface immediately. The parent dispatcher already updates state on
  // session_update; we only listen here to clear the local picked-decision
  // when the engine confirms a decision was accepted.
  useEffect(() => {
    if (!participantId) return;
    const handler = (payload: any) => {
      if (!payload?.success) return;
      if (payload.updatedState?.hasSubmittedDecision) {
        // engine accepted the decision; the round flow now belongs to the engine
      }
    };
    socketService.on('action_result', handler);
    return () => {
      socketService.off('action_result', handler);
    };
  }, [participantId]);

  const handleDecisionPick = (id: string) => {
    setPickedDecisionId(id);
    setLocalPhase('reflection');
  };

  const handleReflectionSubmit = (r: string, a: string) => {
    setRationale(r);
    setAlternatives(a);
    setLocalPhase('review');
  };

  const handleSubmitDecision = () => {
    if (!pickedDecisionId) return;
    onAction('make-decision', {
      round: currentRound,
      decisionId: pickedDecisionId,
      rationale,
      alternatives,
    });
  };

  const handleQuizSubmit = (answers: string[]) => {
    onAction('submit-quiz', { round: currentRound, answers });
  };

  const handleContinueToNext = () => {
    onAction('continue-to-next-event', { round: currentRound });
  };

  // ----- Render guards -----

  if (!state || Object.keys(state).length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading simulation…
      </div>
    );
  }

  if (isFacilitator && !participantId) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Facilitator view</h3>
          <p className="text-sm text-slate-300">
            Each learner runs an independent solo play of the EV Gambit. Track progress here and
            end the session when the cohort has finished.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Scenario</p>
              <p className="text-slate-200 font-semibold">{state.scenarioName ?? '—'}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Round</p>
              <p className="text-slate-200 font-semibold">
                {currentRound} / {totalRounds}
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Status</p>
              <p className="text-slate-200 font-semibold">
                {isComplete ? 'Completed' : 'In progress'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!participantId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">Join this session to play the EV Gambit.</p>
      </div>
    );
  }

  // ----- Main two-column layout -----

  const showFinal = isComplete && state.scores;

  if (showFinal) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <FinalDebrief
            decisions={decisionsHistory}
            quizSubmissions={quizSubmissions}
            scores={state.scores}
            metrics={state.metrics}
            fiveForces={fiveForces ?? {
              rivalry: 0,
              newEntrants: 0,
              suppliers: 0,
              buyers: 0,
              substitutes: 0,
            }}
            industryAttractiveness={industryAttractiveness}
            totalRounds={totalRounds}
          />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PortersForcesPanel
            fiveForces={fiveForces}
            industryAttractiveness={industryAttractiveness}
          />
        </div>
      </div>
    );
  }

  const lastDecision = decisionsHistory[decisionsHistory.length - 1];
  const lastQuiz = quizSubmissions[quizSubmissions.length - 1];

  let center: JSX.Element;

  if (hasSubmittedQuiz && !isComplete) {
    center = (
      <RoundComplete
        round={currentRound}
        totalRounds={totalRounds}
        decision={lastDecision && lastDecision.round === currentRound ? lastDecision : undefined}
        quiz={lastQuiz && lastQuiz.round === currentRound ? lastQuiz : undefined}
        onContinue={handleContinueToNext}
        submitting={actionLoading}
      />
    );
  } else if (hasSubmittedDecision && !hasSubmittedQuiz) {
    const questions = currentQuiz?.questions ?? [];
    center = (
      <Quiz
        questions={questions}
        round={currentRound}
        totalRounds={totalRounds}
        onSubmit={handleQuizSubmit}
        submitting={actionLoading}
      />
    );
  } else if (!currentEvent) {
    center = (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading round {currentRound}…
      </div>
    );
  } else if (localPhase === 'briefing') {
    center = (
      <EventBriefing
        event={currentEvent}
        totalRounds={totalRounds}
        onContinue={() => setLocalPhase('decisions')}
      />
    );
  } else if (localPhase === 'decisions') {
    center = (
      <DecisionPanel
        categories={availableDecisions}
        cash={playerCompany?.cash ?? 0}
        round={currentRound}
        onSelect={handleDecisionPick}
        onBack={() => setLocalPhase('briefing')}
      />
    );
  } else if (localPhase === 'reflection' && pickedDecision) {
    center = (
      <Reflection
        decision={{
          id: pickedDecision.id,
          name: pickedDecision.name,
          category: pickedDecisionCategory,
        }}
        onSubmit={handleReflectionSubmit}
        onBack={() => setLocalPhase('decisions')}
      />
    );
  } else if (localPhase === 'review' && pickedDecision) {
    center = (
      <ReviewSummary
        decision={{
          id: pickedDecision.id,
          name: pickedDecision.name,
          category: pickedDecisionCategory,
          cost: pickedDecision.cost,
        }}
        rationale={rationale}
        alternatives={alternatives}
        onContinue={handleSubmitDecision}
        onBack={() => setLocalPhase('reflection')}
        submitting={actionLoading}
      />
    );
  } else {
    center = (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Preparing round {currentRound}…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-slate-300">
              <span className="text-slate-500 mr-1.5">Round</span>
              <span className="font-semibold text-white">{currentRound}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-slate-400">{totalRounds}</span>
            </span>
            {playerCompany && (
              <>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300">
                  <span className="text-slate-500 mr-1.5">Cash</span>
                  <span className="font-semibold text-emerald-300">
                    ₹{(playerCompany.cash / 10000000).toFixed(2)} cr
                  </span>
                </span>
                <span className="text-slate-700">•</span>
                <span className="text-slate-300">
                  <span className="text-slate-500 mr-1.5">Market share</span>
                  <span className="font-semibold text-amber-300">
                    {playerCompany.marketShare.toFixed(1)}%
                  </span>
                </span>
              </>
            )}
          </div>
          <RoundProgress current={currentRound} total={totalRounds} />
        </div>

        {center}

        {actionFeedback && (
          <div
            className={`rounded-xl p-4 flex items-center gap-2 text-sm ${
              actionFeedback.type === 'error'
                ? 'bg-red-500/10 border border-red-500/40 text-red-100'
                : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
            }`}
          >
            {actionFeedback.type === 'error' ? (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{actionFeedback.message}</p>
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
        <PortersForcesPanel
          fiveForces={fiveForces}
          industryAttractiveness={industryAttractiveness}
          highlightForce={currentEvent?.primaryForce ?? null}
        />
      </div>
    </div>
  );
}

function RoundProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const round = i + 1;
        const isPast = round < current;
        const isActive = round === current;
        return (
          <span
            key={round}
            className={`w-2.5 h-2.5 rounded-full ${
              isPast ? 'bg-emerald-500' : isActive ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-slate-700'
            }`}
          />
        );
      })}
    </div>
  );
}

export default EVGambitGame;
