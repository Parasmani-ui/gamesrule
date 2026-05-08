import { GameComponent } from './types';
import { HRCompensationGame } from './HRCompensation';
import { FruitBeerGame } from './FruitBeer';
import { CustomerInStoreGame } from './CustomerInStore';
import { EVGambitGame } from './EVGambit';
import { Placeholder } from './Placeholder';

/**
 * Slug → game component map. Add an entry here when a simulation graduates from
 * the placeholder to a dedicated UI under `components/games/{Sim}/`.
 *
 * The dispatcher in `pages/sessions/[sessionId].tsx` looks up by `simulation.slug`
 * and falls back to `Placeholder` when the slug is not registered.
 */
export const gameComponents: Record<string, GameComponent> = {
  'hr-compensation': HRCompensationGame,
  'fruit-beer-game': FruitBeerGame,
  'customer-in-store': CustomerInStoreGame,
  'ev-gambit': EVGambitGame,
};

export function resolveGameComponent(slug: string): GameComponent {
  return gameComponents[slug] ?? Placeholder;
}

export { Placeholder };
export type { GameProps, GameComponent } from './types';
