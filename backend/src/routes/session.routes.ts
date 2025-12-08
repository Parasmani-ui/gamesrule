import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
const sessionController = new SessionController();

// Create session (facilitator only)
router.post(
  '/',
  authenticateToken,
  requireRole('FACILITATOR', 'ADMIN'),
  (req, res) => sessionController.createSession(req, res)
);

// Get session by ID
router.get('/:sessionId', authenticateToken, (req, res) =>
  sessionController.getSession(req, res)
);

// Get session by code (for joining)
router.get('/code/:code', (req, res) =>
  sessionController.getSessionByCode(req, res)
);

// Join session
router.post('/:sessionId/join', authenticateToken, (req, res) =>
  sessionController.joinSession(req, res)
);

// Start session (facilitator only)
router.post('/:sessionId/start', authenticateToken, (req, res) =>
  sessionController.startSession(req, res)
);

// End session (facilitator only)
router.post('/:sessionId/end', authenticateToken, (req, res) =>
  sessionController.endSession(req, res)
);

// Facilitator: list own sessions
router.get(
  '/facilitator/my-sessions',
  authenticateToken,
  requireRole('FACILITATOR', 'ADMIN'),
  (req, res) => sessionController.listFacilitatorSessions(req, res)
);

// Facilitator: detailed session report
router.get(
  '/:sessionId/report',
  authenticateToken,
  requireRole('FACILITATOR', 'ADMIN'),
  (req, res) => sessionController.getSessionReport(req, res)
);

export default router;

