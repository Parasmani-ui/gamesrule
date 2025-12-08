import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Dual Source Dilemma - Procurement Strategy Simulation
 * 
 * PURPOSE:
 * - Teach procurement strategy and supplier management
 * - Demonstrate trade-offs between single-sourcing and dual-sourcing
 * - Show risk mitigation through supplier diversification
 * - Illustrate cost-quality-reliability trade-offs
 * 
 * SCENARIO:
 * - Player manages procurement for manufacturing
 * - Two suppliers available with different characteristics:
 *   * Supplier A: Lower cost, longer lead time, higher risk
 *   * Supplier B: Higher cost, shorter lead time, more reliable
 * 
 * MECHANICS:
 * - Weekly demand must be met
 * - Can order from either or both suppliers
 * - Cash management (borrowing costs money)
 * - Inventory holding costs
 * - Stockout penalties
 * 
 * GOAL: Maximize final bank balance after N weeks
 */

interface Supplier {
  name: string;
  unitCost: number;
  leadTime: number;      // Weeks
  reliability: number;   // 0-1 (probability order arrives on time)
  minOrderQty: number;
  volumeDiscount?: {     // Optional volume discounts
    threshold: number;
    discountRate: number;
  };
}

interface DualSourceConfig {
  numWeeks: number;
  initialCash: number;
  initialInventory: number;
  demandPattern: number[];
  supplierA: Supplier;
  supplierB: Supplier;
  holdingCostPerUnit: number;
  stockoutCostPerUnit: number;
  borrowingInterestRate: number; // Per week
}

interface OrderInTransit {
  supplier: string;
  quantity: number;
  arrivalWeek: number;
  cost: number;
  onTime: boolean;
}

interface DualSourceGameState {
  sessionId: string;
  participantId: string;
  config: DualSourceConfig;
  currentWeek: number;
  cash: number;
  inventory: number;
  ordersInTransit: OrderInTransit[];
  weeklyHistory: {
    week: number;
    demand: number;
    inventory: number;
    cash: number;
    orderA: number;
    orderB: number;
    arrivals: number;
    stockouts: number;
    holdingCost: number;
    stockoutCost: number;
    borrowingCost: number;
  }[];
  totalCost: number;
  finalBankBalance: number;
  isComplete: boolean;
}

export class DualSourceEngine extends BaseGameEngine {
  private state!: DualSourceGameState;

  constructor(sessionId: string) {
    super(sessionId, 'dual-source-dilemma');
  }

