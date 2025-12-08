# Fruit Beer Game: A Supply Chain Management Simulation - Complete Analysis & Replication Guide

**Simulation Name:** Fruit Beer Game: A Supply Chain Management Simulation  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Supply Chain Management, Systems Dynamics, Bullwhip Effect  
**Duration:** 60 minutes  
**Difficulty:** ⭐⭐⭐ (Intermediate to Advanced)  
**Players:** 1-4 players (RETAILER, WHOLESALER, DISTRIBUTOR, MANUFACTURER)  
**Framework:** Classic Beer Game, Bullwhip Effect, Multi-Tier Supply Chain

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Four-Tier Supply Chain Structure](#four-tier-supply-chain-structure)
7. [Weekly Processing Cycle](#weekly-processing-cycle)
8. [Pipeline System](#pipeline-system)
9. [Cost Structure](#cost-structure)
10. [Bullwhip Effect Calculation](#bullwhip-effect-calculation)
11. [Scoring & Metrics](#scoring--metrics)
12. [Report Analysis](#report-analysis)
13. [UI/UX Requirements](#uiux-requirements)
14. [API & Data Flow](#api--data-flow)
15. [Implementation Details](#implementation-details)
16. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**Fruit Beer Game: A Supply Chain Management Simulation** is a classic supply chain simulation that demonstrates the bullwhip effect - a fundamental phenomenon where small demand fluctuations amplify exponentially as they move upstream through a multi-tier supply chain. Players take on roles in a four-tier supply chain (Retailer → Wholesaler → Distributor → Manufacturer) and make ordering decisions each week, experiencing firsthand how decentralized decision-making with limited information leads to demand amplification and increased costs.

### Key Features

- ✅ **Four-tier supply chain** (RETAILER → WHOLESALER → DISTRIBUTOR → MANUFACTURER)
- ✅ **Weekly decision-making** (place orders upstream)
- ✅ **Lead time delays** (orders and shipments take time)
- ✅ **Pipeline system** (tracks orders and shipments in transit)
- ✅ **Cost accumulation** (holding costs + stockout costs)
- ✅ **Bullwhip effect** demonstration
- ✅ **Multi-player support** (1-4 players, bots fill missing roles)
- ✅ **Real-time synchronization** (all players must order before week advances)

### Learning Outcomes

- Understand the bullwhip effect and demand amplification
- Experience consequences of decentralized decision-making
- Learn importance of supply chain coordination
- Understand lead time impact on inventory
- Master cost trade-offs (holding vs. stockout)
- Recognize value of information sharing
- Apply systems thinking to supply chains

---

## 📚 Theoretical Foundation

### Core Concept: Bullwhip Effect

**Bullwhip Effect Definition:**
A phenomenon in supply chain management where small fluctuations in demand at the retail level cause progressively larger fluctuations in orders placed upstream. The effect gets its name from the way a bullwhip amplifies small movements at the handle into large movements at the tip.

**Key Principle:** Demand amplification increases exponentially with each tier upstream.

**Formula:**
```
Bullwhip Ratio = σ(Orders) / σ(Demand)
Where:
- σ(Orders) = Standard deviation of orders placed upstream
- σ(Demand) = Standard deviation of customer demand
- Ratio > 1 indicates bullwhip effect
```

### Causes of Bullwhip Effect

**1. Demand Forecasting**
- Each tier forecasts independently
- Forecast errors compound upstream
- Safety stock calculations amplify variability

**2. Lead Time Delays**
- Orders take time to arrive
- Players order more to compensate
- Creates overcorrection cycles

**3. Batch Ordering**
- Players order in batches
- Creates lumpy demand patterns
- Amplifies variability

**4. Price Fluctuations**
- Promotions and discounts
- Forward buying behavior
- Creates artificial demand spikes

**5. Rationing and Shortage Gaming**
- When supply is limited, players overorder
- Creates demand amplification
- Leads to boom-bust cycles

### Consequences

**Operational:**
- Excessive inventory upstream
- Stockouts downstream
- Increased costs (holding + stockout)
- Reduced service levels

**Strategic:**
- Poor capacity planning
- Inefficient resource allocation
- Reduced profitability
- Damaged supplier relationships

### Solutions

**1. Information Sharing**
- Share point-of-sale (POS) data
- Collaborative forecasting
- Vendor-managed inventory (VMI)

**2. Lead Time Reduction**
- Faster order processing
- Improved logistics
- Just-in-time (JIT) systems

**3. Order Coordination**
- Centralized ordering
- Continuous replenishment
- Collaborative planning

**4. Pricing Stability**
- Everyday low pricing (EDLP)
- Reduce promotions
- Stable pricing policies

---

## 🎮 Simulation Overview

### Game Setup

**Supply Chain Structure:**
```
Customer
  ↓ (demand)
RETAILER
  ↓ (orders)
WHOLESALER
  ↓ (orders)
DISTRIBUTOR
  ↓ (orders)
MANUFACTURER
  ↑ (produces)
```

**Default Configuration:**
- **Lead Time:** 2 weeks (orders and shipments)
- **Initial Inventory:** 12 units per player
- **Initial Backorder:** 0 units
- **Holding Cost:** ₹0.5 per unit per week
- **Stockout Cost:** ₹1.0 per unit per week
- **Number of Weeks:** 20 weeks
- **Demand Pattern:** 4 units for weeks 1-4, then 8 units (classic pattern)

### Player Roles

**RETAILER:**
- Faces customer demand directly
- Orders from Wholesaler
- Receives shipments from Wholesaler
- Closest to end customer

**WHOLESALER:**
- Supplies Retailers
- Orders from Distributor
- Receives shipments from Distributor
- Regional distribution hub

**DISTRIBUTOR:**
- Supplies Wholesalers
- Orders from Manufacturer
- Receives shipments from Manufacturer
- Regional aggregation point

**MANUFACTURER:**
- Produces goods (no upstream supplier)
- Receives orders from Distributor
- Produces based on orders
- Longest lead time visibility

### Game Objective

**Individual Goal:** Minimize total cost (holding + stockout)  
**System Goal:** Minimize total supply chain cost  
**Learning Goal:** Understand bullwhip effect and coordination

---

## 🔄 Complete Game Logic & Flow

### Initialization

```typescript
initialize(config) {
  // 1. Set default configuration
  config = {
    leadTime: 2,                    // Weeks
    initialInventory: 12,            // Units per player
    initialBackorder: 0,            // Units per player
    holdingCost: 0.5,                // Per unit per week
    stockoutCost: 1.0,               // Per unit per week
    numWeeks: 20,                    // Total weeks
    demandPattern: [4,4,4,4,8,8,...] // Customer demand
  }
  
  // 2. Initialize players
  players = {
    RETAILER: {
      role: 'RETAILER',
      inventory: 12,
      backorder: 0,
      lastOrderPlaced: 4,
      incomingShipments: [0, 0],     // Pipeline (leadTime length)
      incomingOrders: [0, 0],         // Pipeline (leadTime length)
      weeklyStats: [],
      totalCost: 0
    },
    // ... WHOLESALER, DISTRIBUTOR, MANUFACTURER
  }
  
  // 3. Initialize state
  state = {
    sessionId: sessionId,
    currentWeek: 0,
    maxWeeks: 20,
    config: config,
    players: players,
    customerDemand: demandPattern,
    isComplete: false
  }
}
```

### Weekly Processing Cycle

```
FOR each week (1 to maxWeeks):

  STEP 1: RECEIVE SHIPMENTS
  ├─ FOR each player:
  │   ├─ Get shipment from pipeline[0]
  │   ├─ Add to inventory
  │   └─ Shift pipeline left
  │
  └─ Log: "Player X received Y units"

  STEP 2: PROCESS ORDERS/DEMAND
  ├─ Process from RETAILER to MANUFACTURER:
  │   ├─ RETAILER: Get customer demand
  │   ├─ Others: Get order from downstream pipeline[0]
  │   ├─ Calculate total demand (order + backorder)
  │   ├─ Fulfill as much as possible
  │   ├─ Update inventory and backorder
  │   └─ Ship fulfilled quantity to downstream
  │
  └─ Log: "Player X fulfilled Y units, inventory: Z, backorder: W"

  STEP 3: PLACE ORDERS
  ├─ FOR each player:
  │   ├─ Get order from pendingOrders (player's decision)
  │   ├─ If MANUFACTURER: Add to production pipeline
  │   ├─ If others: Add to upstream's incomingOrders pipeline
  │   └─ Update lastOrderPlaced
  │
  └─ Log: "Player X placed order of Y units"

  STEP 4: ADVANCE PIPELINES
  ├─ Ensure all pipelines have consistent length (leadTime)
  └─ Pipelines already shifted in Step 1 and Step 2

  STEP 5: CALCULATE COSTS
  ├─ FOR each player:
  │   ├─ Holding cost = max(0, inventory) × holdingCost
  │   ├─ Stockout cost = backorder × stockoutCost
  │   ├─ Week cost = holding + stockout
  │   └─ Add to totalCost
  │
  └─ Log: "Player X: holding=Y, stockout=Z, total=W"

  STEP 6: RECORD WEEKLY STATS
  ├─ FOR each player:
  │   └─ Save: week, demand, received, shipped, orderPlaced,
  │            inventory, backorder, holdingCost, stockoutCost, totalCost
  │
  └─ Store in weeklyStats array

  STEP 7: CLEAR PENDING ORDERS
  └─ Clear pendingOrders map (ready for next week)

  STEP 8: CHECK COMPLETION
  └─ IF currentWeek >= maxWeeks:
      └─ isComplete = true
```

### Order Placement Flow

```
Player Action: Place Order
├─ Player submits orderQuantity
├─ Validate: orderQuantity >= 0
├─ Check: Has player already placed order this week?
│   ├─ YES → Return error
│   └─ NO → Continue
│
├─ Store in pendingOrders map
├─ Save decision to database
└─ Return success

When Week Advances:
├─ Get order from pendingOrders
├─ If MANUFACTURER:
│   └─ Add to production pipeline (arrives in leadTime weeks)
│
└─ If others:
    └─ Add to upstream's incomingOrders pipeline (processed next week)
```

---

## 💾 State Management

### Game State Structure

```typescript
interface FruitBeerGameState {
  sessionId: string;
  currentWeek: number;              // 0-20
  maxWeeks: number;                 // Default: 20
  config: FruitBeerConfig;
  players: Map<string, FruitBeerPlayerState>;
  customerDemand: number[];         // Demand pattern
  isComplete: boolean;
}
```

### Player State Structure

```typescript
interface FruitBeerPlayerState {
  role: 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'MANUFACTURER';
  inventory: number;                // Current inventory level
  backorder: number;                // Unfulfilled demand
  lastOrderPlaced: number;           // Last order quantity
  incomingShipments: number[];       // Pipeline: [arrives this week, arrives next week, ...]
  incomingOrders: number[];          // Pipeline: [processed this week, processed next week, ...]
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
  totalCost: number;                // Cumulative cost
}
```

### Configuration Structure

```typescript
interface FruitBeerConfig {
  leadTime: number;                 // Default: 2 weeks
  initialInventory: number;         // Default: 12 units
  initialBackorder: number;          // Default: 0 units
  holdingCost: number;               // Default: 0.5 per unit per week
  stockoutCost: number;              // Default: 1.0 per unit per week
  numWeeks: number;                  // Default: 20 weeks
  demandPattern?: number[];          // Optional: custom pattern
}
```

---

## 🔗 Four-Tier Supply Chain Structure

### Supply Chain Flow

```
┌─────────────┐
│  Customer   │
│  (Demand)   │
└──────┬──────┘
       │ Demand: 4 units (weeks 1-4), then 8 units
       ↓
┌─────────────┐
│  RETAILER   │
│             │
│ Inventory: 12│
│ Orders: →    │
│ Ships: ←     │
└──────┬──────┘
       │ Orders to Wholesaler
       ↓
┌─────────────┐
│ WHOLESALER  │
│             │
│ Inventory: 12│
│ Orders: →    │
│ Ships: ←     │
└──────┬──────┘
       │ Orders to Distributor
       ↓
┌─────────────┐
│ DISTRIBUTOR │
│             │
│ Inventory: 12│
│ Orders: →    │
│ Ships: ←     │
└──────┬──────┘
       │ Orders to Manufacturer
       ↓
┌─────────────┐
│MANUFACTURER │
│             │
│ Inventory: 12│
│ Produces: →  │
│ Ships: ←     │
└─────────────┘
```

### Information Flow

**Downstream → Upstream (Orders):**
- RETAILER orders from WHOLESALER
- WHOLESALER orders from DISTRIBUTOR
- DISTRIBUTOR orders from MANUFACTURER
- MANUFACTURER produces

**Upstream → Downstream (Shipments):**
- MANUFACTURER ships to DISTRIBUTOR
- DISTRIBUTOR ships to WHOLESALER
- WHOLESALER ships to RETAILER
- RETAILER fulfills customer demand

**Information Asymmetry:**
- Players only see their own inventory
- Players don't see downstream inventory
- Players don't see upstream inventory
- Creates bullwhip effect

---

## 📅 Weekly Processing Cycle

### Step 1: Receive Shipments

```typescript
receiveShipments() {
  FOR each player:
    // Get shipment from pipeline[0] (arrives this week)
    shipment = player.incomingShipments.shift() || 0
    
    // Add to inventory
    player.inventory += shipment
    
    // Log
    if (shipment > 0) {
      log(`${role}: Received ${shipment} units, New inventory = ${inventory}`)
    }
}
```

**Example:**
- Week 2: RETAILER receives shipment from Week 0 order
- Pipeline: [5, 0] → Shipment = 5, New pipeline: [0]
- Inventory: 8 → 13

### Step 2: Process Orders/Demand

```typescript
processOrders() {
  // Process from RETAILER (downstream) to MANUFACTURER (upstream)
  FOR each role in [RETAILER, WHOLESALER, DISTRIBUTOR, MANUFACTURER]:
    
    // Get demand
    IF role === RETAILER:
      demand = customerDemand[currentWeek - 1]
    ELSE:
      demand = player.incomingOrders[0]  // Order from downstream
      player.incomingOrders.shift()      // Remove processed order
    
    // Calculate total demand
    totalDemand = demand + player.backorder
    
    // Fulfill as much as possible
    fulfilled = min(totalDemand, player.inventory)
    player.inventory -= fulfilled
    player.backorder = totalDemand - fulfilled
    
    // Ship to downstream (if not RETAILER)
    IF role !== RETAILER:
      downstreamPlayer = getPlayerByRole(downstreamRole)
      leadTime = config.leadTime
      downstreamPlayer.incomingShipments[leadTime - 1] += fulfilled
}
```

**Example:**
- RETAILER: Demand = 4, Inventory = 13, Backorder = 0
- Fulfilled = min(4, 13) = 4
- New inventory = 9, New backorder = 0

### Step 3: Place Orders

```typescript
placeOrders() {
  FOR each player:
    // Get order from pendingOrders (player's decision)
    orderQty = pendingOrders.get(participantId) || player.lastOrderPlaced
    player.lastOrderPlaced = orderQty
    
    IF role === MANUFACTURER:
      // Production (arrives in leadTime weeks)
      player.incomingShipments[leadTime - 1] += orderQty
    ELSE:
      // Order to upstream (processed next week)
      upstreamPlayer = getPlayerByRole(upstreamRole)
      upstreamPlayer.incomingOrders[1] += orderQty
}
```

**Example:**
- RETAILER places order of 5 units
- WHOLESALER's incomingOrders[1] += 5
- Next week, WHOLESALER will process this order

---

## 🔄 Pipeline System

### Pipeline Concept

**Purpose:** Track orders and shipments that are in transit (lead time delay)

**Structure:**
```
Pipeline = [arrives this week, arrives next week, arrives in 2 weeks, ...]
Index 0 = Current week
Index 1 = Next week
Index 2 = Week after next
```

### Incoming Shipments Pipeline

**Purpose:** Track shipments arriving from upstream

**Example:**
```
Week 0: RETAILER places order of 5 units to WHOLESALER
Week 1: WHOLESALER ships 5 units → RETAILER's pipeline: [0, 5]
Week 2: RETAILER receives 5 units → Pipeline: [5, 0] → Inventory += 5
```

**Implementation:**
```typescript
// When upstream ships to downstream
downstreamPlayer.incomingShipments[leadTime - 1] += fulfilled

// When week advances
shipment = player.incomingShipments.shift()  // Get [0]
player.inventory += shipment
```

### Incoming Orders Pipeline

**Purpose:** Track orders from downstream that need to be fulfilled

**Example:**
```
Week 0: RETAILER places order of 5 units
Week 1: WHOLESALER processes order → Demand = 5
```

**Implementation:**
```typescript
// When downstream places order
upstreamPlayer.incomingOrders[1] += orderQty

// When week advances
demand = player.incomingOrders[0]  // Get [0]
player.incomingOrders.shift()      // Remove [0]
```

### Pipeline Visualization

```
Week 0:
RETAILER places order: 5 units
WHOLESALER.incomingOrders: [0, 5]

Week 1:
WHOLESALER processes order: demand = 5
WHOLESALER.incomingOrders: [5, 0] → shift → [0]
WHOLESALER ships: 5 units
RETAILER.incomingShipments: [0, 5]

Week 2:
RETAILER receives shipment: 5 units
RETAILER.incomingShipments: [5, 0] → shift → [0]
RETAILER.inventory += 5
```

---

## 💰 Cost Structure

### Cost Components

**1. Holding Cost**
- **Formula:** `max(0, inventory) × holdingCost`
- **Default:** ₹0.5 per unit per week
- **Purpose:** Penalize excess inventory
- **Example:** Inventory = 10 → Cost = 10 × 0.5 = ₹5

**2. Stockout Cost**
- **Formula:** `backorder × stockoutCost`
- **Default:** ₹1.0 per unit per week
- **Purpose:** Penalize unfulfilled demand
- **Example:** Backorder = 3 → Cost = 3 × 1.0 = ₹3

**3. Total Weekly Cost**
- **Formula:** `holdingCost + stockoutCost`
- **Example:** Holding = ₹5, Stockout = ₹3 → Total = ₹8

**4. Cumulative Cost**
- **Formula:** `totalCost += weeklyCost`
- **Purpose:** Track total cost over all weeks

### Cost Calculation

```typescript
calculateCosts() {
  holdingCost = config.holdingCost || 0.5
  stockoutCost = config.stockoutCost || 1.0
  
  FOR each player:
    holding = max(0, player.inventory) * holdingCost
    stockout = player.backorder * stockoutCost
    weekCost = holding + stockout
    player.totalCost += weekCost
}
```

### Cost Examples

**Scenario 1: Balanced Inventory**
- Inventory: 5 units
- Backorder: 0 units
- Holding: 5 × 0.5 = ₹2.5
- Stockout: 0 × 1.0 = ₹0
- Total: ₹2.5

**Scenario 2: Excess Inventory**
- Inventory: 20 units
- Backorder: 0 units
- Holding: 20 × 0.5 = ₹10
- Stockout: 0 × 1.0 = ₹0
- Total: ₹10

**Scenario 3: Stockout**
- Inventory: 0 units
- Backorder: 5 units
- Holding: 0 × 0.5 = ₹0
- Stockout: 5 × 1.0 = ₹5
- Total: ₹5

**Scenario 4: Both Costs**
- Inventory: 10 units
- Backorder: 3 units
- Holding: 10 × 0.5 = ₹5
- Stockout: 3 × 1.0 = ₹3
- Total: ₹8

---

## 📊 Bullwhip Effect Calculation

### Bullwhip Ratio Formula

```
Bullwhip Ratio = σ(Orders) / σ(Demand)

Where:
- σ(Orders) = Standard deviation of orders placed upstream
- σ(Demand) = Standard deviation of customer demand
- Ratio > 1 indicates bullwhip effect
- Higher ratio = More amplification
```

### Calculation Method

```typescript
calculateBullwhipEffect() {
  // Get order history for each tier
  retailerOrders = getOrderHistory('RETAILER')
  wholesalerOrders = getOrderHistory('WHOLESALER')
  distributorOrders = getOrderHistory('DISTRIBUTOR')
  manufacturerOrders = getOrderHistory('MANUFACTURER')
  
  // Get customer demand
  customerDemand = state.customerDemand
  
  // Calculate variances
  demandVariance = variance(customerDemand)
  manufacturerVariance = variance(manufacturerOrders)
  
  // Calculate bullwhip ratio
  IF demandVariance > 0:
    bullwhipRatio = manufacturerVariance / demandVariance
  ELSE:
    bullwhipRatio = 1.0
  
  RETURN bullwhipRatio
}
```

### Variance Calculation

```typescript
variance(values) {
  IF values.length === 0:
    RETURN 0
  
  mean = sum(values) / values.length
  squaredDiffs = values.map(v => (v - mean)²)
  variance = sum(squaredDiffs) / values.length
  
  RETURN variance
}
```

### Bullwhip Interpretation

**Ratio < 1.0:**
- Demand amplification is less than demand variability
- Good coordination
- Information sharing working

**Ratio = 1.0:**
- Orders match demand variability
- Perfect coordination (ideal)

**Ratio > 1.0:**
- Demand amplification exceeds demand variability
- Bullwhip effect present
- Poor coordination

**Ratio > 2.0:**
- Severe bullwhip effect
- Significant amplification
- Need for intervention

### Example Calculation

**Customer Demand:** [4, 4, 4, 4, 8, 8, 8, 8, ...]
- Mean: 6
- Variance: 4

**Manufacturer Orders:** [4, 4, 6, 8, 12, 16, 14, 10, ...]
- Mean: 10
- Variance: 20

**Bullwhip Ratio:** 20 / 4 = 5.0
- Severe bullwhip effect
- Orders 5x more variable than demand

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Total Cost**
- **Definition:** Cumulative cost over all weeks
- **Components:** Holding costs + Stockout costs
- **Target:** Minimize
- **Display:** ₹XXX per player

#### 2. **Bullwhip Effect**
- **Definition:** Ratio of order variance to demand variance
- **Formula:** σ(Orders) / σ(Demand)
- **Target:** Minimize (closer to 1.0)
- **Display:** X.XX ratio

#### 3. **Inventory Variance**
- **Definition:** Variance of inventory levels over time
- **Formula:** Variance of weekly inventory values
- **Target:** Minimize (stable inventory)
- **Display:** X.XX per player

#### 4. **Service Level**
- **Definition:** Percentage of demand fulfilled on time
- **Formula:** (Total Fulfilled / Total Demand) × 100%
- **Target:** Maximize (closer to 100%)
- **Display:** XX% per player

#### 5. **Average Inventory**
- **Definition:** Average inventory level over all weeks
- **Formula:** Sum of weekly inventory / Number of weeks
- **Target:** Optimize (balance holding vs. stockout)
- **Display:** X.XX units per player

#### 6. **Total Stockouts**
- **Definition:** Cumulative unfulfilled demand
- **Formula:** Sum of weekly backorders
- **Target:** Minimize
- **Display:** XXX units per player

### Metrics Calculation

```typescript
computeMetrics() {
  metrics = {
    totalCosts: {},
    bullwhipEffect: calculateBullwhipEffect(),
    inventoryVariance: {},
    serviceLevel: {}
  }
  
  FOR each player:
    metrics.totalCosts[role] = player.totalCost
    
    inventories = player.weeklyStats.map(w => w.inventory)
    metrics.inventoryVariance[role] = variance(inventories)
    
    totalDemand = sum(player.weeklyStats.map(w => w.demand))
    totalFulfilled = sum(player.weeklyStats.map(w => w.shipped))
    metrics.serviceLevel[role] = (totalFulfilled / totalDemand) * 100
  
  RETURN metrics
}
```

---

## 📈 Report Analysis

### Comprehensive Performance Report

**Report Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  FRUIT BEER GAME - Performance Report                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SUPPLY CHAIN SUMMARY                                    │
│  ┌──────────────────────────────────────┐               │
│  │ Total Weeks: 20                        │               │
│  │ Lead Time: 2 weeks                     │               │
│  │ Demand Pattern: 4→8 (step change)      │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  TOTAL COSTS BY ROLE                                     │
│  ┌──────────────────────────────────────┐               │
│  │ Role          │ Total Cost │ Rank     │               │
│  ├───────────────┼────────────┼──────────┤               │
│  │ RETAILER      │ ₹45.50     │ 1        │               │
│  │ WHOLESALER    │ ₹78.25     │ 2        │               │
│  │ DISTRIBUTOR   │ ₹125.75    │ 3        │               │
│  │ MANUFACTURER  │ ₹198.50     │ 4        │               │
│  ├───────────────┼────────────┼──────────┤               │
│  │ TOTAL         │ ₹448.00    │          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  BULLWHIP EFFECT                                         │
│  ┌──────────────────────────────────────┐               │
│  │ Bullwhip Ratio: 3.25                  │               │
│  │ Interpretation: Severe amplification  │               │
│  │                                        │               │
│  │ Order Variance by Tier:               │               │
│  │ • RETAILER: 2.5 (baseline)            │               │
│  │ • WHOLESALER: 5.8 (2.3x)              │               │
│  │ • DISTRIBUTOR: 12.4 (5.0x)           │               │
│  │ • MANUFACTURER: 20.3 (8.1x)          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  INVENTORY ANALYSIS                                      │
│  ┌──────────────────────────────────────┐               │
│  │ Role          │ Avg │ Max │ Min │ Var │               │
│  ├───────────────┼─────┼─────┼─────┼─────┤               │
│  │ RETAILER      │ 8.2 │ 15  │ 2   │ 12.5│               │
│  │ WHOLESALER    │ 12.5│ 28  │ 0   │ 45.2│               │
│  │ DISTRIBUTOR   │ 18.3│ 42  │ 0   │ 98.7│               │
│  │ MANUFACTURER  │ 25.6│ 58  │ 0   │ 156.3│              │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SERVICE LEVEL                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Role          │ Fulfilled │ Demand │ % │               │
│  ├───────────────┼───────────┼────────┼────┤               │
│  │ RETAILER      │ 148       │ 148    │100%│               │
│  │ WHOLESALER    │ 145       │ 148    │ 98%│               │
│  │ DISTRIBUTOR   │ 142       │ 148    │ 96%│               │
│  │ MANUFACTURER  │ 140       │ 148    │ 95%│               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  WEEK-BY-WEEK BREAKDOWN                                 │
│  ┌──────────────────────────────────────┐               │
│  │ Week │ Demand │ R-Inv │ W-Inv │ D-Inv │ M-Inv │      │
│  ├──────┼────────┼───────┼───────┼───────┼───────┤      │
│  │  1   │   4    │  12   │  12   │  12   │  12   │      │
│  │  2   │   4    │   8   │  12   │  12   │  12   │      │
│  │  3   │   4    │   4   │  10   │  12   │  12   │      │
│  │  4   │   4    │   0   │   8   │  10   │  12   │      │
│  │  5   │   8    │   0   │   4   │   8   │  10   │      │
│  │  6   │   8    │   4   │   0   │   4   │   8   │      │
│  │  7   │   8    │   8   │   0   │   0   │   4   │      │
│  │  8   │   8    │  12   │   4   │   0   │   0   │      │
│  │ ...  │  ...   │  ...  │  ...  │  ...  │  ...  │      │
│  └──────────────────────────────────────┘               │
│                                                          │
│  KEY INSIGHTS                                            │
│  ┌──────────────────────────────────────┐               │
│  │ 1. Bullwhip Effect Detected           │               │
│  │    • Demand doubled (4→8)             │               │
│  │    • Orders amplified 8x upstream     │               │
│  │                                        │               │
│  │ 2. Cost Escalation                    │               │
│  │    • Costs increase upstream           │               │
│  │    • MANUFACTURER has highest cost     │               │
│  │                                        │               │
│  │ 3. Inventory Swings                    │               │
│  │    • Inventory variance increases      │               │
│  │    • Upstream players overstock        │               │
│  │                                        │               │
│  │ 4. Service Level Degradation          │               │
│  │    • Service level decreases upstream  │               │
│  │    • Stockouts occur upstream          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  RECOMMENDATIONS                                         │
│  ┌──────────────────────────────────────┐               │
│  │ 1. Information Sharing                 │               │
│  │    • Share POS data upstream           │               │
│  │    • Collaborative forecasting         │               │
│  │                                        │               │
│  │ 2. Lead Time Reduction                 │               │
│  │    • Faster order processing           │               │
│  │    • Improved logistics                │               │
│  │                                        │               │
│  │ 3. Order Coordination                  │               │
│  │    • Centralized ordering              │               │
│  │    • Vendor-managed inventory          │               │
│  │                                        │               │
│  │ 4. Stable Ordering                     │               │
│  │    • Order only what you need          │               │
│  │    • Avoid overcorrection              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Bullwhip Visualization

```
Order Variance Over Time:

Variance
  │
  │                                    ● MANUFACTURER
  │                              ●
  │                        ● DISTRIBUTOR
  │                  ●
  │            ● WHOLESALER
  │      ● RETAILER
  │  ●
  └──────────────────────────────────────────
    1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
                    Weeks

Interpretation:
- Demand doubles at week 5 (4→8)
- Order variance amplifies upstream
- MANUFACTURER sees 8x variance
```

---

## 🎨 UI/UX Requirements

### Main Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  FRUIT BEER GAME - Week 5 of 20                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  YOUR ROLE: RETAILER                                     │
│                                                          │
│  CURRENT STATUS                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Inventory:        8 units              │               │
│  │ Backorder:        0 units               │               │
│  │ Total Cost:       ₹12.50                │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  INCOMING SHIPMENTS (Pipeline)                           │
│  ┌──────────────────────────────────────┐               │
│  │ Arrives this week:  5 units            │               │
│  │ Arrives next week:  0 units            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  CUSTOMER DEMAND                                         │
│  ┌──────────────────────────────────────┐               │
│  │ This week:        8 units              │               │
│  │ Last week:        4 units              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  PLACE ORDER                                             │
│  ┌──────────────────────────────────────┐               │
│  │ Order Quantity: [8]                   │               │
│  │                                        │               │
│  │ [Place Order]                          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  WEEKLY HISTORY                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Week │ Demand │ Inv │ Back │ Cost │   │               │
│  ├──────┼────────┼─────┼──────┼──────┤   │               │
│  │  1   │   4    │ 12  │  0   │ ₹6.0 │   │               │
│  │  2   │   4    │  8  │  0   │ ₹4.0 │   │               │
│  │  3   │   4    │  4  │  0   │ ₹2.0 │   │               │
│  │  4   │   4    │  0  │  0   │ ₹0.0 │   │               │
│  │  5   │   8    │  0  │  0   │ ₹0.0 │   │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Waiting for other players to place orders...            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Supply Chain Visualization

```
┌─────────────────────────────────────────────────────────┐
│  SUPPLY CHAIN OVERVIEW                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Customer Demand: 8 units                                │
│                                                          │
│  ┌──────────┐                                            │
│  │RETAILER  │ Inventory: 8                              │
│  │          │ Backorder: 0                              │
│  │ Cost: ₹12│                                            │
│  └────┬─────┘                                            │
│       │ Order: 8                                        │
│       ↓                                                  │
│  ┌──────────┐                                            │
│  │WHOLESALER│ Inventory: 12                              │
│  │          │ Backorder: 0                              │
│  │ Cost: ₹18│                                            │
│  └────┬─────┘                                            │
│       │ Order: 12                                       │
│       ↓                                                  │
│  ┌──────────┐                                            │
│  │DISTRIBUTOR│ Inventory: 20                             │
│  │          │ Backorder: 0                              │
│  │ Cost: ₹25│                                            │
│  └────┬─────┘                                            │
│       │ Order: 20                                       │
│       ↓                                                  │
│  ┌──────────┐                                            │
│  │MANUFACTURER│ Inventory: 28                            │
│  │          │ Backorder: 0                              │
│  │ Cost: ₹35│                                            │
│  └──────────┘                                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialize Simulation

```typescript
POST /api/sessions/:sessionId/games/fruit-beer-game/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    leadTime?: number,
    initialInventory?: number,
    initialBackorder?: number,
    holdingCost?: number,
    stockoutCost?: number,
    numWeeks?: number,
    demandPattern?: number[]
  }
}

Response: {
  success: true,
  state: {
    currentWeek: 0,
    maxWeeks: 20,
    config: {...},
    isComplete: false
  }
}
```

### Place Order

```typescript
POST /api/sessions/:sessionId/games/fruit-beer-game/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  orderQuantity: 8
}

Response: {
  success: true,
  message: "Order placed successfully",
  updatedState: {
    role: "RETAILER",
    inventory: 8,
    backorder: 0,
    hasPlacedOrder: true,
    currentWeek: 5
  }
}
```

### Advance Week

```typescript
POST /api/sessions/:sessionId/games/fruit-beer-game/advance-round
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  success: true,
  roundNumber: 6,
  summary: {
    week: 6,
    customerDemand: 8,
    totalCosts: 125.50
  },
  participantResults: Map<participantId, {
    role: "RETAILER",
    inventory: 5,
    backorder: 0,
    totalCost: 15.50
  }>,
  isGameComplete: false
}
```

### Get Metrics

```typescript
GET /api/sessions/:sessionId/games/fruit-beer-game/metrics
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  totalCosts: {
    RETAILER: 45.50,
    WHOLESALER: 78.25,
    DISTRIBUTOR: 125.75,
    MANUFACTURER: 198.50
  },
  bullwhipEffect: 3.25,
  inventoryVariance: {
    RETAILER: 12.5,
    WHOLESALER: 45.2,
    DISTRIBUTOR: 98.7,
    MANUFACTURER: 156.3
  },
  serviceLevel: {
    RETAILER: 100,
    WHOLESALER: 98,
    DISTRIBUTOR: 96,
    MANUFACTURER: 95
  }
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class FruitBeerEngine extends BaseGameEngine {
  private state: FruitBeerGameState;
  private pendingOrders: Map<string, number>;
  private readonly ROLES = ['RETAILER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER'];
  
  constructor(sessionId: string) {
    super(sessionId, 'fruit-beer-game');
  }
  
  // Core methods
  async initialize(config: FruitBeerConfig): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Weekly processing
  private receiveShipments(): void
  private processOrders(): void
  private placeOrders(): void
  private advancePipelines(): void
  private calculateCosts(): void
  private recordWeeklyStats(): void
  
  // Helper methods
  private getPlayerByRole(role: string): FruitBeerPlayerState | undefined
  private getParticipantIdByRole(role: string): string | undefined
  private getCurrentDemand(role: string): number
  private generateDemandPattern(weeks: number): number[]
  private calculateBullwhipEffect(): number
  private variance(values: number[]): number
  private getRoundSummary(): any
  private getParticipantResults(): Map<string, any>
  private async saveGameState(): Promise<void>
}
```

### Pipeline Management

**Key Implementation Details:**
- Pipelines are arrays: `[arrives this week, arrives next week, ...]`
- `shift()` removes first element (arrives this week)
- `[leadTime - 1]` is where future arrivals are placed
- Pipelines maintain consistent length (leadTime)

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1)

- [x] Implement `FruitBeerEngine` class (✅ Complete)
- [x] Create state management structures (✅ Complete)
- [x] Implement four-tier supply chain (✅ Complete)
- [x] Build pipeline system (✅ Complete)

### Phase 2: Weekly Processing (Week 1-2)

- [x] Implement receive shipments (✅ Complete)
- [x] Implement process orders (✅ Complete)
- [x] Implement place orders (✅ Complete)
- [x] Build cost calculation (✅ Complete)
- [x] Create weekly stats recording (✅ Complete)

### Phase 3: Bullwhip Calculation (Week 2)

- [x] Implement variance calculation (✅ Complete)
- [ ] Implement bullwhip effect calculation (🔨 Partial)
- [ ] Build order variance tracking
- [ ] Create demand variance tracking

### Phase 4: UI Development (Week 3-4)

- [ ] Design main dashboard
- [ ] Build order placement interface
- [ ] Create supply chain visualization
- [ ] Design weekly history table
- [ ] Build metrics dashboard
- [ ] Create bullwhip visualization

### Phase 5: Real-Time Synchronization (Week 4)

- [ ] Implement WebSocket events
- [ ] Build order synchronization
- [ ] Create week advancement trigger
- [ ] Implement player waiting state

### Phase 6: Testing & Refinement (Week 5)

- [ ] Unit tests for calculations
- [ ] Integration tests for weekly processing
- [ ] Multi-player synchronization tests
- [ ] Performance testing
- [ ] UI/UX testing

### Phase 7: Documentation (Week 5)

- [x] Theory documentation (✅ Complete)
- [x] Implementation guide (✅ Complete)
- [ ] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

## 📝 Example Scenarios

### Scenario 1: Classic Bullwhip Pattern

**Demand Pattern:** 4 units (weeks 1-4), then 8 units (weeks 5+)

**Expected Behavior:**
- Weeks 1-4: Stable ordering, inventory decreases
- Week 5: Demand doubles, players overorder
- Weeks 6-10: Orders amplify upstream
- Weeks 11-20: Oscillation and overcorrection

**Result:**
- Bullwhip ratio: 3-5x
- Costs increase upstream
- Inventory swings amplify

### Scenario 2: Constant Demand

**Demand Pattern:** 4 units every week

**Expected Behavior:**
- Stable ordering
- Minimal bullwhip
- Low costs

**Result:**
- Bullwhip ratio: ~1.0
- Stable inventory
- Low total costs

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Bullwhip Effect Introduction**
   - Explain demand amplification
   - Show supply chain structure
   - Discuss lead times

2. **Game Mechanics**
   - Four-tier supply chain
   - Weekly ordering decisions
   - Cost structure

3. **Objectives**
   - Minimize individual costs
   - Understand bullwhip effect
   - Learn coordination importance

### During Game (60 minutes)

- Week 1-4: Stable demand (4 units)
- Week 5+: Demand doubles (8 units)
- Players make ordering decisions
- Observe bullwhip amplification

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show total costs by role
   - Display bullwhip ratio
   - Analyze inventory swings

2. **Discussion**
   - Why did costs increase upstream?
   - What caused bullwhip effect?
   - How could coordination help?

3. **Key Learnings**
   - Information sharing eliminates bullwhip
   - Lead time reduction is critical
   - Coordination reduces total costs

---

## ✅ Implementation Checklist

### Backend
- [x] FruitBeerEngine class (✅ Complete)
- [x] State management (✅ Complete)
- [x] Four-tier supply chain (✅ Complete)
- [x] Pipeline system (✅ Complete)
- [x] Weekly processing (✅ Complete)
- [x] Cost calculation (✅ Complete)
- [x] Weekly stats (✅ Complete)
- [ ] Bullwhip calculation (🔨 Partial)
- [x] API endpoints (✅ Complete)
- [x] Database schema (✅ Complete)

### Frontend
- [ ] Main dashboard
- [ ] Order placement interface
- [ ] Supply chain visualization
- [ ] Weekly history table
- [ ] Metrics dashboard
- [ ] Bullwhip visualization

### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (weekly processing)
- [ ] Multi-player tests
- [ ] Performance testing
- [ ] UI/UX testing

### Documentation
- [x] Theory documentation (✅ Complete)
- [x] Implementation guide (✅ Complete)
- [x] Scoring and report analysis (✅ Complete)
- [ ] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Complete Analysis - Backend Implementation Complete  
**Based on:** FruitBeerEngine.ts (complete implementation), Theory Documentation, Bullwhip Effect Theory

---

*This document provides a complete blueprint for replicating the Fruit Beer Game simulation. All mechanics, flows, scoring, and report analysis are documented based on the complete implementation and bullwhip effect theory principles.*
