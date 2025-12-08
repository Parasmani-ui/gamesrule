import { Request } from 'express';

// Extend Express Request with user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Game Engine Types
export interface GameEngine {
  sessionId: string;
  simulationSlug: string;
  
  initialize(config: any): Promise<void>;
  applyAction(participantId: string, action: any): Promise<ActionResult>;
  advanceRound(): Promise<RoundResult>;
  computeMetrics(): Promise<any>;
  getPublicState(): any;
  getParticipantState(participantId: string): any;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  updatedState?: any;
}

export interface RoundResult {
  success?: boolean;
  message?: string;
  roundNumber: number;
  summary?: any;
  participantResults?: Map<string, any>;
  isGameComplete?: boolean;
  isComplete?: boolean;
}

// Socket Event Types
export interface SocketJoinPayload {
  sessionId: string;
  participantId: string;
  token?: string;
}

export interface SocketActionPayload {
  sessionId: string;
  participantId: string;
  actionType: string;
  payload: any;
}

// Fruit Beer Game Specific Types
export interface FruitBeerConfig {
  leadTime: number;
  initialInventory: number;
  initialBackorder: number;
  holdingCost: number;
  stockoutCost: number;
  numWeeks: number;
  demandPattern?: number[]; // If not provided, generate random
}

export interface FruitBeerPlayerState {
  role: 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';
  inventory: number;
  backorder: number;
  lastOrderPlaced: number;
  incomingShipments: number[];
  incomingOrders: number[];
  weeklyStats: {
    week: number;
    demand: number;
    received: number;
    shipped: number;
    orderPlaced: number;
    inventory: number;
    backorder: number;
    holdingCost: number;
    stockoutCost: number;
    totalCost: number;
  }[];
  totalCost: number;
}

export interface FruitBeerGameState {
  sessionId: string;
  currentWeek: number;
  maxWeeks: number;
  config: FruitBeerConfig;
  players: Map<string, FruitBeerPlayerState>;
  customerDemand: number[];
  isComplete: boolean;
}

