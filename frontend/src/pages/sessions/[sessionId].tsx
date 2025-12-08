import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '../../components/Navbar';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Users, 
  PlayCircle,
  Copy,
  CheckCircle,
  XCircle,
  UserPlus,
  StopCircle,
  Bot,
  Crown,
  RefreshCw,
  Package,
  ArrowDownToLine,
  ArrowUpRight,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Briefcase,
  Settings,
  Building2,
  Megaphone,
  ShoppingCart
} from 'lucide-react';

// EV Gambit Quiz Panel Component
function EVGambitQuizPanel({
  quiz,
  onSubmit,
  actionLoading,
}: {
  quiz: { round: number; questions: any[] };
  onSubmit: (answers: number[]) => void;
  actionLoading: boolean;
}) {
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    // Check if all questions are answered (mandatory)
    const unansweredQuestions = answers
      .map((a: number, idx: number) => a === -1 ? idx + 1 : -1)
      .filter((idx: number) => idx !== -1);
    
    if (unansweredQuestions.length > 0) {
      alert(`Please answer all questions. Missing answers for question(s): ${unansweredQuestions.join(', ')}`);
      return;
    }
    
    // Ensure answers is a proper array of numbers
    const validAnswers = answers.map((a: number) => (a === -1 ? 0 : a));
    console.log('Submitting quiz answers:', validAnswers, 'Array check:', Array.isArray(validAnswers));
    onSubmit(validAnswers);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6">
      <h3 className="text-xl font-bold flex items-center">
        <AlertCircle className="w-6 h-6 mr-2 text-blue-400" />
        Quiz for Event {quiz.round}
      </h3>

      <div className="space-y-6">
        {quiz.questions.map((question, qIndex) => (
          <div key={qIndex} className="bg-slate-900/50 rounded-lg p-5 border border-slate-700">
            <p className="font-semibold text-slate-200 mb-4">
              {qIndex + 1}. {question.question}
            </p>
            <div className="space-y-2">
              {question.options.map((option: string, oIndex: number) => (
                <label
                  key={oIndex}
                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    answers[qIndex] === oIndex
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    checked={answers[qIndex] === oIndex}
                    onChange={() => handleAnswerChange(qIndex, oIndex)}
                    className="mt-1 w-4 h-4 text-emerald-500"
                  />
                  <span className="text-slate-300 flex-1">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-700">
        {answers.some((a: number) => a === -1) && (
          <p className="text-sm text-red-400 mb-3 text-center">
            ⚠️ Please answer all questions. All questions are mandatory.
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={actionLoading || answers.some((a: number) => a === -1)}
          className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Submit Answers</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// EV Gambit Decision Panel Component
function EVGambitDecisionPanel({ 
  availableDecisions, 
  playerCompany, 
  onSubmit, 
  actionLoading 
}: { 
  availableDecisions: any[]; 
  playerCompany: any; 
  onSubmit: (decision: any, rationale: string, alternatives: string) => void;
  actionLoading: boolean;
}) {
  // Track selected decision for each category (mandatory selection per category)
  const [selectedDecisions, setSelectedDecisions] = useState<Record<string, any>>({});
  const [rationale, setRationale] = useState('');
  const [alternatives, setAlternatives] = useState('');

  const categoryIcons: Record<string, any> = {
    'Business Strategy': Briefcase,
    'Operations Strategy': Settings,
    'Corporate Strategy': Building2,
    'Marketing Strategy': Megaphone,
    'Sales Strategy': ShoppingCart,
  };

  // Check if all categories have a selection
  const allCategoriesSelected = availableDecisions.every(
    category => selectedDecisions[category.category] !== undefined
  );

  // Get the primary decision (first selected, or combine all if needed)
  // For now, we'll use the first selected decision as the main one
  const primaryDecision = availableDecisions.length > 0 
    ? selectedDecisions[availableDecisions[0].category] 
    : null;

  const handleSelectDecision = (category: string, decision: any) => {
    const canAfford = decision.cost <= 0 || playerCompany.cash >= decision.cost;
    if (canAfford) {
      setSelectedDecisions(prev => ({
        ...prev,
        [category]: decision
      }));
    }
  };

  const handleSubmit = () => {
    // Validate all categories have selections
    const missingCategories = availableDecisions.filter(
      cat => !selectedDecisions[cat.category]
    );
    
    if (missingCategories.length > 0) {
      alert(`Please select a decision from all strategy categories:\n${missingCategories.map(c => c.category).join(', ')}`);
      return;
    }

    if (!rationale.trim()) {
      alert('Please provide your decision rationale');
      return;
    }

    if (!alternatives.trim()) {
      alert('Please provide alternative considerations');
      return;
    }

    // Use the primary decision (first category's selection) as the main decision
    // The backend can be updated later to handle multiple decisions if needed
    const mainDecision = primaryDecision;
    
    if (mainDecision.cost > 0 && playerCompany.cash < mainDecision.cost) {
      alert('Insufficient funds for this decision');
      return;
    }
    
    onSubmit(mainDecision, rationale, alternatives);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-8">
      <h3 className="text-xl font-bold flex items-center">
        <PlayCircle className="w-6 h-6 mr-2 text-emerald-400" />
        Make Your Strategic Decision
      </h3>
      <p className="text-sm text-slate-400">
        Please select <span className="text-emerald-400 font-semibold">one decision from each strategy category</span> below. All selections are mandatory.
      </p>

      {/* All Strategy Categories - Displayed Vertically */}
      <div className="space-y-8">
        {availableDecisions.map((category, categoryIndex) => {
          const Icon = categoryIcons[category.category] || Briefcase;
          const selectedDecision = selectedDecisions[category.category];
          const isCategorySelected = selectedDecision !== undefined;

          return (
            <div key={category.category} className="space-y-4">
              {/* Category Header */}
              <div className={`flex items-center space-x-3 pb-3 border-b-2 ${
                isCategorySelected 
                  ? 'border-emerald-500/50' 
                  : 'border-slate-700'
              }`}>
                <div className={`p-2 rounded-lg ${
                  isCategorySelected 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-200">
                    {category.category}
                    {isCategorySelected && (
                      <span className="ml-2 text-sm text-emerald-400">✓ Selected</span>
                    )}
                  </h4>
                  {!isCategorySelected && (
                    <p className="text-sm text-red-400 mt-1">⚠️ Please select one option (required)</p>
                  )}
                </div>
              </div>

              {/* Decisions for this Category */}
              <div className="space-y-3 pl-2">
                {category.decisions.map((decision: any) => {
                  const canAfford = decision.cost <= 0 || playerCompany.cash >= decision.cost;
                  const isSelected = selectedDecision?.name === decision.name;
                  
                  return (
                    <div
                      key={decision.name}
                      onClick={() => handleSelectDecision(category.category, decision)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : canAfford
                          ? 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                          : 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-200">{decision.name}</h5>
                          <p className="text-sm text-slate-400 mt-1">
                            Cost: <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
                              ₹{decision.cost > 0 ? (decision.cost / 10000000).toFixed(2) + ' cr' : 'Free'}
                            </span>
                            {!canAfford && <span className="text-red-400 ml-2">(Insufficient funds)</span>}
                          </p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                      </div>
                      {decision.expectedImpact && (
                        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                          <p className="font-semibold mb-1">Expected Impact:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {decision.expectedImpact.marketShare && (
                              <span>Market Share: {decision.expectedImpact.marketShare > 0 ? '+' : ''}{decision.expectedImpact.marketShare.toFixed(1)}%</span>
                            )}
                            {decision.expectedImpact.brandValue && (
                              <span>Brand Value: {decision.expectedImpact.brandValue > 0 ? '+' : ''}{decision.expectedImpact.brandValue.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.technology && (
                              <span>Technology: {decision.expectedImpact.technology > 0 ? '+' : ''}{decision.expectedImpact.technology.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.production && (
                              <span>Production: {decision.expectedImpact.production > 0 ? '+' : ''}{decision.expectedImpact.production.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.supplierPower && (
                              <span>Supplier Power: {decision.expectedImpact.supplierPower > 0 ? '+' : ''}{decision.expectedImpact.supplierPower.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.buyerPower && (
                              <span>Buyer Power: {decision.expectedImpact.buyerPower > 0 ? '+' : ''}{decision.expectedImpact.buyerPower.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.substituteThreat && (
                              <span>Substitute Threat: {decision.expectedImpact.substituteThreat > 0 ? '+' : ''}{decision.expectedImpact.substituteThreat.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.rivalry && (
                              <span>Rivalry: {decision.expectedImpact.rivalry > 0 ? '+' : ''}{decision.expectedImpact.rivalry.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.newEntrants && (
                              <span>New Entrants: {decision.expectedImpact.newEntrants > 0 ? '+' : ''}{decision.expectedImpact.newEntrants.toFixed(0)}</span>
                            )}
                            {decision.expectedImpact.cash && (
                              <span>Cash: {decision.expectedImpact.cash > 0 ? '+' : ''}₹{(decision.expectedImpact.cash / 10000000).toFixed(2)} cr</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rationale Input - Show when all categories are selected */}
      {allCategoriesSelected && (
        <div className="space-y-4 pt-6 border-t-2 border-slate-700">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Please share your decision rationale: <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Write your answer... (required)"
              className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              What other alternatives could you consider? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={alternatives}
              onChange={(e) => setAlternatives(e.target.value)}
              placeholder="Write your answer... (required)"
              className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
              rows={3}
              required
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={actionLoading || !allCategoriesSelected || !rationale.trim() || !alternatives.trim()}
            className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Submit Decision</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Show message if not all categories selected */}
      {!allCategoriesSelected && (
        <div className="pt-4 border-t border-slate-700">
          <p className="text-sm text-slate-400 text-center">
            Please select one decision from each strategy category above to continue.
          </p>
        </div>
      )}
    </div>
  );
}

// Role definitions per simulation
const SIMULATION_ROLES: Record<string, { id: string; name: string; description: string }[]> = {
  'fruit-beer-game': [
    { id: 'RETAILER', name: 'Retailer', description: 'Faces end customer demand directly' },
    { id: 'WHOLESALER', name: 'Wholesaler', description: 'Supplies retailers, orders from distributor' },
    { id: 'DISTRIBUTOR', name: 'Distributor', description: 'Regional distribution, orders from manufacturer' },
    { id: 'MANUFACTURER', name: 'Manufacturer', description: 'Produces goods, manages production lead time' },
  ],
  'onion-dilemma': [
    { id: 'FARMER', name: 'Farmer Cooperative', description: 'Decides supply quantity and pricing' },
    { id: 'RETAILER', name: 'Retail Chain', description: 'Decides purchase quantity and resale price' },
  ],
  'order-ops': [
    { id: 'PLATFORM', name: 'Platform Manager', description: 'Manages drivers and assigns orders' },
    { id: 'RESTAURANT_1', name: 'Restaurant 1', description: 'Manages menu and order acceptance' },
    { id: 'RESTAURANT_2', name: 'Restaurant 2', description: 'Manages menu and order acceptance' },
  ],
  // EV Gambit: No roles required - any number of participants can join
  'ev-gambit': [],
  // Single player simulations
  'toc-factory': [{ id: 'MANAGER', name: 'Factory Manager', description: 'Manage production and bottlenecks' }],
  'hr-compensation': [{ id: 'HR_MANAGER', name: 'HR Manager', description: 'Design compensation packages' }],
  'sustainable-select': [{ id: 'ANALYST', name: 'Decision Analyst', description: 'Apply MADM methods' }],
  'dual-source-dilemma': [{ id: 'BUYER', name: 'Procurement Manager', description: 'Manage supplier orders' }],
  'defect-detectives': [{ id: 'QC_LEAD', name: 'QC Lead', description: 'Apply quality control tools' }],
  'customer-in-store': [{ id: 'LEARNER', name: 'Learner', description: 'Answer stock-flow questions' }],
  'demand-forecast-challenge': [{ id: 'FORECASTER', name: 'Demand Planner', description: 'Forecast demand patterns' }],
};

interface Session {
  id: string;
  session_code: string;
  session_name: string;
  status: string;
  current_round: number;
  max_rounds: number | null;
  configuration: any;
  created_at: string;
  started_at: string | null;
  simulation: {
    id: number;
    slug: string;
    name: string;
    description: string;
    type?: string;
    min_players: number;
    max_players: number;
    supports_bots: boolean;
    duration_minutes: number;
  };
  participants: Array<{
    id: string;
    player_name: string;
    role: string;
    is_bot: boolean;
    user_id?: string;
  }>;
  facilitator_id?: string;
}

export default function SessionPage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { isAuthenticated, user } = useAuthStore();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [playerName, setPlayerName] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [publicState, setPublicState] = useState<any>(null);
  const [participantState, setParticipantState] = useState<any>(null);
  const [lastRoundSummary, setLastRoundSummary] = useState<any>(null);
  const [gameMetrics, setGameMetrics] = useState<any>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [hasPlacedDecision, setHasPlacedDecision] = useState(false);
  const [participantsOverview, setParticipantsOverview] = useState<any[]>([]);
  const socketJoinedRef = useRef(false);

  const loadSession = useCallback(async (isBackground = false) => {
    if (!sessionId) return;
    
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      const data = await api.getSession(sessionId as string);
      setSession(data);
      setRateLimited(false); // Reset rate limit flag on success
      
      // Set default player name from user
      if (user?.full_name && !playerName) {
        setPlayerName(user.full_name);
      }
    } catch (err: any) {
      // Don't set error for rate limiting on background refreshes
      if (err.response?.status === 429) {
        setRateLimited(true);
        console.log('Rate limited, will retry later');
      } else if (!isBackground) {
        setError(err.response?.data?.error || 'Failed to load session');
      }
      console.error('Error loading session:', err);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [sessionId, user?.full_name, playerName]);

  useEffect(() => {
    if (sessionId && isAuthenticated) {
      loadSession(false);
    } else if (sessionId && !isAuthenticated) {
      router.push(`/login?redirect=/sessions/${sessionId}`);
    }
  }, [sessionId, isAuthenticated, loadSession, router]);

  // Auto-refresh session data every 10 seconds when in SETUP, WAITING, or IN_PROGRESS status
  // Use 15 seconds if rate limited
  useEffect(() => {
    if (!session || session.status === 'COMPLETED') return;
    
    const refreshInterval = rateLimited ? 15000 : 10000;
    
    const interval = setInterval(() => {
      loadSession(true); // Background refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [session?.status, loadSession, rateLimited]);

  const copySessionCode = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.session_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleJoinSession = async () => {
    if (!session || !playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    // For EV Gambit, role is optional (no roles required) - use default 'PLAYER'
    // For other simulations, role is required
    const roleToUse = session.simulation.slug === 'ev-gambit' 
      ? 'PLAYER' 
      : selectedRole;
    
    if (!roleToUse && session.simulation.slug !== 'ev-gambit') {
      alert('Please select a role');
      return;
    }

    try {
      setJoining(true);
      await api.joinSession(session.id, playerName.trim(), roleToUse || 'PLAYER');
      setShowJoinModal(false);
      await loadSession(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  const handleStartSession = async () => {
    if (!session) return;

    try {
      setStarting(true);
      await api.startSession(session.id);
      await loadSession(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    
    if (!confirm('Are you sure you want to end this session? This action cannot be undone.')) {
      return;
    }

    try {
      await api.endSession(session.id);
      await loadSession(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to end session');
    }
  };

  const handleSubmitOrder = () => {
    if (!session || !myParticipant) return;

    const parsedQuantity = Number(orderQuantity);
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      setActionFeedback({ type: 'error', message: 'Enter a valid order quantity (0 or higher).' });
      return;
    }

    if (!socketService.isConnected()) {
      setActionFeedback({ type: 'error', message: 'Connecting to game server. Please wait a moment.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionFeedback(null);
      socketService.sendAction(session.id, myParticipant.id, 'place-order', {
        orderQuantity: parsedQuantity,
      });
    } catch (error) {
      console.error('Failed to submit order', error);
      setActionLoading(false);
      setActionFeedback({ type: 'error', message: 'Failed to submit order. Please try again.' });
    }
  };

  const isFacilitator = session?.facilitator_id === user?.id;
  const isParticipant = session?.participants.some(p => p.user_id === user?.id);
  const myParticipant = session?.participants.find(p => p.user_id === user?.id);
  const availableRoles = session ? 
    (SIMULATION_ROLES[session.simulation.slug] || []).filter(
      role => !session.participants.some(p => p.role === role.id)
    ) : [];
  const canJoin = session?.status === 'SETUP' || session?.status === 'WAITING';
  const canStart = isFacilitator && (session?.status === 'SETUP' || session?.status === 'WAITING');
  const formatNumber = (value?: number | null) => {
    if (value === undefined || value === null) return '--';
    return Number.isInteger(value) ? Number(value).toLocaleString() : Number(value).toFixed(2);
  };

  useEffect(() => {
    socketJoinedRef.current = false;
  }, [session?.id, myParticipant?.id]);

  useEffect(() => {
    if (participantState?.lastOrderPlaced !== undefined && participantState?.lastOrderPlaced !== null) {
      setOrderQuantity(participantState.lastOrderPlaced);
    }
  }, [participantState?.lastOrderPlaced]);

  useEffect(() => {
    // Connect socket for participants OR facilitators
    if (!session || session.status !== 'IN_PROGRESS' || (!myParticipant && !isFacilitator) || !isAuthenticated) {
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return;
    }

    setSocketStatus(socketService.isConnected() ? 'connected' : 'connecting');
    socketService.connect(token);

    const joinSessionSocket = () => {
      if (socketJoinedRef.current) return;
      
      // For participants, join with participant ID
      if (myParticipant) {
        try {
          socketService.joinSession(session.id, myParticipant.id);
          socketJoinedRef.current = true;
        } catch (joinError) {
          console.error('Failed to join session via socket', joinError);
        }
      } else if (isFacilitator) {
        // Facilitator needs to join the room to receive events
        // For EV Gambit, we can use the first participant's ID to join the room
        // The backend will still allow the facilitator to get participant data
        try {
          const firstParticipant = session.participants.find(p => !p.is_bot);
          if (firstParticipant) {
            console.log('Facilitator joining session room via participant:', firstParticipant.id);
            socketService.joinSession(session.id, firstParticipant.id);
            socketJoinedRef.current = true;
            // Request participants overview after joining
            setTimeout(() => {
              if (socketService.isConnected()) {
                console.log('Requesting participants overview after joining room');
                socketService.getParticipantsOverview(session.id);
              }
            }, 1000);
          } else {
            console.warn('No participants found, facilitator cannot join room');
            socketJoinedRef.current = true;
            // Still try to request overview even without joining
            setTimeout(() => {
              if (socketService.isConnected()) {
                socketService.getParticipantsOverview(session.id);
              }
            }, 1000);
          }
        } catch (joinError) {
          console.error('Failed to join session as facilitator:', joinError);
          socketJoinedRef.current = true;
          // Try to request anyway
          setTimeout(() => {
            if (socketService.isConnected()) {
              socketService.getParticipantsOverview(session.id);
            }
          }, 1000);
        }
      }
    };

    const handleConnect = () => {
      setSocketStatus('connected');
      joinSessionSocket();
    };

    const handleDisconnect = () => {
      setSocketStatus('idle');
      socketJoinedRef.current = false;
    };

    if (socketService.isConnected()) {
      handleConnect();
    } else {
      socketService.on('connect', handleConnect);
    }
    socketService.on('disconnect', handleDisconnect);

    const handleSessionUpdate = (payload: any) => {
      if (payload.publicState) {
        setPublicState((prev: any) => ({
          ...prev,
          ...payload.publicState,
          // Ensure currentEvent is updated if nextEvent is provided
          currentEvent: payload.publicState.nextEvent || payload.publicState.currentEvent || prev?.currentEvent,
          // Ensure currentQuiz is preserved if not in publicState but in participantState
          currentQuiz: payload.publicState.currentQuiz || prev?.currentQuiz,
        }));
        // If quiz was submitted and next event is available, reset decision flag
        if (payload.publicState.hasSubmittedQuiz && (payload.publicState.nextEvent || payload.publicState.currentEvent)) {
          setHasPlacedDecision(false);
        }
      }
      if (payload.participantState && myParticipant) {
        setParticipantState((prev: any) => ({
          ...prev,
          ...payload.participantState,
          // Ensure quizSubmissions is updated if provided in updatedState
          quizSubmissions: payload.participantState.quizSubmissions || prev?.quizSubmissions || [],
          // Ensure hasPlacedDecision is updated
          hasPlacedDecision: payload.participantState.hasPlacedDecision !== undefined 
            ? payload.participantState.hasPlacedDecision 
            : prev?.hasPlacedDecision,
        }));
        
        // If participantState has currentQuiz, also update publicState
        if (payload.participantState.currentQuiz) {
          setPublicState((prev: any) => ({
            ...prev,
            currentQuiz: payload.participantState.currentQuiz,
          }));
        }
        
        // If participantState has hasSubmittedDecision, update publicState too
        if (payload.participantState.hasSubmittedDecision !== undefined) {
          setPublicState((prev: any) => ({
            ...prev,
            hasSubmittedDecision: payload.participantState.hasSubmittedDecision,
          }));
        }
        
        // If participantState has hasSubmittedQuiz, update publicState too
        if (payload.participantState.hasSubmittedQuiz !== undefined) {
          setPublicState((prev: any) => ({
            ...prev,
            hasSubmittedQuiz: payload.participantState.hasSubmittedQuiz,
          }));
        }
        
        // If participantState has showContinueButton, update publicState too
        if (payload.participantState.showContinueButton !== undefined) {
          setPublicState((prev: any) => ({
            ...prev,
            showContinueButton: payload.participantState.showContinueButton,
          }));
        }
      }
    };

    const handleParticipantStateUpdate = (payload: any) => {
      if (myParticipant && payload.participantId === myParticipant.id) {
        setParticipantState(payload.state);
        setActionLoading(false);
        setActionFeedback(null);
      }
    };

    const handleActionResult = (payload: any) => {
      console.log('Action result received:', payload);
      if (payload.success) {
        const isQuizSubmission = payload.message?.includes('Quiz submitted') || payload.message?.includes('quiz');
        const isContinueAction = payload.message?.includes('Moving to next event') || payload.message?.includes('Simulation complete');
        
        setActionFeedback({ 
          type: 'success', 
          message: payload.message || (isQuizSubmission ? 'Quiz submitted successfully' : 'Decision submitted successfully')
        });
        
        if (isQuizSubmission) {
          // Quiz submitted - show results and continue button (don't reset flags yet)
          // Keep hasSubmittedQuiz true to show results panel
          console.log('Quiz submitted successfully, showing results');
        } else if (isContinueAction) {
          // Continue button clicked - move to next event
          setHasPlacedDecision(false);
          console.log('Continue clicked, moving to next event');
        } else {
          // Decision submitted - show quiz
          setHasPlacedDecision(true);
        }
        
        if (payload.updatedState) {
          console.log('Updating state with:', payload.updatedState);
          setPublicState((prev: any) => ({
            ...prev,
            ...payload.updatedState,
            // Ensure hasSubmittedDecision and currentQuiz are set from updatedState
            hasSubmittedDecision: payload.updatedState.hasSubmittedDecision !== undefined 
              ? payload.updatedState.hasSubmittedDecision 
              : prev?.hasSubmittedDecision,
            hasSubmittedQuiz: payload.updatedState.hasSubmittedQuiz !== undefined 
              ? payload.updatedState.hasSubmittedQuiz 
              : prev?.hasSubmittedQuiz,
            showContinueButton: payload.updatedState.showContinueButton !== undefined 
              ? payload.updatedState.showContinueButton 
              : prev?.showContinueButton,
            currentQuiz: payload.updatedState.currentQuiz || prev?.currentQuiz,
            // If next event is provided, update current event
            currentEvent: payload.updatedState.currentEvent || payload.updatedState.nextEvent || prev?.currentEvent,
          }));
          setParticipantState((prev: any) => ({
            ...prev,
            ...payload.updatedState,
            hasPlacedDecision: payload.updatedState.hasSubmittedDecision !== undefined 
              ? payload.updatedState.hasSubmittedDecision 
              : (!isQuizSubmission && !isContinueAction),
            hasSubmittedQuiz: payload.updatedState.hasSubmittedQuiz !== undefined 
              ? payload.updatedState.hasSubmittedQuiz 
              : prev?.hasSubmittedQuiz,
            // Update quizSubmissions if provided in updatedState
            quizSubmissions: payload.updatedState.quizSubmissions || prev?.quizSubmissions || [],
          }));
        }
        // Reload session to get updated state
        setTimeout(() => loadSession(true), 500);
      } else {
        console.error('Action failed:', payload.message);
        setActionFeedback({ type: 'error', message: payload.message || 'Action failed' });
      }
      setActionLoading(false);
    };

    const handleRoundComplete = (payload: any) => {
      setLastRoundSummary(payload.summary);
      setHasPlacedDecision(false);
      setPublicState((prev: any) => (prev ? { ...prev, currentRound: payload.roundNumber } : prev));
      setParticipantState((prev: any) => (prev ? { ...prev, hasPlacedDecision: false } : prev));
      setGameMetrics(null);
    };


    const handleGameComplete = (payload: any) => {
      setGameMetrics(payload.finalMetrics);
      // Reload to get final state
      setTimeout(() => loadSession(true), 500);
    };

    const handleSocketError = (payload: any) => {
      console.error('Socket error:', payload);
      setActionFeedback({ type: 'error', message: payload?.message || 'Server error' });
      setActionLoading(false);
      
      // If facilitator and error is about participants, show in console
      if (isFacilitator && payload?.message?.includes('participant')) {
        console.error('Facilitator participants error:', payload);
      }
    };

    socketService.on('session_update', handleSessionUpdate);
    socketService.on('participant_state_update', handleParticipantStateUpdate);
    socketService.on('action_result', handleActionResult);
    socketService.on('round_complete', handleRoundComplete);
    socketService.on('game_complete', handleGameComplete);
    socketService.on('error', handleSocketError);

    // Facilitator: Get participants overview
    const handleParticipantsOverview = (payload: any) => {
      console.log('Received participants overview:', payload);
      if (payload.sessionId === session?.id) {
        if (payload.participants && Array.isArray(payload.participants)) {
          console.log('Setting participants overview:', payload.participants.length, 'participants');
          setParticipantsOverview(payload.participants);
        } else if (payload.error) {
          console.error('Error in participants overview:', payload.error);
          // Show error but don't keep spinning
          setParticipantsOverview([]);
        } else {
          console.warn('Participants overview payload missing participants array:', payload);
          setParticipantsOverview([]);
        }
      } else {
        console.warn('Participants overview payload mismatch:', {
          payloadSessionId: payload.sessionId,
          currentSessionId: session?.id,
          hasParticipants: !!payload.participants
        });
      }
    };

    // Facilitator: Participant progress update
    const handleParticipantProgressUpdate = (payload: any) => {
      console.log('Participant progress update received:', payload);
      if (payload.participantId && session?.id) {
        // Refresh participants overview
        if (isFacilitator && socketService.isConnected()) {
          setTimeout(() => {
            socketService.getParticipantsOverview(session.id);
          }, 500);
        }
      }
    };

    socketService.on('facilitator_participants_overview', handleParticipantsOverview);
    socketService.on('participant_progress_update', handleParticipantProgressUpdate);

    // Request participants overview if facilitator (after socket is connected)
    const requestParticipantsOverview = () => {
      if (isFacilitator && socketService.isConnected() && session?.id) {
        console.log('Requesting participants overview for facilitator, session:', session.id);
        socketService.getParticipantsOverview(session.id);
      } else {
        console.warn('Cannot request participants overview:', {
          isFacilitator,
          isConnected: socketService.isConnected(),
          sessionId: session?.id
        });
      }
    };

    // Request immediately if already connected, otherwise wait for connection
    if (socketService.isConnected()) {
      setTimeout(requestParticipantsOverview, 1000);
    } else {
      const connectHandler = () => {
        setTimeout(requestParticipantsOverview, 1000);
      };
      socketService.on('connect', connectHandler);
    }

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('session_update', handleSessionUpdate);
      socketService.off('participant_state_update', handleParticipantStateUpdate);
      socketService.off('action_result', handleActionResult);
      socketService.off('round_complete', handleRoundComplete);
      socketService.off('game_complete', handleGameComplete);
      socketService.off('error', handleSocketError);
      socketService.off('facilitator_participants_overview', handleParticipantsOverview);
      socketService.off('participant_progress_update', handleParticipantProgressUpdate);
      socketService.disconnect();
      setSocketStatus('idle');
      socketJoinedRef.current = false;
    };
  }, [session?.id, session?.status, myParticipant?.id, isAuthenticated, isFacilitator]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error || 'Session not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show game interface when session is in progress
  if (session.status === 'IN_PROGRESS') {
    const simulationSlug = session.simulation.slug;
    
    // Render EV Gambit game
    if (simulationSlug === 'ev-gambit') {
      return (
        <div className="min-h-screen bg-slate-900 text-white">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                    {session.simulation.type || 'Simulation'}
                  </p>
                  <h1 className="text-3xl font-bold mt-1">{session.simulation.name}</h1>
                  <p className="text-slate-300 mt-2">
                    Round {Math.min(
                      (participantState?.isComplete 
                        ? (publicState?.maxRounds ?? session.max_rounds ?? 5)
                        : ((participantState?.currentRound ?? publicState?.currentRound ?? session.current_round ?? 0) + 1)),
                      (publicState?.maxRounds ?? session.max_rounds ?? 5)
                    )} of {publicState?.maxRounds ?? session.max_rounds ?? 5}
                  </p>
                </div>
                <div className="text-right space-y-3">
                  <div>
                    <p className="text-sm text-slate-400">Session Code</p>
                    <p className="text-2xl font-mono font-semibold text-emerald-400">
                      {session.session_code}
                    </p>
                  </div>
                  {isFacilitator && (
                    <button
                      onClick={handleEndSession}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                    >
                      <StopCircle className="w-5 h-5 mr-2" />
                      End Game
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!myParticipant && !isFacilitator && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
                <p className="font-semibold mb-1">Spectator mode</p>
                <p className="text-sm">
                  Join this session as a player to make strategic decisions and see the full game interface.
                </p>
              </div>
            )}

            {/* Facilitator Dashboard - Participant Overview */}
            {isFacilitator && session.status === 'IN_PROGRESS' && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center">
                    <Users className="w-6 h-6 mr-2 text-emerald-400" />
                    Participant Overview
                  </h3>
                  <button
                    onClick={() => {
                      if (socketService.isConnected() && session?.id) {
                        socketService.getParticipantsOverview(session.id);
                      }
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                {participantsOverview.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Loading participant data...</p>
                    <p className="text-xs mt-2 text-slate-500">
                      {socketService.isConnected() ? 'Connected, waiting for data...' : 'Connecting to server...'}
                    </p>
                    <button
                      onClick={() => {
                        if (socketService.isConnected() && session?.id) {
                          console.log('Manual refresh triggered');
                          socketService.getParticipantsOverview(session.id);
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participantsOverview.map((participant: any) => {
                      const statusColors = {
                        waiting: 'bg-slate-600 text-slate-200',
                        playing: 'bg-blue-500 text-white',
                        completed: 'bg-emerald-500 text-white',
                        error: 'bg-red-500 text-white',
                      };

                      const statusLabels = {
                        waiting: 'Waiting',
                        playing: 'Playing',
                        completed: 'Completed',
                        error: 'Error',
                      };

                      return (
                        <div
                          key={participant.participantId}
                          className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-semibold">
                                {participant.playerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-200">{participant.playerName}</p>
                                <p className="text-sm text-slate-400">{participant.role}</p>
                              </div>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                statusColors[participant.status as keyof typeof statusColors] || statusColors.waiting
                              }`}
                            >
                              {statusLabels[participant.status as keyof typeof statusLabels] || participant.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-700">
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Current Event</p>
                              <p className="text-sm font-semibold text-slate-200">
                                {participant.currentEvent || 'Not started'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Round Progress</p>
                              <p className="text-sm font-semibold text-slate-200">
                                {participant.currentRound} / {participant.maxRounds}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Decisions Made</p>
                              <p className="text-sm font-semibold text-slate-200">
                                {participant.decisionsCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 mb-1">Quizzes Completed</p>
                              <p className="text-sm font-semibold text-slate-200">
                                {participant.quizSubmissionsCount}
                              </p>
                            </div>
                          </div>

                          {participant.scores && (
                            <div className="pt-2 border-t border-slate-700">
                              <p className="text-xs text-slate-400 mb-2">Scores</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-800/50 rounded p-2">
                                  <p className="text-xs text-slate-400">Decision</p>
                                  <p className="text-sm font-semibold text-blue-400">
                                    {participant.scores.decisionScore?.toFixed(1) || '0'}
                                  </p>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <p className="text-xs text-slate-400">Quiz</p>
                                  <p className="text-sm font-semibold text-purple-400">
                                    {participant.scores.quizScore?.toFixed(1) || '0'}
                                  </p>
                                </div>
                                <div className="bg-slate-800/50 rounded p-2">
                                  <p className="text-xs text-slate-400">Total</p>
                                  <p className="text-sm font-semibold text-emerald-400">
                                    {participant.scores.totalScore?.toFixed(1) || '0'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Show submission status for both playing and completed participants */}
                          {(participant.status === 'playing' || participant.status === 'completed') && (
                            <div className="pt-2 border-t border-slate-700">
                              <div className="flex items-center space-x-4 text-xs text-slate-400">
                                {participant.hasSubmittedDecision && (
                                  <span className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                    <span>Decision Submitted</span>
                                  </span>
                                )}
                                {participant.hasSubmittedQuiz && (
                                  <span className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3 text-blue-400" />
                                    <span>Quiz Submitted</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {myParticipant && (
              <>
                {/* Player Info */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">You are playing as</p>
                      <p className="text-2xl font-bold text-emerald-400">{myParticipant.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Socket status</p>
                      <p className={`font-semibold ${socketStatus === 'connected' ? 'text-emerald-400' : socketStatus === 'connecting' ? 'text-amber-300' : 'text-red-400'}`}>
                        {socketStatus === 'connected' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Event */}
                {publicState?.currentEvent && (
                  <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-blue-300 mb-2">{publicState.currentEvent.title}</h3>
                        <p className="text-slate-300 leading-relaxed">{publicState.currentEvent.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Company Metrics */}
                {publicState?.playerCompany && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Market Share</p>
                      <p className="text-2xl font-bold text-emerald-400">{publicState.playerCompany.marketShare?.toFixed(2) || '0'}%</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Cash</p>
                      <p className="text-2xl font-bold text-green-400">₹{(publicState.playerCompany.cash / 10000000).toFixed(2)} cr</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Brand Value</p>
                      <p className="text-2xl font-bold text-purple-400">{publicState.playerCompany.brandValue?.toFixed(0) || '0'}/100</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Technology</p>
                      <p className="text-2xl font-bold text-cyan-400">{publicState.playerCompany.technology?.toFixed(0) || '0'}/100</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Production</p>
                      <p className="text-2xl font-bold text-orange-400">{publicState.playerCompany.production?.toFixed(0) || '0'}/100</p>
                    </div>
                  </div>
                )}

                {/* Five Forces Visualization */}
                {publicState?.fiveForces && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-indigo-400" />
                      Porter's Five Forces
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(publicState.fiveForces).map(([force, value]: [string, any]) => {
                        const forceName = force.charAt(0).toUpperCase() + force.slice(1).replace(/([A-Z])/g, ' $1');
                        const intensity = value > 70 ? 'high' : value > 40 ? 'medium' : 'low';
                        const color = value > 70 ? 'bg-red-500' : value > 40 ? 'bg-yellow-500' : 'bg-green-500';
                        return (
                          <div key={force} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-300">{forceName}</span>
                              <span className={`font-semibold ${value > 70 ? 'text-red-400' : value > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {value.toFixed(0)} ({intensity})
                              </span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-300`}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-sm text-slate-400">
                        Industry Attractiveness: <span className="font-semibold text-white">{publicState.industryAttractiveness?.toFixed(0) || '0'}%</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Decision Selection */}
                {publicState?.availableDecisions && publicState.availableDecisions.length > 0 && !publicState.hasSubmittedDecision && !hasPlacedDecision && !participantState?.hasPlacedDecision && (
                  <EVGambitDecisionPanel
                    availableDecisions={publicState.availableDecisions}
                    playerCompany={publicState.playerCompany}
                    onSubmit={(decision, rationale, alternatives) => {
                      if (!socketService.isConnected()) {
                        setActionFeedback({ type: 'error', message: 'Not connected to game server' });
                        return;
                      }
                      setActionLoading(true);
                      setActionFeedback(null);
                      socketService.sendAction(session.id, myParticipant.id, 'make-decision', {
                        decision,
                        rationale,
                        alternatives,
                      });
                    }}
                    actionLoading={actionLoading}
                  />
                )}

                {/* Action Feedback */}
                {actionFeedback && (
                  <div className={`rounded-xl p-4 ${
                    actionFeedback.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/40 text-red-100'
                      : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
                  }`}>
                    {actionFeedback.message}
                  </div>
                )}

                {/* Decision History */}
                {participantState?.decisions && participantState.decisions.length > 0 && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Decision History</h3>
                    <div className="space-y-3">
                      {participantState.decisions.slice().reverse().map((decision: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-slate-200">Round {decision.round}</p>
                              <p className="text-sm text-slate-400">{decision.decision.name}</p>
                            </div>
                            <span className="text-xs text-slate-500">₹{(decision.decision.cost / 10000000).toFixed(2)} cr</span>
                          </div>
                          <p className="text-sm text-slate-300 mt-2">{decision.outcome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiz Panel - Show after decision submission */}
                {((participantState?.hasPlacedDecision || hasPlacedDecision || publicState?.hasSubmittedDecision) 
                  && !participantState?.hasSubmittedQuiz
                  && !publicState?.hasSubmittedQuiz
                  && (publicState?.currentQuiz || participantState?.currentQuiz)) && (
                  <EVGambitQuizPanel
                    quiz={publicState?.currentQuiz || participantState?.currentQuiz}
                    onSubmit={(answers) => {
                      if (!socketService.isConnected()) {
                        setActionFeedback({ type: 'error', message: 'Not connected to game server' });
                        return;
                      }
                      console.log('Quiz submission - answers:', answers, 'type:', typeof answers, 'isArray:', Array.isArray(answers));
                      if (!Array.isArray(answers) || answers.length === 0) {
                        setActionFeedback({ type: 'error', message: 'Invalid answers format' });
                        return;
                      }
                      setActionLoading(true);
                      setActionFeedback(null);
                      socketService.sendAction(session.id, myParticipant.id, 'submit-quiz', {
                        answers: answers,
                      });
                    }}
                    actionLoading={actionLoading}
                  />
                )}

                {/* Quiz Results and Continue Button - Show after quiz submission */}
                {publicState?.hasSubmittedQuiz && !publicState.isComplete && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-400 mb-2">Quiz Submitted!</h3>
                      {participantState?.quizSubmissions && participantState.quizSubmissions.length > 0 && (
                        <p className="text-slate-300">
                          You scored {participantState.quizSubmissions[participantState.quizSubmissions.length - 1].score.toFixed(1)}% on this quiz
                        </p>
                      )}
                      {(!participantState?.quizSubmissions || participantState.quizSubmissions.length === 0) && (
                        <p className="text-slate-300">Loading your results...</p>
                      )}
                    </div>

                    {/* Quiz Results */}
                    {participantState?.quizSubmissions && participantState.quizSubmissions.length > 0 && publicState?.currentQuiz && (
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <h4 className="font-semibold text-slate-200 mb-3">Your Answers:</h4>
                        <div className="space-y-3">
                          {publicState.currentQuiz.questions.map((question: any, qIndex: number) => {
                            const submission = participantState.quizSubmissions[participantState.quizSubmissions.length - 1];
                            const selectedAnswer = submission.answers && submission.answers[qIndex] !== undefined 
                              ? submission.answers[qIndex] 
                              : -1;
                            const isCorrect = selectedAnswer === question.correctAnswer;
                            return (
                              <div key={qIndex} className={`p-3 rounded-lg border-2 ${
                                isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                              }`}>
                                <p className="font-semibold text-slate-200 mb-2">{question.question}</p>
                                <div className="space-y-1">
                                  {question.options.map((option: string, oIndex: number) => (
                                    <div key={oIndex} className={`text-sm p-2 rounded ${
                                      oIndex === question.correctAnswer 
                                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                                        : oIndex === selectedAnswer && !isCorrect
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'text-slate-400'
                                    }`}>
                                      {oIndex === question.correctAnswer && '✓ Correct Answer '}
                                      {oIndex === selectedAnswer && !isCorrect && '✗ Your Answer '}
                                      {option}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Continue Button - Show if not complete and quiz submitted */}
                    {!participantState?.isComplete 
                      && !publicState?.isComplete
                      && (publicState?.hasSubmittedQuiz || participantState?.hasSubmittedQuiz) && (
                      <button
                        onClick={() => {
                          if (!socketService.isConnected()) {
                            setActionFeedback({ type: 'error', message: 'Not connected to game server' });
                            return;
                          }
                          setActionLoading(true);
                          setActionFeedback(null);
                          socketService.sendAction(session.id, myParticipant.id, 'continue-to-next-event', {});
                        }}
                        disabled={actionLoading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold text-lg rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-6 h-6" />
                            <span>Continue to Next Event</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Game Complete - Final Scores - Show when participant completes */}
                {(participantState?.isComplete || publicState?.isComplete) && (
                  <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900/50 border-2 border-emerald-500/50 rounded-2xl p-8 space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-4">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-emerald-400 mb-2">Simulation Complete!</h2>
                      <p className="text-slate-300">You have completed all 5 rounds/events</p>
                      <p className="text-sm text-slate-400 mt-2">Final Report</p>
                    </div>

                    {/* Final Scores - Use participant-specific scores */}
                    {(participantState?.scores || publicState?.scores) && (
                      <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-semibold mb-6 text-center">Final Scores</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <p className="text-sm text-slate-400 mb-2">Decision Score</p>
                            <p className="text-4xl font-bold text-blue-400">
                              {(participantState?.scores?.decisionScore ?? publicState?.scores?.decisionScore ?? 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">Based on strategic decisions</p>
                          </div>
                          <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <p className="text-sm text-slate-400 mb-2">Quiz Score</p>
                            <p className="text-4xl font-bold text-purple-400">
                              {(participantState?.scores?.quizScore ?? publicState?.scores?.quizScore ?? 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">Based on quiz performance</p>
                          </div>
                          <div className="text-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                            <p className="text-sm text-slate-400 mb-2">Total Score</p>
                            <p className="text-4xl font-bold text-emerald-400">
                              {(participantState?.scores?.totalScore ?? publicState?.scores?.totalScore ?? 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">Combined performance</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Final Metrics - Use participant-specific company data */}
                    {(participantState?.playerCompany || publicState?.playerCompany) && (
                      <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Final Company Performance</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Market Share</p>
                            <p className="text-2xl font-bold text-emerald-400">
                              {(participantState?.playerCompany?.marketShare ?? publicState?.playerCompany?.marketShare ?? 0).toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Cash</p>
                            <p className="text-2xl font-bold text-green-400">
                              ₹{((participantState?.playerCompany?.cash ?? publicState?.playerCompany?.cash ?? 0) / 10000000).toFixed(2)} cr
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Brand Value</p>
                            <p className="text-2xl font-bold text-purple-400">
                              {(participantState?.playerCompany?.brandValue ?? publicState?.playerCompany?.brandValue ?? 0).toFixed(0)}/100
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Technology</p>
                            <p className="text-2xl font-bold text-cyan-400">
                              {(participantState?.playerCompany?.technology ?? publicState?.playerCompany?.technology ?? 0).toFixed(0)}/100
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Production</p>
                            <p className="text-2xl font-bold text-orange-400">
                              {(participantState?.playerCompany?.production ?? publicState?.playerCompany?.production ?? 0).toFixed(0)}/100
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quiz Results Summary */}
                    {participantState?.quizSubmissions && participantState.quizSubmissions.length > 0 && (
                      <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">Quiz Performance by Event</h3>
                        <div className="space-y-3">
                          {participantState.quizSubmissions.map((submission: any, idx: number) => {
                            const event = publicState.allEvents?.find((e: any) => e.round === submission.round) || 
                                         publicState.recentEvents?.find((e: any) => e.round === submission.round);
                            return (
                              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                <div>
                                  <p className="font-semibold text-slate-200">Event {submission.round}</p>
                                  <p className="text-sm text-slate-400">
                                    {event?.title || `Event ${submission.round}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-2xl font-bold ${submission.score >= 75 ? 'text-emerald-400' : submission.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {submission.score.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-slate-500">Score</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Decision History Summary */}
                    {participantState?.decisions && participantState.decisions.length > 0 && (
                      <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-lg font-semibold mb-4">All Decisions Made</h3>
                        <div className="space-y-3">
                          {participantState.decisions.map((decision: any, idx: number) => {
                            const event = publicState.allEvents?.find((e: any) => e.round === decision.round) ||
                                         publicState.recentEvents?.find((e: any) => e.round === decision.round);
                            return (
                              <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-slate-200">Event {decision.round}: {event?.title || 'Event'}</p>
                                    <p className="text-sm text-slate-400 mt-1">{decision.decision.name}</p>
                                  </div>
                                  <span className="text-xs text-slate-500">₹{(decision.decision.cost / 10000000).toFixed(2)} cr</span>
                                </div>
                                <p className="text-sm text-slate-300 mt-2">{decision.outcome}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Waiting for Decision */}
                {!participantState?.isComplete && !publicState?.isComplete && publicState?.hasSubmittedDecision === false && (hasPlacedDecision || participantState?.hasPlacedDecision) && (
                  <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-5 text-emerald-100">
                    <p className="font-semibold mb-1">Decision Submitted</p>
                    <p className="text-sm">Please answer the quiz questions below.</p>
                  </div>
                )}

                {/* Scores are only shown at the end of round 5 (when isComplete is true) */}
              </>
            )}
          </main>
        </div>
      );
    }

    // Render Fruit Beer Game (existing code)
    const currentWeek = publicState?.currentWeek ?? session.current_round ?? 0;
    const maxWeeks = publicState?.maxWeeks ?? session.max_rounds ?? 20;
    const progressPercent = maxWeeks ? Math.min(100, (currentWeek / maxWeeks) * 100) : 0;
    const shipments = participantState?.incomingShipments?.slice(0, 4) || [];
    const upstreamOrders = participantState?.incomingOrders?.slice(0, 4) || [];
    const recentStats = participantState?.weeklyStats
      ? [...participantState.weeklyStats].slice(-5).reverse()
      : [];
    const metricCards = myParticipant
      ? [
          {
            label: 'Inventory on Hand',
            value: formatNumber(participantState?.inventory),
            helper: 'Units available right now',
            icon: Package,
            accent: 'text-emerald-400',
          },
          {
            label: 'Backorder',
            value: formatNumber(participantState?.backorder),
            helper: 'Unfulfilled demand',
            icon: AlertTriangle,
            accent: 'text-amber-400',
          },
          {
            label: 'Next Shipment',
            value: formatNumber(shipments[0]),
            helper: 'Arriving next week',
            icon: ArrowDownToLine,
            accent: 'text-sky-400',
          },
          {
            label: 'Last Order',
            value: formatNumber(participantState?.lastOrderPlaced),
            helper: 'Placed upstream this round',
            icon: ArrowUpRight,
            accent: 'text-purple-400',
          },
          {
            label: 'Total Cost',
            value: participantState ? `₹${formatNumber(participantState.totalCost)}` : '--',
            helper: 'Holding + stockout',
            icon: DollarSign,
            accent: 'text-rose-400',
          },
        ]
      : [];

    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  {session.simulation.type || 'Simulation'}
                </p>
                <h1 className="text-3xl font-bold mt-1">{session.simulation.name}</h1>
                <p className="text-slate-300 mt-2">
                  Week {currentWeek} of {maxWeeks}
                </p>
                <div className="mt-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Progress {progressPercent.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Session Code</p>
                  <p className="text-2xl font-mono font-semibold text-emerald-400">
                    {session.session_code}
                  </p>
                </div>
                {isFacilitator && (
                  <button
                    onClick={handleEndSession}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    End Game
                  </button>
                )}
              </div>
            </div>
          </div>

          {!myParticipant && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
              <p className="font-semibold mb-1">Spectator mode</p>
              <p className="text-sm">
                Join this session as a player to place weekly orders and see the full game HUD.
              </p>
            </div>
          )}

          {myParticipant && (
            <>
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">You are playing as</p>
                    <p className="text-2xl font-bold text-emerald-400">{myParticipant.role}</p>
                  </div>
                  <div className="text-sm text-slate-400">
                    Socket status:{' '}
                    <span
                      className={`font-semibold ${
                        socketStatus === 'connected'
                          ? 'text-emerald-400'
                          : socketStatus === 'connecting'
                          ? 'text-amber-300'
                          : 'text-red-400'
                      }`}
                    >
                      {socketStatus === 'connected'
                        ? 'Connected'
                        : socketStatus === 'connecting'
                        ? 'Connecting...'
                        : 'Offline'}
                    </span>
                  </div>
                </div>
                {actionFeedback && (
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      actionFeedback.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/40 text-red-100'
                        : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-100'
                    }`}
                  >
                    {actionFeedback.message}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {metricCards.map((card) => (
                  <div
                    key={card.label}
                    className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-slate-400">{card.label}</p>
                      <p className="text-2xl font-semibold mt-1">{card.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{card.helper}</p>
                    </div>
                    <card.icon className={`w-10 h-10 ${card.accent}`} />
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <PlayCircle className="w-5 h-5 text-emerald-400 mr-2" />
                    Place this week's order
                  </h3>
                  <input
                    type="number"
                    min={0}
                    value={orderQuantity}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setOrderQuantity(Number.isNaN(value) ? 0 : value);
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white"
                  />
                  <button
                    onClick={handleSubmitOrder}
                    disabled={actionLoading || participantState?.hasPlacedOrder}
                    className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : participantState?.hasPlacedOrder ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Order submitted
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-5 h-5 mr-2" />
                        Submit order
                      </>
                    )}
                  </button>
                  {participantState?.hasPlacedOrder && (
                    <p className="text-sm text-emerald-200">
                      Waiting for other players to submit their orders...
                    </p>
                  )}
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <BarChart3 className="w-5 h-5 text-sky-400 mr-2" />
                    Pipeline preview
                  </h3>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Incoming shipments</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {shipments.length ? (
                        shipments.map((qty, index) => (
                          <div
                            key={`shipment-${index}`}
                            className="bg-slate-900/60 rounded-lg p-3 text-center border border-slate-700"
                          >
                            <p className="text-xs text-slate-500">
                              Week {currentWeek + index + 1}
                            </p>
                            <p className="text-lg font-semibold">{formatNumber(qty)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 col-span-4">
                          Waiting for upstream shipments...
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Downstream orders</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {upstreamOrders.length ? (
                        upstreamOrders.map((qty, index) => (
                          <div
                            key={`order-${index}`}
                            className="bg-slate-900/60 rounded-lg p-3 text-center border border-slate-700"
                          >
                            <p className="text-xs text-slate-500">
                              Week {currentWeek + index + 1}
                            </p>
                            <p className="text-lg font-semibold">{formatNumber(qty)}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 col-span-4">
                          No pending downstream orders yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="w-5 h-5 text-indigo-400 mr-2" />
                  Weekly performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">Week</th>
                        <th className="py-2 pr-3">Demand</th>
                        <th className="py-2 pr-3">Order</th>
                        <th className="py-2 pr-3">Inventory</th>
                        <th className="py-2 pr-3">Backorder</th>
                        <th className="py-2 pr-3">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentStats.length ? (
                        recentStats.map((stat) => (
                          <tr
                            key={stat.week}
                            className="border-t border-slate-700/60 hover:bg-slate-800/60"
                          >
                            <td className="py-2 pr-3">Week {stat.week}</td>
                            <td className="py-2 pr-3">{formatNumber(stat.demand)}</td>
                            <td className="py-2 pr-3">{formatNumber(stat.orderPlaced)}</td>
                            <td className="py-2 pr-3">{formatNumber(stat.inventory)}</td>
                            <td className="py-2 pr-3">{formatNumber(stat.backorder)}</td>
                            <td className="py-2 pr-3">
                              ₹{formatNumber(Number(stat.holdingCost + stat.stockoutCost))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-4 text-slate-400" colSpan={6}>
                            No history yet. Complete a round to see stats.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {lastRoundSummary && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-100">
                  <p className="font-semibold">
                    Week {lastRoundSummary.week} summary
                  </p>
                  <p className="text-sm mt-1">
                    Customer demand was {formatNumber(lastRoundSummary.customerDemand)} units. Total
                    system cost so far: ₹{formatNumber(lastRoundSummary.totalCosts)}.
                  </p>
                </div>
              )}

              {gameMetrics && (
                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-5 text-emerald-100 space-y-2">
                  <p className="text-lg font-semibold flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Game complete
                  </p>
                  <p className="text-sm text-emerald-200">
                    Final costs by role:
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {gameMetrics?.totalCosts &&
                      Object.entries(gameMetrics.totalCosts).map(([role, cost]) => (
                        <div
                          key={role}
                          className="bg-slate-900/60 border border-emerald-500/30 rounded-lg p-3 text-center"
                        >
                          <p className="text-xs uppercase tracking-wide text-emerald-200">
                            {role}
                          </p>
                          <p className="text-lg font-semibold">
                            ₹{formatNumber(Number(cost))}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  // Show completed state
  if (session.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Session Completed</h1>
            <p className="text-gray-600 mb-8">
              {session.session_name} has ended. Thank you for participating!
            </p>
            <button
              onClick={() => router.push('/simulations')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse More Simulations
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Session Lobby (SETUP / WAITING status)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Join Session</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {/* Role selection - hidden for EV Gambit */}
              {session.simulation.slug !== 'ev-gambit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Your Role
                  </label>
                  <div className="space-y-2">
                    {availableRoles.length === 0 ? (
                      <p className="text-amber-600 text-sm">All roles are taken!</p>
                    ) : (
                      availableRoles.map((role) => (
                        <label
                          key={role.id}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedRole === role.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role.id}
                            checked={selectedRole === role.id}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{role.name}</p>
                            <p className="text-sm text-gray-500">{role.description}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinSession}
                disabled={joining || (!selectedRole && session.simulation.slug !== 'ev-gambit') || !playerName.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {joining ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Join
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  session.status === 'SETUP' ? 'bg-yellow-100 text-yellow-800' :
                  session.status === 'WAITING' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {session.status === 'SETUP' ? '⚙️ Setup' : 
                   session.status === 'WAITING' ? '⏳ Waiting for Players' : session.status}
                </span>
                {isFacilitator && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                    <Crown className="w-3 h-3 inline mr-1" />
                    Facilitator
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{session.session_name}</h1>
              <p className="text-gray-600">{session.simulation.name}</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Session Code</p>
              <button
                onClick={copySessionCode}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="text-xl font-mono font-bold text-primary-600">
                  {session.session_code}
                </span>
                {codeCopied ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{session.simulation.duration_minutes} min</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>
                {session.participants.length} / {session.simulation.max_players} players
              </span>
            </div>
            {session.simulation.supports_bots && (
              <div className="flex items-center space-x-2 text-emerald-600">
                <Bot className="w-4 h-4" />
                <span>Bots Available</span>
              </div>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Participants</h2>
            <button
              onClick={loadSession}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(SIMULATION_ROLES[session.simulation.slug] || []).map((role) => {
              const participant = session.participants.find(p => p.role === role.id);
              const isMe = participant?.user_id === user?.id;
              
              return (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    participant 
                      ? isMe 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-green-300 bg-green-50'
                      : 'border-dashed border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                    {participant ? (
                      <div className="flex items-center space-x-2">
                        {participant.is_bot ? (
                          <Bot className="w-5 h-5 text-slate-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  
                  {participant && (
                    <div className="mt-3 flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isMe ? 'bg-primary-200' : 'bg-green-200'
                      }`}>
                        {participant.is_bot ? (
                          <Bot className="w-4 h-4 text-slate-600" />
                        ) : (
                          <span className="text-sm font-medium">
                            {participant.player_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${isMe ? 'text-primary-700' : 'text-gray-700'}`}>
                        {participant.player_name}
                        {isMe && <span className="text-primary-600 ml-1">(You)</span>}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state for roles */}
          {(!SIMULATION_ROLES[session.simulation.slug] || SIMULATION_ROLES[session.simulation.slug].length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Role configuration not available for this simulation</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Join Button */}
            {/* For EV Gambit, allow joining without roles. For others, require available roles */}
            {canJoin && !isParticipant && !isFacilitator && (session.simulation.slug === 'ev-gambit' || availableRoles.length > 0) && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Join Session
              </button>
            )}

            {/* Already joined indicator */}
            {isParticipant && (
              <div className="flex-1 flex items-center justify-center px-6 py-3 bg-green-100 text-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 mr-2" />
                You've joined as {myParticipant?.role}
              </div>
            )}

            {/* Facilitator Controls */}
            {isFacilitator && (
              <>
                <button
                  onClick={handleStartSession}
                  disabled={starting || session.participants.length < session.simulation.min_players}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {starting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="w-5 h-5 mr-2" />
                  )}
                  {session.participants.length < session.simulation.min_players 
                    ? `Need ${session.simulation.min_players - session.participants.length} more player(s)`
                    : 'Start Game'
                  }
                </button>
              </>
            )}
          </div>

          {/* Help text */}
          {canJoin && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Share the session code <span className="font-mono font-bold text-primary-600">{session.session_code}</span> with other players to invite them
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

