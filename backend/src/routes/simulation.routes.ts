import { Router } from 'express';
import { SimulationController } from '../controllers/simulation.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const simulationController = new SimulationController();

router.get('/', (req, res) => simulationController.listSimulations(req, res));
router.get('/:slug', (req, res) => simulationController.getSimulation(req, res));

// Admin only
router.post(
  '/seed',
  authenticateToken,
  requireRole('ADMIN'),
  (req, res) => simulationController.seedSimulations(req, res)
);

export default router;

