import { Request, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class SimulationController {
  async listSimulations(req: Request, res: Response) {
    try {
      // Try to get from database first
      let simulations;
      try {
        simulations = await prisma.simulation.findMany({
          orderBy: { id: 'asc' },
        });
      } catch (dbError) {
        // Fallback to reading from JSON file
        logger.warn('Database not available, reading from JSON file');
        const dataPath = path.join(process.cwd(), '..', 'simulations-data.json');
        const data = await fs.readFile(dataPath, 'utf-8');
        simulations = JSON.parse(data);
      }

      res.json({ simulations });
    } catch (error) {
      logger.error('List simulations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSimulation(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      let simulation;
      let activeSessions = [];

      try {
        simulation = await prisma.simulation.findUnique({
          where: { slug },
        });

        if (simulation) {
          // Get active sessions for this simulation
          activeSessions = await prisma.gameSession.findMany({
            where: {
              simulation_id: simulation.id,
              status: { in: ['WAITING', 'IN_PROGRESS'] },
            },
            select: {
              id: true,
              session_code: true,
              session_name: true,
              status: true,
              participants: {
                select: {
                  id: true,
                  player_name: true,
                  role: true,
                },
              },
            },
            take: 10,
            orderBy: { created_at: 'desc' },
          });
        }
      } catch (dbError) {
        // Fallback to reading from JSON file
        logger.warn('Database not available, reading from JSON file');
        const dataPath = path.join(process.cwd(), '..', 'simulations-data.json');
        const data = await fs.readFile(dataPath, 'utf-8');
        const simulations = JSON.parse(data);
        simulation = simulations.find((s: any) => s.slug === slug);
      }

      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }

      res.json({
        simulation,
        activeSessions,
      });
    } catch (error) {
      logger.error('Get simulation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Admin only - seed simulations from JSON
  async seedSimulations(req: Request, res: Response) {
    try {
      // Read simulations data file
      const dataPath = path.join(process.cwd(), '..', 'simulations-data.json');
      const data = await fs.readFile(dataPath, 'utf-8');
      const simulations = JSON.parse(data);

      // Upsert each simulation
      for (const sim of simulations) {
        await prisma.simulation.upsert({
          where: { slug: sim.slug },
          create: {
            slug: sim.slug,
            name: sim.name,
            type: sim.type,
            author: sim.author,
            description: sim.description,
            duration_minutes: sim.duration_minutes,
            difficulty_level: sim.difficulty_level,
            learning_objectives: sim.learning_objectives,
            max_players: sim.max_players,
            min_players: sim.min_players,
            supports_bots: sim.supports_bots,
            tags: sim.tags,
          },
          update: {
            name: sim.name,
            description: sim.description,
            duration_minutes: sim.duration_minutes,
            difficulty_level: sim.difficulty_level,
            learning_objectives: sim.learning_objectives,
            max_players: sim.max_players,
            min_players: sim.min_players,
            supports_bots: sim.supports_bots,
            tags: sim.tags,
          },
        });
      }

      logger.info('Simulations seeded successfully');

      res.json({
        message: 'Simulations seeded successfully',
        count: simulations.length,
      });
    } catch (error) {
      logger.error('Seed simulations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

