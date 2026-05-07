import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';

interface WarmupItem {
  id: string;
  prompt: string;
  hint: string;
  /**
   * The "correct" answer is illustrative only — these warm-ups are
   * cognitive-reflection priming, not graded. The engine never sees them.
   * Acceptance is forgiving: any non-empty answer counts as attempted.
   */
  exampleAnswer: string;
}

const PUZZLES: WarmupItem[] = [
  {
    id: 'water-barrel',
    prompt:
      'A water barrel is filling at 4 litres per minute. It also drains at 6 litres per minute. After 10 minutes, by how many litres has the water level changed?',
    hint: 'Compute net flow per minute first, then multiply by time.',
    exampleAnswer: 'Down by 20 litres (net = -2 L/min × 10 min)',
  },
  {
    id: 'marks-rank',
    prompt:
      "In a class of 30 students, Asha's marks improved this term while she fell from rank 5 to rank 8. What can you infer about her classmates?",
    hint: 'Rank is relative; marks are absolute. Both can move independently.',
    exampleAnswer: "At least three classmates improved more than Asha did.",
  },
  {
    id: 'pig-trade',
    prompt:
      'A trader buys a pig for ₹600, sells it for ₹700, buys it back for ₹800, and finally sells it for ₹900. What is the trader\'s net profit?',
    hint: 'Track each transaction\'s gain or loss separately, then sum.',
    exampleAnswer: '₹200 profit (₹100 + ₹100; the back-and-forth doesn\'t change the math).',
  },
  {
    id: 'stock-investment',
    prompt:
      'A stock\'s price rises 50% on Monday and falls 50% on Tuesday. Is the stock back to its starting price, higher, or lower?',
    hint: 'A 50% drop from a higher base is a larger absolute fall than a 50% rise from the lower base.',
    exampleAnswer: '25% lower than the starting price (e.g. ₹100 → ₹150 → ₹75).',
  },
];

interface Props {
  onComplete: () => void;
}

export function WarmupQuiz({ onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);

  const item = PUZZLES[currentIdx];
  const isLast = currentIdx === PUZZLES.length - 1;
  const progress = useMemo(
    () => Math.round(((currentIdx + (revealed ? 1 : 0)) / PUZZLES.length) * 100),
    [currentIdx, revealed]
  );

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setResponses(prev => [...prev, answer.trim()]);
    setRevealed(true);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setCurrentIdx(idx => idx + 1);
    setAnswer('');
    setRevealed(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Warm-up · Cognitive Reflection</h2>
        </div>
        <p className="text-sm text-slate-300">
          A few short puzzles before the main quiz. These are not graded — they're priming
          exercises to slow you down and surface the kind of "fast-but-wrong" thinking the
          main test is designed to expose.
        </p>
        <div className="mt-4 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Puzzle {currentIdx + 1} of {PUZZLES.length}
        </p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-2 flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-base text-slate-100 leading-relaxed">{item.prompt}</p>
          </div>
        </div>

        <div>
          <label
            htmlFor="warmup-answer"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Your answer
          </label>
          <textarea
            id="warmup-answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={revealed}
            rows={2}
            className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
            placeholder="Type your reasoning…"
          />
        </div>

        {revealed ? (
          <div className="bg-slate-900/60 border border-emerald-500/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold text-sm">Worked example</span>
            </div>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">Hint:</span> {item.hint}
            </p>
            <p className="text-sm text-slate-200">
              <span className="text-slate-400">A typical correct answer:</span>{' '}
              {item.exampleAnswer}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          {!revealed ? (
            <button
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              Reveal worked example
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition-colors"
            >
              {isLast ? 'Start main quiz' : 'Next puzzle'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {responses.length > 0 ? (
        <div className="text-xs text-slate-500 text-center">
          {responses.length} of {PUZZLES.length} warm-up puzzle
          {responses.length === 1 ? '' : 's'} answered.
        </div>
      ) : null}
    </div>
  );
}