  async initialize(config: DualSourceConfig): Promise<void> {
    this.log('Initializing Dual Source Dilemma', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    // Default configuration
    const defaultConfig: DualSourceConfig = {
      numWeeks: config.numWeeks || 20,
      initialCash: config.initialCash || 10000,
      initialInventory: config.initialInventory || 50,
      demandPattern: config.demandPattern || this.generateDemandPattern(config.numWeeks || 20),
      supplierA: config.supplierA || {
        name: 'Supplier A (Low Cost)',
        unitCost: 10,
        leadTime: 3,
        reliability: 0.8,
        minOrderQty: 20,
        volumeDiscount: { threshold: 100, discountRate: 0.1 },
      },
      supplierB: config.supplierB || {
        name: 'Supplier B (Reliable)',
        unitCost: 15,
        leadTime: 1,
        reliability: 0.95,
        minOrderQty: 10,
      },
      holdingCostPerUnit: config.holdingCostPerUnit || 1,
      stockoutCostPerUnit: config.stockoutCostPerUnit || 20,
      borrowingInterestRate: config.borrowingInterestRate || 0.02,
    };

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: defaultConfig,
      currentWeek: 0,
      cash: defaultConfig.initialCash,
      inventory: defaultConfig.initialInventory,
      ordersInTransit: [],
      weeklyHistory: [],
      totalCost: 0,
      finalBankBalance: 0,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Dual Source Dilemma initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { orderA, orderB } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    const orderQuantityA = orderA || 0;
    const orderQuantityB = orderB || 0;

    if (orderQuantityA < 0 || orderQuantityB < 0) {
      return {
        success: false,
        message: 'Order quantities cannot be negative',
      };
    }

    // Validate minimum order quantities
    if (orderQuantityA > 0 && orderQuantityA < this.state.config.supplierA.minOrderQty) {
      return {
        success: false,
        message: `Supplier A requires minimum order of ${this.state.config.supplierA.minOrderQty} units`,
      };
    }

    if (orderQuantityB > 0 && orderQuantityB < this.state.config.supplierB.minOrderQty) {
      return {
        success: false,
        message: `Supplier B requires minimum order of ${this.state.config.supplierB.minOrderQty} units`,
      };
    }

    // Calculate order costs
    const costA = this.calculateOrderCost(orderQuantityA, this.state.config.supplierA);
    const costB = this.calculateOrderCost(orderQuantityB, this.state.config.supplierB);
    const totalOrderCost = costA + costB;

    // Check if can afford (allow borrowing)
    const cashAfterOrder = this.state.cash - totalOrderCost;

    // Place orders
    if (orderQuantityA > 0) {
      const arrivalWeek = this.state.currentWeek + this.state.config.supplierA.leadTime;
      const onTime = Math.random() < this.state.config.supplierA.reliability;
      
      this.state.ordersInTransit.push({
        supplier: 'A',
        quantity: orderQuantityA,
        arrivalWeek: onTime ? arrivalWeek : arrivalWeek + 1,
        cost: costA,
        onTime,
      });
    }

    if (orderQuantityB > 0) {
      const arrivalWeek = this.state.currentWeek + this.state.config.supplierB.leadTime;
      const onTime = Math.random() < this.state.config.supplierB.reliability;
      
      this.state.ordersInTransit.push({
        supplier: 'B',
        quantity: orderQuantityB,
        arrivalWeek: onTime ? arrivalWeek : arrivalWeek + 1,
        cost: costB,
        onTime,
      });
    }

    // Deduct cash
    this.state.cash = cashAfterOrder;

    // Process week
    const weekResult = await this.processWeek();

    await this.saveGameState();

    return {
      success: true,
      message: `Orders placed for week ${this.state.currentWeek}`,
      data: {
        ordersPlaced: {
          supplierA: orderQuantityA,
          supplierB: orderQuantityB,
          totalCost: totalOrderCost,
        },
        weekResult,
        currentCash: this.state.cash,
        currentInventory: this.state.inventory,
        isComplete: this.state.isComplete,
      },
    };
  }

  async advanceRound(): Promise<RoundResult> {
    this.ensureInitialized();

    if (this.state.isComplete) {
      return {
        success: true,
        message: 'Simulation complete',
        roundNumber: this.state.currentWeek,
        isComplete: true,
      };
    }

    // Auto-advance if no orders placed (process week with 0 orders)
    const weekResult = await this.processWeek();

    return {
      success: true,
      message: `Week ${this.state.currentWeek - 1} completed`,
      roundNumber: this.state.currentWeek,
      isComplete: this.state.isComplete,
      data: weekResult,
    };
  }

  private async processWeek(): Promise<any> {
    const week = this.state.currentWeek;
    const demand = this.state.config.demandPattern[week] || 0;

    // Receive incoming shipments
    const arrivals = this.receiveShipments(week);

    // Fulfill demand
    const stockouts = Math.max(0, demand - this.state.inventory);
    const fulfilled = demand - stockouts;
    this.state.inventory -= fulfilled;

    // Calculate costs
    const holdingCost = this.state.inventory * this.state.config.holdingCostPerUnit;
    const stockoutCost = stockouts * this.state.config.stockoutCostPerUnit;
    let borrowingCost = 0;

    if (this.state.cash < 0) {
      borrowingCost = Math.abs(this.state.cash) * this.state.config.borrowingInterestRate;
      this.state.cash -= borrowingCost;
    }

    const weekCost = holdingCost + stockoutCost + borrowingCost;
    this.state.totalCost += weekCost;
    this.state.cash -= holdingCost;
    this.state.cash -= stockoutCost;

    // Record week
    this.state.weeklyHistory.push({
      week,
      demand,
      inventory: this.state.inventory,
      cash: this.state.cash,
      orderA: 0, // Will be updated from action
      orderB: 0,
      arrivals,
      stockouts,
      holdingCost,
      stockoutCost,
      borrowingCost,
    });

    // Advance week
    this.state.currentWeek++;

    // Check if complete
    if (this.state.currentWeek >= this.state.config.numWeeks) {
      this.state.isComplete = true;
      this.state.finalBankBalance = this.state.cash + (this.state.inventory * this.state.config.supplierA.unitCost * 0.5); // Liquidate inventory at 50% value
    }

    return {
      week,
      demand,
      fulfilled,
      stockouts,
      arrivals,
      inventory: this.state.inventory,
      cash: this.state.cash,
      costs: { holdingCost, stockoutCost, borrowingCost, total: weekCost },
    };
  }

  private receiveShipments(currentWeek: number): number {
    let totalArrivals = 0;

    // Filter and receive orders arriving this week
    this.state.ordersInTransit = this.state.ordersInTransit.filter(order => {
      if (order.arrivalWeek <= currentWeek) {
        this.state.inventory += order.quantity;
        totalArrivals += order.quantity;
        return false; // Remove from transit
      }
      return true; // Keep in transit
    });

    return totalArrivals;
  }

  private calculateOrderCost(quantity: number, supplier: Supplier): number {
    if (quantity === 0) return 0;

    let unitCost = supplier.unitCost;

    // Apply volume discount if applicable
    if (supplier.volumeDiscount && quantity >= supplier.volumeDiscount.threshold) {
      unitCost *= (1 - supplier.volumeDiscount.discountRate);
    }

    return quantity * unitCost;
  }

  private generateDemandPattern(weeks: number): number[] {
    const demand: number[] = [];
    const baseLevel = 50;

    for (let w = 0; w < weeks; w++) {
      // Demand with seasonal variation and randomness
      const seasonal = Math.sin(w / 5) * 10;
      const noise = (Math.random() - 0.5) * 20;
      demand.push(Math.max(20, Math.round(baseLevel + seasonal + noise)));
    }

    return demand;
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    const supplierMix = this.calculateSupplierMix();
    const serviceLevel = this.calculateServiceLevel();

    return {
      finalBankBalance: this.state.finalBankBalance.toFixed(2),
      totalCost: this.state.totalCost.toFixed(2),
      averageInventory: this.calculateAverageInventory(),
      serviceLevel: serviceLevel + '%',
      supplierMix,
      totalStockouts: this.state.weeklyHistory.reduce((sum, w) => sum + w.stockouts, 0),
      cashFlowAnalysis: this.analyzeCashFlow(),
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      currentWeek: this.state.currentWeek,
      maxWeeks: this.state.config.numWeeks,
      cash: this.state.cash,
      inventory: this.state.inventory,
      ordersInTransit: this.state.ordersInTransit,
      suppliers: {
        a: this.state.config.supplierA,
        b: this.state.config.supplierB,
      },
      isComplete: this.state.isComplete,
      finalBankBalance: this.state.isComplete ? this.state.finalBankBalance : undefined,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      weeklyHistory: this.state.weeklyHistory,
      metrics: this.computeMetrics(),
      demandPattern: this.state.config.demandPattern,
    };
  }

  // ===== ANALYTICS METHODS =====

  private calculateSupplierMix(): { A: number; B: number } {
    let totalA = 0, totalB = 0;

    for (const order of this.state.ordersInTransit) {
      if (order.supplier === 'A') totalA += order.quantity;
      else totalB += order.quantity;
    }

    const total = totalA + totalB;
    return {
      A: total > 0 ? Math.round((totalA / total) * 100) : 0,
      B: total > 0 ? Math.round((totalB / total) * 100) : 0,
    };
  }

  private calculateServiceLevel(): number {
    const totalDemand = this.state.weeklyHistory.reduce((sum, w) => sum + w.demand, 0);
    const totalStockouts = this.state.weeklyHistory.reduce((sum, w) => sum + w.stockouts, 0);
    const fulfilled = totalDemand - totalStockouts;
    
    return totalDemand > 0 ? Math.round((fulfilled / totalDemand) * 100) : 100;
  }

  private calculateAverageInventory(): number {
    if (this.state.weeklyHistory.length === 0) return this.state.initialInventory;
    
    const totalInventory = this.state.weeklyHistory.reduce((sum, w) => sum + w.inventory, 0);
    return Math.round(totalInventory / this.state.weeklyHistory.length);
  }

  private analyzeCashFlow(): string {
    const minCash = Math.min(...this.state.weeklyHistory.map(w => w.cash));
    
    if (minCash < 0) {
      return `Borrowed up to $${Math.abs(minCash).toFixed(2)}`;
    }
    return 'No borrowing needed';
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: this.state.currentWeek,
        state_data: this.state as any,
      },
    });
  }
}

