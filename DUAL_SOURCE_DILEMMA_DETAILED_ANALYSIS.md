# The Dual Source Dilemma: A Procurement Strategy Game - Complete Analysis & Replication Guide

**Simulation Name:** The Dual Source Dilemma: A Procurement Strategy Game  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Procurement Strategy, Supply Chain Management, Risk Management  
**Duration:** 45 minutes  
**Difficulty:** ⭐⭐⭐ (Intermediate to Advanced)  
**Players:** 1 player (Procurement Manager role)  
**Framework:** Strategic Sourcing, Supply Risk Management

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Supplier Comparison](#supplier-comparison)
7. [Order Management System](#order-management-system)
8. [Cost Structure](#cost-structure)
9. [Risk Management & Reliability](#risk-management--reliability)
10. [Scoring & Metrics](#scoring--metrics)
11. [Report Analysis](#report-analysis)
12. [UI/UX Requirements](#uiux-requirements)
13. [API & Data Flow](#api--data-flow)
14. [Implementation Details](#implementation-details)
15. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**The Dual Source Dilemma: A Procurement Strategy Game** is a procurement simulation that teaches students how to balance cost, risk, and reliability when selecting suppliers. Players manage weekly demand by placing orders with two suppliers that have different characteristics: one is low-cost but less reliable, the other is more expensive but highly reliable. The goal is to maximize final bank balance by optimizing supplier mix, managing inventory, and avoiding stockouts.

### Key Features

- ✅ **Two-supplier system** with contrasting characteristics
- ✅ **Weekly demand fulfillment** with variable demand patterns
- ✅ **Lead time management** (3 weeks vs. 1 week)
- ✅ **Reliability simulation** (80% vs. 95% on-time delivery)
- ✅ **Volume discounts** for large orders
- ✅ **Cash flow management** with borrowing costs
- ✅ **Inventory holding costs** and stockout penalties
- ✅ **Total Cost of Ownership (TCO)** calculation

### Learning Outcomes

- Understand trade-offs between single-sourcing and dual-sourcing
- Evaluate supplier risk profiles and reliability
- Calculate Total Cost of Ownership (TCO)
- Manage cash flow and inventory levels
- Balance cost optimization with risk mitigation
- Develop procurement strategies for different scenarios

---

## 📚 Theoretical Foundation

### Core Concept: Strategic Sourcing

**Strategic Sourcing:**
A systematic approach to procurement that focuses on long-term value creation rather than just price. It involves:
- Supplier evaluation and selection
- Risk assessment and mitigation
- Total Cost of Ownership (TCO) analysis
- Relationship management

**Key Principle:** The lowest price is not always the best value. Total cost includes purchase price, quality, reliability, risk, and relationship factors.

### Single-Sourcing vs. Dual-Sourcing

**Single-Sourcing:**
- **Advantages:**
  - Lower unit costs (volume discounts)
  - Simplified relationships
  - Easier quality control
  - Lower administrative costs
  - Better supplier commitment

- **Disadvantages:**
  - High supplier dependency
  - No leverage in negotiations
  - Vulnerable to disruptions
  - Limited innovation
  - Single point of failure

**Dual-Sourcing:**
- **Advantages:**
  - Risk mitigation (supplier failure backup)
  - Competitive pressure on suppliers
  - Negotiation leverage
  - Access to diverse capabilities
  - Continuity of supply

- **Disadvantages:**
  - Higher unit costs (split volume)
  - More complex management
  - Inconsistent quality
  - Higher administrative burden
  - Lost volume discounts

### Total Cost of Ownership (TCO)

**TCO Components:**
```
Total Cost of Ownership = 
  Purchase Price +
  Ordering Costs +
  Holding Costs +
  Stockout Costs +
  Quality Costs +
  Risk Costs +
  Administrative Costs
```

**Key Insight:** Purchase price is often only 30-50% of total cost.

### Supply Risk Management

**Risk Categories:**
1. **Operational Risk:** Quality issues, capacity constraints
2. **Financial Risk:** Supplier bankruptcy, payment terms
3. **Geopolitical Risk:** Trade wars, sanctions, political instability
4. **Natural Disasters:** Earthquakes, floods, pandemics
5. **Technology Risk:** Obsolescence, innovation lag

**Risk Mitigation Strategies:**
- Supplier diversification
- Safety stock
- Multiple suppliers
- Geographic diversification
- Supplier qualification and monitoring

---

## 🎮 Simulation Overview

### Game Setup

**Duration:** 20 weeks (configurable)  
**Initial Cash:** $10,000  
**Initial Inventory:** 50 units  
**Goal:** Maximize final bank balance

### Supplier Characteristics

**Supplier A: Low Cost**
- **Unit Cost:** $10
- **Lead Time:** 3 weeks
- **Reliability:** 80% (on-time delivery probability)
- **Minimum Order:** 20 units
- **Volume Discount:** 10% off if order ≥100 units

**Supplier B: Reliable**
- **Unit Cost:** $15
- **Lead Time:** 1 week
- **Reliability:** 95% (on-time delivery probability)
- **Minimum Order:** 10 units
- **Volume Discount:** None

### Cost Parameters

**Holding Cost:** $1 per unit per week  
**Stockout Cost:** $20 per unit  
**Borrowing Interest Rate:** 2% per week (on negative cash balance)

### Demand Pattern

**Base Level:** 50 units/week  
**Variation:** Seasonal + random noise
- Seasonal: ±10 units (sine wave)
- Random: ±20 units

**Example Pattern:**
```
Week 1: 45 units
Week 2: 52 units
Week 3: 48 units
Week 4: 55 units
...
```

### Game Flow

```
WEEKLY CYCLE:

1. RECEIVE SHIPMENTS
   ├─ Check orders in transit
   ├─ Receive orders that arrived
   └─ Add to inventory

2. FULFILL DEMAND
   ├─ Check current demand
   ├─ Fulfill from inventory
   ├─ Calculate stockouts (if any)
   └─ Update inventory

3. CALCULATE COSTS
   ├─ Holding cost (inventory × $1)
   ├─ Stockout cost (stockouts × $20)
   ├─ Borrowing cost (if cash < 0)
   └─ Update total cost

4. PLACE ORDERS
   ├─ View current inventory
   ├─ View demand forecast
   ├─ Decide order quantities
   ├─ Place orders to Supplier A and/or B
   └─ Deduct cash

5. ADVANCE WEEK
   └─ Move to next week
```

---

## 🔄 Complete Game Logic & Flow

### Initialization

```typescript
initialize(config) {
  // 1. Set default configuration
  config = {
    numWeeks: 20,
    initialCash: $10,000,
    initialInventory: 50,
    demandPattern: generateDemandPattern(20),
    supplierA: {
      name: 'Supplier A (Low Cost)',
      unitCost: $10,
      leadTime: 3 weeks,
      reliability: 0.8,
      minOrderQty: 20,
      volumeDiscount: { threshold: 100, discountRate: 0.1 }
    },
    supplierB: {
      name: 'Supplier B (Reliable)',
      unitCost: $15,
      leadTime: 1 week,
      reliability: 0.95,
      minOrderQty: 10
    },
    holdingCostPerUnit: $1,
    stockoutCostPerUnit: $20,
    borrowingInterestRate: 0.02
  }
  
  // 2. Initialize state
  state = {
    currentWeek: 0,
    cash: $10,000,
    inventory: 50,
    ordersInTransit: [],
    weeklyHistory: [],
    totalCost: 0,
    finalBankBalance: 0,
    isComplete: false
  }
}
```

### Weekly Processing Loop

```typescript
processWeek() {
  // 1. Receive shipments
  arrivals = receiveShipments(currentWeek)
  inventory += arrivals
  
  // 2. Fulfill demand
  demand = demandPattern[currentWeek]
  stockouts = max(0, demand - inventory)
  fulfilled = demand - stockouts
  inventory -= fulfilled
  
  // 3. Calculate costs
  holdingCost = inventory × $1
  stockoutCost = stockouts × $20
  borrowingCost = 0
  if (cash < 0) {
    borrowingCost = abs(cash) × 0.02
    cash -= borrowingCost
  }
  
  weekCost = holdingCost + stockoutCost + borrowingCost
  totalCost += weekCost
  cash -= holdingCost
  cash -= stockoutCost
  
  // 4. Record week
  weeklyHistory.push({
    week: currentWeek,
    demand,
    inventory,
    cash,
    arrivals,
    stockouts,
    holdingCost,
    stockoutCost,
    borrowingCost
  })
  
  // 5. Advance week
  currentWeek++
  
  // 6. Check completion
  if (currentWeek >= numWeeks) {
    isComplete = true
    finalBankBalance = cash + (inventory × $10 × 0.5)  // Liquidate at 50% value
  }
}
```

### Order Placement

```typescript
placeOrders(orderA, orderB) {
  // 1. Validate orders
  if (orderA > 0 && orderA < minOrderQtyA) {
    return error: "Minimum order not met"
  }
  if (orderB > 0 && orderB < minOrderQtyB) {
    return error: "Minimum order not met"
  }
  
  // 2. Calculate costs
  costA = calculateOrderCost(orderA, supplierA)
  costB = calculateOrderCost(orderB, supplierB)
  totalCost = costA + costB
  
  // 3. Check affordability (allow borrowing)
  cashAfterOrder = cash - totalCost
  
  // 4. Place orders
  if (orderA > 0) {
    arrivalWeek = currentWeek + supplierA.leadTime
    onTime = random() < supplierA.reliability
    
    ordersInTransit.push({
      supplier: 'A',
      quantity: orderA,
      arrivalWeek: onTime ? arrivalWeek : arrivalWeek + 1,
      cost: costA,
      onTime
    })
  }
  
  if (orderB > 0) {
    arrivalWeek = currentWeek + supplierB.leadTime
    onTime = random() < supplierB.reliability
    
    ordersInTransit.push({
      supplier: 'B',
      quantity: orderB,
      arrivalWeek: onTime ? arrivalWeek : arrivalWeek + 1,
      cost: costB,
      onTime
    })
  }
  
  // 5. Deduct cash
  cash = cashAfterOrder
}
```

### Order Cost Calculation

```typescript
calculateOrderCost(quantity, supplier) {
  if (quantity === 0) return 0
  
  unitCost = supplier.unitCost
  
  // Apply volume discount
  if (supplier.volumeDiscount && quantity >= supplier.volumeDiscount.threshold) {
    unitCost *= (1 - supplier.volumeDiscount.discountRate)
  }
  
  return quantity × unitCost
}
```

### Shipment Receipt

```typescript
receiveShipments(currentWeek) {
  totalArrivals = 0
  
  // Filter orders arriving this week
  ordersInTransit = ordersInTransit.filter(order => {
    if (order.arrivalWeek <= currentWeek) {
      inventory += order.quantity
      totalArrivals += order.quantity
      return false  // Remove from transit
    }
    return true  // Keep in transit
  })
  
  return totalArrivals
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface DualSourceGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    numWeeks: number;                    // Default: 20
    initialCash: number;                 // Default: $10,000
    initialInventory: number;             // Default: 50
    demandPattern: number[];              // Array of weekly demands
    supplierA: Supplier;
    supplierB: Supplier;
    holdingCostPerUnit: number;          // Default: $1
    stockoutCostPerUnit: number;          // Default: $20
    borrowingInterestRate: number;        // Default: 0.02 (2% per week)
  };
  
  currentWeek: number;                   // Current week (0-19)
  cash: number;                          // Current cash balance
  inventory: number;                      // Current inventory level
  ordersInTransit: OrderInTransit[];     // Orders in pipeline
  
  weeklyHistory: {
    week: number;
    demand: number;
    inventory: number;
    cash: number;
    orderA: number;                      // Order placed to A
    orderB: number;                      // Order placed to B
    arrivals: number;                    // Units received
    stockouts: number;                    // Units not fulfilled
    holdingCost: number;
    stockoutCost: number;
    borrowingCost: number;
  }[];
  
  totalCost: number;                     // Cumulative operational costs
  finalBankBalance: number;              // Final balance (cash + inventory value)
  isComplete: boolean;
}
```

### Supplier Structure

```typescript
interface Supplier {
  name: string;
  unitCost: number;
  leadTime: number;                      // Weeks
  reliability: number;                    // 0-1 (probability on-time)
  minOrderQty: number;
  volumeDiscount?: {
    threshold: number;
    discountRate: number;                 // 0-1 (e.g., 0.1 = 10% off)
  };
}
```

### Order in Transit Structure

```typescript
interface OrderInTransit {
  supplier: string;                      // 'A' or 'B'
  quantity: number;
  arrivalWeek: number;                   // Week when order arrives
  cost: number;                          // Total order cost
  onTime: boolean;                       // Whether order arrived on time
}
```

---

## ⚖️ Supplier Comparison

### Side-by-Side Comparison

| Characteristic | Supplier A (Low Cost) | Supplier B (Reliable) |
|----------------|----------------------|----------------------|
| **Unit Cost** | $10 | $15 |
| **Lead Time** | 3 weeks | 1 week |
| **Reliability** | 80% | 95% |
| **Minimum Order** | 20 units | 10 units |
| **Volume Discount** | 10% off (≥100 units) | None |
| **Best For** | Cost optimization | Risk mitigation |
| **Trade-off** | Lower cost, higher risk | Higher cost, lower risk |

### Cost Analysis Examples

**Example 1: Order 100 units from Supplier A**
```
Base Cost: 100 × $10 = $1,000
Volume Discount: 10% off
Final Cost: $1,000 × 0.9 = $900
Cost per Unit: $9.00
```

**Example 2: Order 100 units from Supplier B**
```
Base Cost: 100 × $15 = $1,500
No Discount
Final Cost: $1,500
Cost per Unit: $15.00
```

**Example 3: Split Order (50/50)**
```
Supplier A: 50 × $10 = $500 (no discount)
Supplier B: 50 × $15 = $750
Total Cost: $1,250
Average Cost per Unit: $12.50
```

### Lead Time Impact

**Supplier A (3 weeks):**
- Must order 3 weeks in advance
- Higher inventory needed for safety stock
- Less responsive to demand changes

**Supplier B (1 week):**
- Can order 1 week in advance
- Lower inventory needed
- More responsive to demand changes

### Reliability Impact

**Supplier A (80% reliability):**
- 20% chance of late delivery
- Late orders arrive 1 week later
- Higher risk of stockouts

**Supplier B (95% reliability):**
- 5% chance of late delivery
- Late orders arrive 1 week later
- Lower risk of stockouts

---

## 📦 Order Management System

### Order Placement Rules

**Minimum Order Quantities:**
- Supplier A: Minimum 20 units
- Supplier B: Minimum 10 units

**Order Validation:**
```typescript
if (orderA > 0 && orderA < 20) {
  return error: "Supplier A requires minimum 20 units"
}

if (orderB > 0 && orderB < 10) {
  return error: "Supplier B requires minimum 10 units"
}
```

### Volume Discounts

**Supplier A Volume Discount:**
- **Threshold:** 100 units
- **Discount:** 10% off
- **Calculation:**
  ```
  IF quantity >= 100:
    unitCost = $10 × 0.9 = $9
  ELSE:
    unitCost = $10
  ```

**Example:**
```
Order 100 units: 100 × $9 = $900
Order 99 units: 99 × $10 = $990
Order 101 units: 101 × $9 = $909
```

### Order Pipeline Management

**Orders in Transit:**
- Tracked by `arrivalWeek`
- Each order has supplier, quantity, cost, on-time status
- Orders arrive when `currentWeek >= arrivalWeek`

**Pipeline Visualization:**
```
Week 5:
  Orders in Transit:
    - Supplier A: 50 units (arrives Week 8)
    - Supplier B: 30 units (arrives Week 6)
    - Supplier A: 100 units (arrives Week 9)
```

### Order Timing Strategy

**Strategy 1: Just-in-Time (JIT)**
- Order close to when needed
- Minimize inventory
- Requires reliable supplier (Supplier B)

**Strategy 2: Safety Stock**
- Order early to build buffer
- Higher inventory
- Works with less reliable supplier (Supplier A)

**Strategy 3: Dual Sourcing**
- Use Supplier B for immediate needs
- Use Supplier A for bulk orders
- Balance cost and reliability

---

## 💰 Cost Structure

### Cost Components

**1. Purchase Costs**
```
Purchase Cost = (Order A Quantity × Unit Cost A) + (Order B Quantity × Unit Cost B)
```

**2. Holding Costs**
```
Holding Cost = Inventory Level × $1 per unit per week
```

**3. Stockout Costs**
```
Stockout Cost = Stockout Units × $20 per unit
```

**4. Borrowing Costs**
```
IF cash < 0:
  Borrowing Cost = |cash| × 2% per week
ELSE:
  Borrowing Cost = 0
```

### Total Cost Calculation

**Weekly Cost:**
```
Weekly Cost = Holding Cost + Stockout Cost + Borrowing Cost
```

**Cumulative Cost:**
```
Total Cost = Sum of all weekly costs
```

### Cost Examples

**Example 1: Normal Week**
```
Inventory: 60 units
Demand: 50 units
Stockouts: 0
Cash: $5,000 (positive)

Holding Cost: 60 × $1 = $60
Stockout Cost: 0 × $20 = $0
Borrowing Cost: $0

Weekly Cost: $60
```

**Example 2: Stockout Week**
```
Inventory: 30 units
Demand: 50 units
Stockouts: 20 units
Cash: $5,000

Holding Cost: 30 × $1 = $30
Stockout Cost: 20 × $20 = $400
Borrowing Cost: $0

Weekly Cost: $430
```

**Example 3: Cash Shortage Week**
```
Inventory: 50 units
Demand: 50 units
Stockouts: 0
Cash: -$1,000 (negative)

Holding Cost: 50 × $1 = $50
Stockout Cost: 0 × $20 = $0
Borrowing Cost: $1,000 × 0.02 = $20

Weekly Cost: $70
```

### Final Bank Balance Calculation

**At Game End:**
```
Final Bank Balance = Cash + (Inventory × Unit Cost × Liquidation Rate)

Where:
- Cash: Final cash balance
- Inventory: Remaining inventory
- Unit Cost: $10 (Supplier A cost)
- Liquidation Rate: 0.5 (50% of cost)
```

**Example:**
```
Cash: $8,000
Inventory: 40 units
Liquidation Value: 40 × $10 × 0.5 = $200

Final Bank Balance: $8,000 + $200 = $8,200
```

---

## ⚠️ Risk Management & Reliability

### Reliability Simulation

**On-Time Delivery Probability:**
- Supplier A: 80% (20% chance of delay)
- Supplier B: 95% (5% chance of delay)

**Delay Impact:**
- Delayed orders arrive 1 week later than expected
- Can cause stockouts if not planned for

**Simulation:**
```typescript
onTime = Math.random() < supplier.reliability

if (onTime) {
  arrivalWeek = currentWeek + leadTime
} else {
  arrivalWeek = currentWeek + leadTime + 1  // 1 week delay
}
```

### Risk Scenarios

**Scenario 1: Single-Source from Supplier A**
- **Risk:** 20% chance of delay
- **Impact:** High if delay occurs during high demand
- **Mitigation:** Build safety stock

**Scenario 2: Single-Source from Supplier B**
- **Risk:** 5% chance of delay
- **Impact:** Low, but higher cost
- **Mitigation:** Lower safety stock needed

**Scenario 3: Dual-Source (50/50)**
- **Risk:** Both suppliers delay (0.2 × 0.05 = 1%)
- **Impact:** Very low
- **Mitigation:** Natural diversification

### Risk Mitigation Strategies

**Strategy 1: Safety Stock**
- Maintain extra inventory
- Protects against delays
- Increases holding costs

**Strategy 2: Dual Sourcing**
- Split orders between suppliers
- Reduces dependency risk
- Increases purchase costs

**Strategy 3: Lead Time Buffer**
- Order earlier than needed
- Accounts for potential delays
- Increases inventory levels

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Final Bank Balance**
- **Definition:** Cash + inventory liquidation value at game end
- **Target:** Maximize
- **Calculation:** `Cash + (Inventory × $10 × 0.5)`
- **Display:** $X,XXX.XX

#### 2. **Total Cost**
- **Definition:** Cumulative operational costs
- **Components:** Holding + Stockout + Borrowing costs
- **Target:** Minimize
- **Display:** $X,XXX.XX

#### 3. **Service Level**
- **Definition:** Percentage of demand fulfilled
- **Formula:** `(Total Demand - Total Stockouts) / Total Demand × 100%`
- **Target:** ≥95%
- **Display:** XX%

#### 4. **Average Inventory**
- **Definition:** Average inventory level across all weeks
- **Formula:** `Sum of weekly inventory / Number of weeks`
- **Target:** Optimize (balance holding cost vs. stockout risk)
- **Display:** XX units

#### 5. **Supplier Mix**
- **Definition:** Percentage of orders from each supplier
- **Formula:** `(Orders from Supplier X / Total Orders) × 100%`
- **Target:** Based on strategy
- **Display:** A: XX%, B: XX%

#### 6. **Total Stockouts**
- **Definition:** Total units not fulfilled
- **Target:** Minimize (ideally 0)
- **Display:** XX units

#### 7. **Cash Flow Analysis**
- **Definition:** Analysis of cash position
- **Components:** Minimum cash, borrowing amount
- **Target:** Avoid negative cash
- **Display:** "No borrowing needed" or "Borrowed up to $X"

### Performance Metrics Calculation

```typescript
computeMetrics() {
  // Supplier mix
  supplierMix = calculateSupplierMix()
  // Returns: { A: XX%, B: XX% }
  
  // Service level
  serviceLevel = calculateServiceLevel()
  // Returns: XX%
  
  // Average inventory
  averageInventory = calculateAverageInventory()
  // Returns: XX units
  
  // Cash flow analysis
  cashFlowAnalysis = analyzeCashFlow()
  // Returns: "No borrowing needed" or "Borrowed up to $X"
  
  return {
    finalBankBalance: finalBankBalance.toFixed(2),
    totalCost: totalCost.toFixed(2),
    averageInventory: averageInventory,
    serviceLevel: serviceLevel + '%',
    supplierMix: supplierMix,
    totalStockouts: totalStockouts,
    cashFlowAnalysis: cashFlowAnalysis
  }
}
```

### Supplier Mix Calculation

```typescript
calculateSupplierMix() {
  totalA = 0
  totalB = 0
  
  // Sum all orders from each supplier
  for (order of ordersInTransit) {
    if (order.supplier === 'A') {
      totalA += order.quantity
    } else {
      totalB += order.quantity
    }
  }
  
  total = totalA + totalB
  
  return {
    A: total > 0 ? (totalA / total) × 100 : 0,
    B: total > 0 ? (totalB / total) × 100 : 0
  }
}
```

### Service Level Calculation

```typescript
calculateServiceLevel() {
  totalDemand = sum(weeklyHistory.demand)
  totalStockouts = sum(weeklyHistory.stockouts)
  fulfilled = totalDemand - totalStockouts
  
  return (fulfilled / totalDemand) × 100
}
```

### Average Inventory Calculation

```typescript
calculateAverageInventory() {
  if (weeklyHistory.length === 0) {
    return initialInventory
  }
  
  totalInventory = sum(weeklyHistory.inventory)
  return totalInventory / weeklyHistory.length
}
```

### Cash Flow Analysis

```typescript
analyzeCashFlow() {
  minCash = min(weeklyHistory.cash)
  
  if (minCash < 0) {
    return `Borrowed up to $${abs(minCash).toFixed(2)}`
  }
  
  return 'No borrowing needed'
}
```

---

## 📈 Report Analysis

### Comprehensive Performance Report

**Report Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  DUAL SOURCE DILEMMA - Performance Report                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINANCIAL SUMMARY                                       │
│  ┌──────────────────────────────────────┐               │
│  │ Final Bank Balance:  $8,200.00        │               │
│  │ Initial Cash:         $10,000.00       │               │
│  │ Net Change:           -$1,800.00       │               │
│  │ Total Costs:           $3,500.00        │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  OPERATIONAL METRICS                                     │
│  ┌──────────────────────────────────────┐               │
│  │ Service Level:        96.5%            │               │
│  │ Average Inventory:    45 units         │               │
│  │ Total Stockouts:      35 units         │               │
│  │ Total Demand:         1,000 units      │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SUPPLIER ANALYSIS                                        │
│  ┌──────────────────────────────────────┐               │
│  │ Supplier Mix:                         │               │
│  │   Supplier A:         70%              │               │
│  │   Supplier B:         30%              │               │
│  │                                        │               │
│  │ Total Orders:          1,200 units     │               │
│  │   From Supplier A:     840 units       │               │
│  │   From Supplier B:     360 units       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  COST BREAKDOWN                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Purchase Costs:        $13,200.00     │               │
│  │ Holding Costs:         $900.00         │               │
│  │ Stockout Costs:        $700.00         │               │
│  │ Borrowing Costs:       $0.00            │               │
│  │ Total Operational:     $1,600.00       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  CASH FLOW ANALYSIS                                       │
│  ┌──────────────────────────────────────┐               │
│  │ Minimum Cash:          $2,500.00       │               │
│  │ Maximum Cash:          $10,000.00      │               │
│  │ Average Cash:          $6,200.00       │               │
│  │ Borrowing:             None             │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  WEEKLY PERFORMANCE TREND                                 │
│  ┌──────────────────────────────────────┐               │
│  │ [Chart showing inventory, demand,      │               │
│  │  stockouts over 20 weeks]              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  STRATEGY ANALYSIS                                        │
│  ┌──────────────────────────────────────┐               │
│  │ Primary Strategy: Dual-Source (70/30) │               │
│  │ Effectiveness:    Good                 │               │
│  │ Recommendations:                       │               │
│  │   - Consider increasing Supplier B    │               │
│  │     usage to reduce stockouts          │               │
│  │   - Monitor cash flow more closely     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Weekly Performance Breakdown

**Week-by-Week Analysis:**
```
┌──────┬─────────┬───────────┬──────────┬───────────┬──────────┐
│ Week │ Demand  │ Inventory │ Stockouts│ Holding $ │ Stockout$│
├──────┼─────────┼───────────┼──────────┼───────────┼──────────┤
│  1   │   45    │    50     │    0      │   $50     │   $0     │
│  2   │   52    │    55     │    0      │   $55     │   $0     │
│  3   │   48    │    53     │    0      │   $53     │   $0     │
│  4   │   55    │    50     │    5      │   $50     │  $100    │
│  5   │   50    │    45     │    0      │   $45     │   $0     │
│ ...  │  ...    │    ...    │   ...     │   ...     │   ...    │
│  20  │   48    │    40     │    0      │   $40     │   $0     │
└──────┴─────────┴───────────┴──────────┴───────────┴──────────┘
```

### Supplier Performance Analysis

**Supplier A Performance:**
```
Total Orders: 840 units
Total Cost: $7,560 (with volume discounts)
Average Lead Time: 3.2 weeks (includes delays)
On-Time Rate: 78% (slightly below 80% target)
Reliability Issues: 22% of orders delayed
```

**Supplier B Performance:**
```
Total Orders: 360 units
Total Cost: $5,400
Average Lead Time: 1.1 weeks (includes delays)
On-Time Rate: 94% (slightly below 95% target)
Reliability Issues: 6% of orders delayed
```

### Cost Analysis

**Total Cost Breakdown:**
```
Purchase Costs:
  Supplier A: $7,560 (840 units × $9 average)
  Supplier B: $5,400 (360 units × $15)
  Total: $12,960

Operational Costs:
  Holding Costs: $900 (45 units avg × 20 weeks × $1)
  Stockout Costs: $700 (35 units × $20)
  Borrowing Costs: $0
  Total: $1,600

Grand Total: $14,560
```

**Cost per Unit:**
```
Total Units Purchased: 1,200
Total Cost: $14,560
Cost per Unit: $12.13
```

### Performance Grade

**Grading Criteria:**
```
Excellent (A): Final Balance > $9,000, Service Level ≥98%, No Stockouts
Very Good (B): Final Balance > $8,000, Service Level ≥95%, Stockouts <20
Good (C): Final Balance > $7,000, Service Level ≥90%, Stockouts <50
Fair (D): Final Balance > $6,000, Service Level ≥85%, Stockouts <100
Needs Improvement (F): Final Balance ≤ $6,000 or Service Level <85%
```

**Example Grade:**
```
Final Balance: $8,200 → Good
Service Level: 96.5% → Very Good
Stockouts: 35 units → Good

Overall Grade: B (Very Good)
```

### Strategic Recommendations

**Based on Performance:**
```
1. SUPPLIER MIX OPTIMIZATION
   Current: 70% A, 30% B
   Recommendation: Consider 60% A, 40% B
   Rationale: Reduce stockouts while maintaining cost advantage

2. INVENTORY MANAGEMENT
   Current Average: 45 units
   Recommendation: Maintain 50-55 units
   Rationale: Better buffer against demand variability

3. ORDER TIMING
   Observation: Some orders placed too late
   Recommendation: Order 1 week earlier
   Rationale: Account for Supplier A's 3-week lead time

4. CASH FLOW
   Status: Healthy (no borrowing)
   Recommendation: Maintain current strategy
   Rationale: Cash position is stable
```

### Comparative Analysis

**Benchmarking:**
```
┌─────────────────────┬──────────┬──────────┬──────────┐
│ Metric              │ Your     │ Average  │ Best     │
│                     │ Result   │ Result   │ Result   │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Final Balance       │ $8,200   │ $7,500   │ $9,200   │
│ Service Level       │ 96.5%    │ 94.0%    │ 99.2%    │
│ Total Stockouts     │ 35       │ 60       │ 8        │
│ Average Inventory   │ 45       │ 50       │ 40       │
│ Supplier A Usage    │ 70%      │ 65%      │ 60%      │
│ Supplier B Usage    │ 30%      │ 35%      │ 40%      │
└─────────────────────┴──────────┴──────────┴──────────┘
```

---

## 🎨 UI/UX Requirements

### Main Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  DUAL SOURCE DILEMMA - Week 5 of 20                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CURRENT STATUS                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Cash:              $6,500.00           │               │
│  │ Inventory:        45 units             │               │
│  │ Orders in Transit: 2 orders             │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SUPPLIERS                                                │
│  ┌──────────────────────────────────────┐               │
│  │ Supplier A (Low Cost)                │               │
│  │   Cost: $10/unit                      │               │
│  │   Lead Time: 3 weeks                  │               │
│  │   Reliability: 80%                    │               │
│  │   Min Order: 20 units                 │               │
│  │   Volume Discount: 10% (≥100 units)    │               │
│  │                                        │               │
│  │ Supplier B (Reliable)                 │               │
│  │   Cost: $15/unit                       │               │
│  │   Lead Time: 1 week                    │               │
│  │   Reliability: 95%                    │               │
│  │   Min Order: 10 units                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  DEMAND FORECAST                                          │
│  ┌──────────────────────────────────────┐               │
│  │ This Week: 48 units                    │               │
│  │ Next Week: 52 units                    │               │
│  │ Week After: 50 units                   │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  PLACE ORDERS                                             │
│  ┌──────────────────────────────────────┐               │
│  │ Supplier A: [____] units               │               │
│  │   Cost: $0.00                          │               │
│  │                                        │               │
│  │ Supplier B: [____] units                │               │
│  │   Cost: $0.00                          │               │
│  │                                        │               │
│  │ Total Cost: $0.00                      │               │
│  │ Cash After: $6,500.00                  │               │
│  │                                        │               │
│  │ [Place Orders] [Clear]                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ORDERS IN TRANSIT                                        │
│  ┌──────────────────────────────────────┐               │
│  │ Week 8: Supplier A - 50 units          │               │
│  │ Week 6: Supplier B - 30 units          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Process Week] [View History] [View Metrics]            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Weekly History View

```
┌─────────────────────────────────────────────────────────┐
│  WEEKLY HISTORY                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────┬─────────┬───────────┬──────────┬───────────┐│
│  │ Week │ Demand  │ Inventory │ Stockouts│ Total Cost││
│  ├──────┼─────────┼───────────┼──────────┼───────────┤│
│  │  1   │   45    │    50     │    0      │   $50     ││
│  │  2   │   52    │    55     │    0      │   $55     ││
│  │  3   │   48    │    53     │    0      │   $53     ││
│  │  4   │   55    │    50     │    5      │  $150     ││
│  │  5   │   50    │    45     │    0      │   $45     ││
│  └──────┴─────────┴───────────┴──────────┴───────────┘│
│                                                          │
│  [View Details] [Export Data]                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Performance Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  PERFORMANCE METRICS                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINANCIAL                                               │
│  ┌──────────────────────────────────────┐               │
│  │ Final Balance:    $8,200.00            │               │
│  │ Total Costs:      $1,600.00            │               │
│  │ Net Change:       -$1,800.00           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  OPERATIONAL                                             │
│  ┌──────────────────────────────────────┐               │
│  │ Service Level:    96.5%                │               │
│  │ Avg Inventory:   45 units             │               │
│  │ Total Stockouts:  35 units              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SUPPLIER MIX                                            │
│  ┌──────────────────────────────────────┐               │
│  │ Supplier A:      70%                  │               │
│  │ Supplier B:      30%                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [View Full Report]                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialize Simulation

```typescript
POST /api/sessions/:sessionId/games/dual-source-dilemma/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    numWeeks?: number,              // Default: 20
    initialCash?: number,            // Default: 10000
    initialInventory?: number,        // Default: 50
    holdingCostPerUnit?: number,       // Default: 1
    stockoutCostPerUnit?: number,      // Default: 20
    borrowingInterestRate?: number     // Default: 0.02
  }
}

Response: {
  success: true,
  state: {
    currentWeek: 0,
    maxWeeks: 20,
    cash: 10000,
    inventory: 50,
    suppliers: {
      a: { name: 'Supplier A (Low Cost)', unitCost: 10, leadTime: 3, reliability: 0.8, minOrderQty: 20 },
      b: { name: 'Supplier B (Reliable)', unitCost: 15, leadTime: 1, reliability: 0.95, minOrderQty: 10 }
    },
    demandPattern: [45, 52, 48, 55, ...],
    isComplete: false
  }
}
```

### Place Orders

```typescript
POST /api/sessions/:sessionId/games/dual-source-dilemma/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  orderA: 50,    // Units from Supplier A
  orderB: 30     // Units from Supplier B
}

Response: {
  success: true,
  message: "Orders placed for week 5",
  data: {
    ordersPlaced: {
      supplierA: 50,
      supplierB: 30,
      totalCost: 950
    },
    weekResult: {
      week: 5,
      demand: 48,
      fulfilled: 48,
      stockouts: 0,
      arrivals: 30,
      inventory: 45,
      cash: 5550,
      costs: {
        holdingCost: 45,
        stockoutCost: 0,
        borrowingCost: 0,
        total: 45
      }
    },
    currentCash: 5550,
    currentInventory: 45,
    isComplete: false
  }
}
```

### Get Current State

```typescript
GET /api/sessions/:sessionId/games/dual-source-dilemma/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentWeek: 5,
  maxWeeks: 20,
  cash: 5550,
  inventory: 45,
  ordersInTransit: [
    { supplier: 'A', quantity: 50, arrivalWeek: 8, cost: 450, onTime: true },
    { supplier: 'B', quantity: 30, arrivalWeek: 6, cost: 450, onTime: true }
  ],
  suppliers: { ... },
  isComplete: false
}
```

### Get Metrics

```typescript
GET /api/sessions/:sessionId/games/dual-source-dilemma/metrics
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  finalBankBalance: "8200.00",
  totalCost: "1600.00",
  averageInventory: 45,
  serviceLevel: "96.5%",
  supplierMix: {
    A: 70,
    B: 30
  },
  totalStockouts: 35,
  cashFlowAnalysis: "No borrowing needed"
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class DualSourceEngine extends BaseGameEngine {
  private state: DualSourceGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'dual-source-dilemma');
  }
  
  // Core methods
  async initialize(config: DualSourceConfig): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Order methods
  private calculateOrderCost(quantity: number, supplier: Supplier): number
  private receiveShipments(currentWeek: number): number
  
  // Week processing
  private async processWeek(): Promise<any>
  
  // Analytics methods
  private calculateSupplierMix(): { A: number; B: number }
  private calculateServiceLevel(): number
  private calculateAverageInventory(): number
  private analyzeCashFlow(): string
  
  // Helper methods
  private generateDemandPattern(weeks: number): number[]
  private async saveGameState(): Promise<void>
}
```

### Demand Pattern Generation

```typescript
private generateDemandPattern(weeks: number): number[] {
  const demand: number[] = []
  const baseLevel = 50
  
  for (let w = 0; w < weeks; w++) {
    // Seasonal variation (sine wave)
    const seasonal = Math.sin(w / 5) * 10
    
    // Random noise
    const noise = (Math.random() - 0.5) * 20
    
    // Final demand (minimum 20 units)
    demand.push(Math.max(20, Math.round(baseLevel + seasonal + noise)))
  }
  
  return demand
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `DualSourceEngine` class
- [ ] Create state management structures
- [ ] Implement supplier configuration
- [ ] Build demand pattern generation
- [ ] Create order placement system

### Phase 2: Week Processing (Week 2-3)

- [ ] Build shipment receipt logic
- [ ] Implement demand fulfillment
- [ ] Create cost calculation system
- [ ] Build weekly history tracking
- [ ] Implement week advancement

### Phase 3: Cost Management (Week 3)

- [ ] Implement holding cost calculation
- [ ] Build stockout cost system
- [ ] Create borrowing cost logic
- [ ] Build total cost tracking

### Phase 4: Analytics & Metrics (Week 3-4)

- [ ] Build supplier mix calculation
- [ ] Implement service level calculation
- [ ] Create average inventory calculation
- [ ] Build cash flow analysis
- [ ] Implement final balance calculation

### Phase 5: UI Development (Week 4-5)

- [ ] Design main dashboard
- [ ] Build order placement interface
- [ ] Create supplier comparison view
- [ ] Design weekly history table
- [ ] Build metrics dashboard
- [ ] Create performance report view

### Phase 6: Reporting (Week 5)

- [ ] Build comprehensive report generation
- [ ] Create weekly breakdown analysis
- [ ] Implement supplier performance analysis
- [ ] Build cost breakdown visualization
- [ ] Create strategic recommendations

### Phase 7: Testing & Refinement (Week 6)

- [ ] Unit tests for calculations
- [ ] Integration tests for order processing
- [ ] Balance testing (cost vs. service level)
- [ ] Performance testing
- [ ] UI/UX testing

---

## 📝 Strategy Examples

### Strategy 1: Cost Optimization

**Approach:** Maximize Supplier A usage
- Order primarily from Supplier A (80-90%)
- Use Supplier B only for emergencies
- Focus on volume discounts

**Result:** Lowest cost, higher stockout risk

### Strategy 2: Risk Mitigation

**Approach:** Balanced dual-sourcing
- Split orders 50/50 or 60/40
- Use Supplier B for immediate needs
- Use Supplier A for bulk orders

**Result:** Balanced cost and risk

### Strategy 3: Reliability First

**Approach:** Maximize Supplier B usage
- Order primarily from Supplier B (70-80%)
- Use Supplier A for cost savings when possible
- Focus on service level

**Result:** Highest service level, higher cost

### Strategy 4: Adaptive Strategy

**Approach:** Adjust based on performance
- Start with cost optimization
- Shift to dual-sourcing if stockouts occur
- Monitor and adjust weekly

**Result:** Optimal balance over time

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Procurement Strategy Introduction**
   - Explain single vs. dual sourcing
   - Discuss TCO concept
   - Show supplier comparison

2. **Game Mechanics**
   - Weekly demand fulfillment
   - Order placement system
   - Cost structure

3. **Objectives**
   - Maximize final bank balance
   - Maintain service level ≥95%
   - Minimize total costs

### During Game (45 minutes)

- Place orders weekly
- Monitor inventory and cash
- Track costs and stockouts
- Adjust strategy based on performance

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final balance
   - Analyze supplier mix
   - Discuss cost breakdown

2. **Strategic Discussion**
   - What sourcing strategy worked best?
   - How did reliability impact decisions?
   - What was the optimal supplier mix?

3. **Key Learnings**
   - TCO vs. purchase price
   - Risk vs. cost trade-offs
   - Importance of supplier diversification

---

## ✅ Implementation Checklist

### Backend
- [x] DualSourceEngine class structure
- [x] State management
- [x] Order placement system
- [x] Week processing logic
- [x] Cost calculations
- [x] Metrics computation
- [x] Report generation
- [ ] API endpoints
- [ ] Database schema

### Frontend
- [ ] Main dashboard
- [ ] Order placement interface
- [ ] Supplier comparison view
- [ ] Weekly history table
- [ ] Metrics dashboard
- [ ] Performance report view
- [ ] Cost breakdown charts

### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (order processing)
- [ ] Balance testing
- [ ] Performance testing
- [ ] UI/UX testing

### Documentation
- [x] Theory documentation
- [x] Implementation guide
- [x] Scoring and report analysis
- [ ] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Complete Analysis - Ready for Implementation  
**Based on:** DualSourceEngine.ts, Theory Documentation, Procurement Strategy

---

*This document provides a complete blueprint for replicating the Dual Source Dilemma simulation. All mechanics, flows, scoring, and report analysis are documented based on the engine implementation and procurement strategy theory.*
