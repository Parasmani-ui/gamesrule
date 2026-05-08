import { useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, Loader2 } from 'lucide-react';

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

interface Props {
  questions: QuizQuestion[];
  round: number;
  totalRounds: number;
  onSubmit: (answers: string[]) => void;
  submitting: boolean;
}

export function Quiz({ questions, round, totalRounds, onSubmit, submitting }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() =>
    Array(questions.length).fill(null)
  );

  useEffect(() => {
    setIndex(0);
    setAnswers(Array(questions.length).fill(null));
  }, [round, questions.length]);

  if (questions.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400 mb-3" />
        Loading quiz…
      </div>
    );
  }

  const q = questions[index];
  const picked = answers[index];
  const isLast = index === questions.length - 1;
  const allAnswered = answers.every(a => a !== null);

  const setAnswer = (oid: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[index] = oid;
      return next;
    });
  };

  const advance = () => {
    if (picked === null) return;
    if (!isLast) {
      setIndex(i => i + 1);
    }
  };

  const submit = () => {
    if (!allAnswered) return;
    onSubmit(answers as string[]);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-7 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/40">
            <BookOpenCheck className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Round {round} of {totalRounds} · Strategic Reasoning Quiz
            </p>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Question {index + 1} of {questions.length}
            </h3>
          </div>
        </div>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`w-7 h-1.5 rounded-full transition-colors ${
                answers[i] !== null
                  ? 'bg-emerald-500'
                  : i === index
                  ? 'bg-indigo-400'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-slate-100 leading-relaxed text-base">{q.question}</p>

      <div className="space-y-2">
        {q.options.map(opt => {
          const selected = picked === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAnswer(opt.id)}
              className={`w-full text-left rounded-lg p-4 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    selected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-500 text-slate-400'
                  }`}
                >
                  {opt.id.toUpperCase()}
                </span>
                <span className="text-slate-100 leading-snug pt-0.5">{opt.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0 || submitting}
          className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit quiz
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={advance}
            disabled={picked === null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            Next question
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
