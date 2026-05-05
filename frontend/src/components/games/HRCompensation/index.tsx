import { CheckCircle, XCircle } from 'lucide-react';
import { GameProps } from '../types';
import { ExpertSelection } from './ExpertSelection';
import { AttributeWeighting } from './AttributeWeighting';
import { CandidateRanking } from './CandidateRanking';
import { Results } from './Results';

type Stage = 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete';

const STAGE_TITLES: Record<Stage, string> = {
  'expert-selection': 'Stage 1 · Select Experts',
  'attribute-weighting': 'Stage 2 · Weight Attributes',
  'candidate-ranking': 'Stage 3 · Rank Candidates',
  complete: 'Simulation Complete',
};

const STAGE_ORDER: Stage[] = ['expert-selection', 'attribute-weighting', 'candidate-ranking'];

export function HRCompensationGame({
  participantId,
  state,
  onAction,
  isFacilitator,
  actionLoading,
  actionFeedback,
}: GameProps) {
  if (!state) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-300">
        Loading simulation state…
      </div>
    );
  }

  const currentStage: Stage = state.currentStage ?? 'expert-selection';
  const isComplete = Boolean(state.isComplete);

  const experts = state.experts ?? [];
  const attributes = state.attributes ?? [];
  const candidates = state.candidates ?? [];
  const selectedExperts: string[] = state.selectedExperts ?? [];
  const attributeWeights: { [key: string]: number } = state.attributeWeights ?? {};
  const candidateRanking: string[] = state.candidateRanking ?? [];

  if (isFacilitator && !participantId) {
    return (
      <FacilitatorView
        currentStage={currentStage}
        isComplete={isComplete}
        scenarioName={state.scenarioName}
        baseSalary={state.baseSalary}
      />
    );
  }

  if (!participantId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
        <p className="font-semibold mb-1">Spectator mode</p>
        <p className="text-sm">
          Join this session to participate in the HR Compensation simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StageProgress currentStage={currentStage} isComplete={isComplete} />

      {!isComplete && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-white text-center">
              {STAGE_TITLES[currentStage]}
            </h2>

            {currentStage === 'expert-selection' && (
              <ExpertSelection
                experts={experts}
                selectedExperts={selectedExperts}
                onSubmit={expertIds =>
                  onAction('select_experts', {
                    stage: 'expert-selection',
                    data: { expertIds },
                  })
                }
                actionLoading={actionLoading}
              />
            )}

            {currentStage === 'attribute-weighting' && (
              <AttributeWeighting
                attributes={attributes}
                currentWeights={attributeWeights}
                onSubmit={weights =>
                  onAction('set_weights', {
                    stage: 'attribute-weighting',
                    data: { weights },
                  })
                }
                actionLoading={actionLoading}
              />
            )}

            {currentStage === 'candidate-ranking' && (
              <CandidateRanking
                candidates={candidates}
                attributes={attributes}
                weights={attributeWeights}
                currentRanking={candidateRanking}
                onSubmit={ranking =>
                  onAction('submit_ranking', {
                    stage: 'candidate-ranking',
                    data: { ranking },
                  })
                }
                actionLoading={actionLoading}
              />
            )}

            {actionFeedback && (
              <div
                className={`mt-6 rounded-xl p-4 flex items-center gap-2 ${
                  actionFeedback.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/40 text-red-100'
                    : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
                }`}
              >
                {actionFeedback.type === 'error' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <p>{actionFeedback.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isComplete && (
        <Results
          finalCompensation={state.finalCompensation ?? state.baseSalary ?? 0}
          baseSalary={state.baseSalary ?? 0}
          scores={
            state.scores ?? {
              expertSelectionScore: 0,
              attributeWeightScore: 0,
              rankingMatchScore: 0,
              totalScore: 0,
            }
          }
          experts={experts}
          attributes={attributes}
          candidates={candidates}
          selectedExperts={selectedExperts}
          attributeWeights={attributeWeights}
          candidateRanking={candidateRanking}
          optimalValues={state.optimalValues}
          expertiseLevel={state.metrics?.expertiseLevel}
        />
      )}
    </div>
  );
}

function StageProgress({
  currentStage,
  isComplete,
}: {
  currentStage: Stage;
  isComplete: boolean;
}) {
  const currentIndex = isComplete ? STAGE_ORDER.length : STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        {STAGE_ORDER.map((stage, idx) => {
          const isPast = idx < currentIndex;
          const isActive = idx === currentIndex && !isComplete;
          return (
            <div key={stage} className="flex-1 flex items-center">
              <div className="flex items-center gap-3 flex-1">
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                    isPast
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isPast ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </span>
                <span
                  className={`text-sm hidden md:inline ${
                    isActive ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {STAGE_TITLES[stage].split(' · ')[1]}
                </span>
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={`h-px flex-1 mx-2 ${
                    isPast ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FacilitatorView({
  currentStage,
  isComplete,
  scenarioName,
  baseSalary,
}: {
  currentStage: Stage;
  isComplete: boolean;
  scenarioName?: string;
  baseSalary?: number;
}) {
  return (
    <div className="space-y-4">
      <StageProgress currentStage={currentStage} isComplete={isComplete} />
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Facilitator view</h3>
        <p className="text-sm text-slate-300">
          Participants are working through the simulation. Use this view to monitor progress and
          end the session when the cohort has finished.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="bg-slate-900/60 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Scenario</p>
            <p className="text-slate-200 font-semibold">{scenarioName ?? '—'}</p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Base salary</p>
            <p className="text-slate-200 font-semibold">
              {baseSalary ? `₹${baseSalary.toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Status</p>
            <p className="text-slate-200 font-semibold">
              {isComplete ? 'Completed' : STAGE_TITLES[currentStage]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HRCompensationGame;
