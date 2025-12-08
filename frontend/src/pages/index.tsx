import { useRouter } from 'next/router';
import { Navbar } from '../components/Navbar';
import { PlayCircle, BookOpen, Users, TrendingUp, Award, Target } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center py-20 animate-fade-in">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-primary-600">Parasmani Skills</span>
          </h1>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto mb-8">
            Master Real-World Business Skills Through Interactive Simulations
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mb-12">
            Experience hands-on learning in supply chain management, operations, strategy, 
            quality control, and decision-making through our comprehensive simulation platform.
          </p>

          <div className="flex justify-center space-x-6">
            <button
              onClick={() => router.push('/simulations')}
              className="flex items-center px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all"
            >
              <PlayCircle className="w-6 h-6 mr-2" />
              Explore Simulations
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="flex items-center px-8 py-4 bg-white text-primary-600 text-lg font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50 shadow-lg hover:shadow-xl transition-all"
            >
              <Users className="w-6 h-6 mr-2" />
              Get Started Free
            </button>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">11</div>
            <div className="text-gray-600">Business Simulations</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">1000+</div>
            <div className="text-gray-600">Students Trained</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">50+</div>
            <div className="text-gray-600">Institutions</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">100%</div>
            <div className="text-gray-600">Hands-On Learning</div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose Parasmani Skills?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Real-World Scenarios</h3>
              <p className="text-gray-600">
                Experience authentic business challenges from supply chain dynamics to strategic 
                decision-making. Our simulations mirror real corporate environments.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Interactive Learning</h3>
              <p className="text-gray-600">
                Learn by doing! Make decisions, see consequences in real-time, and understand 
                complex business concepts through hands-on practice.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Performance Analytics</h3>
              <p className="text-gray-600">
                Track your progress with detailed metrics and analytics. Compare performance, 
                identify improvement areas, and master business skills.
              </p>
            </div>
          </div>
        </div>

        {/* Simulation Categories */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Simulation Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Supply Chain', count: 3, color: 'blue', icon: '📦' },
              { title: 'Operations', count: 2, color: 'green', icon: '⚙️' },
              { title: 'Strategy', count: 2, color: 'purple', icon: '🎯' },
              { title: 'Decision Making', count: 2, color: 'orange', icon: '🧠' },
              { title: 'Quality Control', count: 1, color: 'red', icon: '✅' },
              { title: 'HR Management', count: 1, color: 'pink', icon: '👥' },
            ].map((category) => (
              <div
                key={category.title}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push('/simulations')}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{category.icon}</span>
                  <span className={`text-${category.color}-600 font-bold text-2xl`}>
                    {category.count}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{category.title}</h3>
                <p className="text-gray-600 text-sm">
                  Explore {category.count} simulation{category.count > 1 ? 's' : ''} in this category
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20 bg-white rounded-lg shadow-xl p-12">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sign Up</h3>
              <p className="text-gray-600">
                Create your free account as a student or facilitator
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Simulation</h3>
              <p className="text-gray-600">
                Browse 11 simulations and pick your learning path
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Play & Learn</h3>
              <p className="text-gray-600">
                Make decisions, see real-time results, and learn from outcomes
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Improve</h3>
              <p className="text-gray-600">
                Review analytics and continuously enhance your skills
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-16 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg shadow-xl mb-20">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Join thousands of students and professionals mastering business skills through 
            experiential learning.
          </p>
          <button
            onClick={() => router.push('/simulations')}
            className="px-10 py-4 bg-white text-primary-600 text-lg font-bold rounded-lg hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all"
          >
            View All Simulations
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center pb-12 text-gray-500">
          <p className="mb-2">
            <BookOpen className="inline w-5 h-5 mr-2" />
            Educational platform for business schools and corporate training
          </p>
          <p className="text-sm">
            © 2024 Parasmani Skills. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
