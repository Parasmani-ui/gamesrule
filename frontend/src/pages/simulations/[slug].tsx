import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  PlayCircle,
  Plus,
  CheckCircle,
  Lock,
  LogIn
} from 'lucide-react';

export default function SimulationDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAuthenticated, user } = useAuthStore();

  const [simulation, setSimulation] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (slug) {
      loadSimulation();
    }
  }, [slug]);

  const loadSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSimulation(slug as string);
      setSimulation(data.simulation);
      setActiveSessions(data.activeSessions || []);
    } catch (err: any) {
      // Allow browsing without authentication
      if (err.response?.status === 401) {
        // Still try to get simulation data without active sessions
        setError(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load simulation');
      }
      console.error('Error loading simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    if (user?.role !== 'FACILITATOR' && user?.role !== 'ADMIN') {
      alert('Only facilitators can create sessions. Please sign up as a facilitator.');
      return;
    }

    try {
      setCreating(true);
      const sessionName = `${simulation.name} - ${new Date().toLocaleDateString()}`;
      const response = await api.createSession({
        simulationSlug: simulation.slug,
        sessionName,
        configuration: {},
      });

      router.push(`/sessions/${response.session.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    router.push(`/sessions/${sessionId}`);
  };

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

  if (error || !simulation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error || 'Simulation not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-slide-up">
            <div className="text-center">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h3>
              <p className="text-gray-600 mb-6">
                You need to be logged in to create or join game sessions. 
                Signing up is free and takes less than a minute!
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Login
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Sign Up Free
                </button>
              </div>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {simulation.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">by {simulation.author}</p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{simulation.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>{simulation.min_players}-{simulation.max_players} players</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="capitalize">{simulation.difficulty_level}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              {isAuthenticated && (user?.role === 'FACILITATOR' || user?.role === 'ADMIN') ? (
                <button
                  onClick={handleCreateSession}
                  disabled={creating}
                  className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5 mr-2" />
                  )}
                  Create Session
                </button>
              ) : !isAuthenticated ? (
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Lock className="w-5 h-5 mr-2" />
                  Login to Create Session
                </button>
              ) : (
                <div className="text-sm text-gray-500 text-center px-4 py-2 bg-gray-100 rounded-lg">
                  Only facilitators can create sessions
                </div>
              )}
              
              {simulation.slug === 'fruit-beer-game' && (
                <span className="text-xs text-green-600 font-medium flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Fully Implemented
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Simulation</h2>
          <p className="text-gray-700 leading-relaxed mb-6">{simulation.description}</p>

          {simulation.learning_objectives && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Learning Objectives</h3>
              <ul className="space-y-2">
                {simulation.learning_objectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Active Sessions */}
        {isAuthenticated && activeSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Sessions</h2>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-400 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{session.session_name}</h3>
                    <p className="text-sm text-gray-600">
                      Code: <span className="font-mono font-bold">{session.session_code}</span>
                      {' '} • {session.participants.length} players joined
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinSession(session.id)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Join/View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Sessions + Not Logged In */}
        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8">
            <div className="text-center">
              <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Ready to Play?
              </h3>
              <p className="text-gray-600 mb-6">
                Create a free account to start playing simulations and track your progress.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => router.push('/signup')}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Sign Up Free
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {simulation.tags && simulation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {simulation.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 text-sm rounded-full bg-primary-100 text-primary-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
