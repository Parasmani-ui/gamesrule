import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '../components/Navbar';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import {
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  Users,
  ArrowRight,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from 'lucide-react';

interface FacilitatorSession {
  id: string;
  code: string;
  name: string;
  status: string;
  currentRound: number;
  maxRounds: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  simulation: {
    id: number;
    slug: string;
    name: string;
    type?: string;
  };
  participantCount: number;
}

interface SessionReportRound {
  roundNumber: number;
  decisions: {
    participantId: string;
    playerName: string;
    role: string;
    isBot: boolean;
    orderQuantity?: number;
    raw: any;
  }[];
}

interface SessionReport {
  session: {
    id: string;
    code: string;
    name: string;
    status: string;
    currentRound: number;
    maxRounds: number | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    simulation: {
      id: number;
      slug: string;
      name: string;
      type?: string;
    };
  };
  participants: {
    id: string;
    playerName: string;
    role: string;
    isBot: boolean;
    userId?: string | null;
  }[];
  rounds: SessionReportRound[];
  fruitBeer?: {
    weeks: Array<{
      week: number;
      inventory: Record<string, number>;
      backorders: Record<string, number>;
      ordersPlaced: Record<string, number>;
      costs: Record<string, number>;
    }>;
    summary: {
      roles: Record<string, {
        totalCost: number;
        avgInventory: number;
        avgBackorder: number;
        avgOrder: number;
        maxInventory: number;
        maxBackorder: number;
        inventoryVariance: number;
        orderVariance: number;
      }>;
      bullwhipIndex: number;
      totalWeeks: number;
    };
  } | null;
}

const formatDate = (value: string | null) => {
  if (!value) return '--';
  return new Date(value).toLocaleString();
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [sessions, setSessions] = useState<FacilitatorSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoadingSessions(true);
        const data = await api.getMyFacilitatorSessions();
        setSessions(data);
        if (data.length && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load sessions');
      } finally {
        setLoadingSessions(false);
      }
    };

    if (isAuthenticated && (user?.role === 'FACILITATOR' || user?.role === 'ADMIN')) {
      loadSessions();
    }
  }, [isAuthenticated, user?.role, selectedSessionId]);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedSessionId) {
        setReport(null);
        return;
      }

      try {
        setLoadingReport(true);
        const data = await api.getSessionReport(selectedSessionId);
        setReport(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load session report');
      } finally {
        setLoadingReport(false);
      }
    };

    if (selectedSessionId) {
      loadReport();
    }
  }, [selectedSessionId]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (user?.role !== 'FACILITATOR' && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h1 className="text-xl font-semibold text-red-900">Access restricted</h1>
              <p className="text-red-700">
                Only facilitators and admins can view the dashboard.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facilitator Dashboard</h1>
            <p className="text-gray-600 mt-1">
              View completed and in-progress sessions, along with detailed reports.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
          {/* Sessions list */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Your Sessions
              </h2>
              {loadingSessions && (
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              )}
            </div>
            {sessions.length === 0 && !loadingSessions ? (
              <p className="text-sm text-gray-500">
                No sessions found. Create a simulation session from the Simulations page.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg border ${
                      selectedSessionId === s.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">
                          {s.simulation.name} • Code:{' '}
                          <span className="font-mono font-semibold">{s.code}</span>
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p className="capitalize">{s.status.toLowerCase()}</p>
                        <p>{s.participantCount} participants</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Report */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            {loadingReport || !report ? (
              <div className="flex flex-col items-center justify-center py-12">
                {selectedSessionId && loadingReport ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-3" />
                    <p className="text-sm text-gray-600">Loading session report…</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Select a session from the left to view its report.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {report.session.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {report.session.simulation.name} • Code:{' '}
                      <span className="font-mono font-semibold">
                        {report.session.code}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {formatDate(report.session.createdAt)} • Started:{' '}
                      {formatDate(report.session.startedAt)} • Completed:{' '}
                      {formatDate(report.session.completedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(report, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `session-report-${report.session.code}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export JSON
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-primary-600" />
                    Participants
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.participants.map((p) => (
                      <div
                        key={p.id}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-gray-900 flex items-center justify-between">
                          <span className="truncate">{p.playerName}</span>
                          {p.isBot && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              BOT
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{p.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fruit Beer Analytics */}
                {report.fruitBeer && (
                  <>
                    {/* Participant Comparison */}
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-primary-600" />
                        Participant Performance Comparison
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">
                                Role
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Total Cost
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Avg Inventory
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Avg Backorder
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Avg Order
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Max Inventory
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700 border-b">
                                Max Backorder
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(report.fruitBeer.summary.roles)
                              .sort(([a], [b]) => {
                                const order = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];
                                return order.indexOf(a) - order.indexOf(b);
                              })
                              .map(([role, stats]) => (
                                <tr key={role} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium text-gray-900">
                                    {role}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.totalCost.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.avgInventory.toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.avgBackorder.toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.avgOrder.toFixed(1)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.maxInventory.toFixed(0)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {stats.maxBackorder.toFixed(0)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Bullwhip Index:</strong>{' '}
                          {report.fruitBeer.summary.bullwhipIndex.toFixed(2)}
                          {report.fruitBeer.summary.bullwhipIndex > 1.5 && (
                            <span className="ml-2 text-orange-600">
                              (High variability - indicates bullwhip effect)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Weekly Breakdown */}
                    <div className="border-t border-gray-100 pt-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-primary-600" />
                        Weekly Performance Breakdown
                      </h3>
                      <div className="max-h-[400px] overflow-y-auto pr-1">
                        <div className="space-y-4">
                          {report.fruitBeer.weeks.map((weekData) => (
                            <div
                              key={weekData.week}
                              className="border border-gray-200 rounded-lg p-3"
                            >
                              <p className="font-semibold text-gray-800 mb-2 text-sm">
                                Week {weekData.week}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'].map(
                                  (role) => {
                                    const inv = weekData.inventory[role] ?? 0;
                                    const back = weekData.backorders[role] ?? 0;
                                    const order = weekData.ordersPlaced[role] ?? 0;
                                    const cost = weekData.costs[role] ?? 0;
                                    return (
                                      <div
                                        key={role}
                                        className="bg-gray-50 rounded-md p-2 text-xs"
                                      >
                                        <p className="font-semibold text-gray-900 mb-1.5">
                                          {role}
                                        </p>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600 flex items-center">
                                              <Package className="w-3 h-3 mr-1" />
                                              Inventory:
                                            </span>
                                            <span className="font-medium text-gray-900">
                                              {inv.toFixed(0)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600 flex items-center">
                                              <AlertTriangle className="w-3 h-3 mr-1" />
                                              Backorder:
                                            </span>
                                            <span className="font-medium text-orange-600">
                                              {back.toFixed(0)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Order:</span>
                                            <span className="font-medium text-blue-600">
                                              {order.toFixed(0)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between pt-1 border-t border-gray-200">
                                            <span className="text-gray-600 flex items-center">
                                              <DollarSign className="w-3 h-3 mr-1" />
                                              Cost:
                                            </span>
                                            <span className="font-medium text-red-600">
                                              {cost.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Decisions by round */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-primary-600" />
                    Orders by round
                  </h3>
                  {report.rounds.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No player decisions recorded for this session.
                    </p>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3">
                      {report.rounds.map((round) => (
                        <div
                          key={round.roundNumber}
                          className="border border-gray-200 rounded-lg p-3 text-xs"
                        >
                          <p className="font-semibold text-gray-800 mb-2">
                            Week {round.roundNumber}
                          </p>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {round.decisions.map((d) => (
                              <div
                                key={`${round.roundNumber}-${d.participantId}`}
                                className="bg-gray-50 rounded-md px-2 py-1.5"
                              >
                                <p className="font-medium text-gray-900 flex justify-between">
                                  <span className="truncate">{d.playerName}</span>
                                  <span className="ml-2 text-[10px] text-gray-500">
                                    {d.role}
                                  </span>
                                </p>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                  Order: {d.orderQuantity ?? '—'} units
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


