import { BaseGameEngine } from './BaseGameEngine';
import { ActionResult, RoundResult } from '../../types';
import { prisma } from '../../db';

/**
 * Order Ops - Online Food Delivery Simulation
 * 
 * PURPOSE:
 * - Understand platform business models and two-sided markets
 * - Teach real-time logistics and fleet management
 * - Demonstrate trade-offs between cost, speed, and service quality
 * - Show how market structure affects competitive strategy
 * 
 * PLATFORM ECOSYSTEM:
 * Supply Side (Restaurants) ← Platform → Demand Side (Customers)
 *                            ↕
 *                   Delivery Partners
 * 
 * KEY CONCEPTS:
 * - Network Effects (direct, indirect, cross-side)
 * - Chicken-and-Egg Problem
 * - Multi-homing vs Single-homing
 * - Winner-take-most dynamics
 */

interface Restaurant {
  id: string;
  name: string;
  location: { x: number; y: number };
  commissionRate: number; // Percentage
  avgPreparationTime: number; // Minutes
}

interface Customer {
  id: string;
  name: string;
  location: { x: number; y: number };
  orderValue: number;
}

interface Driver {
  id: string;
  name: string;
  currentLocation: { x: number; y: number };
  status: 'idle' | 'picking-up' | 'delivering';
  currentOrder?: string;
}

interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  orderValue: number;
  placedTime: number;
  pickupTime?: number;
  deliveredTime?: number;
  status: 'pending' | 'assigned' | 'picked-up' | 'delivered' | 'cancelled';
  customerLocation: { x: number; y: number };
  restaurantLocation: { x: number; y: number };
}

interface OrderOpsConfig {
  durationMinutes: number;
  numDrivers: number;
  restaurants: Restaurant[];
  orderArrivalRate: number; // Orders per minute
  maxDeliveryTime: number; // Minutes (SLA)
}

interface OrderOpsGameState {
  sessionId: string;
  participantId: string;
  config: OrderOpsConfig;
  currentMinute: number;
  drivers: Driver[];
  orders: Order[];
  completedOrders: Order[];
  revenue: number;
  costs: number;
  customerSatisfaction: number;
  avgDeliveryTime: number;
  slaViolations: number;
  isComplete: boolean;
}

export class OrderOpsEngine extends BaseGameEngine {
  private state!: OrderOpsGameState;
  private orderIdCounter = 0;

  constructor(sessionId: string) {
    super(sessionId, 'order-ops');
  }

  async initialize(config: Partial<OrderOpsConfig>): Promise<void> {
    this.log('Initializing Order Ops simulation', config);

    const participants = await prisma.sessionParticipant.findMany({
      where: { session_id: this.sessionId },
    });

    if (participants.length === 0) {
      throw new Error('No participant found for session');
    }

    const participant = participants[0];

    const defaultConfig: OrderOpsConfig = {
      durationMinutes: config.durationMinutes || 30,
      numDrivers: config.numDrivers || 10,
      restaurants: config.restaurants || this.generateRestaurants(),
      orderArrivalRate: config.orderArrivalRate || 1.5,
      maxDeliveryTime: config.maxDeliveryTime || 40,
    };

    const drivers = this.generateDrivers(defaultConfig.numDrivers);

    this.state = {
      sessionId: this.sessionId,
      participantId: participant.id,
      config: defaultConfig,
      currentMinute: 0,
      drivers,
      orders: [],
      completedOrders: [],
      revenue: 0,
      costs: 0,
      customerSatisfaction: 100,
      avgDeliveryTime: 0,
      slaViolations: 0,
      isComplete: false,
    };

    await this.saveGameState();
    this.isInitialized = true;
    this.log('Order Ops initialized successfully');
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    this.ensureInitialized();

    const { actionType, data } = action;

    if (this.state.isComplete) {
      return {
        success: false,
        message: 'Simulation already complete',
      };
    }

    switch (actionType) {
      case 'assign-driver':
        return await this.assignDriverToOrder(data);
      
      case 'advance-time':
        return await this.advanceTime();
      
      default:
        return {
          success: false,
          message: 'Invalid action type',
        };
    }
  }

  private async assignDriverToOrder(data: any): Promise<ActionResult> {
    const { orderId, driverId } = data;

    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    if (order.status !== 'pending') {
      return {
        success: false,
        message: 'Order already assigned',
      };
    }

    const driver = this.state.drivers.find(d => d.id === driverId);
    if (!driver) {
      return {
        success: false,
        message: 'Driver not found',
      };
    }

    if (driver.status !== 'idle') {
      return {
        success: false,
        message: 'Driver is not available',
      };
    }

    // Assign driver
    order.driverId = driverId;
    order.status = 'assigned';
    driver.status = 'picking-up';
    driver.currentOrder = orderId;

    await this.saveGameState();

    return {
      success: true,
      message: `Driver ${driver.name} assigned to order ${orderId}`,
      data: {
        orderId,
        driverId,
        estimatedDeliveryTime: this.estimateDeliveryTime(order, driver),
      },
    };
  }

