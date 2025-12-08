import { GameEngine } from '../../types';
import { FruitBeerEngine } from './FruitBeerEngine';
import { TOCFactoryEngine } from './TOCFactoryEngine';
import { OnionDilemmaEngine } from './OnionDilemmaEngine';
import { CustomerInStoreEngine } from './CustomerInStoreEngine';
import { DemandForecastEngine } from './DemandForecastEngine';
import { DualSourceEngine } from './DualSourceEngine';
import { HRCompensationEngine } from './HRCompensationEngine';
import { DefectDetectivesEngine } from './DefectDetectivesEngine';
import { EVGambitEngine } from './EVGambitEngine';
import { OrderOpsEngine } from './OrderOpsEngine';
import { SustainableSelectEngine } from './SustainableSelectEngine';
import { logger } from '../../utils/logger';

/**
 * Game Engine Factory
 * 
 * Creates the appropriate game engine instance based on simulation slug
 */
export class GameEngineFactory {
  private static engines: Map<string, GameEngine> = new Map();

  static create(simulationSlug: string, sessionId: string): GameEngine {
    const cacheKey = `${simulationSlug}:${sessionId}`;

    // Return cached engine if exists and matches
    if (this.engines.has(cacheKey)) {
      const cachedEngine = this.engines.get(cacheKey)!;
      // Verify the cached engine matches the requested simulation
      if (cachedEngine.simulationSlug === simulationSlug) {
        return cachedEngine;
      } else {
        // Mismatch detected - remove from cache and create new
        logger.warn(`Engine cache mismatch for ${cacheKey}. Expected ${simulationSlug}, got ${cachedEngine.simulationSlug}. Recreating.`);
        this.engines.delete(cacheKey);
      }
    }

    // Create new engine
    let engine: GameEngine;

    switch (simulationSlug) {
      case 'fruit-beer-game':
        engine = new FruitBeerEngine(sessionId);
        break;

      case 'toc-factory':
        engine = new TOCFactoryEngine(sessionId);
        break;

      case 'onion-dilemma':
        engine = new OnionDilemmaEngine(sessionId);
        break;

      case 'customer-in-store':
        engine = new CustomerInStoreEngine(sessionId);
        break;

      case 'demand-forecast-challenge':
        engine = new DemandForecastEngine(sessionId);
        break;

      case 'dual-source-dilemma':
        engine = new DualSourceEngine(sessionId);
        break;

      case 'hr-compensation':
        engine = new HRCompensationEngine(sessionId);
        break;

      case 'defect-detectives':
        engine = new DefectDetectivesEngine(sessionId);
        break;

      case 'ev-gambit':
        engine = new EVGambitEngine(sessionId);
        break;

      case 'order-ops':
        engine = new OrderOpsEngine(sessionId);
        break;

      case 'sustainable-select':
        engine = new SustainableSelectEngine(sessionId);
        break;

      default:
        logger.error(`Unknown simulation slug: ${simulationSlug}`);
        throw new Error(`Unknown simulation: "${simulationSlug}"`);
    }

    // Cache the engine
    this.engines.set(cacheKey, engine);

    return engine;
  }

  static remove(simulationSlug: string, sessionId: string): void {
    const cacheKey = `${simulationSlug}:${sessionId}`;
    this.engines.delete(cacheKey);
  }

  static clearAll(): void {
    this.engines.clear();
  }
}

