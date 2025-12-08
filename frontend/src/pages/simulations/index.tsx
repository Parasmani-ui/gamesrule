import { useEffect, useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { SimulationCard } from '../../components/SimulationCard';
import { api } from '../../services/api';
import { Loader2, AlertCircle, Filter } from 'lucide-react';

interface Simulation {
  id: number;
  slug: string;
  name: string;
  type: string;
  author: string;
  description: string;
  duration_minutes: number;
  difficulty_level: string;
  max_players: number;
  min_players: number;
  supports_bots: boolean;
  tags: string[];
}

export default function Simulations() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSimulations();
      setSimulations(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load simulations');
      console.error('Error loading simulations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSimulations = simulations.filter((sim) => {
    if (filter === 'all') return true;
    return sim.type === filter || sim.difficulty_level === filter;
  });

  const categories = [
    { value: 'all', label: 'All Simulations' },
    { value: 'supply-chain', label: 'Supply Chain' },
    { value: 'operations', label: 'Operations' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'decision-analysis', label: 'Decision Analysis' },
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Business Simulations
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose from our collection of 11 interactive simulations covering supply chain, 
            operations, strategy, and business decision-making.
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Simulations</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === cat.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <div className="w-px bg-gray-300 mx-2"></div>
            {difficulties.map((diff) => (
              <button
                key={diff.value}
                onClick={() => setFilter(diff.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === diff.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Simulations</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadSimulations}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {!loading && !error && filteredSimulations.length > 0 && (
          <div className="mb-6 text-gray-600">
            Showing <span className="font-semibold">{filteredSimulations.length}</span> simulation
            {filteredSimulations.length !== 1 ? 's' : ''}
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="ml-2 text-primary-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Simulations Grid */}
        {!loading && !error && filteredSimulations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {filteredSimulations.map((simulation) => (
              <SimulationCard key={simulation.id} simulation={simulation} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSimulations.length === 0 && filter !== 'all' && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              No simulations found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your filter to see more results
            </p>
            <button
              onClick={() => setFilter('all')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              View All Simulations
            </button>
          </div>
        )}

        {/* No Simulations */}
        {!loading && !error && simulations.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              No simulations available yet
            </h3>
            <p className="text-gray-500">
              Please run the seed script to populate the database with simulations.
            </p>
            <code className="mt-4 inline-block px-4 py-2 bg-gray-100 rounded-md text-sm">
              cd backend && npm run prisma:seed
            </code>
          </div>
        )}
      </main>
    </div>
  );
}