  private async advanceTime(): Promise<ActionResult> {
    // Advance one minute
    this.state.currentMinute++;

    // Generate new orders
    if (Math.random() < this.state.config.orderArrivalRate / 60) {
      this.generateNewOrder();
    }

    // Update existing orders
    this.updateOrders();

    // Update drivers
    this.updateDrivers();

    // Check if complete
    if (this.state.currentMinute >= this.state.config.durationMinutes) {
      this.state.isComplete = true;
    }

    await this.saveGameState();

    return {
      success: true,
      message: `Time advanced to minute ${this.state.currentMinute}`,
      data: {
        currentMinute: this.state.currentMinute,
        pendingOrders: this.state.orders.filter(o => o.status === 'pending').length,
        activeDeliveries: this.state.orders.filter(o => o.status === 'assigned' || o.status === 'picked-up').length,
        completedOrders: this.state.completedOrders.length,
        isComplete: this.state.isComplete,
      },
    };
  }

  private generateNewOrder(): void {
    const restaurant = this.state.config.restaurants[Math.floor(Math.random() * this.state.config.restaurants.length)];
    
    const order: Order = {
      id: `ORD${++this.orderIdCounter}`,
      customerId: `CUST${this.orderIdCounter}`,
      restaurantId: restaurant.id,
      orderValue: 300 + Math.random() * 700, // ₹300-₹1000
      placedTime: this.state.currentMinute,
      status: 'pending',
      customerLocation: this.generateRandomLocation(),
      restaurantLocation: restaurant.location,
    };

    this.state.orders.push(order);
  }

  private updateOrders(): void {
    for (const order of this.state.orders) {
      if (order.status === 'assigned') {
        const driver = this.state.drivers.find(d => d.id === order.driverId);
        if (driver) {
          // Check if reached restaurant
          const distanceToRestaurant = this.calculateDistance(driver.currentLocation, order.restaurantLocation);
          if (distanceToRestaurant < 0.1) {
            order.status = 'picked-up';
            order.pickupTime = this.state.currentMinute;
            driver.status = 'delivering';
          }
        }
      } else if (order.status === 'picked-up') {
        const driver = this.state.drivers.find(d => d.id === order.driverId);
        if (driver) {
          // Check if reached customer
          const distanceToCustomer = this.calculateDistance(driver.currentLocation, order.customerLocation);
          if (distanceToCustomer < 0.1) {
            order.status = 'delivered';
            order.deliveredTime = this.state.currentMinute;
            this.completeOrder(order);
            
            // Free driver
            driver.status = 'idle';
            driver.currentOrder = undefined;
          }
        }
      }
    }
  }

  private updateDrivers(): void {
    for (const driver of this.state.drivers) {
      if (driver.status !== 'idle' && driver.currentOrder) {
        const order = this.state.orders.find(o => o.id === driver.currentOrder);
        if (order) {
          // Move driver towards target
          const target = order.status === 'assigned' ? order.restaurantLocation : order.customerLocation;
          driver.currentLocation = this.moveTowards(driver.currentLocation, target, 0.5); // Speed: 0.5 units/minute
        }
      }
    }
  }

  private completeOrder(order: Order): void {
    // Calculate delivery time
    const deliveryTime = order.deliveredTime! - order.placedTime;
    
    // Update metrics
    this.state.completedOrders.push(order);
    
    // Revenue
    const restaurant = this.state.config.restaurants.find(r => r.id === order.restaurantId)!;
    const commission = order.orderValue * (restaurant.commissionRate / 100);
    this.state.revenue += commission;
    
    // Costs (driver payment, operational costs)
    const deliveryCost = 50 + deliveryTime * 2; // Base + time-based
    this.state.costs += deliveryCost;
    
    // Customer satisfaction
    if (deliveryTime > this.state.config.maxDeliveryTime) {
      this.state.slaViolations++;
      this.state.customerSatisfaction = Math.max(0, this.state.customerSatisfaction - 2);
    } else {
      this.state.customerSatisfaction = Math.min(100, this.state.customerSatisfaction + 0.5);
    }
    
    // Update average delivery time
    const totalDeliveryTime = this.state.completedOrders.reduce((sum, o) => 
      sum + ((o.deliveredTime || 0) - o.placedTime), 0
    );
    this.state.avgDeliveryTime = totalDeliveryTime / this.state.completedOrders.length;
    
    // Remove from active orders
    this.state.orders = this.state.orders.filter(o => o.id !== order.id);
  }

