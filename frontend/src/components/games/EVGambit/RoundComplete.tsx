import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface QuizQuestionWithAnswer {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  correctAnswerId: string;
}

interface QuizSubmission {
  round: number;
  eventId: string;
  answers: string[];
  correct: number;
  total: number;
  scorePercent: number;
  questions?: QuizQuestionWithAnswer[];
}

interface DecisionRecord {
  round: number;
  decisionName: string;
  category: string;
  decisionScore: number;
  outcome: string;
}

interface Props {
  round: number;
  totalRounds: number;
  decision: DecisionRecord | undefined;
  quiz: QuizSubmission | undefined;
  onContinue: () => void;
  submitting: boolean;
}

export function RoundComplete({
  round,
  totalRounds,
  decision,
  quiz,
  onContinue,
  submitting,
}: Props) {
  const isFinalRound = round >= totalRounds;
  const decisionScore = decision?.decisionScore ?? 0;
  const quizPct = quiz?.scorePercent ?? 0;
  const quizPoints = quiz ? (quiz.correct / quiz.total) * 20 : 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          Round {round} of {totalRounds} complete
        </p>
        <h3 className="text-2xl font-bold text-white mt-1">Round results</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Decision score (round)</p>
          <p className="text-3xl font-bold text-emerald-300 mt-1">
            {decisionScore.toFixed(1)} <span className="text-base text-slate-400">/ 20</span>
          </p>
          {decision && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              {decision.decisionName} · {decision.category}
            </p>
          )}
        </div>
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Quiz score (round)</p>
          <p className="text-3xl font-bold text-indigo-300 mt-1">
            {quizPoints.toFixed(1)} <span className="text-base text-slate-400">/ 20</span>
          </p>
          {quiz && (
            <p className="text-xs text-slate-400 mt-2">
              {quiz.correct} of {quiz.total} correct ({quizPct.toFixed(0)}%)
            </p>
          )}
        </div>
      </div>

      {decision?.outcome && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-300 font-semibold mb-1">
            Outcome
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{decision.outcome}</p>
        </div>
      )}

      {quiz?.questions && quiz.questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
            Quiz review
          </p>
          {quiz.questions.map((q, i) => {
            const playerAnswer = quiz.answers[i];
            const isRight = playerAnswer === q.correctAnswerId;
            const playerLabel = q.options.find(o => o.id === playerAnswer)?.label ?? '—';
            const correctLabel = q.options.find(o => o.id === q.correctAnswerId)?.label ?? '—';
            return (
              <div
                key={q.id}
                className={`rounded-lg p-3 border ${
                  isRight ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {isRight ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="text-sm space-y-1">
                    <p className="text-slate-200">{q.question}</p>
                    <p className="text-xs text-slate-400">
                      Your answer:{' '}
                      <span className={isRight ? 'text-emerald-300' : 'text-red-300'}>
                        {playerLabel}
                      </span>
                    </p>
                    {!isRight && (
                      <p className="text-xs text-slate-400">
                        Correct: <span className="text-emerald-300">{correctLabel}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Loading…' : isFinalRound ? 'View final results' : 'Next event'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
