import { ArrowRight, Newspaper } from 'lucide-react';

type ForceKey = 'rivalry' | 'newEntrants' | 'suppliers' | 'buyers' | 'substitutes';

interface CurrentEvent {
  id: string;
  round: number;
  title: string;
  description: string;
  primaryForce: ForceKey;
}

interface Props {
  event: CurrentEvent;
  totalRounds: number;
  onContinue: () => void;
}

const FORCE_LABEL: Record<ForceKey, string> = {
  rivalry: 'Competitive Rivalry',
  newEntrants: 'Threat of New Entrants',
  suppliers: 'Supplier Power',
  buyers: 'Buyer Power',
  substitutes: 'Threat of Substitutes',
};

export function EventBriefing({ event, totalRounds, onContinue }: Props) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40">
            <Newspaper className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Round {event.round} of {totalRounds} — Industry Event
            </p>
            <h2 className="text-2xl font-bold text-white mt-0.5">{event.title}</h2>
          </div>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 font-semibold">
          Affects: {FORCE_LABEL[event.primaryForce]}
        </span>
      </div>

      <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-5">
        <p className="text-slate-200 leading-relaxed">{event.description}</p>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm text-slate-300">
        <p className="font-semibold text-emerald-200 mb-1">As CEO of EVans, you must respond.</p>
        <p>
          You will pick one decision per category (Business / Operations / Corporate / Marketing /
          Sales — depending on the event), explain your rationale, then answer a 4-question quiz
          on the strategic implications.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors"
        >
          Continue to decisions
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
