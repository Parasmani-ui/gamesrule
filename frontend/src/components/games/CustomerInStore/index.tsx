import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GameProps } from '../types';
import { socketService } from '../../../services/socket';
import { WarmupQuiz } from './WarmupQuiz';
import { QuestionView } from './QuestionView';
import { Feedback } from './Feedback';
import { Results } from './Results';

type Mode = 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';

interface CurrentQuestion {
  id: number;
  scenario: string;
  inflowPattern: number[];
  outflowPattern: number[];
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Customer In A Store — single-player stock-flow simulation.
 *
 * The container drives a three-phase flow:
 *   1. warmup   — local-only cognitive-reflection puzzles (`WarmupQuiz`)
 *   2. quiz     — engine-driven main quiz (`QuestionView` + `Feedback`)
 *   3. complete — `Results` view computed from engine metrics
 *
 * Local socket listeners: like FruitBeer, we subscribe to `action_result`
 * here so that per-question feedback (correct answer + bias flag) lands
 * before the parent's session reload roundtrip resolves. Without this,
 * `learning-by-doing` and `binary-feedback` modes would briefly flash
 * stale state between answer submission and the next question.
 */
export function CustomerInStoreGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps) {
  const [phase, setPhase] = useState<'warmup' | 'quiz' | 'complete'>('warmup');
  const [latestFeedback, setLatestFeedback] = useState<any>(null);
  // Track the question index whose feedback is currently displayed; clear
  // when the engine moves on to the next question.
  const [feedbackQuestionIndex, setFeedbackQuestionIndex] = useState<number | null>(null);

  const isComplete = Boolean(state?.isComplete);
  const currentQuestion = state?.currentQuestion as CurrentQuestion | null | undefined;
  const currentQuestionIndex = Number(state?.currentQuestionIndex ?? 0);
  const totalQuestions = Number(state?.totalQuestions ?? 0);
  const mode: Mode = (state?.learningGroup as Mode) ?? 'binary-feedback';
  const metrics = state?.metrics ?? null;

  // Move to results once the engine reports completion.
  useEffect(() => {
    if (isComplete) {
      setPhase('complete');
    }
  }, [isComplete]);

  // Clear stale feedback when the engine has moved past the question it
  // applied to.
  useEffect(() => {
    if (feedbackQuestionIndex !== null && currentQuestionIndex > feedbackQuestionIndex) {
      // keep feedback visible briefly until input changes; intentional
    }
  }, [currentQuestionIndex, feedbackQuestionIndex]);

  // Local listener for action_result so we can render mode-aware feedback
  // immediately, without waiting for the parent's reload + session_update.
  useEffect(() => {
    if (!participantId) return;
    if (phase !== 'quiz') return;

    const handleActionResult = (payload: any) => {
      if (!payload?.success) return;
      if (!payload.data?.feedback) return;
      setLatestFeedback({
        ...payload.data.feedback,
        playerAnswer: payload.data.feedback.playerAnswer,
      });
      // The data payload's nextQuestionIndex tells us which question this
      // feedback belongs to (the one we just answered = current - 1 after
      // the engine advances).
      const justAnswered =
        typeof payload.data.nextQuestionIndex === 'number'
          ? payload.data.nextQuestionIndex - 1
          : currentQuestionIndex;
      setFeedbackQuestionIndex(justAnswered);
    };

    socketService.on('action_result', handleActionResult);
    return () => {
      socketService.off('action_result', handleActionResult);
    };
  }, [participantId, phase, currentQuestionIndex]);

  const handleSubmit = (answer: number, timeSpent: number, stockCalculation?: number[]) => {
    onAction('submit_answer', {
      questionIndex: currentQuestionIndex,
      answer,
      timeSpent,
      stockCalculation,
    });
  };

  const handleNextQuestion = () => {
    setLatestFeedback(null);
    setFeedbackQuestionIndex(null);
  };

  const showFeedback = useMemo(() => {
    if (!latestFeedback) return false;
    if (feedbackQuestionIndex === null) return false;
    // Hide feedback once the engine has moved to a question past the one
    // we have feedback for AND the user has clicked "Next".
    return true;
  }, [latestFeedback, feedbackQuestionIndex]);

  // ------- render --------------------------------------------------------

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
            One learner is working through the stock-flow quiz at their own pace. The
            session completes when they finish all questions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Intervention
              </p>
              <p className="text-slate-200 font-semibold">{mode}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Progress</p>
              <p className="text-slate-200 font-semibold">
                {Math.min(currentQuestionIndex, totalQuestions)} / {totalQuestions}
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
        {isComplete && metrics ? <Results metrics={metrics} mode={mode} /> : null}
      </div>
    );
  }

  if (!participantId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">
          Join this session to take the stock-flow reasoning quiz.
        </p>
      </div>
    );
  }

  if (phase === 'complete' && metrics) {
    return <Results metrics={metrics} mode={mode} />;
  }

  if (phase === 'warmup') {
    return (
      <WarmupQuiz
        onComplete={() => {
          setPhase('quiz');
        }}
      />
    );
  }

  // phase === 'quiz'
  if (!currentQuestion) {
    if (isComplete) {
      // Allow the completion effect to land
      return null;
    }
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading next question…
      </div>
    );
  }

  // While feedback for the just-answered question is displayed, we hide
  // the question entry so the player isn't tempted to mash submit twice.
  const awaitingNext = showFeedback && feedbackQuestionIndex === currentQuestionIndex - 1;

  return (
    <div className="space-y-6">
      <QuestionView
        question={currentQuestion}
        questionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        mode={mode}
        actionLoading={actionLoading}
        onSubmit={handleSubmit}
        awaitingFeedback={awaitingNext}
      />

      {actionFeedback && actionFeedback.type === 'error' ? (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/40 text-red-100 text-sm">
          {actionFeedback.message}
        </div>
      ) : null}

      {showFeedback && latestFeedback ? (
        <div className="space-y-3">
          <Feedback feedback={latestFeedback} />
          {!isComplete ? (
            <div className="flex justify-end">
              <button
                onClick={handleNextQuestion}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold transition-colors"
              >
                Next question
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CustomerInStoreGame;
