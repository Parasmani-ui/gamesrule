import { GameEngine, ActionResult, RoundResult } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Base Game Engine
 * 
 * All simulation engines should extend this abstract class.
 * Provides common structure and methods that all game engines must implement.
 */
export abstract class BaseGameEngine implements GameEngine {
  public sessionId: string;
  public simulationSlug: string;
  protected gameState: any;
  protected isInitialized: boolean = false;

  constructor(sessionId: string, simulationSlug: string) {
    this.sessionId = sessionId;
    this.simulationSlug = simulationSlug;
  }

  /**
   * Initialize the game engine with session configuration
   * @param config - Simulation-specific configuration object
   */
  abstract initialize(config: any): Promise<void>;

  /**
   * Apply a player action to the game state
   * @param participantId - ID of the participant making the action
   * @param action - Action payload (simulation-specific)
   * @returns Result of the action
   */
  abstract applyAction(participantId: string, action: any): Promise<ActionResult>;

  /**
   * Advance the game to the next round
   * @returns Result of the round advancement
   */
  abstract advanceRound(): Promise<RoundResult>;

  /**
   * Compute current game metrics and analytics
   * @returns Metrics object
   */
  abstract computeMetrics(): Promise<any>;

  /**
   * Get the public game state (safe for all participants)
   * @returns Serializable public state
   */
  abstract getPublicState(): any;

  /**
   * Get participant-specific game state
   * @param participantId - ID of the participant
   * @returns Participant's view of the game state
   */
  abstract getParticipantState(participantId: string): any;

  /**
   * Validate that the engine is initialized
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`Game engine for ${this.simulationSlug} is not initialized`);
    }
  }

  /**
   * Log engine events
   */
  protected log(message: string, data?: any): void {
    logger.info(`[${this.simulationSlug}][${this.sessionId}] ${message}`, data);
  }

  /**
   * Log engine errors
   */
  protected logError(message: string, error?: any): void {
    logger.error(`[${this.simulationSlug}][${this.sessionId}] ${message}`, error);
  }
}

