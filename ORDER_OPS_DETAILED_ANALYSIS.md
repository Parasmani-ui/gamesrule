# Order Ops: The Online Food Delivery Simulation - Complete Analysis & Replication Guide

**Simulation Name:** Order Ops: The Online Food Delivery Simulation  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Operations Management, Platform Economics, Logistics  
**Duration:** 30 minutes  
**Difficulty:** ⭐⭐⭐⭐ (Advanced)  
**Players:** 1-4 players (supports multiple roles)  
**Framework:** Platform Economics, Real-time Logistics

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Platform Ecosystem Structure](#platform-ecosystem-structure)
7. [Order Generation System](#order-generation-system)
8. [Driver Assignment & Routing](#driver-assignment--routing)
9. [Real-time Movement System](#real-time-movement-system)
10. [Revenue & Cost Model](#revenue--cost-model)
11. [Customer Satisfaction & SLA](#customer-satisfaction--sla)
12. [Scoring & Metrics](#scoring--metrics)
13. [UI/UX Requirements](#uiux-requirements)
14. [API & Data Flow](#api--data-flow)
15. [Implementation Details](#implementation-details)
16. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**Order Ops: The Online Food Delivery Simulation** is a real-time logistics and platform economics simulation that teaches students how to manage a multi-sided food delivery platform. Players manage a fleet of delivery drivers, assign them to orders in real-time, optimize routes, and balance revenue (commissions) with costs (driver payments) while maintaining customer satisfaction through timely deliveries.

### Key Features

- ✅ **Real-time simulation** (30-minute duration, minute-by-minute updates)
- ✅ **2D coordinate system** for restaurants, customers, and drivers
- ✅ **Dynamic order generation** (1.5 orders/minute average)
- ✅ **Driver assignment system** with distance-based optimization
- ✅ **Platform economics** (commission-based revenue model)
- ✅ **SLA tracking** (40-minute delivery time limit)
- ✅ **Customer satisfaction** system
- ✅ **Profit optimization** goal

### Learning Outcomes

- Understand platform business models and two-sided markets
- Manage real-time logistics and fleet operations
- Optimize driver assignments for cost and speed
- Balance revenue (commissions) with operational costs
- Understand network effects and platform dynamics
- Learn trade-offs between speed, cost, and service quality

---

## 📚 Theoretical Foundation

### Core Concept: Platform Economics

**Platform Business Model:**
A platform creates value by facilitating interactions between two or more distinct groups (sides) of users. In food delivery:
- **Supply Side:** Restaurants
- **Demand Side:** Customers
- **Platform:** Order Ops (facilitator)
- **Delivery Partners:** Drivers (third side)

**Key Principle:** Platforms create value by reducing transaction costs and enabling network effects.

### Network Effects

**1. Direct Network Effects**
- More customers → More value for customers
- Example: More users = better matching, faster delivery

**2. Indirect Network Effects**
- More restaurants → More value for customers
- More customers → More value for restaurants
- Cross-side benefits

**3. Cross-Side Network Effects**
- Growth on one side benefits the other side
- Creates positive feedback loops
- Leads to winner-take-most dynamics

### Chicken-and-Egg Problem

**The Challenge:**
- Need restaurants to attract customers
- Need customers to attract restaurants
- Both sides need each other to start

**Solutions:**
- Subsidize one side initially (e.g., free delivery for customers)
- Build critical mass on one side first
- Leverage existing networks

### Multi-homing vs. Single-homing

**Multi-homing:**
- Restaurants list on multiple platforms (Swiggy, Zomato, Uber Eats)
- Customers use multiple apps
- Creates competitive pressure

**Single-homing:**
- Exclusive partnerships
- Higher switching costs
- Stronger network effects

---

## 🎮 Simulation Overview

### Game Setup

**Duration:** 30 minutes (configurable)  
**Time Scale:** 1 minute per update  
**Map Size:** 10×10 coordinate grid (0-10 on both axes)

**Initial Configuration:**
- **Number of Drivers:** 10 (default, configurable)
- **Restaurants:** 4 restaurants at fixed locations
- **Order Arrival Rate:** 1.5 orders/minute (configurable)
- **SLA:** 40 minutes maximum delivery time
- **Initial Customer Satisfaction:** 100%

### Restaurants

**Default Restaurant Setup:**

| Restaurant | Location (x, y) | Commission Rate | Avg Prep Time |
|------------|----------------|-----------------|---------------|
| Pizza Palace | (2, 3) | 20% | 15 min |
| Burger Bliss | (7, 2) | 18% | 10 min |
| Sushi Station | (4, 8) | 25% | 20 min |
| Indian Curry House | (9, 6) | 22% | 18 min |

**Restaurant Properties:**
- Fixed locations on map
- Commission rate (percentage of order value)
- Average preparation time (affects total delivery time)

### Drivers

**Driver Properties:**
- **ID:** D1, D2, D3, ..., D10
- **Name:** Driver 1, Driver 2, etc.
- **Location:** Random initial position (x, y)
- **Status:** `idle` | `picking-up` | `delivering`
- **Current Order:** Order ID if assigned
- **Speed:** 0.5 units/minute (configurable)

### Orders

**Order Properties:**
- **ID:** ORD1, ORD2, ORD3, ...
- **Customer ID:** CUST1, CUST2, ...
- **Restaurant ID:** R1, R2, R3, R4
- **Order Value:** ₹300 - ₹1000 (random)
- **Placed Time:** Minute when order was placed
- **Pickup Time:** Minute when driver picked up
- **Delivered Time:** Minute when order delivered
- **Status:** `pending` | `assigned` | `picked-up` | `delivered` | `cancelled`
- **Locations:** Restaurant location, Customer location

---

## 🔄 Complete Game Logic & Flow

### Real-time Simulation Loop

```
SIMULATION LOOP (Every Minute):

STEP 1: GENERATE NEW ORDERS
├─ Check order arrival rate (1.5 orders/min)
├─ Random chance: Math.random() < (arrivalRate / 60)
├─ If order generated:
│   ├─ Select random restaurant
│   ├─ Generate random customer location
│   ├─ Generate order value (₹300-₹1000)
│   ├─ Create order with status 'pending'
│   └─ Add to orders array

STEP 2: UPDATE DRIVER MOVEMENTS
├─ For each driver with status != 'idle':
│   ├─ Get current order
│   ├─ Determine target location:
│   │   ├─ If status = 'picking-up': target = restaurant
│   │   └─ If status = 'delivering': target = customer
│   ├─ Calculate distance to target
│   ├─ Move driver towards target (0.5 units/min)
│   └─ Update driver location

STEP 3: CHECK ORDER STATUS UPDATES
├─ For each order with status = 'assigned':
│   ├─ Get assigned driver
│   ├─ Calculate distance to restaurant
│   ├─ If distance < 0.1 (reached):
│   │   ├─ Update order status to 'picked-up'
│   │   ├─ Record pickup time
│   │   └─ Update driver status to 'delivering'
│
├─ For each order with status = 'picked-up':
│   ├─ Get assigned driver
│   ├─ Calculate distance to customer
│   ├─ If distance < 0.1 (reached):
│   │   ├─ Update order status to 'delivered'
│   │   ├─ Record delivered time
│   │   ├─ Complete order (calculate revenue, costs)
│   │   ├─ Update customer satisfaction
│   │   ├─ Free driver (status = 'idle')
│   │   └─ Remove from active orders

STEP 4: UPDATE METRICS
├─ Calculate average delivery time
├─ Update customer satisfaction
├─ Calculate driver utilization
├─ Update revenue and costs
└─ Check SLA violations

STEP 5: ADVANCE TIME
├─ Increment currentMinute
├─ Check if simulation complete (currentMinute >= durationMinutes)
└─ Save state

STEP 6: BROADCAST UPDATES
├─ Send state update via WebSocket
├─ Update map markers
├─ Update metrics dashboard
└─ Notify players of new orders
```

### Player Actions

**Action 1: Assign Driver to Order**
```typescript
{
  actionType: 'assign-driver',
  data: {
    orderId: 'ORD1',
    driverId: 'D3'
  }
}
```

**Action 2: Advance Time** (Automatic or Manual)
```typescript
{
  actionType: 'advance-time'
}
```

### Order Lifecycle

```
Order Placed (pending)
    ↓
[Player assigns driver]
    ↓
Order Assigned (assigned)
    ↓
[Driver reaches restaurant]
    ↓
Order Picked Up (picked-up)
    ↓
[Driver reaches customer]
    ↓
Order Delivered (delivered)
    ↓
[Calculate revenue, costs, satisfaction]
    ↓
Order Completed
```

---

## 💾 State Management

### Game State Structure

```typescript
interface OrderOpsGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    durationMinutes: number;          // Default: 30
    numDrivers: number;               // Default: 10
    restaurants: Restaurant[];        // 4 restaurants
    orderArrivalRate: number;         // Orders per minute (default: 1.5)
    maxDeliveryTime: number;          // SLA in minutes (default: 40)
  };
  
  currentMinute: number;              // Simulation time (0-30)
  
  drivers: Driver[];                 // Array of 10 drivers
  
  orders: Order[];                   // Active orders (pending, assigned, picked-up)
  
  completedOrders: Order[];          // Delivered orders
  
  revenue: number;                  // Total revenue (commissions)
  costs: number;                     // Total costs (driver payments)
  
  customerSatisfaction: number;      // 0-100%
  avgDeliveryTime: number;           // Average delivery time in minutes
  slaViolations: number;             // Count of SLA violations
  
  isComplete: boolean;
}
```

### Restaurant Structure

```typescript
interface Restaurant {
  id: string;                       // R1, R2, R3, R4
  name: string;                     // "Pizza Palace"
  location: { x: number; y: number }; // (2, 3)
  commissionRate: number;           // 20% (percentage)
  avgPreparationTime: number;        // 15 minutes
}
```

### Driver Structure

```typescript
interface Driver {
  id: string;                       // D1, D2, ..., D10
  name: string;                     // "Driver 1"
  currentLocation: { x: number; y: number }; // Current position
  status: 'idle' | 'picking-up' | 'delivering';
  currentOrder?: string;            // Order ID if assigned
}
```

### Order Structure

```typescript
interface Order {
  id: string;                       // ORD1, ORD2, ...
  customerId: string;               // CUST1, CUST2, ...
  restaurantId: string;              // R1, R2, R3, R4
  driverId?: string;                // D1, D2, ... (if assigned)
  orderValue: number;               // ₹300-₹1000
  placedTime: number;               // Minute when placed
  pickupTime?: number;              // Minute when picked up
  deliveredTime?: number;            // Minute when delivered
  status: 'pending' | 'assigned' | 'picked-up' | 'delivered' | 'cancelled';
  customerLocation: { x: number; y: number };
  restaurantLocation: { x: number; y: number };
}
```

---

## 🏗️ Platform Ecosystem Structure

### Three-Sided Platform

```
┌─────────────────────────────────────────────────────────┐
│                    PLATFORM ECOSYSTEM                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SUPPLY SIDE          PLATFORM          DEMAND SIDE     │
│  ┌──────────┐                        ┌──────────┐       │
│  │          │                        │          │       │
│  │Restaurant│◄─────Commissions───────│ Customer │       │
│  │   R1     │                        │  CUST1   │       │
│  │          │                        │          │       │
│  │Restaurant│                        │ Customer │       │
│  │   R2     │                        │  CUST2   │       │
│  │          │                        │          │       │
│  │Restaurant│                        │ Customer │       │
│  │   R3     │                        │  CUST3   │       │
│  │          │                        │          │       │
│  │Restaurant│                        │ Customer │       │
│  │   R4     │                        │  CUST4   │       │
│  └──────────┘                        └──────────┘       │
│         │                                    │          │
│         │                                    │          │
│         └──────────────┬─────────────────────┘          │
│                        │                                │
│                        ▼                                │
│              ┌─────────────────┐                        │
│              │  DELIVERY       │                        │
│              │  PARTNERS       │                        │
│              │  (Drivers)      │                        │
│              │                 │                        │
│              │  D1, D2, ...,   │                        │
│              │  D10            │                        │
│              └─────────────────┘                        │
│                                                          │
│  Platform Revenue: Commissions from restaurants          │
│  Platform Costs: Driver payments + operational costs     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Value Flows

**Revenue Flow:**
```
Customer pays ₹500 for order
    ↓
Restaurant receives ₹400 (80% after 20% commission)
    ↓
Platform receives ₹100 (20% commission)
```

**Cost Flow:**
```
Platform pays driver ₹50 base + ₹2/min × delivery time
    ↓
Example: 25-minute delivery = ₹50 + ₹50 = ₹100
    ↓
Platform profit = ₹100 revenue - ₹100 cost = ₹0 (break-even)
```

---

## 📦 Order Generation System

### Order Arrival Process

**Poisson Process:**
- Orders arrive randomly based on arrival rate
- Average: 1.5 orders per minute
- Probability per minute: `arrivalRate / 60`

**Generation Algorithm:**
```typescript
generateNewOrder(): void {
  // Select random restaurant
  const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)]
  
  // Generate order
  const order: Order = {
    id: `ORD${++orderIdCounter}`,
    customerId: `CUST${orderIdCounter}`,
    restaurantId: restaurant.id,
    orderValue: 300 + Math.random() * 700,  // ₹300-₹1000
    placedTime: currentMinute,
    status: 'pending',
    customerLocation: generateRandomLocation(),  // Random (x, y)
    restaurantLocation: restaurant.location      // Fixed restaurant location
  }
  
  orders.push(order)
}
```

### Order Value Distribution

**Range:** ₹300 to ₹1000  
**Distribution:** Uniform random  
**Average:** ₹650 per order

**Commission Calculation:**
```typescript
commission = orderValue × (restaurant.commissionRate / 100)

Example:
- Order: ₹500
- Commission Rate: 20%
- Commission: ₹500 × 0.20 = ₹100
```

### Order Frequency

**Arrival Rate:** 1.5 orders/minute  
**Expected Orders in 30 minutes:** 45 orders  
**Actual:** Varies due to randomness (Poisson distribution)

---

## 🚗 Driver Assignment & Routing

### Assignment Decision

**Player Action:**
- Select pending order
- Select available (idle) driver
- System assigns driver to order

**Assignment Validation:**
```typescript
assignDriverToOrder(orderId, driverId) {
  // 1. Validate order exists and is pending
  if (order.status !== 'pending') return error
  
  // 2. Validate driver exists and is idle
  if (driver.status !== 'idle') return error
  
  // 3. Assign
  order.driverId = driverId
  order.status = 'assigned'
  driver.status = 'picking-up'
  driver.currentOrder = orderId
  
  // 4. Estimate delivery time
  const estimatedTime = estimateDeliveryTime(order, driver)
  
  return success
}
```

### Distance Calculation

**Euclidean Distance:**
```typescript
calculateDistance(loc1: {x, y}, loc2: {x, y}): number {
  return Math.sqrt(
    Math.pow(loc2.x - loc1.x, 2) + 
    Math.pow(loc2.y - loc1.y, 2)
  )
}
```

**Example:**
- Driver at (3, 4)
- Restaurant at (2, 3)
- Distance = √[(2-3)² + (3-4)²] = √[1 + 1] = √2 ≈ 1.41 units

### Delivery Time Estimation

```typescript
estimateDeliveryTime(order: Order, driver: Driver): number {
  // Distance from driver to restaurant
  const toRestaurant = calculateDistance(
    driver.currentLocation, 
    order.restaurantLocation
  )
  
  // Distance from restaurant to customer
  const toCustomer = calculateDistance(
    order.restaurantLocation, 
    order.customerLocation
  )
  
  // Total distance
  const totalDistance = toRestaurant + toCustomer
  
  // Travel time (distance / speed)
  const travelTime = totalDistance / 0.5  // 0.5 units/min speed
  
  // Add restaurant preparation time
  const restaurant = getRestaurant(order.restaurantId)
  const prepTime = restaurant.avgPreparationTime
  
  // Total estimated time
  return travelTime + prepTime
}
```

### Optimal Assignment Strategy

**Strategy 1: Nearest Driver**
- Assign order to closest idle driver
- Minimizes travel time to restaurant
- Fastest pickup

**Strategy 2: Nearest to Restaurant**
- Consider driver's distance to restaurant
- Ignore customer location initially
- Good for quick assignments

**Strategy 3: Total Distance Minimization**
- Minimize: (driver → restaurant) + (restaurant → customer)
- Best overall efficiency
- More complex calculation

**Strategy 4: Revenue Maximization**
- Prioritize high-value orders
- Assign best drivers to high commissions
- Maximize profit per delivery

---

## 🗺️ Real-time Movement System

### Driver Movement Algorithm

```typescript
updateDrivers(): void {
  for (const driver of drivers) {
    if (driver.status !== 'idle' && driver.currentOrder) {
      const order = getOrder(driver.currentOrder)
      
      // Determine target based on order status
      let target: {x, y}
      if (order.status === 'assigned') {
        target = order.restaurantLocation  // Going to restaurant
      } else if (order.status === 'picked-up') {
        target = order.customerLocation    // Going to customer
      }
      
      // Move driver towards target
      driver.currentLocation = moveTowards(
        driver.currentLocation,
        target,
        0.5  // Speed: 0.5 units per minute
      )
    }
  }
}
```

### Movement Calculation

```typescript
moveTowards(from: {x, y}, to: {x, y}, speed: number): {x, y} {
  const distance = calculateDistance(from, to)
  
  // If already at target
  if (distance < speed) {
    return { ...to }
  }
  
  // Move towards target
  const ratio = speed / distance
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio
  }
}
```

### Movement Example

**Starting Position:** Driver at (3, 4)  
**Target:** Restaurant at (2, 3)  
**Speed:** 0.5 units/minute

**Minute 1:**
- Distance = √2 ≈ 1.41
- Ratio = 0.5 / 1.41 ≈ 0.354
- New position: (3 + (2-3)×0.354, 4 + (3-4)×0.354) = (2.646, 3.646)

**Minute 2:**
- Distance ≈ 0.91
- Move 0.5 units closer
- New position: (2.146, 3.146)

**Minute 3:**
- Distance ≈ 0.41
- Move remaining distance
- Arrive at (2, 3)

**Total Time:** ~3 minutes to reach restaurant

### Arrival Detection

```typescript
// Check if driver reached restaurant
const distance = calculateDistance(driver.currentLocation, restaurantLocation)
if (distance < 0.1) {  // Threshold: 0.1 units
  // Driver has arrived
  order.status = 'picked-up'
  order.pickupTime = currentMinute
  driver.status = 'delivering'
}
```

---

## 💰 Revenue & Cost Model

### Revenue Calculation

**Revenue Source:** Commission from restaurants

```typescript
calculateRevenue(order: Order): number {
  const restaurant = getRestaurant(order.restaurantId)
  const commission = order.orderValue × (restaurant.commissionRate / 100)
  return commission
}
```

**Example:**
- Order Value: ₹500
- Commission Rate: 20%
- Revenue: ₹500 × 0.20 = ₹100

**Total Revenue:**
```typescript
totalRevenue = sum of all commissions from completed orders
```

### Cost Calculation

**Cost Components:**
1. **Base Delivery Cost:** ₹50 per delivery
2. **Time-based Cost:** ₹2 per minute of delivery time

```typescript
calculateCost(order: Order): number {
  const deliveryTime = order.deliveredTime - order.placedTime
  const baseCost = 50
  const timeCost = deliveryTime × 2
  return baseCost + timeCost
}
```

**Example:**
- Delivery Time: 25 minutes
- Base Cost: ₹50
- Time Cost: 25 × ₹2 = ₹50
- Total Cost: ₹50 + ₹50 = ₹100

**Total Costs:**
```typescript
totalCosts = sum of all delivery costs
```

### Profit Calculation

```typescript
profit = totalRevenue - totalCosts
profitMargin = (profit / totalRevenue) × 100%
```

**Example:**
- Revenue: ₹4,500
- Costs: ₹4,000
- Profit: ₹500
- Profit Margin: (500 / 4500) × 100% = 11.1%

### Break-even Analysis

**Break-even occurs when:**
```
Commission = Base Cost + (Delivery Time × Time Cost)

Example with 20% commission:
₹500 × 0.20 = ₹50 + (Time × ₹2)
₹100 = ₹50 + (Time × ₹2)
₹50 = Time × ₹2
Time = 25 minutes

If delivery takes >25 minutes, platform loses money on that order.
```

---

## 😊 Customer Satisfaction & SLA

### SLA (Service Level Agreement)

**Maximum Delivery Time:** 40 minutes (configurable)

**SLA Violation:**
```typescript
if (deliveryTime > maxDeliveryTime) {
  slaViolations++
  customerSatisfaction -= 2  // Decrease by 2 points
} else {
  customerSatisfaction += 0.5  // Increase by 0.5 points
}
```

### Customer Satisfaction Calculation

**Initial:** 100%  
**Range:** 0% to 100%

**Update Rules:**
- **On-time delivery (≤40 min):** +0.5 points
- **Late delivery (>40 min):** -2 points
- **Capped:** Minimum 0%, Maximum 100%

**Formula:**
```typescript
customerSatisfaction = Math.max(0, Math.min(100, 
  currentSatisfaction + (onTime ? 0.5 : -2)
))
```

### Satisfaction Impact

**High Satisfaction (80-100%):**
- Better customer retention
- More repeat orders (implied)
- Positive word-of-mouth

**Low Satisfaction (<60%):**
- Customer churn risk
- Negative reviews
- Reduced order frequency

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Orders Completed**
- **Definition:** Total number of successfully delivered orders
- **Target:** Maximize (more orders = more revenue)
- **Calculation:** Count of orders with status 'delivered'

#### 2. **Revenue**
- **Definition:** Total commission revenue
- **Formula:** `Sum of (orderValue × commissionRate) for all completed orders`
- **Target:** Maximize
- **Display:** ₹X.XX

#### 3. **Costs**
- **Definition:** Total delivery costs
- **Formula:** `Sum of (50 + deliveryTime × 2) for all deliveries`
- **Target:** Minimize
- **Display:** ₹X.XX

#### 4. **Profit**
- **Definition:** Revenue - Costs
- **Target:** Maximize
- **Display:** ₹X.XX

#### 5. **Profit Margin**
- **Definition:** (Profit / Revenue) × 100%
- **Target:** 10-20% (healthy margin)
- **Display:** X.XX%

#### 6. **Average Delivery Time**
- **Definition:** Mean time from order placement to delivery
- **Formula:** `Sum of delivery times / Number of orders`
- **Target:** Minimize (ideally <30 minutes)
- **Display:** X.XX min

#### 7. **SLA Compliance**
- **Definition:** Percentage of orders delivered within SLA
- **Formula:** `(1 - slaViolations / totalOrders) × 100%`
- **Target:** >90%
- **Display:** X.XX%

#### 8. **Customer Satisfaction**
- **Definition:** Overall customer satisfaction score
- **Range:** 0-100%
- **Target:** >80%
- **Display:** XX%

#### 9. **Driver Utilization**
- **Definition:** Percentage of drivers actively working
- **Formula:** `(Busy drivers / Total drivers) × 100%`
- **Target:** 70-90% (balanced)
- **Display:** XX%

**Interpretation:**
- **<50%:** Too many idle drivers (overstaffed)
- **50-70%:** Good utilization
- **70-90%:** Optimal (busy but not overwhelmed)
- **>90%:** Overloaded (may need more drivers)

### Performance Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  ORDER OPS - Performance Metrics                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ORDERS                                                  │
│  ┌──────────────────────────────────────┐               │
│  │ Completed:        42 orders           │               │
│  │ Pending:          3 orders            │               │
│  │ Active:           5 orders            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  FINANCIAL                                               │
│  ┌──────────────────────────────────────┐               │
│  │ Revenue:          ₹4,200.00           │               │
│  │ Costs:            ₹3,850.00           │               │
│  │ Profit:           ₹350.00             │               │
│  │ Profit Margin:    8.33%                │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SERVICE QUALITY                                         │
│  ┌──────────────────────────────────────┐               │
│  │ Avg Delivery Time:  28.5 min          │               │
│  │ SLA Compliance:     95.2%            │               │
│  │ Customer Satisfaction: 87%            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  OPERATIONS                                              │
│  ┌──────────────────────────────────────┐               │
│  │ Driver Utilization:  75%               │               │
│  │ Idle Drivers:       2                  │               │
│  │ Active Drivers:     8                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Requirements

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  ORDER OPS - Minute 15 of 30                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MAP VIEW (10×10 Grid)                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  10│                                            │   │
│  │    │                                            │   │
│  │   8│        🍕 R3                               │   │
│  │    │                                            │   │
│  │   6│                    🍛 R4                  │   │
│  │    │                                            │   │
│  │   4│                                            │   │
│  │    │                                            │   │
│  │   2│        🍔 R2                               │   │
│  │    │                                            │   │
│  │   0│  🍕 R1                                     │   │
│  │    └────────────────────────────────────────────│   │
│  │      0   2   4   6   8  10                      │   │
│  │                                                  │   │
│  │  Legend:                                        │   │
│  │  🍕 Restaurant  🚗 Driver  📦 Order  🏠 Customer│   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PENDING ORDERS (3)                                     │
│  ┌──────────────────────────────────────┐               │
│  │ ORD15: ₹450 | Pizza Palace           │               │
│  │         [Assign Driver ▼]           │               │
│  │                                      │               │
│  │ ORD16: ₹680 | Burger Bliss           │               │
│  │         [Assign Driver ▼]           │               │
│  │                                      │               │
│  │ ORD17: ₹320 | Sushi Station          │               │
│  │         [Assign Driver ▼]           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ACTIVE DELIVERIES (5)                                   │
│  ┌──────────────────────────────────────┐               │
│  │ ORD12: D3 → Restaurant (2 min)        │               │
│  │ ORD13: D5 → Customer (8 min)          │               │
│  │ ORD14: D7 → Restaurant (5 min)       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  DRIVER STATUS                                           │
│  ┌──────────────────────────────────────┐               │
│  │ D1:  ⏸️ Idle                          │               │
│  │ D2:  ⏸️ Idle                          │               │
│  │ D3:  🚗 Picking up (ORD12)           │               │
│  │ D4:  🚗 Delivering (ORD10)            │               │
│  │ D5:  🚗 Delivering (ORD13)            │               │
│  │ ...                                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Advance 1 Minute] [Pause] [Speed: 1x]                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Driver Assignment Interface

```
┌─────────────────────────────────────────────────────────┐
│  ASSIGN DRIVER TO ORDER ORD15                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Order Details:                                          │
│  • Restaurant: Pizza Palace (2, 3)                       │
│  • Customer Location: (5.2, 7.8)                        │
│  • Order Value: ₹450                                     │
│  • Commission: ₹90 (20%)                                 │
│                                                          │
│  Available Drivers:                                      │
│  ┌──────────────────────────────────────┐               │
│  │ D1:  ⏸️ Idle                          │               │
│  │      Location: (3.5, 4.2)            │               │
│  │      Est. Delivery: 32 min            │               │
│  │      [Assign]                         │               │
│  │                                      │               │
│  │ D2:  ⏸️ Idle                          │               │
│  │      Location: (6.1, 2.8)            │               │
│  │      Est. Delivery: 28 min ⭐ Best    │               │
│  │      [Assign]                         │               │
│  │                                      │               │
│  │ D8:  ⏸️ Idle                          │               │
│  │      Location: (1.2, 5.5)            │               │
│  │      Est. Delivery: 35 min            │               │
│  │      [Assign]                         │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Cancel]                                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Real-time Map Visualization

**Map Features:**
- **Restaurants:** Fixed markers (🍕, 🍔, 🍣, 🍛)
- **Drivers:** Moving markers (🚗) with status color
  - Green: Idle
  - Yellow: Picking up
  - Red: Delivering
- **Orders:** Customer location markers (📦)
- **Routes:** Lines showing driver paths
- **Real-time Updates:** Markers move every minute

**Interactive Features:**
- Click driver to see details
- Click order to see assignment options
- Hover to see distances and times
- Zoom/pan capabilities

### Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  LIVE METRICS                                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Revenue:     ₹2,100.00  ████████░░  70% of target      │
│  Costs:       ₹1,950.00  ████████░░                      │
│  Profit:      ₹150.00    ██░░░░░░░░  7.1% margin        │
│                                                          │
│  Avg Delivery: 29.2 min  ████████░░  (Target: <30)      │
│  SLA:         92.5%       █████████░  (Target: >90%)      │
│  Satisfaction: 85%       █████████░  (Target: >80%)     │
│                                                          │
│  Driver Util:  75%       ████████░░  (Optimal: 70-90%)  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialization

```typescript
POST /api/sessions/:sessionId/games/order-ops/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    durationMinutes?: number,      // Default: 30
    numDrivers?: number,           // Default: 10
    orderArrivalRate?: number,      // Default: 1.5
    maxDeliveryTime?: number,       // Default: 40
    restaurants?: Restaurant[]
  }
}

Response: {
  success: true,
  state: {
    currentMinute: 0,
    maxMinutes: 30,
    drivers: Driver[],
    restaurants: Restaurant[],
    orders: [],
    revenue: 0,
    costs: 0,
    customerSatisfaction: 100,
    isComplete: false
  }
}
```

### Assign Driver

```typescript
POST /api/sessions/:sessionId/games/order-ops/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  actionType: 'assign-driver',
  data: {
    orderId: 'ORD1',
    driverId: 'D3'
  }
}

Response: {
  success: true,
  message: "Driver D3 assigned to order ORD1",
  data: {
    orderId: 'ORD1',
    driverId: 'D3',
    estimatedDeliveryTime: 28
  }
}
```

### Advance Time

```typescript
POST /api/sessions/:sessionId/games/order-ops/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  actionType: 'advance-time'
}

Response: {
  success: true,
  message: "Time advanced to minute 15",
  data: {
    currentMinute: 15,
    pendingOrders: 3,
    activeDeliveries: 5,
    completedOrders: 12,
    newOrders: ['ORD16', 'ORD17'],
    completedOrders: ['ORD10'],
    isComplete: false
  }
}
```

### Get Current State

```typescript
GET /api/sessions/:sessionId/games/order-ops/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentMinute: 15,
  maxMinutes: 30,
  pendingOrders: Order[],
  activeOrders: Order[],
  drivers: Driver[],
  revenue: 2100,
  costs: 1950,
  customerSatisfaction: 85,
  isComplete: false
}
```

### WebSocket Events

**State Update (Every Minute):**
```javascript
socket.on('game:state-update', (data) => {
  // Updated positions, new orders, completed orders
  updateMap(data)
  updateMetrics(data)
})
```

**New Order:**
```javascript
socket.on('game:new-order', (order) => {
  // New order arrived
  showNewOrderNotification(order)
  addOrderToMap(order)
})
```

**Order Completed:**
```javascript
socket.on('game:order-completed', (data) => {
  // Order delivered
  // data: { orderId, deliveryTime, revenue, cost }
  updateMetrics(data)
  showCompletionNotification(data)
})
```

**Driver Arrived:**
```javascript
socket.on('game:driver-arrived', (data) => {
  // Driver reached restaurant or customer
  // data: { driverId, orderId, location: 'restaurant' | 'customer' }
  updateDriverStatus(data)
})
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class OrderOpsEngine extends BaseGameEngine {
  private state: OrderOpsGameState;
  private orderIdCounter: number = 0;
  
  constructor(sessionId: string) {
    super(sessionId, 'order-ops');
  }
  
  // Core methods
  async initialize(config: Partial<OrderOpsConfig>): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Order methods
  private generateNewOrder(): void
  private updateOrders(): void
  private completeOrder(order: Order): void
  
  // Driver methods
  private assignDriverToOrder(data: any): Promise<ActionResult>
  private updateDrivers(): void
  
  // Calculation methods
  private calculateDistance(loc1: {x, y}, loc2: {x, y}): number
  private moveTowards(from: {x, y}, to: {x, y}, speed: number): {x, y}
  private estimateDeliveryTime(order: Order, driver: Driver): number
  private calculateDriverUtilization(): number
  
  // Helper methods
  private generateRestaurants(): Restaurant[]
  private generateDrivers(count: number): Driver[]
  private generateRandomLocation(): {x, y}
  private async saveGameState(): Promise<void>
}
```

### Real-time Update Loop

```typescript
async advanceTime(): Promise<ActionResult> {
  // 1. Advance time
  this.state.currentMinute++
  
  // 2. Generate new orders (Poisson process)
  if (Math.random() < this.state.config.orderArrivalRate / 60) {
    this.generateNewOrder()
  }
  
  // 3. Update driver positions
  this.updateDrivers()
  
  // 4. Check for arrivals (restaurant/customer)
  this.updateOrders()
  
  // 5. Check completion
  if (this.state.currentMinute >= this.state.config.durationMinutes) {
    this.state.isComplete = true
  }
  
  // 6. Save state
  await this.saveGameState()
  
  return {
    success: true,
    message: `Time advanced to minute ${this.state.currentMinute}`,
    data: {
      currentMinute: this.state.currentMinute,
      pendingOrders: this.state.orders.filter(o => o.status === 'pending').length,
      activeDeliveries: this.state.orders.filter(o => 
        o.status === 'assigned' || o.status === 'picked-up'
      ).length,
      completedOrders: this.state.completedOrders.length,
      isComplete: this.state.isComplete
    }
  }
}
```

### Order Completion Logic

```typescript
private completeOrder(order: Order): void {
  // 1. Calculate delivery time
  const deliveryTime = order.deliveredTime! - order.placedTime
  
  // 2. Move to completed orders
  this.state.completedOrders.push(order)
  
  // 3. Calculate revenue (commission)
  const restaurant = this.state.config.restaurants.find(
    r => r.id === order.restaurantId
  )!
  const commission = order.orderValue * (restaurant.commissionRate / 100)
  this.state.revenue += commission
  
  // 4. Calculate costs
  const deliveryCost = 50 + deliveryTime * 2
  this.state.costs += deliveryCost
  
  // 5. Update customer satisfaction
  if (deliveryTime > this.state.config.maxDeliveryTime) {
    this.state.slaViolations++
    this.state.customerSatisfaction = Math.max(0, 
      this.state.customerSatisfaction - 2
    )
  } else {
    this.state.customerSatisfaction = Math.min(100,
      this.state.customerSatisfaction + 0.5
    )
  }
  
  // 6. Update average delivery time
  const totalDeliveryTime = this.state.completedOrders.reduce(
    (sum, o) => sum + ((o.deliveredTime || 0) - o.placedTime), 
    0
  )
  this.state.avgDeliveryTime = totalDeliveryTime / this.state.completedOrders.length
  
  // 7. Free driver
  const driver = this.state.drivers.find(d => d.id === order.driverId)
  if (driver) {
    driver.status = 'idle'
    driver.currentOrder = undefined
  }
  
  // 8. Remove from active orders
  this.state.orders = this.state.orders.filter(o => o.id !== order.id)
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `OrderOpsEngine` class
- [ ] Create state management structures
- [ ] Implement order generation system
- [ ] Build driver management system
- [ ] Create distance calculation functions
- [ ] Implement movement system

### Phase 2: Real-time Simulation (Week 2-3)

- [ ] Build time advancement loop
- [ ] Implement driver movement algorithm
- [ ] Create arrival detection system
- [ ] Build order status update logic
- [ ] Implement order completion system

### Phase 3: Assignment System (Week 3)

- [ ] Build driver assignment logic
- [ ] Create assignment validation
- [ ] Implement delivery time estimation
- [ ] Build optimal assignment algorithms
- [ ] Add assignment recommendations

### Phase 4: Financial Model (Week 3-4)

- [ ] Implement revenue calculation (commissions)
- [ ] Build cost calculation system
- [ ] Create profit tracking
- [ ] Implement profit margin calculation

### Phase 5: Metrics & Analytics (Week 4)

- [ ] Build customer satisfaction system
- [ ] Implement SLA tracking
- [ ] Create driver utilization calculation
- [ ] Build performance metrics dashboard

### Phase 6: UI Development (Week 4-5)

- [ ] Design 2D map visualization
- [ ] Build restaurant/driver/customer markers
- [ ] Create real-time movement animation
- [ ] Design order assignment interface
- [ ] Build metrics dashboard
- [ ] Create driver status panel

### Phase 7: Real-time Updates (Week 5)

- [ ] Implement WebSocket integration
- [ ] Build state synchronization
- [ ] Create real-time map updates
- [ ] Add notification system

### Phase 8: Testing & Refinement (Week 6)

- [ ] Unit tests for calculations
- [ ] Integration tests for assignment
- [ ] Balance testing (revenue vs costs)
- [ ] Performance testing
- [ ] UI/UX testing

---

## 📝 Strategy Examples

### Strategy 1: Speed Optimization

**Approach:** Minimize delivery time
- Assign nearest driver to each order
- Prioritize quick assignments
- Accept lower profit margins for speed

**Result:** High customer satisfaction, lower profit margins

### Strategy 2: Profit Maximization

**Approach:** Maximize profit per order
- Prioritize high-value orders
- Assign to closest drivers (reduce costs)
- Focus on high-commission restaurants

**Result:** Higher profit margins, may sacrifice speed

### Strategy 3: Balanced Approach

**Approach:** Balance speed and profit
- Assign based on total distance minimization
- Consider both order value and delivery time
- Maintain SLA compliance

**Result:** Balanced metrics across all KPIs

### Strategy 4: Fleet Optimization

**Approach:** Optimize driver utilization
- Keep 70-80% drivers busy
- Avoid over-assignment
- Balance workload

**Result:** Efficient operations, good margins

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Platform Economics Introduction**
   - Explain two-sided markets
   - Discuss network effects
   - Show platform ecosystem

2. **Game Mechanics**
   - Map and coordinate system
   - Order generation
   - Driver assignment
   - Revenue/cost model

3. **Objectives**
   - Maximize profit
   - Maintain customer satisfaction
   - Optimize operations

### During Game (30 minutes)

- Real-time simulation runs
- Players make assignment decisions
- Monitor metrics continuously
- Adjust strategy based on performance

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final profit
   - Analyze delivery times
   - Discuss driver utilization

2. **Platform Economics Discussion**
   - How did network effects play out?
   - What was the chicken-and-egg challenge?
   - How did pricing affect operations?

3. **Key Learnings**
   - Trade-offs between speed and cost
   - Importance of real-time optimization
   - Platform business model insights

---

## ✅ Implementation Checklist

### Backend
- [x] OrderOpsEngine class structure
- [x] State management
- [x] Order generation
- [x] Driver management
- [x] Movement system
- [x] Revenue/cost calculation
- [x] Metrics computation
- [ ] API endpoints
- [ ] WebSocket integration
- [ ] Database schema

### Frontend
- [ ] 2D map visualization
- [ ] Restaurant markers
- [ ] Driver markers with movement
- [ ] Order markers
- [ ] Assignment interface
- [ ] Metrics dashboard
- [ ] Real-time updates
- [ ] Driver status panel

### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (assignment)
- [ ] Balance testing
- [ ] Performance testing
- [ ] UI/UX testing

### Documentation
- [x] Theory documentation
- [x] Implementation guide
- [ ] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Complete Analysis - Ready for Implementation  
**Based on:** OrderOpsEngine.ts, Theory Documentation, Platform Economics

---

*This document provides a complete blueprint for replicating the Order Ops simulation. All mechanics, flows, and logic are documented based on the engine implementation and platform economics theory.*
