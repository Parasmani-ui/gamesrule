import Link from 'next/link';
import { Clock, Users, TrendingUp } from 'lucide-react';

interface Simulation {
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

interface SimulationCardProps {
  simulation: Simulation;
}

export function SimulationCard({ simulation }: SimulationCardProps) {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  const difficultyColor =
    difficultyColors[simulation.difficulty_level as keyof typeof difficultyColors] ||
    'bg-gray-100 text-gray-800';

  return (
    <Link href={`/simulations/${simulation.slug}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 h-full flex flex-col cursor-pointer border border-gray-200 hover:border-primary-400">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
            {simulation.name}
          </h3>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${difficultyColor}`}
          >
            {simulation.difficulty_level}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-2">by {simulation.author}</p>
        
        <p className="text-gray-700 mb-4 flex-grow line-clamp-3">
          {simulation.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{simulation.duration_minutes} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>
              {simulation.min_players}-{simulation.max_players} players
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>{simulation.type}</span>
          </div>
        </div>

        {simulation.supports_bots && (
          <div className="mt-2 text-xs text-primary-600 font-medium">
            ✓ Single-player with bots available
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {simulation.tags?.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

