# TOC Simulation: The Factory Manager Experience - Complete Analysis & Replication Guide

**Simulation Name:** TOC Simulation: The Factory Manager Experience  
**Author:** Prof. Umang Varshney  
**Category:** Operations Management, Industrial Engineering, Decision Sciences  
**Duration:** 60 minutes  
**Difficulty:** ⭐⭐⭐⭐ (Advanced)  
**Players:** 1 player (single-player)  
**Framework:** Theory of Constraints (TOC) - Eliyahu Goldratt

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Factory Setup & Configuration](#factory-setup--configuration)
7. [Decision System](#decision-system)
8. [DBR Scheduling Methodology](#dbr-scheduling-methodology)
9. [Bottleneck Identification & Management](#bottleneck-identification--management)
10. [Production Processing System](#production-processing-system)
11. [Scoring & Metrics](#scoring--metrics)
12. [UI/UX Requirements](#uiux-requirements)
13. [API & Data Flow](#api--data-flow)
14. [Implementation Details](#implementation-details)
15. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**TOC Simulation: The Factory Manager Experience** is an operations management simulation that teaches students how to apply **Eliyahu Goldratt's Theory of Constraints (TOC)** to optimize factory production. Players manage a 5-machine production line producing two products, identify bottlenecks, and apply **Drum-Buffer-Rope (DBR)** scheduling to maximize throughput while minimizing work-in-process (WIP) inventory and operating expenses.

### Key Features

- ✅ **5-machine production line** in sequence (M1 → M2 → M3 → M4 → M5)
- ✅ **Two products** (Product A and Product B) with different processing times
- ✅ **Setup times** when switching between products
- ✅ **WIP buffers** between machines
- ✅ **DBR scheduling** (Drum-Buffer-Rope methodology)
- ✅ **Bottleneck identification** and management
- ✅ **Real-time production simulation**
- ✅ **Throughput optimization** goal

### Learning Outcomes

- Apply Theory of Constraints (TOC) principles to production systems
- Identify bottlenecks using utilization analysis
- Implement Drum-Buffer-Rope (DBR) scheduling
- Understand the difference between throughput and local efficiency
- Balance throughput, inventory, and operating expenses
- Apply the Five Focusing Steps methodology

---

## 📚 Theoretical Foundation

### Core Concept: Theory of Constraints (TOC)

**Eliyahu Goldratt's Theory of Constraints (TOC)** is a management philosophy that views any manageable system as being limited by a small number of constraints. The theory states that:

1. **Every system has at least one constraint** that limits its performance
2. **Focusing improvement efforts on the constraint** yields the greatest system-wide improvement
3. **Constraints can be physical** (machines, resources) or **policy-based** (rules, procedures)

**Key Principle:** System performance is determined by its weakest link (constraint/bottleneck). Improving anything other than the constraint provides only marginal benefit.

### The Five Focusing Steps

TOC provides a systematic approach to continuous improvement:

1. **IDENTIFY** the system's constraint (bottleneck)
   - Find the resource that limits throughput
   - Use utilization analysis, queue lengths, wait times

2. **EXPLOIT** the constraint
   - Maximize the bottleneck's output
   - Minimize idle time at bottleneck
   - Reduce setup times at bottleneck

3. **SUBORDINATE** everything else to the constraint
   - All other processes should support the bottleneck
   - Don't produce faster than the bottleneck can process
   - Use Drum-Buffer-Rope (DBR) scheduling

4. **ELEVATE** the constraint
   - Add capacity to the bottleneck (if economically justified)
   - Invest in equipment, reduce setup times, improve quality

5. **REPEAT** the process
   - When constraint is broken/elevated, identify new constraint
   - Continuous improvement cycle

### Drum-Buffer-Rope (DBR) Scheduling

**DBR** is a production scheduling methodology based on TOC:

- **Drum:** The constraint (bottleneck) sets the pace for the entire system
- **Buffer:** Time buffer protects the constraint from disruptions (WIP inventory)
- **Rope:** Material release is synchronized to the constraint's pace (pull system)

**Concept:**
- Release material into the system only at the rate the bottleneck can process
- Maintain a protective buffer of WIP before the bottleneck
- Non-bottleneck machines may be idle; this is acceptable

### TOC Metrics

Traditional cost accounting focuses on efficiency, but TOC focuses on:

1. **Throughput (T):** Rate at which the system generates money through sales
   - Revenue from products sold
   - Only counts what is sold, not what is produced

2. **Inventory (I):** All money invested in things the system intends to sell
   - Raw materials, WIP, finished goods
   - Money tied up in the system

3. **Operating Expense (OE):** All money spent turning inventory into throughput
   - Labor, utilities, depreciation, overhead
   - Cost of operating the system

**Goal:** Maximize (T - OE) while minimizing I

### Key TOC Insights

1. **Hour Lost at Bottleneck = Hour Lost for Entire System**
   - Bottleneck determines system capacity
   - Any time lost at bottleneck cannot be recovered

2. **Hour Saved at Non-Bottleneck = Mirage**
   - Improving non-bottlenecks doesn't increase throughput
   - May only increase inventory (WIP)

3. **Increasing Efficiency ≠ Increasing Throughput**
   - High machine utilization at non-bottlenecks is wasted
   - Focus efficiency improvements on bottleneck only

4. **Local Optimization ≠ Global Optimization**
   - Optimizing individual machines may hurt overall system
   - Must view system as a whole

---

## 🎮 Simulation Overview

### Factory Setup

**Production Line Structure:**
```
Raw Materials → M1 → Buffer → M2 → Buffer → M3 → Buffer → M4 → Buffer → M5 → Finished Goods
                ↑                                                              ↑
            Entry Point                                                   Exit Point
```

**5 Machines in Sequence:**
- **Machine 1 (M1):** First processing stage
- **Machine 2 (M2):** Second processing stage
- **Machine 3 (M3):** Third processing stage (often the bottleneck)
- **Machine 4 (M4):** Fourth processing stage
- **Machine 5 (M5):** Final processing stage

**Two Products:**
- **Product A:** Requires specific processing times per machine
- **Product B:** Different processing times per machine
- Different products may have different bottlenecks

### Initial Configuration

**Machine Processing Times (Example):**

| Machine | Product A (min/unit) | Product B (min/unit) | Capacity (units/hour) |
|---------|---------------------|---------------------|----------------------|
| M1      | 15                  | 10                  | 4 (A) / 6 (B)        |
| M2      | 20                  | 15                  | 3 (A) / 4 (B)        |
| M3      | 30                  | 25                  | 2 (A) / 2.4 (B)      |
| M4      | 25                  | 20                  | 2.4 (A) / 3 (B)      |
| M5      | 18                  | 12                  | 3.3 (A) / 5 (B)      |

**Setup Times:**
- **Setup Time:** 30-60 minutes when switching between products
- **Setup at Bottleneck:** Critical - directly reduces throughput
- **Setup at Non-Bottleneck:** Less critical but affects WIP levels

**WIP Buffers:**
- **Buffer before each machine:** Stores units waiting for processing
- **Buffer size:** Configurable (player decision or fixed)
- **Buffer before bottleneck:** Most important (protects constraint)

### Game Objectives

1. **Primary Goal:** Maximize throughput (units/hour)
2. **Secondary Goals:**
   - Minimize WIP inventory
   - Minimize operating expenses
   - Identify and exploit bottleneck
3. **Ultimate Goal:** Maximize profit = Throughput - Operating Expenses

---

## 🔄 Complete Game Logic & Flow

### Simulation Structure

**Time-Based Simulation:**
- Continuous time advancement (minutes/hours)
- Discrete events (job completion, setup completion)
- Real-time production processing

**Round Structure (Alternative):**
- Discrete time periods (e.g., 1-hour rounds)
- All decisions made at start of round
- Production processes during round
- Results shown at end of round

### Production Processing Flow

```
STEP 1: RELEASE DECISION
├─ Player decides: Product type (A or B), Batch size
├─ Material released into M1 queue
└─ Update raw material inventory

STEP 2: MACHINE PROCESSING
├─ For each machine M1 to M5:
│   ├─ Check if machine is idle
│   ├─ Check if setup needed (product switch)
│   ├─ If setup needed: Start setup timer
│   ├─ If setup complete: Start processing
│   ├─ Process one unit at a time
│   ├─ Update processing timer
│   └─ When unit complete: Move to next buffer/machine

STEP 3: BUFFER MANAGEMENT
├─ Units flow from machine to buffer
├─ Buffer feeds next machine
├─ Track buffer levels (WIP)
└─ Alert if buffer empty/full

STEP 4: BOTTLENECK IDENTIFICATION
├─ Calculate utilization for each machine
├─ Identify machine with highest utilization
├─ Check queue lengths before each machine
└─ Update bottleneck status

STEP 5: METRICS CALCULATION
├─ Throughput: Units completed per hour
├─ Utilization: % time each machine is busy
├─ WIP: Total units in buffers and machines
├─ Profit: Revenue - Operating Expenses
└─ Update dashboard

STEP 6: PLAYER DECISIONS (Next Round)
├─ Review current state
├─ Make production decisions
│   ├─ Product selection
│   ├─ Batch size
│   ├─ Buffer sizes (if configurable)
│   └─ Release timing (DBR rope)
└─ Repeat from STEP 1
```

### Production Processing Algorithm

```typescript
processProduction(timeElapsed: number) {
  // For each machine in sequence
  for (machine of machines) {
    // 1. Check if machine is in setup
    if (machine.setupTimeRemaining > 0) {
      machine.setupTimeRemaining -= timeElapsed
      if (machine.setupTimeRemaining <= 0) {
        machine.setupTimeRemaining = 0
        machine.status = 'ready'
      }
      continue
    }
    
    // 2. Check if machine is processing
    if (machine.currentJob) {
      machine.processingTimeRemaining -= timeElapsed
      if (machine.processingTimeRemaining <= 0) {
        // Job complete - move to next buffer/machine
        completeJob(machine)
      }
      continue
    }
    
    // 3. Machine is idle - check if work available
    if (machine.queue.length > 0) {
      const nextUnit = machine.queue[0]
      
      // Check if setup needed
      if (machine.currentProduct !== nextUnit.productType) {
        startSetup(machine, nextUnit.productType)
      } else {
        startProcessing(machine, nextUnit)
      }
    }
  }
  
  // Update throughput (count completed units)
  // Update WIP (sum all buffers and queues)
  // Calculate utilization for each machine
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface TOCFactoryGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    simulationDuration: number;        // Total simulation time (hours)
    timeStep: number;                  // Time increment per update (minutes)
    machines: MachineConfig[];
    products: ProductConfig[];
    revenue: {
      productA: number;                // Revenue per unit of A
      productB: number;                // Revenue per unit of B
    };
    operatingExpense: {
      hourly: number;                  // Fixed hourly operating cost
      perUnit: number;                 // Variable cost per unit
    };
  };
  
  machines: MachineState[];
  
  wipBuffers: {
    [key: string]: WorkUnit[];         // M1_M2, M2_M3, M3_M4, M4_M5
  };
  
  rawMaterial: {
    productA: number;
    productB: number;
  };
  
  finishedGoods: {
    productA: number;
    productB: number;
  };
  
  currentTime: number;                 // Simulation time (minutes)
  elapsedTime: number;                 // Time since start
  
  metrics: {
    throughput: {
      productA: number;                // Units/hour
      productB: number;
      total: number;
    };
    utilization: {
      [machineId: string]: number;     // 0-100%
    };
    wip: number;                       // Total WIP units
    profit: number;                    // Cumulative profit
    revenue: number;                   // Cumulative revenue
    operatingExpense: number;          // Cumulative OE
  };
  
  bottleneck: {
    machineId: string | null;
    utilization: number;
    queueLength: number;
  };
  
  decisions: {
    time: number;
    productType: 'A' | 'B';
    batchSize: number;
    bufferSize?: number;
  }[];
  
  isComplete: boolean;
}
```

### Machine State Structure

```typescript
interface MachineState {
  id: string;                          // M1, M2, M3, M4, M5
  name: string;
  
  // Configuration
  processingTimeA: number;             // Minutes per unit for Product A
  processingTimeB: number;             // Minutes per unit for Product B
  setupTime: number;                   // Minutes to switch products
  
  // Current State
  status: 'idle' | 'setup' | 'processing';
  currentProduct: 'A' | 'B' | null;
  
  setupTimeRemaining: number;          // Remaining setup time (minutes)
  processingTimeRemaining: number;     // Remaining processing time (minutes)
  
  currentJob: WorkUnit | null;         // Currently processing unit
  
  queue: WorkUnit[];                   // Units waiting for this machine
  
  // Statistics
  totalProcessingTime: number;         // Total time spent processing
  totalSetupTime: number;              // Total time spent in setup
  totalIdleTime: number;               // Total idle time
  unitsProcessed: number;              // Total units processed
  utilization: number;                 // Percentage (0-100)
}
```

### Work Unit Structure

```typescript
interface WorkUnit {
  id: string;                          // Unique unit ID
  productType: 'A' | 'B';
  releaseTime: number;                 // Time when released into system
  startTime: number;                   // Time when processing started
  completionTime: number;              // Time when processing completed
  currentLocation: string;             // Which machine/buffer
  processingHistory: {
    machineId: string;
    startTime: number;
    endTime: number;
  }[];
}
```

---

## 🏭 Factory Setup & Configuration

### Machine Configuration

**Default Machine Setup:**

| Machine | Product A (min) | Product B (min) | Setup (min) | Capacity (A) | Capacity (B) |
|---------|----------------|-----------------|-------------|--------------|--------------|
| M1      | 15             | 10              | 30          | 4 units/hr   | 6 units/hr   |
| M2      | 20             | 15              | 30          | 3 units/hr   | 4 units/hr   |
| M3      | 30             | 25              | 45          | 2 units/hr   | 2.4 units/hr |
| M4      | 25             | 20              | 30          | 2.4 units/hr | 3 units/hr   |
| M5      | 18             | 12              | 30          | 3.3 units/hr | 5 units/hr   |

**Bottleneck Analysis:**
- For Product A: M3 is bottleneck (slowest: 30 min/unit = 2 units/hr)
- For Product B: M3 is bottleneck (slowest: 25 min/unit = 2.4 units/hr)

**Machine M3 (Bottleneck):**
- Highest processing time for both products
- Determines system throughput
- Must be protected with buffer
- Setup time at M3 directly impacts throughput

### Product Configuration

**Product A:**
- Revenue per unit: ₹500
- Processing sequence: M1 → M2 → M3 → M4 → M5
- Total processing time: 108 minutes/unit (without setup)
- System capacity: Limited by M3 = 2 units/hour

**Product B:**
- Revenue per unit: ₹400
- Processing sequence: M1 → M2 → M3 → M4 → M5
- Total processing time: 82 minutes/unit (without setup)
- System capacity: Limited by M3 = 2.4 units/hour

### Buffer Configuration

**WIP Buffers Between Machines:**
- **Buffer M1→M2:** Between Machine 1 and Machine 2
- **Buffer M2→M3:** Between Machine 2 and Machine 3 (CRITICAL - protects bottleneck)
- **Buffer M3→M4:** Between Machine 3 and Machine 4
- **Buffer M4→M5:** Between Machine 4 and Machine 5

**Buffer Sizes:**
- **Default:** 10 units per buffer
- **Configurable:** Player can adjust buffer sizes
- **Buffer before bottleneck (M2→M3):** Should be larger (20-30 units)

### Operating Expenses

**Fixed Costs:**
- Hourly operating expense: ₹1,000/hour
- Includes: Labor, utilities, facility costs

**Variable Costs:**
- Per-unit cost: ₹50/unit
- Includes: Raw materials, energy per unit

**Cost Calculation:**
```
Operating Expense = (Fixed Hourly Cost × Hours) + (Variable Cost × Units Produced)
```

---

## 🎯 Decision System

### Player Decisions

Players make decisions at the start of each round (or continuously):

#### 1. **Product Selection**

**Options:**
- Produce **Product A** only
- Produce **Product B** only
- Produce **Mixed** (alternate between A and B)

**Considerations:**
- Product A: Higher revenue (₹500) but slower (2 units/hr)
- Product B: Lower revenue (₹400) but faster (2.4 units/hr)
- Mixed production: Requires setup times, reduces throughput

#### 2. **Batch Size**

**Options:**
- **Small Batch:** 5-10 units
  - Less WIP
  - More setup times (if switching products)
  
- **Medium Batch:** 10-20 units
  - Balance between WIP and setup
  
- **Large Batch:** 20-50 units
  - Less setup times
  - More WIP inventory

**Decision Impact:**
- Larger batches = Less frequent setups = Higher throughput (if bottleneck)
- Larger batches = More WIP = Higher inventory cost

#### 3. **Release Rate (DBR Rope)**

**Options:**
- **Aggressive Release:** Release material faster than bottleneck rate
  - Risk: Builds excessive WIP
  
- **Balanced Release:** Release at bottleneck rate
  - Optimal: Matches system capacity
  
- **Conservative Release:** Release slower than bottleneck rate
  - Risk: Bottleneck starves, throughput lost

**DBR Calculation:**
```
Release Rate = Bottleneck Capacity × (1 - Buffer Safety Margin)
Example: If bottleneck = 2 units/hr, release at 1.8 units/hr
```

#### 4. **Buffer Sizes** (If Configurable)

**Options:**
- **Small Buffers:** 5 units each
  - Lower WIP
  - Risk of bottleneck starvation
  
- **Standard Buffers:** 10 units each
  - Balanced
  
- **Large Buffer Before Bottleneck:** 20-30 units at M2→M3
  - Protects bottleneck from upstream disruptions
  - Higher WIP but ensures bottleneck never starves

#### 5. **Setup Reduction** (Investment Decision)

**Options:**
- **Reduce Setup at Bottleneck (M3):** Invest to reduce setup time
  - Cost: ₹50,000 one-time
  - Effect: Setup time reduced from 45 min to 20 min
  - Impact: More time for processing = higher throughput

**Decision Impact:**
- Setup reduction at bottleneck = Direct throughput increase
- Setup reduction at non-bottleneck = Minimal impact

---

## 🥁 DBR Scheduling Methodology

### Drum-Buffer-Rope (DBR) Implementation

**DBR Principles:**
1. **Drum:** The bottleneck (constraint) sets the pace
2. **Buffer:** Time buffer protects the bottleneck
3. **Rope:** Material release synchronized to drum

### DBR Algorithm

```typescript
class DBRScheduler {
  // 1. Identify the Drum (Bottleneck)
  identifyBottleneck(machines: MachineState[]): string {
    let maxUtilization = 0
    let bottleneckId = null
    
    for (machine of machines) {
      if (machine.utilization > maxUtilization) {
        maxUtilization = machine.utilization
        bottleneckId = machine.id
      }
    }
    
    return bottleneckId // Returns "M3" typically
  }
  
  // 2. Calculate Drum Rate (Bottleneck Capacity)
  calculateDrumRate(bottleneck: MachineState, productType: 'A' | 'B'): number {
    const processingTime = productType === 'A' 
      ? bottleneck.processingTimeA 
      : bottleneck.processingTimeB
    
    // Capacity in units per hour
    return 60 / processingTime
  }
  
  // 3. Set Buffer Size Before Bottleneck
  calculateBufferSize(drumRate: number, protectionTime: number): number {
    // Buffer should protect bottleneck for 'protectionTime' hours
    // protectionTime = time to recover from upstream disruptions
    return Math.ceil(drumRate * protectionTime)
  }
  
  // 4. Calculate Rope (Release Rate)
  calculateRopeReleaseRate(drumRate: number, bufferSafety: number): number {
    // Release slightly slower than drum to maintain buffer
    // bufferSafety = 0.1 means release 10% slower
    return drumRate * (1 - bufferSafety)
  }
  
  // 5. Determine Release Timing
  shouldRelease(currentBuffer: number, targetBuffer: number, ropeRate: number): boolean {
    // Release when buffer drops below target
    return currentBuffer < targetBuffer
  }
}
```

### DBR Scheduling Example

**Scenario:**
- Bottleneck: M3
- Product A: 30 min/unit = 2 units/hour
- Buffer target: 20 units (protects for 10 hours)

**DBR Schedule:**
1. **Drum Rate:** 2 units/hour (M3 capacity)
2. **Buffer Size:** 20 units before M3
3. **Rope Rate:** 1.8 units/hour (10% safety margin)
4. **Release Decision:** Release 1 unit every 33 minutes (60/1.8)

**Result:**
- Buffer maintains ~20 units
- M3 never starves
- System throughput = 2 units/hour (drum rate)

---

## 🔍 Bottleneck Identification & Management

### Bottleneck Detection Methods

#### Method 1: Utilization Analysis

```typescript
calculateUtilization(machine: MachineState, currentTime: number): number {
  const totalTime = currentTime - machine.startTime
  const busyTime = machine.totalProcessingTime + machine.totalSetupTime
  return (busyTime / totalTime) * 100
}
```

**Bottleneck Indicator:**
- Machine with highest utilization (typically 95-100%)
- All other machines have lower utilization

#### Method 2: Queue Length Analysis

```typescript
identifyBottleneckByQueue(machines: MachineState[]): string {
  let maxQueue = 0
  let bottleneckId = null
  
  for (machine of machines) {
    if (machine.queue.length > maxQueue) {
      maxQueue = machine.queue.length
      bottleneckId = machine.id
    }
  }
  
  return bottleneckId
}
```

**Bottleneck Indicator:**
- Machine with longest queue before it
- Units accumulating = bottleneck ahead

#### Method 3: Capacity Analysis

```typescript
identifyBottleneckByCapacity(machines: MachineState[], productType: 'A' | 'B'): string {
  let minCapacity = Infinity
  let bottleneckId = null
  
  for (machine of machines) {
    const processingTime = productType === 'A' 
      ? machine.processingTimeA 
      : machine.processingTimeB
    const capacity = 60 / processingTime // units per hour
    
    if (capacity < minCapacity) {
      minCapacity = capacity
      bottleneckId = machine.id
    }
  }
  
  return bottleneckId
}
```

**Bottleneck Indicator:**
- Machine with lowest capacity (slowest processing time)
- Determines system maximum throughput

### Bottleneck Management Strategies

#### Strategy 1: Exploit the Bottleneck

**Actions:**
- Minimize idle time at bottleneck
- Reduce setup times at bottleneck
- Ensure buffer is always full before bottleneck
- Prioritize bottleneck work

**Implementation:**
```typescript
exploitBottleneck(bottleneck: MachineState) {
  // 1. Ensure buffer before bottleneck is full
  const buffer = getBufferBefore(bottleneck.id)
  if (buffer.length < targetBufferSize) {
    releaseMaterial(bottleneck.capacity)
  }
  
  // 2. Minimize setup times
  if (bottleneck.requiresSetup) {
    prioritizeLargeBatches() // Fewer setups
  }
  
  // 3. Never let bottleneck starve
  monitorBufferLevels(bottleneck.id)
}
```

#### Strategy 2: Subordinate to Bottleneck

**Actions:**
- All upstream machines produce only at bottleneck rate
- Non-bottlenecks may be idle (this is OK)
- Don't over-produce beyond bottleneck capacity

**Implementation:**
```typescript
subordinateToBottleneck(bottleneck: MachineState, machines: MachineState[]) {
  const bottleneckRate = calculateDrumRate(bottleneck)
  
  // Limit release rate to bottleneck rate
  const releaseRate = bottleneckRate * 0.9 // 10% safety margin
  
  // Upstream machines should not produce faster
  for (machine of upstreamMachines(bottleneck)) {
    machine.maxProductionRate = releaseRate
  }
}
```

#### Strategy 3: Elevate the Bottleneck

**Actions:**
- Add capacity to bottleneck (if economically justified)
- Reduce setup time at bottleneck
- Improve quality at bottleneck (reduce rework)

**Implementation:**
```typescript
elevateBottleneck(bottleneck: MachineState, investment: number) {
  if (investment >= 50000) {
    // Reduce setup time
    bottleneck.setupTime *= 0.5 // 50% reduction
    
    // Or add parallel machine
    // bottleneck.capacity *= 2
  }
}
```

---

## ⚙️ Production Processing System

### Unit Processing Flow

```typescript
class ProductionProcessor {
  processUnit(unit: WorkUnit, machine: MachineState): void {
    // 1. Check if machine needs setup
    if (machine.currentProduct !== unit.productType) {
      this.startSetup(machine, unit.productType)
      return
    }
    
    // 2. Start processing
    machine.status = 'processing'
    machine.currentJob = unit
    machine.currentProduct = unit.productType
    
    const processingTime = unit.productType === 'A' 
      ? machine.processingTimeA 
      : machine.processingTimeB
    
    machine.processingTimeRemaining = processingTime
    unit.startTime = this.currentTime
  }
  
  completeUnit(machine: MachineState): void {
    const unit = machine.currentJob
    
    // Record completion
    unit.completionTime = this.currentTime
    unit.processingHistory.push({
      machineId: machine.id,
      startTime: unit.startTime,
      endTime: this.currentTime
    })
    
    // Update machine statistics
    machine.unitsProcessed++
    machine.totalProcessingTime += (this.currentTime - unit.startTime)
    
    // Move unit to next location
    if (machine.id === 'M5') {
      // Finished - move to finished goods
      this.addToFinishedGoods(unit)
    } else {
      // Move to next buffer
      this.moveToNextBuffer(unit, machine.id)
    }
    
    // Clear machine
    machine.currentJob = null
    machine.processingTimeRemaining = 0
    
    // Process next unit in queue
    this.processNextInQueue(machine)
  }
  
  moveToNextBuffer(unit: WorkUnit, fromMachineId: string): void {
    const bufferKey = this.getBufferKey(fromMachineId)
    const buffer = this.state.wipBuffers[bufferKey]
    
    buffer.push(unit)
    unit.currentLocation = bufferKey
    
    // Feed next machine
    this.feedNextMachine(bufferKey)
  }
  
  feedNextMachine(bufferKey: string): void {
    const nextMachineId = this.getNextMachine(bufferKey)
    const nextMachine = this.getMachine(nextMachineId)
    const buffer = this.state.wipBuffers[bufferKey]
    
    // Machine pulls from buffer when idle
    if (nextMachine.status === 'idle' && buffer.length > 0) {
      const unit = buffer.shift()
      nextMachine.queue.push(unit)
      this.processNextInQueue(nextMachine)
    }
  }
}
```

### Setup Time Handling

```typescript
startSetup(machine: MachineState, newProductType: 'A' | 'B'): void {
  machine.status = 'setup'
  machine.setupTimeRemaining = machine.setupTime
  machine.currentProduct = null // In transition
  
  // Update statistics
  machine.totalSetupTime += machine.setupTime
}

completeSetup(machine: MachineState, productType: 'A' | 'B'): void {
  machine.status = 'ready'
  machine.setupTimeRemaining = 0
  machine.currentProduct = productType
  
  // Process next unit
  this.processNextInQueue(machine)
}
```

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Throughput**

**Definition:** Rate at which finished products are produced (units/hour)

**Calculation:**
```typescript
calculateThroughput(finishedGoods: FinishedGoods, elapsedTime: number) {
  const totalUnits = finishedGoods.productA + finishedGoods.productB
  const hours = elapsedTime / 60 // Convert minutes to hours
  return totalUnits / hours
}
```

**Target:** Maximize throughput (limited by bottleneck capacity)

#### 2. **Machine Utilization**

**Definition:** Percentage of time each machine is busy (processing or setup)

**Calculation:**
```typescript
calculateUtilization(machine: MachineState, elapsedTime: number): number {
  const busyTime = machine.totalProcessingTime + machine.totalSetupTime
  return (busyTime / elapsedTime) * 100
}
```

**Bottleneck Indicator:**
- Bottleneck: 95-100% utilization
- Non-bottlenecks: Lower utilization (may be idle)

#### 3. **Work-in-Process (WIP)**

**Definition:** Total units in the production system (buffers + machines)

**Calculation:**
```typescript
calculateWIP(state: TOCFactoryGameState): number {
  let wip = 0
  
  // Count units in buffers
  for (buffer of Object.values(state.wipBuffers)) {
    wip += buffer.length
  }
  
  // Count units in machine queues
  for (machine of state.machines) {
    wip += machine.queue.length
    if (machine.currentJob) wip += 1
  }
  
  return wip
}
```

**Target:** Minimize WIP (while protecting bottleneck)

#### 4. **Bottleneck Utilization**

**Definition:** Utilization of the bottleneck machine

**Importance:** Directly determines system throughput

**Target:** 95-100% (maximize bottleneck utilization)

#### 5. **Profit**

**Definition:** Throughput Revenue - Operating Expenses

**Calculation:**
```typescript
calculateProfit(state: TOCFactoryGameState): number {
  const revenue = (state.finishedGoods.productA * state.config.revenue.productA) +
                  (state.finishedGoods.productB * state.config.revenue.productB)
  
  const hours = state.elapsedTime / 60
  const fixedOE = state.config.operatingExpense.hourly * hours
  const variableOE = (state.finishedGoods.productA + state.finishedGoods.productB) *
                     state.config.operatingExpense.perUnit
  
  const operatingExpense = fixedOE + variableOE
  
  return revenue - operatingExpense
}
```

**Target:** Maximize profit

### Performance Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  TOC FACTORY - Performance Metrics                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  THROUGHPUT                                             │
│  ┌──────────────────────────────────────┐               │
│  │ Product A:    2.0 units/hour         │               │
│  │ Product B:    2.4 units/hour         │               │
│  │ Total:        4.4 units/hour         │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  MACHINE UTILIZATION                                    │
│  ┌──────────────────────────────────────┐               │
│  │ M1:  ████████░░  67%                 │               │
│  │ M2:  ██████████░  83%                 │               │
│  │ M3:  ████████████ 100% ⚠️ BOTTLENECK │               │
│  │ M4:  ████████░░  67%                 │               │
│  │ M5:  ███████░░░  58%                 │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  WIP INVENTORY                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Buffer M1→M2:  5 units               │               │
│  │ Buffer M2→M3:  22 units ⚠️ HIGH      │               │
│  │ Buffer M3→M4:  3 units               │               │
│  │ Buffer M4→M5:  2 units               │               │
│  │ Total WIP:     32 units              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  FINANCIAL                                              │
│  ┌──────────────────────────────────────┐               │
│  │ Revenue:        ₹125,000             │               │
│  │ Operating Exp:  ₹45,000              │               │
│  │ Profit:         ₹80,000              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Requirements

### Main Factory Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  TOC FACTORY SIMULATION - Round 5                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PRODUCTION LINE                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │  [Raw] → [M1] → [●5] → [M2] → [●22] → [M3] →    │   │
│  │                                    ⚠️ BOTTLENECK │   │
│  │         → [●3] → [M4] → [●2] → [M5] → [FG]      │   │
│  │                                                   │   │
│  │  M1: Processing A (12 min left)                  │   │
│  │  M2: Idle                                        │   │
│  │  M3: Processing B (15 min left) ⚠️               │   │
│  │  M4: Processing A (10 min left)                  │   │
│  │  M5: Idle                                        │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PRODUCTION DECISIONS                                    │
│  ┌──────────────────────────────────────┐               │
│  │ Product Type:  [● A]  [○ B]  [○ Mix]│               │
│  │                                      │               │
│  │ Batch Size:    [10] units           │               │
│  │                                      │               │
│  │ Release Rate:  [Balanced ▼]         │               │
│  │                • Aggressive          │               │
│  │                • Balanced (DBR)      │               │
│  │                • Conservative        │               │
│  │                                      │               │
│  │ [Release Batch] [Wait]              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  BOTTLENECK ANALYSIS                                     │
│  ┌──────────────────────────────────────┐               │
│  │ ⚠️ Current Bottleneck: M3            │               │
│  │    Utilization: 100%                 │               │
│  │    Queue Length: 22 units            │               │
│  │    Capacity: 2 units/hour (A)        │               │
│  │           2.4 units/hour (B)         │               │
│  │                                      │               │
│  │ Recommendations:                     │               │
│  │ • Reduce setup time at M3            │               │
│  │ • Maintain buffer before M3          │               │
│  │ • Prioritize large batches           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Machine Status Panel

```
┌─────────────────────────────────────────────────────────┐
│  MACHINE STATUS                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Machine 1 (M1)                                          │
│  Status: 🔄 Processing Product A                         │
│  Time Remaining: 12 minutes                             │
│  Utilization: 67%                                       │
│  Queue: 0 units                                         │
│                                                          │
│  Machine 2 (M2)                                          │
│  Status: ⏸️ Idle                                        │
│  Utilization: 83%                                       │
│  Queue: 0 units                                         │
│                                                          │
│  Machine 3 (M3) ⚠️ BOTTLENECK                           │
│  Status: 🔄 Processing Product B                         │
│  Time Remaining: 15 minutes                             │
│  Utilization: 100%                                      │
│  Queue: 22 units                                        │
│                                                          │
│  Machine 4 (M4)                                          │
│  Status: 🔄 Processing Product A                         │
│  Time Remaining: 10 minutes                             │
│  Utilization: 67%                                       │
│  Queue: 0 units                                         │
│                                                          │
│  Machine 5 (M5)                                          │
│  Status: ⏸️ Idle                                        │
│  Utilization: 58%                                       │
│  Queue: 0 units                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Real-time Visualization

**Gantt Chart:**
- Shows machine timeline
- Visualizes processing, setup, and idle time
- Identifies bottlenecks visually

**Flow Diagram:**
- Animated flow of units through production line
- Shows buffer levels
- Highlights bottleneck location

**Utilization Heatmap:**
- Color-coded machine utilization
- Red = High utilization (bottleneck)
- Green = Low utilization (may be idle)

---

## 🔌 API & Data Flow

### Initialization

```typescript
POST /api/sessions/:sessionId/games/toc-factory/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    simulationDuration?: number,  // Hours
    machines?: MachineConfig[],
    products?: ProductConfig[],
    bufferSizes?: { [key: string]: number }
  }
}

Response: {
  success: true,
  state: TOCFactoryGameState
}
```

### Release Decision

```typescript
POST /api/sessions/:sessionId/games/toc-factory/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  action: 'release',
  productType: 'A' | 'B',
  batchSize: number,
  releaseRate?: 'aggressive' | 'balanced' | 'conservative'
}

Response: {
  success: true,
  message: "Batch released into production",
  data: {
    batchId: string,
    estimatedCompletion: number,
    newWIP: number
  }
}
```

### Get Current State

```typescript
GET /api/sessions/:sessionId/games/toc-factory/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentTime: number,
  machines: MachineState[],
  wipBuffers: { [key: string]: WorkUnit[] },
  bottleneck: {
    machineId: string,
    utilization: number,
    queueLength: number
  },
  metrics: {
    throughput: { productA: number, productB: number, total: number },
    utilization: { [machineId: string]: number },
    wip: number,
    profit: number
  }
}
```

### WebSocket Events

**State Update:**
```javascript
socket.on('game:state-update', (data) => {
  // Updated machine states, buffers, metrics
  updateFactoryVisualization(data)
})
```

**Unit Completed:**
```javascript
socket.on('game:unit-completed', (data) => {
  // Unit finished processing
  // data: { unitId, productType, completionTime }
  updateThroughput(data)
})
```

**Bottleneck Changed:**
```javascript
socket.on('game:bottleneck-changed', (data) => {
  // Bottleneck shifted to different machine
  // data: { newBottleneck: 'M3', utilization: 100 }
  highlightNewBottleneck(data)
})
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class TOCFactoryEngine extends BaseGameEngine {
  private state: TOCFactoryGameState;
  private scheduler: DBRScheduler;
  private processor: ProductionProcessor;
  
  constructor(sessionId: string) {
    super(sessionId, 'toc-factory');
    this.scheduler = new DBRScheduler();
    this.processor = new ProductionProcessor();
  }
  
  // Core methods
  async initialize(config: Partial<TOCFactoryConfig>): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // Production methods
  private processProduction(timeElapsed: number): void
  private releaseBatch(productType: 'A' | 'B', batchSize: number): void
  private identifyBottleneck(): string
  
  // DBR methods
  private calculateDrumRate(): number
  private calculateBufferSize(): number
  private calculateReleaseRate(): number
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Helper methods
  private updateUtilization(): void
  private updateMetrics(): void
  private async saveGameState(): Promise<void>
}
```

### Production Processing Loop

```typescript
async processProduction(timeElapsed: number): Promise<void> {
  const startTime = this.state.currentTime
  
  // Process in small time steps
  const stepSize = 1 // 1 minute steps
  let remainingTime = timeElapsed
  
  while (remainingTime > 0) {
    const step = Math.min(stepSize, remainingTime)
    
    // Process each machine
    for (const machine of this.state.machines) {
      // Handle setup
      if (machine.setupTimeRemaining > 0) {
        machine.setupTimeRemaining -= step
        if (machine.setupTimeRemaining <= 0) {
          this.completeSetup(machine)
        }
        continue
      }
      
      // Handle processing
      if (machine.processingTimeRemaining > 0) {
        machine.processingTimeRemaining -= step
        machine.totalProcessingTime += step
        
        if (machine.processingTimeRemaining <= 0) {
          this.completeUnit(machine)
        }
        continue
      }
      
      // Machine idle - check queue
      if (machine.queue.length > 0) {
        const unit = machine.queue[0]
        
        // Check if setup needed
        if (machine.currentProduct !== unit.productType) {
          this.startSetup(machine, unit.productType)
        } else {
          this.startProcessing(machine, unit)
        }
      } else {
        // Machine idle - update statistics
        machine.totalIdleTime += step
      }
    }
    
    // Feed machines from buffers
    this.feedMachinesFromBuffers()
    
    // Update time
    this.state.currentTime += step
    remainingTime -= step
  }
  
  // Update metrics after processing
  this.updateUtilization()
  this.updateMetrics()
  this.identifyBottleneck()
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `TOCFactoryEngine` class extending `BaseGameEngine`
- [ ] Create machine state structure
- [ ] Implement production processing loop
- [ ] Build unit flow system (machine to buffer to machine)
- [ ] Implement setup time handling
- [ ] Create WIP buffer management

### Phase 2: Bottleneck & DBR (Week 2-3)

- [ ] Implement bottleneck identification algorithms
- [ ] Build DBR scheduler
- [ ] Implement drum rate calculation
- [ ] Create buffer size calculation
- [ ] Build release rate (rope) calculation
- [ ] Implement buffer monitoring

### Phase 3: Metrics & Analytics (Week 3)

- [ ] Implement throughput calculation
- [ ] Build utilization tracking
- [ ] Create WIP counting system
- [ ] Implement profit calculation
- [ ] Build performance dashboard

### Phase 4: UI Development (Week 4-5)

- [ ] Design factory layout visualization
- [ ] Build machine status panels
- [ ] Create buffer level indicators
- [ ] Implement real-time production flow animation
- [ ] Build decision input interface
- [ ] Create metrics dashboard
- [ ] Design bottleneck highlighting

### Phase 5: API & Integration (Week 5)

- [ ] Create REST API endpoints
- [ ] Implement WebSocket event handlers
- [ ] Build state persistence
- [ ] Create session management integration
- [ ] Implement real-time updates

### Phase 6: Testing & Refinement (Week 6)

- [ ] Unit tests for production logic
- [ ] Integration tests for DBR scheduling
- [ ] Balance testing (processing times, setup times)
- [ ] UI/UX testing
- [ ] Performance testing
- [ ] User acceptance testing

### Phase 7: Advanced Features (Week 7-8)

- [ ] Multiple product types
- [ ] Setup reduction investments
- [ ] Machine capacity upgrades
- [ ] Advanced analytics (Gantt charts, heatmaps)
- [ ] Export functionality (PDF/Excel)
- [ ] Scenario comparison mode

---

## 📝 Decision Examples & Strategies

### Strategy 1: Maximize Throughput (DBR Focus)

**Approach:** Strict DBR scheduling
- Identify bottleneck (M3)
- Release at bottleneck rate (2 units/hr for A)
- Maintain large buffer before M3 (20 units)
- Minimize setup times at M3
- **Result:** Maximum throughput, controlled WIP

### Strategy 2: Minimize WIP

**Approach:** Just-in-Time (JIT)
- Small batches
- Small buffers
- Frequent releases
- **Risk:** Bottleneck may starve
- **Result:** Low WIP, potential throughput loss

### Strategy 3: Mixed Production

**Approach:** Produce both products
- Alternate between A and B
- Balance revenue vs. throughput
- **Challenge:** Setup times reduce throughput
- **Result:** Balanced product mix, lower throughput

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Introduce Theory of Constraints**
   - Explain bottleneck concept
   - Show Five Focusing Steps
   - Discuss DBR methodology

2. **Factory Setup Explanation**
   - Show production line structure
   - Explain machine capacities
   - Demonstrate bottleneck identification

3. **Game Mechanics**
   - Decision types
   - Production processing
   - Metrics to track

### During Game (60 minutes)

- Continuous production simulation
- Player makes decisions periodically
- Real-time feedback on performance
- Optional pause for discussion

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final throughput
   - Analyze bottleneck utilization
   - Discuss WIP levels

2. **TOC Discussion**
   - How was bottleneck identified?
   - Was bottleneck exploited effectively?
   - Could throughput be improved?

3. **Key Learnings**
   - Throughput vs. efficiency
   - Importance of protecting bottleneck
   - WIP vs. throughput trade-off

---

## ✅ Implementation Checklist

### Backend
- [x] TOCFactoryEngine skeleton structure
- [ ] Machine state management
- [ ] Production processing loop
- [ ] Buffer management
- [ ] Setup time handling
- [ ] Bottleneck identification
- [ ] DBR scheduling
- [ ] Metrics calculation
- [ ] API endpoints
- [ ] WebSocket integration
- [ ] Database schema

### Frontend
- [ ] Factory layout visualization
- [ ] Machine status panels
- [ ] Buffer level indicators
- [ ] Production flow animation
- [ ] Decision input interface
- [ ] Metrics dashboard
- [ ] Bottleneck highlighting
- [ ] Real-time updates

### Testing
- [ ] Unit tests (production logic)
- [ ] Integration tests (DBR)
- [ ] Balance testing
- [ ] UI/UX testing
- [ ] Performance testing

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
**Based on:** TOCFactoryEngine.ts skeleton, Theory Documentation, TOC Principles

---

*This document provides a complete blueprint for replicating the TOC Factory Simulation. All mechanics, flows, and logic are documented based on Theory of Constraints principles and the skeleton engine implementation.*
