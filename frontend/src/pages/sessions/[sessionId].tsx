import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
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
} from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import { resolveGameComponent } from '../../components/games';

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
  'ev-gambit': [],
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
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const socketJoinedRef = useRef(false);

  const loadSession = useCallback(
    async (isBackground = false) => {
      if (!sessionId) return;
      try {
        if (!isBackground) setLoading(true);
        setError(null);
        const data = await api.getSession(sessionId as string);
        setSession(data);
        setRateLimited(false);
        if (user?.full_name && !playerName) setPlayerName(user.full_name);
      } catch (err: any) {
        if (err.response?.status === 429) {
          setRateLimited(true);
        } else if (!isBackground) {
          setError(err.response?.data?.error || 'Failed to load session');
        }
        console.error('Error loading session:', err);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [sessionId, user?.full_name, playerName]
  );

  useEffect(() => {
    if (sessionId && isAuthenticated) {
      loadSession(false);
    } else if (sessionId && !isAuthenticated) {
      router.push(`/login?redirect=/sessions/${sessionId}`);
    }
  }, [sessionId, isAuthenticated, loadSession, router]);

  useEffect(() => {
    if (!session || session.status === 'COMPLETED') return;
    const refreshInterval = rateLimited ? 15000 : 10000;
    const interval = setInterval(() => loadSession(true), refreshInterval);
    return () => clearInterval(interval);
  }, [session?.status, loadSession, rateLimited]);

  const isFacilitator = session?.facilitator_id === user?.id;
  const isParticipant = session?.participants.some(p => p.user_id === user?.id) ?? false;
  const myParticipant = session?.participants.find(p => p.user_id === user?.id);
  const availableRoles = session
    ? (SIMULATION_ROLES[session.simulation.slug] || []).filter(
        role => !session.participants.some(p => p.role === role.id)
      )
    : [];
  const canJoin = session?.status === 'SETUP' || session?.status === 'WAITING';

  useEffect(() => {
    socketJoinedRef.current = false;
  }, [session?.id, myParticipant?.id]);

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
    const roleToUse = session.simulation.slug === 'ev-gambit' ? 'PLAYER' : selectedRole;
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
    if (!confirm('Are you sure you want to end this session? This action cannot be undone.')) return;
    try {
      await api.endSession(session.id);
      await loadSession(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to end session');
    }
  };

  const handleGameAction = useCallback(
    (actionType: string, payload: any) => {
      if (!session || !myParticipant) return;
      if (!socketService.isConnected()) {
        setActionFeedback({ type: 'error', message: 'Connecting to game server. Please wait a moment.' });
        return;
      }
      setActionLoading(true);
      setActionFeedback(null);
      try {
        socketService.sendAction(session.id, myParticipant.id, actionType, payload);
      } catch (err) {
        console.error('Failed to send action', err);
        setActionLoading(false);
        setActionFeedback({ type: 'error', message: 'Failed to send action. Please try again.' });
      }
    },
    [session, myParticipant]
  );

  // Socket lifecycle: connect, subscribe to events, join room, request initial state.
  useEffect(() => {
    if (!session || session.status !== 'IN_PROGRESS' || !isAuthenticated) return;
    if (!myParticipant && !isFacilitator) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSocketStatus(socketService.isConnected() ? 'connected' : 'connecting');
    socketService.connect(token);

    const joinSessionSocket = () => {
      if (socketJoinedRef.current) return;
      try {
        if (myParticipant) {
          socketService.joinSession(session.id, myParticipant.id);
        } else if (isFacilitator) {
          const firstParticipant = session.participants.find(p => !p.is_bot);
          if (firstParticipant) {
            socketService.joinSession(session.id, firstParticipant.id);
          }
        }
        socketJoinedRef.current = true;
      } catch (joinError) {
        console.error('Failed to join session via socket', joinError);
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
        setPublicState((prev: any) => ({ ...prev, ...payload.publicState }));
      }
      if (payload.participantState && myParticipant) {
        setParticipantState((prev: any) => ({ ...prev, ...payload.participantState }));
      }
    };

    const handleActionResult = (payload: any) => {
      if (payload.success) {
        setActionFeedback({
          type: 'success',
          message: payload.message || 'Action submitted successfully',
        });
        if (payload.updatedState) {
          setPublicState((prev: any) => ({ ...prev, ...payload.updatedState }));
          setParticipantState((prev: any) => ({ ...prev, ...payload.updatedState }));
        }
        if (payload.data) {
          setParticipantState((prev: any) => ({ ...prev, ...payload.data }));
        }
        setTimeout(() => loadSession(true), 500);
      } else {
        setActionFeedback({ type: 'error', message: payload.message || 'Action failed' });
      }
      setActionLoading(false);
    };

    const handleGameComplete = (payload: any) => {
      if (payload?.finalMetrics) {
        setParticipantState((prev: any) => ({ ...prev, metrics: payload.finalMetrics }));
      }
      setTimeout(() => loadSession(true), 500);
    };

    const handleSocketError = (payload: any) => {
      console.error('Socket error:', payload);
      setActionFeedback({ type: 'error', message: payload?.message || 'Server error' });
      setActionLoading(false);
    };

    socketService.on('session_update', handleSessionUpdate);
    socketService.on('action_result', handleActionResult);
    socketService.on('game_complete', handleGameComplete);
    socketService.on('error', handleSocketError);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('session_update', handleSessionUpdate);
      socketService.off('action_result', handleActionResult);
      socketService.off('game_complete', handleGameComplete);
      socketService.off('error', handleSocketError);
      socketService.disconnect();
      setSocketStatus('idle');
      socketJoinedRef.current = false;
    };
  }, [session?.id, session?.status, myParticipant?.id, isAuthenticated, isFacilitator, loadSession]);

  if (!isAuthenticated || loading) {
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

  if (session.status === 'IN_PROGRESS') {
    const GameUI = resolveGameComponent(session.simulation.slug);
    const mergedState = { ...(publicState || {}), ...(participantState || {}) };

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
                {myParticipant && (
                  <p className="text-slate-300 mt-2">
                    Playing as <span className="text-emerald-400 font-semibold">{myParticipant.role}</span>
                  </p>
                )}
              </div>
              <div className="text-right space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Session Code</p>
                  <p className="text-2xl font-mono font-semibold text-emerald-400">
                    {session.session_code}
                  </p>
                </div>
                <p className={`text-xs font-medium ${
                  socketStatus === 'connected'
                    ? 'text-emerald-400'
                    : socketStatus === 'connecting'
                    ? 'text-amber-300'
                    : 'text-red-400'
                }`}>
                  Socket: {socketStatus === 'connected' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting…' : 'Offline'}
                </p>
                {isFacilitator && (
                  <button
                    onClick={handleEndSession}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    End Session
                  </button>
                )}
              </div>
            </div>
          </div>

          {!myParticipant && !isFacilitator && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 text-amber-100">
              <p className="font-semibold mb-1">Spectator mode</p>
              <p className="text-sm">Join this session as a player to make decisions and see the full game interface.</p>
            </div>
          )}

          <GameUI
            sessionId={session.id}
            participantId={myParticipant?.id ?? null}
            state={mergedState}
            onAction={handleGameAction}
            isFacilitator={isFacilitator}
            actionLoading={actionLoading}
            actionFeedback={actionFeedback}
          />
        </main>
      </div>
    );
  }

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

  // Lobby (SETUP / WAITING)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />

      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Join Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {session.simulation.slug !== 'ev-gambit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Your Role</label>
                  <div className="space-y-2">
                    {availableRoles.length === 0 ? (
                      <p className="text-amber-600 text-sm">All roles are taken!</p>
                    ) : (
                      availableRoles.map(role => (
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
                            onChange={e => setSelectedRole(e.target.value)}
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    session.status === 'SETUP'
                      ? 'bg-yellow-100 text-yellow-800'
                      : session.status === 'WAITING'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.status === 'SETUP'
                    ? 'Setup'
                    : session.status === 'WAITING'
                    ? 'Waiting for Players'
                    : session.status}
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
                <span className="text-xl font-mono font-bold text-primary-600">{session.session_code}</span>
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

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Participants</h2>
            <button
              onClick={() => loadSession(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(SIMULATION_ROLES[session.simulation.slug] || []).map(role => {
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
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isMe ? 'bg-primary-200' : 'bg-green-200'
                        }`}
                      >
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

          {(!SIMULATION_ROLES[session.simulation.slug] ||
            SIMULATION_ROLES[session.simulation.slug].length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Role configuration not available for this simulation</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {canJoin &&
              !isParticipant &&
              !isFacilitator &&
              (session.simulation.slug === 'ev-gambit' || availableRoles.length > 0) && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Join Session
                </button>
              )}

            {isParticipant && (
              <div className="flex-1 flex items-center justify-center px-6 py-3 bg-green-100 text-green-800 rounded-lg">
                <CheckCircle className="w-5 h-5 mr-2" />
                You've joined as {myParticipant?.role}
              </div>
            )}

            {isFacilitator && (
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
                  : 'Start Game'}
              </button>
            )}
          </div>

          {canJoin && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Share the session code{' '}
              <span className="font-mono font-bold text-primary-600">{session.session_code}</span> with other
              players to invite them
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
