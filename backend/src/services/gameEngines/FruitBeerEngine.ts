import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult, FruitBeerConfig, FruitBeerGameState, FruitBeerPlayerState } from '../../types';
import { prisma } from '../../db';

/**
 * Fruit Beer Game Engine
 * 
 * Implements the classic beer game (supply chain simulation) with 4 tiers:
 * RETAILER -> WHOLESALER -> DISTRIBUTOR -> MANUFACTURER
 * 
 * Game mechanics:
 * 1. Each week, customer demand reaches retailer
 * 2. Each player receives shipments (after lead time delay)
 * 3. Players fulfill demand/orders from downstream
 * 4. Players place orders to upstream
 * 5. Orders and shipments move through pipeline
 * 6. Costs accumulate (holding + stockout)
 */
export class FruitBeerEngine extends BaseGameEngine {
  private state!: FruitBeerGameState;
  private pendingOrders: Map<string, number> = new Map();
  private readonly ROLES = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];

  constructor(sessionId: string) {
    super(sessionId, 'fruit-beer-game');
  }

  async initialize(config: FruitBeerConfig): Promise<void> {
    this.log('Initializing Fruit Beer Game', config);

    // Get participants
    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
      orderBy: { joined_at: 'asc' },
    });

    if (participants.length === 0) {
      throw new Error('No participants found for session');
    }

    // Initialize player states
    const players = new Map<string, FruitBeerPlayerState>();

    for (const participant of participants) {
      const role = participant.role as any;
      
      players.set(participant.id, {
        role,
        inventory: config.initialInventory || 12,
        backorder: config.initialBackorder || 0,
        lastOrderPlaced: config.initialInventory || 4,
        // Initialize pipelines with 0s - shipments/orders will be added as they're placed
        // Pipeline represents future arrivals: [0] = arrives this week, [1] = arrives next week, etc.
        incomingShipments: new Array(config.leadTime || 2).fill(0),
        incomingOrders: new Array(config.leadTime || 2).fill(0),
        weeklyStats: [],
        totalCost: 0,
      });
    }

    // Generate customer demand pattern if not provided
    const customerDemand = config.demandPattern || this.generateDemandPattern(config.numWeeks || 20);

    this.state = {
      sessionId: this.sessionId,
      currentWeek: 0,
      maxWeeks: config.numWeeks || 20,
      config,
      players,
      customerDemand,
      isComplete: false,
    };

    // Save initial state to DB
    await this.saveGameState();

    this.isInitialized = true;
    this.log('Game initialized successfully', { playerCount: players.size });
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { orderQuantity } = action;

    if (typeof orderQuantity !== 'number' || orderQuantity < 0) {
      return {
        success: false,
        message: 'Invalid order quantity',
      };
    }

    // Check if player exists
    const playerState = this.state.players.get(participantId);
    if (!playerState) {
      return {
        success: false,
        message: 'Player not found',
      };
    }

    // Check if already placed order this week
    if (this.pendingOrders.has(participantId)) {
      return {
        success: false,
        message: 'Order already placed for this week',
      };
    }

    // Record order
    this.pendingOrders.set(participantId, orderQuantity);

    // Save decision to DB
    await prisma.playerDecision.create({
      data: {
        session_id: this.sessionId,
        participant_id: participantId,
        round_number: this.state.currentWeek + 1,
        decision_payload: { orderQuantity },
      },
    });

    this.log(`Player ${playerState.role} placed order: ${orderQuantity}`);

    return {
      success: true,
      message: 'Order placed successfully',
      updatedState: this.getParticipantState(participantId),
    };
  }

  async advanceRound(): Promise<RoundResult> {
    this.ensureInitialized();

    this.state.currentWeek++;
    this.log(`\n========== ADVANCING TO WEEK ${this.state.currentWeek} ==========`);

    // Step 1: Receive shipments (from upstream) - shipments arrive from pipeline
    this.log(`\n--- Step 1: Receiving shipments ---`);
    this.receiveShipments();

    // Step 2: Process demand/orders (from downstream) - fulfill demand and ship
    this.log(`\n--- Step 2: Processing orders/demand ---`);
    this.processOrders();

    // Step 3: Place orders (to upstream) - use pending orders or default
    this.log(`\n--- Step 3: Placing orders ---`);
    this.placeOrders();

    // Step 4: Advance pipelines - ensure consistent length
    this.advancePipelines();

    // Step 5: Calculate costs
    this.calculateCosts();

    // Step 6: Record weekly stats
    this.recordWeeklyStats();

    // Step 7: Clear pending orders
    this.pendingOrders.clear();

    // Step 8: Check if game is complete
    if (this.state.currentWeek >= this.state.maxWeeks) {
      this.state.isComplete = true;
      await prisma.gameSession.update({
        where: { id: this.sessionId },
        data: { status: 'COMPLETED', completed_at: new Date() },
      });
    }

    // Step 9: Update session round number
    await prisma.gameSession.update({
      where: { id: this.sessionId },
      data: { current_round: this.state.currentWeek },
    });

    // Step 10: Save game state
    await this.saveGameState();

    this.log(`Week ${this.state.currentWeek} completed`);

    return {
      roundNumber: this.state.currentWeek,
      summary: this.getRoundSummary(),
      participantResults: this.getParticipantResults(),
      isGameComplete: this.state.isComplete,
    };
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    const metrics: any = {
      totalCosts: {},
      bullwhipEffect: this.calculateBullwhipEffect(),
      inventoryVariance: {},
      serviceLevel: {},
    };

    for (const [_, playerState] of this.state.players) {
      metrics.totalCosts[playerState.role] = playerState.totalCost;
      
      // Calculate inventory variance
      const inventories = playerState.weeklyStats.map(w => w.inventory);
      metrics.inventoryVariance[playerState.role] = this.variance(inventories);
    }

    return metrics;
  }

  getPublicState(): any {
    this.ensureInitialized();

    return {
      sessionId: this.sessionId,
      currentWeek: this.state.currentWeek,
      maxWeeks: this.state.maxWeeks,
      isComplete: this.state.isComplete,
      config: this.state.config,
    };
  }

  getParticipantState(participantId: string): any {
    this.ensureInitialized();

    const playerState = this.state.players.get(participantId);
    if (!playerState) {
      return null;
    }

    return {
      ...playerState,
      currentWeek: this.state.currentWeek,
      maxWeeks: this.state.maxWeeks,
      isComplete: this.state.isComplete,
      hasPlacedOrder: this.pendingOrders.has(participantId),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private receiveShipments(): void {
    for (const [_, playerState] of this.state.players) {
      // Receive shipment from pipeline (first element = arrives this week)
      const shipment = playerState.incomingShipments.shift() || 0;
      playerState.inventory += shipment;
      const role = playerState.role;
      if (shipment > 0) {
        this.log(`${role}: Received ${shipment} units from upstream, New inventory = ${playerState.inventory}`);
      }
    }
  }

  private processOrders(): void {
    const roles = this.ROLES;
    
    // Process from RETAILER (downstream) to MANUFACTURER (upstream)
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const player = this.getPlayerByRole(role);
      if (!player) continue;

      let demand = 0;

      if (role === 'RETAILER') {
        // Customer demand (external)
        // Week 1 uses customerDemand[0], Week 2 uses customerDemand[1], etc.
        const demandIndex = this.state.currentWeek - 1;
        demand = (demandIndex >= 0 && demandIndex < this.state.customerDemand.length) 
          ? this.state.customerDemand[demandIndex] 
          : 4;
        this.log(`RETAILER: Customer demand = ${demand} (week ${this.state.currentWeek}, index ${demandIndex})`);
      } else {
        // Get order from downstream player (downstream placed order to this player)
        // The order is at position [0] in THIS player's incomingOrders pipeline
        // Process [0] first, then shift to advance pipeline
        demand = player.incomingOrders[0] || 0;
        // Shift to advance pipeline (remove processed order, move others left)
        player.incomingOrders.shift();
        this.log(`${role}: Received order from downstream = ${demand} (pipeline after shift: [${player.incomingOrders.join(', ')}])`);
      }

      // Add to existing backorder
      const totalDemand = demand + player.backorder;
      this.log(`${role}: Total demand (order + backorder) = ${totalDemand} (backorder: ${player.backorder})`);

      // Fulfill as much as possible
      const fulfilled = Math.min(totalDemand, player.inventory);
      player.inventory -= fulfilled;
      player.backorder = totalDemand - fulfilled;
      
      this.log(`${role}: Fulfilled ${fulfilled}, New inventory = ${player.inventory}, New backorder = ${player.backorder}`);

      // Ship fulfilled quantity to downstream player
      // (downstream receives shipments from upstream after lead time)
      if (i > 0) {
        const downstreamRole = roles[i - 1];
        const downstreamPlayer = this.getPlayerByRole(downstreamRole);
        if (downstreamPlayer) {
          // Shipments arrive after lead time, so place at position [leadTime-1] in pipeline
          // Pipeline: [0] = this week, [1] = next week, [leadTime-1] = arrives in leadTime weeks
          const leadTime = this.state.config.leadTime || 2;
          // Ensure pipeline is long enough
          while (downstreamPlayer.incomingShipments.length < leadTime) {
            downstreamPlayer.incomingShipments.push(0);
          }
          // Add shipment to the position where it will arrive after lead time
          downstreamPlayer.incomingShipments[leadTime - 1] += fulfilled;
          this.log(`${role}: Shipped ${fulfilled} to ${downstreamRole} (will arrive in ${leadTime} weeks, pipeline: [${downstreamPlayer.incomingShipments.join(', ')}])`);
        }
      }
    }
  }

  private placeOrders(): void {
    const roles = this.ROLES;

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const player = this.getPlayerByRole(role);
      if (!player) continue;

      const participantId = this.getParticipantIdByRole(role);
      let orderQty = this.pendingOrders.get(participantId!) || player.lastOrderPlaced;

      player.lastOrderPlaced = orderQty;

      if (role === 'MANUFACTURER') {
        // Manufacturer orders result in production (arrives after lead time)
        const leadTime = this.state.config.leadTime || 2;
        // Ensure pipeline is long enough
        while (player.incomingShipments.length < leadTime) {
          player.incomingShipments.push(0);
        }
        // Add production to the position where it will arrive after lead time
        player.incomingShipments[leadTime - 1] += orderQty;
        this.log(`${role}: Produced ${orderQty} units (will arrive in ${leadTime} weeks, pipeline: [${player.incomingShipments.join(', ')}])`);
      } else {
        // Place order to upstream (order goes into upstream's incomingOrders pipeline)
        const upstreamRole = roles[i + 1];
        const upstreamPlayer = this.getPlayerByRole(upstreamRole);
        if (upstreamPlayer) {
          // Orders are processed next week, so place at position [1] (becomes [0] after shift)
          // Pipeline: [0] = this week (will be shifted), [1] = next week
          // Ensure pipeline is long enough (need at least 2 positions: [0] for this week, [1] for next)
          while (upstreamPlayer.incomingOrders.length < 2) {
            upstreamPlayer.incomingOrders.push(0);
          }
          // Add order to position [1] so it's processed next week
          upstreamPlayer.incomingOrders[1] += orderQty;
          this.log(`${role}: Placed order of ${orderQty} to ${upstreamRole} (will be processed next week, pipeline: [${upstreamPlayer.incomingOrders.join(', ')}])`);
        }
      }
    }
  }

  private advancePipelines(): void {
    // Pipelines are already advanced during processOrders and placeOrders
    // This method ensures all pipelines have consistent length
    // Note: shift() already advanced the pipeline, we just ensure minimum length
    for (const [_, playerState] of this.state.players) {
      const leadTime = this.state.config.leadTime || 2;
      
      while (playerState.incomingShipments.length < leadTime) {
        playerState.incomingShipments.push(0);
      }
      
      while (playerState.incomingOrders.length < leadTime) {
        playerState.incomingOrders.push(0);
      }
    }
  }

  private calculateCosts(): void {
    const holdingCost = this.state.config.holdingCost || 0.5;
    const stockoutCost = this.state.config.stockoutCost || 1.0;

    for (const [_, playerState] of this.state.players) {
      const holding = Math.max(0, playerState.inventory) * holdingCost;
      const stockout = playerState.backorder * stockoutCost;
      const totalWeekCost = holding + stockout;

      playerState.totalCost += totalWeekCost;
    }
  }

  private recordWeeklyStats(): void {
    for (const [_, playerState] of this.state.players) {
      const demand = this.getCurrentDemand(playerState.role);
      const received = playerState.incomingShipments[0] || 0;
      
      playerState.weeklyStats.push({
        week: this.state.currentWeek,
        demand,
        received,
        shipped: 0, // TODO: Track actual shipments
        orderPlaced: playerState.lastOrderPlaced,
        inventory: playerState.inventory,
        backorder: playerState.backorder,
        holdingCost: Math.max(0, playerState.inventory) * (this.state.config.holdingCost || 0.5),
        stockoutCost: playerState.backorder * (this.state.config.stockoutCost || 1.0),
        totalCost: playerState.totalCost,
      });
    }
  }

  private async saveGameState(): Promise<void> {
    // Save to FruitBeerGameState table
    const stateData: {
      inventory: Record<string, number>;
      backorders: Record<string, number>;
      orders_placed: Record<string, number>;
      shipments: Record<string, any>;
      costs: Record<string, number>;
    } = {
      inventory: {},
      backorders: {},
      orders_placed: {},
      shipments: {},
      costs: {},
    };

    for (const [_, playerState] of this.state.players) {
      stateData.inventory[playerState.role] = playerState.inventory;
      stateData.backorders[playerState.role] = playerState.backorder;
      stateData.orders_placed[playerState.role] = playerState.lastOrderPlaced;
      stateData.costs[playerState.role] = playerState.totalCost;
    }

    await prisma.fruitBeerGameState.create({
      data: {
        session_id: this.sessionId,
        week: this.state.currentWeek,
        inventory: stateData.inventory,
        backorders: stateData.backorders,
        orders_placed: stateData.orders_placed,
        shipments: {},
        costs: stateData.costs,
      },
    });
  }

  private getRoundSummary(): any {
    return {
      week: this.state.currentWeek,
      customerDemand: this.state.customerDemand[this.state.currentWeek - 1],
      totalCosts: Array.from(this.state.players.values()).reduce(
        (sum, p) => sum + p.totalCost,
        0
      ),
    };
  }

  private getParticipantResults(): Map<string, any> {
    const results = new Map();
    
    for (const [participantId, playerState] of this.state.players) {
      results.set(participantId, {
        role: playerState.role,
        inventory: playerState.inventory,
        backorder: playerState.backorder,
        totalCost: playerState.totalCost,
      });
    }

    return results;
  }

  private getCurrentDemand(role: string): number {
    if (role === 'RETAILER') {
      return this.state.customerDemand[this.state.currentWeek - 1] || 4;
    }
    return 0; // Simplified
  }

  private getPlayerByRole(role: string): FruitBeerPlayerState | undefined {
    for (const [_, playerState] of this.state.players) {
      if (playerState.role === role) {
        return playerState;
      }
    }
    return undefined;
  }

  private getParticipantIdByRole(role: string): string | undefined {
    for (const [participantId, playerState] of this.state.players) {
      if (playerState.role === role) {
        return participantId;
      }
    }
    return undefined;
  }

  private generateDemandPattern(weeks: number): number[] {
    // Classic pattern: 4 units for first 4 weeks, then 8 units
    const pattern: number[] = [];
    for (let i = 0; i < weeks; i++) {
      pattern.push(i < 4 ? 4 : 8);
    }
    return pattern;
  }

  private calculateBullwhipEffect(): number {
    // Bullwhip = Variance of orders / Variance of demand
    // Simplified calculation
    return 1.0; // TODO: Implement proper calculation
  }

  private variance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}

