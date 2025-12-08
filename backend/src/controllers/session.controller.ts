import { Response } from 'express';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';
import { generateSessionCode } from '../utils/session-code';
import { GameEngineFactory } from '../services/gameEngines/factory';

export class SessionController {
  async createSession(req: AuthRequest, res: Response) {
    try {
      const { simulationSlug, sessionName, configuration, maxRounds } = req.body;
      const userId = req.user?.id;

      if (!simulationSlug || !sessionName) {
        return res.status(400).json({
          error: 'Simulation slug and session name are required',
        });
      }

      // Find simulation
      const simulation = await prisma.simulation.findUnique({
        where: { slug: simulationSlug },
      });

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }

      // Generate unique session code
      const sessionCode = await generateSessionCode();

      // Create session
      const session = await prisma.gameSession.create({
        data: {
          simulation_id: simulation.id,
          session_code: sessionCode,
          session_name: sessionName,
          facilitator_id: userId,
          configuration: configuration || {},
          max_rounds: maxRounds || 20,
          status: 'SETUP',
        },
        include: {
          simulation: true,
        },
      });

      logger.info(`Session created: ${session.session_code} for ${simulation.name}`);

      res.status(201).json({
        message: 'Session created successfully',
        session: {
          id: session.id,
          code: session.session_code,
          name: session.session_name,
          simulation: simulation.name,
          simulationSlug: simulation.slug,
          status: session.status,
        },
      });
    } catch (error) {
      logger.error('Create session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          simulation: true,
          participants: {
            orderBy: { joined_at: 'asc' },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ session });
    } catch (error) {
      logger.error('Get session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSessionByCode(req: AuthRequest, res: Response) {
    try {
      const { code } = req.params;

      const session = await prisma.gameSession.findUnique({
        where: { session_code: code },
        include: {
          simulation: true,
          participants: {
            select: {
              id: true,
              player_name: true,
              role: true,
              is_bot: true,
            },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ session });
    } catch (error) {
      logger.error('Get session by code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async joinSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const { playerName, role } = req.body;
      const userId = req.user?.id;

      if (!playerName) {
        return res.status(400).json({
          error: 'Player name is required',
        });
      }

      // For EV Gambit, role is optional - use default 'PLAYER' if not provided
      const roleToUse = role || 'PLAYER';

      // Get session
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          simulation: true,
          participants: true,
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'SETUP' && session.status !== 'WAITING') {
        return res.status(400).json({
          error: 'Cannot join session - game already started or completed',
        });
      }

      // For EV Gambit, assign unique role names (PLAYER_1, PLAYER_2, etc.) to allow multiple participants
      // For other simulations, check if role is already taken
      let finalRole = roleToUse;
      if (session.simulation.slug === 'ev-gambit') {
        // Count existing participants to assign unique role number
        const participantCount = session.participants.length;
        finalRole = `PLAYER_${participantCount + 1}`;
      } else {
        const existingParticipant = session.participants.find(
          (p) => p.role === roleToUse
        );

        if (existingParticipant) {
          return res.status(409).json({ error: 'Role already taken' });
        }
        finalRole = roleToUse;
      }

      // Check max players
      if (session.participants.length >= session.simulation.max_players) {
        return res.status(400).json({ error: 'Session is full' });
      }

      // Create participant
      const participant = await prisma.sessionParticipant.create({
        data: {
          session_id: sessionId,
          user_id: userId,
          player_name: playerName,
          role: finalRole,
          is_bot: false,
        },
      });

      logger.info(`Player ${playerName} joined session ${session.session_code} as ${finalRole}`);

      res.status(201).json({
        message: 'Joined session successfully',
        participant: {
          id: participant.id,
          playerName: participant.player_name,
          role: participant.role,
        },
      });
    } catch (error) {
      logger.error('Join session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async startSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          simulation: true,
          participants: true,
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if user is facilitator
      if (session.facilitator_id !== userId) {
        return res.status(403).json({
          error: 'Only the facilitator can start the session',
        });
      }

      if (session.status !== 'SETUP' && session.status !== 'WAITING') {
        return res.status(400).json({
          error: 'Session already started or completed',
        });
      }

      // For Fruit Beer Game: Auto-fill missing roles with bots
      if (session.simulation.slug === 'fruit-beer-game') {
        const REQUIRED_ROLES = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];
        const humanParticipants = session.participants.filter(p => !p.is_bot);
        const allParticipants = session.participants;
        
        // Check at least 1 human participant
        if (humanParticipants.length === 0) {
          return res.status(400).json({
            error: 'At least 1 human participant is required to start the simulation',
          });
        }

        // Get roles already filled (by humans or bots)
        const filledRoles = new Set(allParticipants.map(p => p.role));
        const missingRoles = REQUIRED_ROLES.filter(role => !filledRoles.has(role));

        // Create bots for missing roles
        if (missingRoles.length > 0) {
          logger.info(`Auto-filling ${missingRoles.length} missing role(s) with bots for session ${session.session_code}`);
          
          for (const role of missingRoles) {
            await prisma.sessionParticipant.create({
              data: {
                session_id: sessionId,
                player_name: `Bot ${role}`,
                role: role,
                is_bot: true,
                bot_strategy: 'SMOOTHING', // Default strategy as per BOT_STRATEGY_EXPLAINED.md
                user_id: null,
              },
            });
            logger.info(`Created bot participant for role: ${role}`);
          }
        }

        // Verify we now have all 4 roles
        const updatedParticipants = await prisma.sessionParticipant.findMany({
          where: { session_id: sessionId },
        });
        
        const finalFilledRoles = new Set(updatedParticipants.map(p => p.role));
        const stillMissing = REQUIRED_ROLES.filter(role => !finalFilledRoles.has(role));
        
        if (stillMissing.length > 0) {
          logger.error(`Failed to fill all roles. Still missing: ${stillMissing.join(', ')}`);
          return res.status(500).json({
            error: `Failed to fill all required roles. Missing: ${stillMissing.join(', ')}`,
          });
        }

        logger.info(`Session ${session.session_code} has all 4 roles filled (${humanParticipants.length} human(s), ${updatedParticipants.length - humanParticipants.length} bot(s))`);
      } else {
        // For other simulations, check minimum players
        if (session.participants.length < session.simulation.min_players) {
          if (!session.simulation.supports_bots) {
            return res.status(400).json({
              error: `Minimum ${session.simulation.min_players} players required`,
            });
          }
          
          logger.info(`Need to add bots for session ${session.session_code}`);
        }
      }

      // Update session status
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'IN_PROGRESS',
          started_at: new Date(),
        },
      });

      // Initialize game engine
      const engine = GameEngineFactory.create(
        session.simulation.slug,
        sessionId
      );
      await engine.initialize(session.configuration);

      logger.info(`Session started: ${session.session_code}`);

      res.json({
        message: 'Session started successfully',
        sessionId: session.id,
      });
    } catch (error) {
      logger.error('Start session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async endSession(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.facilitator_id !== userId) {
        return res.status(403).json({
          error: 'Only the facilitator can end the session',
        });
      }

      if (session.status !== 'IN_PROGRESS') {
        return res.status(400).json({
          error: 'Session is not in progress',
        });
      }

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
        },
      });

      logger.info(`Session ended: ${session.session_code}`);

      // REPORTS_DISABLED: This is where report generation would be triggered
      // await reportQueue.add('generateReports', { sessionId });

      res.json({
        message: 'Session ended successfully',
      });
    } catch (error) {
      logger.error('End session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List all sessions for the current facilitator/admin
   */
  async listFacilitatorSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sessions = await prisma.gameSession.findMany({
        where: {
          facilitator_id: userId,
        },
        include: {
          simulation: true,
          participants: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const formatted = sessions.map((session) => ({
        id: session.id,
        code: session.session_code,
        name: session.session_name,
        status: session.status,
        currentRound: session.current_round,
        maxRounds: session.max_rounds,
        createdAt: session.created_at,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        simulation: {
          id: session.simulation.id,
          slug: session.simulation.slug,
          name: session.simulation.name,
          type: session.simulation.type,
        },
        participantCount: session.participants.length,
      }));

      res.json({ sessions: formatted });
    } catch (error) {
      logger.error('List facilitator sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Detailed per-session report for facilitator dashboard
   * - Participant list (humans & bots)
   * - All decisions per round
   * - Engine-specific state snapshots (Fruit Beer)
   */
  async getSessionReport(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
          simulation: true,
          participants: true,
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.facilitator_id !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'You are not allowed to view this session report',
        });
      }

      // Player decisions grouped by round
      const decisions = await prisma.playerDecision.findMany({
        where: { session_id: sessionId },
        orderBy: [
          { round_number: 'asc' },
          { created_at: 'asc' },
        ],
      });

      const participantsById = new Map(
        session.participants.map((p) => [p.id, p])
      );

      const rounds: Record<
        number,
        {
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
      > = {};

      for (const decision of decisions) {
        const roundNumber = decision.round_number;
        if (!rounds[roundNumber]) {
          rounds[roundNumber] = {
            roundNumber,
            decisions: [],
          };
        }

        const participant = participantsById.get(decision.participant_id);
        const payload: any = decision.decision_payload as any;

        rounds[roundNumber].decisions.push({
          participantId: decision.participant_id,
          playerName: participant?.player_name || 'Unknown',
          role: participant?.role || 'UNKNOWN',
          isBot: participant?.is_bot ?? false,
          orderQuantity:
            typeof payload.orderQuantity === 'number'
              ? payload.orderQuantity
              : undefined,
          raw: decision.decision_payload,
        });
      }

      // Fruit Beer specific: weekly state snapshots with analytics
      let fruitBeerAnalytics: any = null;
      if (session.simulation.slug === 'fruit-beer-game') {
        const fruitBeerStates = await prisma.fruitBeerGameState.findMany({
          where: { session_id: sessionId },
          orderBy: { week: 'asc' },
        });

        if (fruitBeerStates.length > 0) {
          // Process weekly data
          const weeks: any[] = [];
          const roleStats: Record<string, { inventories: number[]; backorders: number[]; costs: number[]; orders: number[] }> = {};

          for (const state of fruitBeerStates) {
            const inventory = state.inventory as Record<string, number>;
            const backorders = state.backorders as Record<string, number>;
            const ordersPlaced = state.orders_placed as Record<string, number>;
            const costs = state.costs as Record<string, number>;

            weeks.push({
              week: state.week,
              inventory,
              backorders,
              ordersPlaced,
              costs,
            });

            // Accumulate stats per role
            for (const role of Object.keys(inventory)) {
              if (!roleStats[role]) {
                roleStats[role] = { inventories: [], backorders: [], costs: [], orders: [] };
              }
              roleStats[role].inventories.push(inventory[role] || 0);
              roleStats[role].backorders.push(backorders[role] || 0);
              roleStats[role].costs.push(costs[role] || 0);
              roleStats[role].orders.push(ordersPlaced[role] || 0);
            }
          }

          // Compute summary per role
          const roleSummary: Record<string, any> = {};
          for (const [role, stats] of Object.entries(roleStats)) {
            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            const totalCost = stats.costs.length > 0 ? stats.costs[stats.costs.length - 1] : 0; // Final cumulative cost
            const variance = (arr: number[]) => {
              if (arr.length === 0) return 0;
              const mean = avg(arr);
              return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
            };

            roleSummary[role] = {
              totalCost,
              avgInventory: avg(stats.inventories),
              avgBackorder: avg(stats.backorders),
              avgOrder: avg(stats.orders),
              maxInventory: Math.max(...stats.inventories),
              maxBackorder: Math.max(...stats.backorders),
              inventoryVariance: variance(stats.inventories),
              orderVariance: variance(stats.orders),
            };
          }

          // Compute bullwhip effect (variance of orders / variance of demand)
          // For now, use a simplified calculation
          const retailerOrders = roleStats['RETAILER']?.orders || [];
          const demandVariance = retailerOrders.length > 0
            ? (() => {
                const mean = retailerOrders.reduce((a, b) => a + b, 0) / retailerOrders.length;
                return retailerOrders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / retailerOrders.length;
              })()
            : 1;

          const manufacturerOrders = roleStats['MANUFACTURER']?.orders || [];
          const manufacturerVariance = manufacturerOrders.length > 0
            ? (() => {
                const mean = manufacturerOrders.reduce((a, b) => a + b, 0) / manufacturerOrders.length;
                return manufacturerOrders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / manufacturerOrders.length;
              })()
            : 1;

          const bullwhipIndex = demandVariance > 0 ? manufacturerVariance / demandVariance : 1;

          fruitBeerAnalytics = {
            weeks,
            summary: {
              roles: roleSummary,
              bullwhipIndex,
              totalWeeks: weeks.length,
            },
          };
        }
      }

      res.json({
        session: {
          id: session.id,
          code: session.session_code,
          name: session.session_name,
          status: session.status,
          currentRound: session.current_round,
          maxRounds: session.max_rounds,
          createdAt: session.created_at,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          simulation: {
            id: session.simulation.id,
            slug: session.simulation.slug,
            name: session.simulation.name,
            type: session.simulation.type,
          },
        },
        participants: session.participants.map((p) => ({
          id: p.id,
          playerName: p.player_name,
          role: p.role,
          isBot: p.is_bot,
          userId: p.user_id,
        })),
        rounds: Object.values(rounds),
        fruitBeer: fruitBeerAnalytics,
      });
    } catch (error) {
      logger.error('Get session report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

