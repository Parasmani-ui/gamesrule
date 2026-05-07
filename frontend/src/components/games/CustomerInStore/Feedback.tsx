import { AlertTriangle, CheckCircle2, Table2, XCircle } from 'lucide-react';

type Mode = 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';

interface StockTableRow {
  minute: number;
  inflow: number | null;
  outflow: number | null;
  netFlow: number | null;
  stock: number;
  isPeak: boolean;
}

interface FeedbackPayload {
  mode: Mode;
  isCorrect: boolean;
  correctAnswer?: number;
  usedCorrelationHeuristic?: boolean;
  stockTable?: StockTableRow[];
  keyInsight?: string;
  playerAnswer?: number;
}

interface Props {
  feedback: FeedbackPayload;
}

/**
 * Mode-aware per-question feedback. Mounted by the parent only when the
 * intervention mode is `binary-feedback` or `task-decomposition`. The
 * `learning-by-doing` mode shows nothing here — minimal feedback is the
 * point of that group.
 */
export function Feedback({ feedback }: Props) {
  if (feedback.mode === 'learning-by-doing') {
    // Pure binary acknowledgement; no leak of correct answer.
    return (
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${
          feedback.isCorrect
            ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
            : 'bg-red-500/10 border border-red-500/40 text-red-100'
        }`}
      >
        {feedback.isCorrect ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <p className="font-medium">
          {feedback.isCorrect ? 'Correct.' : 'Incorrect. Try the next question.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${
          feedback.isCorrect
            ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
            : 'bg-red-500/10 border border-red-500/40 text-red-100'
        }`}
      >
        {feedback.isCorrect ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <div className="flex-1">
          <p className="font-semibold">
            {feedback.isCorrect ? 'Correct!' : 'Incorrect.'}
          </p>
          {feedback.correctAnswer !== undefined ? (
            <p className="text-sm opacity-90">
              Stock peaked at <span className="font-mono font-semibold">minute{' '}
              {feedback.correctAnswer}</span>
              {feedback.playerAnswer !== undefined && !feedback.isCorrect ? (
                <>
                  {' '}— you picked{' '}
                  <span className="font-mono">minute {feedback.playerAnswer}</span>.
                </>
              ) : (
                '.'
              )}
            </p>
          ) : null}
        </div>
      </div>

      {feedback.usedCorrelationHeuristic ? (
        <div className="rounded-xl p-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/40 text-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Correlation heuristic detected</p>
            <p className="text-sm opacity-90">
              You picked the minute when <strong>inflow</strong> peaked. Stock peaks where
              the <em>cumulative net flow</em> is highest — typically at the inflow=outflow
              crossover, not the inflow peak.
            </p>
          </div>
        </div>
      ) : null}

      {feedback.mode === 'task-decomposition' && feedback.stockTable ? (
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-200">
              Stock-flow table
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Minute</th>
                  <th className="px-3 py-2 text-right font-medium">Inflow</th>
                  <th className="px-3 py-2 text-right font-medium">Outflow</th>
                  <th className="px-3 py-2 text-right font-medium">Net flow</th>
                  <th className="px-3 py-2 text-right font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {feedback.stockTable.map(row => (
                  <tr
                    key={row.minute}
                    className={`border-t border-slate-800 ${
                      row.isPeak ? 'bg-emerald-500/15 text-emerald-100 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono">
                      {row.minute === 0 ? 'start' : row.minute}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.inflow ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.outflow ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.netFlow === null
                        ? '—'
                        : row.netFlow >= 0
                        ? `+${row.netFlow}`
                        : `${row.netFlow}`}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.stock}
                      {row.isPeak ? ' ★' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {feedback.keyInsight ? (
            <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">Insight:</span>{' '}
              {feedback.keyInsight}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
