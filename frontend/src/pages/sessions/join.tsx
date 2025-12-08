import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  Hash,
  Lock,
  LogIn
} from 'lucide-react';

export default function JoinSessionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const code = sessionCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Please enter a valid session code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Find session by code
      const session = await api.getSessionByCode(code);
      
      // Navigate to session page
      router.push(`/sessions/${session.id}`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Session not found. Please check the code and try again.');
      } else {
        setError(err.response?.data?.error || 'Failed to find session');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
            <div className="text-center">
              <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h3>
              <p className="text-gray-600 mb-6">
                You need to be logged in to join game sessions.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push(`/login?redirect=/sessions/join&code=${sessionCode}`)}
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

      <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-6">
            <Hash className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join a Session</h1>
          <p className="text-gray-600">
            Enter the session code shared by your facilitator
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                Session Code
              </label>
              <input
                id="sessionCode"
                type="text"
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g., ABCD1234"
                className="w-full px-4 py-4 text-2xl font-mono font-bold text-center tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
                maxLength={10}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !sessionCode.trim()}
              className="w-full flex items-center justify-center px-6 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Join Session
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Don't have a code?{' '}
              <Link href="/simulations" className="text-primary-600 hover:text-primary-700 font-medium">
                Browse simulations
              </Link>
              {' '}to create your own session.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