  async advanceRound(): Promise<RoundResult> {
    // Auto-advance time
    return await this.advanceTime() as any;
  }

  async computeMetrics(): Promise<any> {
    this.ensureInitialized();

    const profit = this.state.revenue - this.state.costs;
    const profitMargin = this.state.revenue > 0 ? (profit / this.state.revenue) * 100 : 0;

    return {
      ordersCompleted: this.state.completedOrders.length,
      revenue: `₹${this.state.revenue.toFixed(2)}`,
      costs: `₹${this.state.costs.toFixed(2)}`,
      profit: `₹${profit.toFixed(2)}`,
      profitMargin: profitMargin.toFixed(2) + '%',
      avgDeliveryTime: this.state.avgDeliveryTime.toFixed(2) + ' min',
      slaCompliance: ((1 - this.state.slaViolations / this.state.completedOrders.length) * 100).toFixed(2) + '%',
      customerSatisfaction: this.state.customerSatisfaction.toFixed(0) + '%',
      driverUtilization: this.calculateDriverUtilization() + '%',
    };
  }

  getPublicState(): any {
    if (!this.isInitialized) return null;

    return {
      currentMinute: this.state.currentMinute,
      maxMinutes: this.state.config.durationMinutes,
      pendingOrders: this.state.orders.filter(o => o.status === 'pending'),
      activeOrders: this.state.orders.filter(o => o.status !== 'pending'),
      drivers: this.state.drivers,
      revenue: this.state.revenue,
      costs: this.state.costs,
      customerSatisfaction: this.state.customerSatisfaction,
      isComplete: this.state.isComplete,
    };
  }

  getParticipantState(participantId: string): any {
    if (!this.isInitialized) return null;

    return {
      ...this.getPublicState(),
      completedOrders: this.state.completedOrders,
      metrics: this.state.isComplete ? this.computeMetrics() : undefined,
    };
  }

  // ===== HELPER METHODS =====

  private generateRestaurants(): Restaurant[] {
    return [
      {
        id: 'R1',
        name: 'Pizza Palace',
        location: { x: 2, y: 3 },
        commissionRate: 20,
        avgPreparationTime: 15,
      },
      {
        id: 'R2',
        name: 'Burger Bliss',
        location: { x: 7, y: 2 },
        commissionRate: 18,
        avgPreparationTime: 10,
      },
      {
        id: 'R3',
        name: 'Sushi Station',
        location: { x: 4, y: 8 },
        commissionRate: 25,
        avgPreparationTime: 20,
      },
      {
        id: 'R4',
        name: 'Indian Curry House',
        location: { x: 9, y: 6 },
        commissionRate: 22,
        avgPreparationTime: 18,
      },
    ];
  }

  private generateDrivers(count: number): Driver[] {
    const drivers: Driver[] = [];
    
    for (let i = 0; i < count; i++) {
      drivers.push({
        id: `D${i + 1}`,
        name: `Driver ${i + 1}`,
        currentLocation: this.generateRandomLocation(),
        status: 'idle',
      });
    }

    return drivers;
  }

  private generateRandomLocation(): { x: number; y: number } {
    return {
      x: Math.random() * 10,
      y: Math.random() * 10,
    };
  }

  private calculateDistance(loc1: { x: number; y: number }, loc2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(loc2.x - loc1.x, 2) + Math.pow(loc2.y - loc1.y, 2));
  }

  private moveTowards(from: { x: number; y: number }, to: { x: number; y: number }, speed: number): { x: number; y: number } {
    const distance = this.calculateDistance(from, to);
    
    if (distance < speed) {
      return { ...to };
    }

    const ratio = speed / distance;
    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
    };
  }

  private estimateDeliveryTime(order: Order, driver: Driver): number {
    const toRestaurant = this.calculateDistance(driver.currentLocation, order.restaurantLocation);
    const toCustomer = this.calculateDistance(order.restaurantLocation, order.customerLocation);
    const totalDistance = toRestaurant + toCustomer;
    
    const restaurant = this.state.config.restaurants.find(r => r.id === order.restaurantId)!;
    
    return (totalDistance / 0.5) + restaurant.avgPreparationTime; // travel time + prep time
  }

  private calculateDriverUtilization(): number {
    if (this.state.currentMinute === 0) return 0;
    
    const busyDrivers = this.state.drivers.filter(d => d.status !== 'idle').length;
    return Math.round((busyDrivers / this.state.drivers.length) * 100);
  }

  private async saveGameState(): Promise<void> {
    await prisma.gameState.create({
      data: {
        session_id: this.sessionId,
        round_number: this.state.currentMinute,
        state_data: this.state as any,
      },
    });
  }
}

