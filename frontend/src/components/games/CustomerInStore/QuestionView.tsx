import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GraphChart } from './GraphChart';

interface CurrentQuestion {
  id: number;
  scenario: string;
  inflowPattern: number[];
  outflowPattern: number[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Props {
  question: CurrentQuestion;
  questionIndex: number;
  totalQuestions: number;
  mode: 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';
  actionLoading: boolean;
  onSubmit: (answer: number, timeSpent: number, stockCalculation?: number[]) => void;
  awaitingFeedback: boolean;
}

const DIFFICULTY_BADGE: Record<CurrentQuestion['difficulty'], string> = {
  easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  hard: 'bg-red-500/15 text-red-300 border-red-500/40',
};

/**
 * Scenario-tailored wording. The engine rotates across 5 cover stories
 * (CustomerInStoreEngine.SCENARIOS) but every question is the same
 * pedagogical task — find the stock peak. Tailoring the prompt to the
 * cover story keeps the canonical Niranjan phrasing ("when are the most
 * customers in the store" / "when is the water level at its maximum")
 * instead of repeating the generic "stock" noun for all 10 questions.
 */
interface ScenarioCopy {
  inflowLabel: string;
  outflowLabel: string;
  stockNoun: string;
  initialClause: string;
  questionLine: string;
}

const SCENARIO_COPY: ScenarioCopy[] = [
  {
    // Customers entering and leaving a store
    inflowLabel: 'arrivals',
    outflowLabel: 'departures',
    stockNoun: 'customers in the store',
    initialClause: 'There are 10 customers in the store at the start.',
    questionLine: 'At which minute are there the most customers in the store?',
  },
  {
    // Water flowing into and out of a reservoir
    inflowLabel: 'water inflow',
    outflowLabel: 'water outflow',
    stockNoun: 'water level',
    initialClause: 'The reservoir starts at a level of 10 units.',
    questionLine: 'At which minute is the water level at its maximum?',
  },
  {
    // Inventory arriving and being sold
    inflowLabel: 'goods arriving',
    outflowLabel: 'goods sold',
    stockNoun: 'inventory on hand',
    initialClause: 'Inventory on hand is 10 units at the start.',
    questionLine: 'At which minute is inventory on hand at its maximum?',
  },
  {
    // Patients admitted to and discharged from a hospital
    inflowLabel: 'admissions',
    outflowLabel: 'discharges',
    stockNoun: 'patients in the hospital',
    initialClause: 'There are 10 patients in the hospital at the start.',
    questionLine: 'At which minute are there the most patients in the hospital?',
  },
  {
    // Money deposited to and withdrawn from an account
    inflowLabel: 'deposits',
    outflowLabel: 'withdrawals',
    stockNoun: 'account balance',
    initialClause: 'The account starts with a balance of 10 units.',
    questionLine: 'At which minute is the account balance at its maximum?',
  },
];

const GENERIC_COPY: ScenarioCopy = {
  inflowLabel: 'inflow',
  outflowLabel: 'outflow',
  stockNoun: 'stock',
  initialClause: 'The system starts at a stock of 10.',
  questionLine: 'At which minute is the stock at its maximum?',
};

function copyForScenario(scenario: string): ScenarioCopy {
  const s = scenario.toLowerCase();
  if (s.includes('store') || s.includes('customer')) return SCENARIO_COPY[0];
  if (s.includes('reservoir') || s.includes('water')) return SCENARIO_COPY[1];
  if (s.includes('inventory') || s.includes('warehouse') || s.includes('sold')) return SCENARIO_COPY[2];
  if (s.includes('hospital') || s.includes('patient')) return SCENARIO_COPY[3];
  if (s.includes('account') || s.includes('money') || s.includes('deposit')) return SCENARIO_COPY[4];
  return GENERIC_COPY;
}

export function QuestionView({
  question,
  questionIndex,
  totalQuestions,
  mode,
  actionLoading,
  onSubmit,
  awaitingFeedback,
}: Props) {
  const [answer, setAnswer] = useState<string>('');
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  // Reset input + timer whenever the engine moves to a new question.
  useEffect(() => {
    setAnswer('');
    setStartedAt(Date.now());
  }, [question.id, questionIndex]);

  const minuteCount = question.inflowPattern.length;
  const copy = useMemo(() => copyForScenario(question.scenario), [question.scenario]);

  const parsedAnswer = useMemo(() => {
    if (answer === '') return null;
    const n = Number(answer);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    return n;
  }, [answer]);

  const isValidAnswer =
    parsedAnswer !== null &&
    parsedAnswer >= 1 &&
    parsedAnswer <= Math.min(30, minuteCount);

  const handleSubmit = () => {
    if (!isValidAnswer || parsedAnswer === null) return;
    const timeSpent = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    onSubmit(parsedAnswer, timeSpent);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValidAnswer && !actionLoading && !awaitingFeedback) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          <h2 className="text-lg font-semibold text-white mt-1">{question.scenario}</h2>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${DIFFICULTY_BADGE[question.difficulty]}`}
        >
          {question.difficulty}
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">
        The graph shows the rate of{' '}
        <span className="text-emerald-300 font-semibold">{copy.inflowLabel}</span>
        {' '}and the rate of{' '}
        <span className="text-amber-300 font-semibold">{copy.outflowLabel}</span>{' '}
        for each minute. {copy.initialClause}{' '}
        <strong>{copy.questionLine}</strong>
      </p>

      <GraphChart inflow={question.inflowPattern} outflow={question.outflowPattern} />

      <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
        <label htmlFor="cis-answer" className="block text-sm font-medium text-slate-200 mb-2">
          Pick the minute (1 – {Math.min(30, minuteCount)})
        </label>
        <div className="flex gap-3 items-stretch">
          <input
            id="cis-answer"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.min(30, minuteCount)}
            step={1}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKey}
            disabled={actionLoading || awaitingFeedback}
            className="w-32 bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
            placeholder="—"
          />
          <button
            onClick={handleSubmit}
            disabled={!isValidAnswer || actionLoading || awaitingFeedback}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit answer
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        {parsedAnswer !== null && !isValidAnswer ? (
          <p className="text-xs text-red-300 mt-2">
            Answer must be an integer between 1 and {Math.min(30, minuteCount)}.
          </p>
        ) : null}
        {mode === 'task-decomposition' ? (
          <p className="text-xs text-slate-400 mt-3">
            Tip: build the stock table on paper. Stock(t) = Stock(t-1) + Inflow(t) − Outflow(t).
            The peak is the minute *after* which net flow turns negative.
          </p>
        ) : null}
      </div>
    </div>
  );
}
