import { Construction } from 'lucide-react';
import { GameProps } from './types';

export function Placeholder({ state, isFacilitator, participantId }: GameProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20">
          <Construction className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">UI coming soon</h2>
        <p className="text-slate-300">
          The dedicated interface for this simulation is being built. The
          backend engine is running and accepting actions; raw state below is
          provided for debugging.
        </p>
        <div className="text-left bg-slate-900/70 border border-slate-700 rounded-xl p-4 mt-6">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Role: {isFacilitator ? 'Facilitator' : participantId ? 'Participant' : 'Spectator'}
          </p>
          <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(state ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
