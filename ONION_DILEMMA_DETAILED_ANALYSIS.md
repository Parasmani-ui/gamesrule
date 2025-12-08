# The Onion Dilemma: A Game Theory Supply Chain Simulation - Complete Analysis & Replication Guide

**Simulation Name:** The Onion Dilemma: A Game Theory Supply Chain Simulation  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Game Theory, Supply Chain Management, Strategic Interaction  
**Duration:** 45 minutes  
**Difficulty:** ⭐⭐⭐⭐ (Advanced)  
**Players:** 1-2 players (Farmer-Coordinator vs. Retailer-Coordinator)  
**Framework:** Prisoner's Dilemma, Nash Equilibrium, Trust Dynamics

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Payoff Matrix System](#payoff-matrix-system)
7. [Trust Dynamics](#trust-dynamics)
8. [Player Decisions](#player-decisions)
9. [Market Conditions](#market-conditions)
10. [Bot Strategies](#bot-strategies)
11. [Scoring & Metrics](#scoring--metrics)
12. [Report Analysis](#report-analysis)
13. [UI/UX Requirements](#uiux-requirements)
14. [API & Data Flow](#api--data-flow)
15. [Implementation Details](#implementation-details)
16. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**The Onion Dilemma: A Game Theory Supply Chain Simulation** is a game theory simulation that teaches students about strategic interactions, cooperation, and trust in supply chain contexts. Based on the Prisoner's Dilemma, two players (Farmer-Coordinator and Retailer-Coordinator) make simultaneous decisions each round to either cooperate (share information) or defect (withhold information). The game demonstrates how individual rationality can lead to collective irrationality and how trust dynamics evolve through repeated interactions.

### Key Features

- ✅ **Two-player game** (Farmer-Coordinator vs. Retailer-Coordinator)
- ✅ **Simultaneous decision-making** each round
- ✅ **Prisoner's Dilemma** payoff structure
- ✅ **Trust index** that evolves based on decisions
- ✅ **Dynamic market conditions** (stable/volatile)
- ✅ **Multiple rounds** with cumulative payoffs
- ✅ **Nash Equilibrium** identification
- ✅ **Bot strategies** (Tit-for-Tat, Grim Trigger, Adaptive)

### Learning Outcomes

- Understand Game Theory fundamentals and Nash Equilibrium
- Recognize Prisoner's Dilemma in business contexts
- Analyze strategic interactions and coordination problems
- Learn how trust evolves through repeated interactions
- Understand why cooperation fails and how to enable it
- Explore solutions: contracts, cooperatives, reputation systems

---

## 📚 Theoretical Foundation

### Core Concept: Game Theory

**Game Theory:**
A mathematical framework for analyzing strategic interactions between rational decision-makers. It studies situations where:
- Multiple players make decisions
- Each player's payoff depends on others' decisions
- Players act strategically to maximize their own payoff

**Key Principle:** Optimal strategy depends on what others are doing.

### Prisoner's Dilemma

**The Classic Prisoner's Dilemma:**
Two prisoners are interrogated separately. Each can:
- **Cooperate:** Stay silent (help partner)
- **Defect:** Confess (betray partner)

**Payoff Structure:**
```
                Prisoner B: Silent    Prisoner B: Confess
Prisoner A: Silent   (1, 1)            (5, 0)
Prisoner A: Confess  (0, 5)            (3, 3)
```

**The Dilemma:**
- **Mutual Cooperation:** Both stay silent → Best collective outcome (1, 1)
- **Mutual Defection:** Both confess → Nash Equilibrium (3, 3)
- **Problem:** Each player has incentive to defect, leading to suboptimal outcome

### Nash Equilibrium

**Definition:**
A state where no player can improve their payoff by unilaterally changing their strategy, given what others are doing.

**In Prisoner's Dilemma:**
- Mutual defection is Nash Equilibrium
- Each player's best response to defection is defection
- But mutual cooperation would be better for both

### The Onion Dilemma Context

**Scenario:**
- Multiple onion farmers decide production levels
- Market price depends on total supply
- High supply → Low price → Low profit
- Low supply → High price → High profit (requires coordination)

**The Dilemma:**
- **Cooperative Outcome:** All produce low → High prices → High profit
- **Nash Equilibrium:** All produce high → Low prices → Medium profit
- **Problem:** Fear of exploitation leads to suboptimal outcome

---

## 🎮 Simulation Overview

### Game Setup

**Players:** 2 players
- **Player 1:** Farmer-Coordinator (FC)
- **Player 2:** Retailer-Coordinator (RC)

**Rounds:** 10-20 rounds (configurable)  
**Initial Trust Index:** 50 (0-100 scale)  
**Decision Type:** Simultaneous (both players decide at same time)

### Player Roles

**Farmer-Coordinator (FC):**
- Represents onion farmers' cooperative
- Decides production levels and pricing
- Can cooperate (share information) or defect (withhold information)

**Retailer-Coordinator (RC):**
- Represents retail chain
- Decides purchasing strategy and pricing
- Can cooperate (share demand info) or defect (withhold info)

### Decision Options

**Cooperate:**
- Share information with partner
- Commit to agreed terms
- Build trust
- Lower immediate payoff but better long-term

**Defect:**
- Withhold information
- Act opportunistically
- Exploit partner
- Higher immediate payoff but damages trust

### Market Conditions

**Stable Market:**
- Predictable demand
- Moderate price volatility
- Standard payoffs

**Volatile Market:**
- Unpredictable demand
- High price volatility
- Modified payoffs (higher risk/reward)

---

## 🔄 Complete Game Logic & Flow

### Initialization

```typescript
initialize(config) {
  // 1. Set default configuration
  config = {
    numRounds: 15,
    initialTrustIndex: 50,
    payoffMatrix: {
      mutualCooperation: { FC: 5, RC: 5 },
      mutualDefection: { FC: 2, RC: 2 },
      FC_Defect_RC_Cooperate: { FC: 8, RC: 0 },
      FC_Cooperate_RC_Defect: { FC: 0, RC: 8 }
    },
    trustUpdateRate: 5,  // Points per round
    marketCondition: 'stable'
  }
  
  // 2. Initialize players
  players = {
    FC: {
      payoff: 0,
      decisions: [],
      trust: 50,
      cumulativePayoff: 0
    },
    RC: {
      payoff: 0,
      decisions: [],
      trust: 50,
      cumulativePayoff: 0
    }
  }
  
  // 3. Initialize state
  state = {
    round: 0,
    players: players,
    trustIndex: 50,
    marketCondition: 'stable',
    history: [],
    isComplete: false
  }
}
```

### Round Processing Loop

```
FOR each round (1 to numRounds):

  STEP 1: MARKET EVENT (Optional)
  ├─ Show market condition
  ├─ Display market information
  └─ Update payoff multipliers if volatile

  STEP 2: SIMULTANEOUS DECISIONS
  ├─ Both players decide simultaneously
  │   ├─ FC chooses: COOPERATE or DEFECT
  │   └─ RC chooses: COOPERATE or DEFECT
  │
  ├─ Wait for both decisions
  └─ Record decisions

  STEP 3: CALCULATE PAYOFFS
  ├─ Look up payoff matrix
  │   IF FC=COOPERATE AND RC=COOPERATE:
  │     payoff = mutualCooperation (5, 5)
  │   IF FC=DEFECT AND RC=DEFECT:
  │     payoff = mutualDefection (2, 2)
  │   IF FC=DEFECT AND RC=COOPERATE:
  │     payoff = (8, 0)  // FC exploits RC
  │   IF FC=COOPERATE AND RC=DEFECT:
  │     payoff = (0, 8)  // RC exploits FC
  │
  ├─ Apply trust multiplier
  │   trustMultiplier = trustIndex / 50
  │   adjustedPayoff = basePayoff × trustMultiplier
  │
  └─ Update cumulative payoffs

  STEP 4: UPDATE TRUST INDEX
  ├─ IF mutual cooperation:
  │     trustIndex += trustUpdateRate
  │   IF mutual defection:
  │     trustIndex -= trustUpdateRate
  │   IF one defects:
  │     trustIndex -= (trustUpdateRate × 1.5)
  │
  ├─ Clamp trustIndex to [0, 100]
  └─ Update player trust scores

  STEP 5: RECORD HISTORY
  ├─ Save round data:
  │   - Round number
  │   - FC decision
  │   - RC decision
  │   - FC payoff
  │   - RC payoff
  │   - Trust index
  │   - Market condition
  │
  └─ Add to history array

  STEP 6: CHECK COMPLETION
  └─ IF round >= numRounds:
      └─ isComplete = true
```

### Decision Processing

```typescript
processDecisions(fcDecision, rcDecision) {
  // 1. Get base payoffs from matrix
  let fcPayoff, rcPayoff
  
  if (fcDecision === 'COOPERATE' && rcDecision === 'COOPERATE') {
    fcPayoff = payoffMatrix.mutualCooperation.FC
    rcPayoff = payoffMatrix.mutualCooperation.RC
  } else if (fcDecision === 'DEFECT' && rcDecision === 'DEFECT') {
    fcPayoff = payoffMatrix.mutualDefection.FC
    rcPayoff = payoffMatrix.mutualDefection.RC
  } else if (fcDecision === 'DEFECT' && rcDecision === 'COOPERATE') {
    fcPayoff = payoffMatrix.FC_Defect_RC_Cooperate.FC  // 8
    rcPayoff = payoffMatrix.FC_Defect_RC_Cooperate.RC  // 0
  } else {  // FC=COOPERATE, RC=DEFECT
    fcPayoff = payoffMatrix.FC_Cooperate_RC_Defect.FC  // 0
    rcPayoff = payoffMatrix.FC_Cooperate_RC_Defect.RC  // 8
  }
  
  // 2. Apply trust multiplier
  const trustMultiplier = trustIndex / 50
  fcPayoff = Math.round(fcPayoff * trustMultiplier)
  rcPayoff = Math.round(rcPayoff * trustMultiplier)
  
  // 3. Update cumulative payoffs
  players.FC.cumulativePayoff += fcPayoff
  players.RC.cumulativePayoff += rcPayoff
  
  // 4. Update trust index
  updateTrustIndex(fcDecision, rcDecision)
  
  return { fcPayoff, rcPayoff }
}
```

### Trust Index Update

```typescript
updateTrustIndex(fcDecision, rcDecision) {
  if (fcDecision === 'COOPERATE' && rcDecision === 'COOPERATE') {
    // Mutual cooperation: increase trust
    trustIndex += trustUpdateRate
  } else if (fcDecision === 'DEFECT' && rcDecision === 'DEFECT') {
    // Mutual defection: decrease trust
    trustIndex -= trustUpdateRate
  } else {
    // One-sided defection: larger decrease
    trustIndex -= (trustUpdateRate * 1.5)
  }
  
  // Clamp to [0, 100]
  trustIndex = Math.max(0, Math.min(100, trustIndex))
  
  // Update individual player trust
  if (fcDecision === 'COOPERATE') {
    players.FC.trust = Math.min(100, players.FC.trust + 2)
  } else {
    players.FC.trust = Math.max(0, players.FC.trust - 3)
  }
  
  if (rcDecision === 'COOPERATE') {
    players.RC.trust = Math.min(100, players.RC.trust + 2)
  } else {
    players.RC.trust = Math.max(0, players.RC.trust - 3)
  }
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface OnionDilemmaGameState {
  sessionId: string;
  
  config: {
    numRounds: number;                    // Default: 15
    initialTrustIndex: number;             // Default: 50
    trustUpdateRate: number;                // Default: 5
    payoffMatrix: PayoffMatrix;
    marketVolatility: number;              // 0-1 (affects payoffs)
  };
  
  round: number;                          // Current round (0-14)
  
  players: {
    FC: {
      participantId: string;
      payoff: number;                      // Current round payoff
      cumulativePayoff: number;            // Total payoff
      decisions: Decision[];                // History of decisions
      trust: number;                       // Individual trust score (0-100)
    };
    RC: {
      participantId: string;
      payoff: number;
      cumulativePayoff: number;
      decisions: Decision[];
      trust: number;
    };
  };
  
  trustIndex: number;                     // Overall trust index (0-100)
  marketCondition: 'stable' | 'volatile';
  
  history: {
    round: number;
    fcDecision: 'COOPERATE' | 'DEFECT';
    rcDecision: 'COOPERATE' | 'DEFECT';
    fcPayoff: number;
    rcPayoff: number;
    trustIndex: number;
    marketCondition: string;
  }[];
  
  isComplete: boolean;
}
```

### Payoff Matrix Structure

```typescript
interface PayoffMatrix {
  mutualCooperation: {
    FC: number;  // Default: 5
    RC: number;   // Default: 5
  };
  mutualDefection: {
    FC: number;  // Default: 2
    RC: number;   // Default: 2
  };
  FC_Defect_RC_Cooperate: {
    FC: number;  // Default: 8 (FC exploits RC)
    RC: number;   // Default: 0 (RC exploited)
  };
  FC_Cooperate_RC_Defect: {
    FC: number;  // Default: 0 (FC exploited)
    RC: number;   // Default: 8 (RC exploits FC)
  };
}
```

### Decision Structure

```typescript
interface Decision {
  round: number;
  decision: 'COOPERATE' | 'DEFECT';
  contractTerms?: {
    price?: number;
    quantity?: number;
    informationSharing?: boolean;
  };
  timestamp: Date;
}
```

---

## 📊 Payoff Matrix System

### Standard Payoff Matrix

**Base Payoff Matrix:**
```
                RC: Cooperate    RC: Defect
FC: Cooperate   (5, 5)          (0, 8)
FC: Defect      (8, 0)          (2, 2)
```

**Interpretation:**
- **(5, 5):** Mutual cooperation → Both benefit moderately
- **(2, 2):** Mutual defection → Both get low payoff (Nash Equilibrium)
- **(8, 0):** FC defects, RC cooperates → FC exploits RC
- **(0, 8):** FC cooperates, RC defects → RC exploits FC

### Payoff Analysis

**For Farmer-Coordinator (FC):**
- If RC cooperates: Defect (8) > Cooperate (5) → Defect is better
- If RC defects: Defect (2) > Cooperate (0) → Defect is better
- **Dominant Strategy:** Always defect

**For Retailer-Coordinator (RC):**
- If FC cooperates: Defect (8) > Cooperate (5) → Defect is better
- If FC defects: Defect (2) > Cooperate (0) → Defect is better
- **Dominant Strategy:** Always defect

**Result:** Both players defect → (2, 2) Nash Equilibrium

**But:** Mutual cooperation (5, 5) would be better for both!

### Trust-Adjusted Payoffs

**Trust Multiplier:**
```
trustMultiplier = trustIndex / 50

Example:
- Trust Index = 50 → Multiplier = 1.0 (base payoffs)
- Trust Index = 75 → Multiplier = 1.5 (higher payoffs)
- Trust Index = 25 → Multiplier = 0.5 (lower payoffs)
```

**Adjusted Payoffs:**
```
Adjusted Payoff = Base Payoff × Trust Multiplier

Example (Trust Index = 75):
- Mutual Cooperation: (5, 5) × 1.5 = (7.5, 7.5)
- Mutual Defection: (2, 2) × 1.5 = (3, 3)
- FC Defect: (8, 0) × 1.5 = (12, 0)
```

### Market Condition Modifiers

**Stable Market:**
- Base payoffs apply
- Predictable outcomes

**Volatile Market:**
- Payoffs multiplied by volatility factor (1.2-1.5)
- Higher risk/reward
- More uncertainty

---

## 🤝 Trust Dynamics

### Trust Index Evolution

**Initial Trust:** 50 (neutral)

**Trust Updates:**
```
IF mutual cooperation:
  trustIndex += trustUpdateRate  // +5 points

IF mutual defection:
  trustIndex -= trustUpdateRate  // -5 points

IF one-sided defection:
  trustIndex -= (trustUpdateRate × 1.5)  // -7.5 points
```

**Trust Range:** 0-100
- **0-30:** Low trust (hostile)
- **31-60:** Moderate trust (cautious)
- **61-80:** High trust (cooperative)
- **81-100:** Very high trust (strong partnership)

### Trust Impact on Payoffs

**High Trust (75-100):**
- Payoffs multiplied by 1.5-2.0
- Cooperation becomes more attractive
- Defection becomes less attractive

**Low Trust (0-30):**
- Payoffs multiplied by 0.5-0.6
- Cooperation becomes less attractive
- Defection becomes more attractive

### Individual Player Trust

**Each player has individual trust score:**
- Starts at 50
- Increases by +2 when player cooperates
- Decreases by -3 when player defects
- Range: 0-100

**Use:** Can be used for reputation systems or bot strategies

---

## 🎯 Player Decisions

### Decision Types

**1. Cooperate**
- Share information with partner
- Commit to agreed terms
- Build trust
- Lower immediate payoff but better long-term

**2. Defect**
- Withhold information
- Act opportunistically
- Exploit partner
- Higher immediate payoff but damages trust

### Contract Terms (Optional)

**If Cooperating, players can specify:**
- **Price:** Agreed price per unit
- **Quantity:** Agreed quantity
- **Information Sharing:** Level of information shared
- **Duration:** Length of agreement

**Impact:** Contract terms can affect payoffs and trust updates

### Decision Timing

**Simultaneous Decisions:**
- Both players decide at same time
- Cannot see partner's decision before deciding
- Creates strategic uncertainty

**Decision Lock:**
- Once decision submitted, cannot change
- Both decisions revealed simultaneously
- Payoffs calculated immediately

---

## 📈 Market Conditions

### Market Types

**Stable Market:**
- Predictable demand
- Moderate price volatility
- Standard payoffs apply
- Easier to coordinate

**Volatile Market:**
- Unpredictable demand
- High price volatility
- Payoffs multiplied by 1.2-1.5
- Harder to coordinate

### Market Events

**Weather Shocks:**
- Crop failure → Supply shortage
- Favorable weather → Supply surplus
- Affects payoffs

**Price Collapse:**
- Market oversupply → Prices drop
- Affects all players negatively
- May force cooperation

**Demand Spike:**
- Unexpected demand increase
- Prices rise
- Creates opportunity for exploitation

### Market Condition Changes

**Random Events:**
- Market condition can change between rounds
- Probability: 20% per round
- Affects payoff multipliers

---

## 🤖 Bot Strategies

### Strategy 1: Tit-for-Tat

**Description:** Start by cooperating, then mirror opponent's last move

**Algorithm:**
```
Round 1: Cooperate
Round N: Do what opponent did in Round N-1
```

**Characteristics:**
- ✅ Forgiving (cooperates after opponent cooperates)
- ✅ Retaliatory (defects after opponent defects)
- ✅ Simple and effective
- ✅ Promotes cooperation

**Example:**
```
Round 1: (C, C) → Both cooperate
Round 2: (C, C) → Both cooperate
Round 3: (D, C) → FC defects, RC cooperates
Round 4: (C, D) → FC cooperates, RC defects (tit-for-tat)
Round 5: (D, C) → FC defects, RC cooperates (tit-for-tat)
```

### Strategy 2: Grim Trigger

**Description:** Cooperate until opponent defects, then always defect

**Algorithm:**
```
IF opponent has ever defected:
  Always defect
ELSE:
  Cooperate
```

**Characteristics:**
- ❌ Unforgiving (never forgives defection)
- ✅ Deterrent (threatens permanent retaliation)
- ⚠️ Can lead to mutual defection spiral

**Example:**
```
Round 1: (C, C) → Both cooperate
Round 2: (C, C) → Both cooperate
Round 3: (D, C) → FC defects
Round 4: (D, D) → RC triggers, both defect forever
```

### Strategy 3: Adaptive

**Description:** Adjust strategy based on opponent's behavior pattern

**Algorithm:**
```
IF opponent cooperates >70% of time:
  Cooperate
ELSE IF opponent defects >70% of time:
  Defect
ELSE:
  Tit-for-tat
```

**Characteristics:**
- ✅ Adapts to opponent
- ✅ Balances cooperation and retaliation
- ✅ More complex

### Strategy 4: Always Cooperate

**Description:** Always cooperate regardless of opponent

**Characteristics:**
- ✅ Promotes cooperation
- ❌ Vulnerable to exploitation
- ⚠️ Not optimal in one-shot games

### Strategy 5: Always Defect

**Description:** Always defect regardless of opponent

**Characteristics:**
- ✅ Maximizes immediate payoff
- ❌ Prevents cooperation
- ⚠️ Leads to mutual defection

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Cumulative Payoff**
- **Definition:** Total payoff accumulated across all rounds
- **Target:** Maximize
- **Calculation:** Sum of all round payoffs
- **Display:** FC: XXX, RC: XXX

#### 2. **Average Payoff per Round**
- **Definition:** Average payoff per round
- **Formula:** `Cumulative Payoff / Number of Rounds`
- **Target:** Maximize
- **Display:** FC: X.XX, RC: X.XX

#### 3. **Cooperation Rate**
- **Definition:** Percentage of rounds where player cooperated
- **Formula:** `(Cooperation Rounds / Total Rounds) × 100%`
- **Target:** Analyze (not necessarily maximize)
- **Display:** FC: XX%, RC: XX%

#### 4. **Trust Index**
- **Definition:** Overall trust level (0-100)
- **Target:** Maintain high trust (60-100)
- **Display:** XX

#### 5. **Mutual Cooperation Rate**
- **Definition:** Percentage of rounds with mutual cooperation
- **Formula:** `(Mutual Cooperation Rounds / Total Rounds) × 100%`
- **Target:** Maximize
- **Display:** XX%

#### 6. **Equilibrium Type**
- **Definition:** Type of equilibrium achieved
- **Types:** Nash (mutual defection), Pareto (mutual cooperation), Mixed
- **Target:** Achieve Pareto optimal
- **Display:** "Nash Equilibrium" or "Pareto Optimal"

#### 7. **Trust Evolution**
- **Definition:** Change in trust index over time
- **Calculation:** Final trust - Initial trust
- **Target:** Positive (trust building)
- **Display:** +XX or -XX

### Performance Metrics Calculation

```typescript
computeMetrics() {
  // Cumulative payoffs
  const fcTotalPayoff = players.FC.cumulativePayoff
  const rcTotalPayoff = players.RC.cumulativePayoff
  
  // Average payoffs
  const fcAvgPayoff = fcTotalPayoff / round
  const rcAvgPayoff = rcTotalPayoff / round
  
  // Cooperation rates
  const fcCooperationRate = (players.FC.decisions.filter(d => d === 'COOPERATE').length / round) * 100
  const rcCooperationRate = (players.RC.decisions.filter(d => d === 'COOPERATE').length / round) * 100
  
  // Mutual cooperation rate
  const mutualCooperationRounds = history.filter(h => 
    h.fcDecision === 'COOPERATE' && h.rcDecision === 'COOPERATE'
  ).length
  const mutualCooperationRate = (mutualCooperationRounds / round) * 100
  
  // Trust evolution
  const trustEvolution = trustIndex - initialTrustIndex
  
  // Equilibrium type
  const equilibriumType = determineEquilibriumType()
  
  return {
    cumulativePayoffs: {
      FC: fcTotalPayoff,
      RC: rcTotalPayoff
    },
    averagePayoffs: {
      FC: fcAvgPayoff.toFixed(2),
      RC: rcAvgPayoff.toFixed(2)
    },
    cooperationRates: {
      FC: fcCooperationRate.toFixed(1) + '%',
      RC: rcCooperationRate.toFixed(1) + '%'
    },
    mutualCooperationRate: mutualCooperationRate.toFixed(1) + '%',
    trustIndex: trustIndex,
    trustEvolution: trustEvolution > 0 ? '+' + trustEvolution : trustEvolution.toString(),
    equilibriumType: equilibriumType
  }
}
```

### Equilibrium Identification

```typescript
determineEquilibriumType() {
  // Count decision patterns
  const mutualCooperation = history.filter(h => 
    h.fcDecision === 'COOPERATE' && h.rcDecision === 'COOPERATE'
  ).length
  
  const mutualDefection = history.filter(h => 
    h.fcDecision === 'DEFECT' && h.rcDecision === 'DEFECT'
  ).length
  
  const totalRounds = history.length
  
  // If >70% mutual cooperation → Pareto Optimal
  if (mutualCooperation / totalRounds > 0.7) {
    return 'Pareto Optimal'
  }
  
  // If >70% mutual defection → Nash Equilibrium
  if (mutualDefection / totalRounds > 0.7) {
    return 'Nash Equilibrium'
  }
  
  // Otherwise → Mixed Strategy
  return 'Mixed Strategy'
}
```

---

## 📈 Report Analysis

### Comprehensive Performance Report

**Report Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  ONION DILEMMA - Performance Report                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINANCIAL SUMMARY                                       │
│  ┌──────────────────────────────────────┐               │
│  │ Farmer-Coordinator (FC):              │               │
│  │   Total Payoff:        75 points      │               │
│  │   Average per Round:   5.00 points    │               │
│  │                                        │               │
│  │ Retailer-Coordinator (RC):             │               │
│  │   Total Payoff:        78 points      │               │
│  │   Average per Round:   5.20 points    │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  COOPERATION ANALYSIS                                    │
│  ┌──────────────────────────────────────┐               │
│  │ FC Cooperation Rate:    80%           │               │
│  │ RC Cooperation Rate:    87%           │               │
│  │ Mutual Cooperation:     73%           │               │
│  │ Mutual Defection:       13%           │               │
│  │ One-Sided Defection:    14%           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  TRUST DYNAMICS                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Initial Trust Index:   50             │               │
│  │ Final Trust Index:     82             │               │
│  │ Trust Evolution:       +32            │               │
│  │ Trust Status:          High           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  EQUILIBRIUM ANALYSIS                                    │
│  ┌──────────────────────────────────────┐               │
│  │ Equilibrium Type:     Pareto Optimal │               │
│  │ Nash Equilibrium:      Not achieved   │               │
│  │ Cooperation Success:   High           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  ROUND-BY-ROUND BREAKDOWN                                │
│  ┌──────────────────────────────────────┐               │
│  │ Round │ FC │ RC │ FC$ │ RC$ │ Trust ││
│  ├───────┼────┼────┼─────┼─────┼───────┤│
│  │   1   │ C  │ C  │  5  │  5  │  55   ││
│  │   2   │ C  │ C  │  6  │  6  │  60   ││
│  │   3   │ C  │ C  │  7  │  7  │  65   ││
│  │   4   │ D  │ C  │ 12  │  0  │  58   ││
│  │   5   │ C  │ D  │  0  │ 12  │  51   ││
│  │ ...   │... │... │ ... │ ... │ ...   ││
│  └──────────────────────────────────────┘               │
│                                                          │
│  STRATEGIC INSIGHTS                                      │
│  ┌──────────────────────────────────────┐               │
│  │ • Players achieved Pareto optimal     │               │
│  │   outcome through cooperation          │               │
│  │ • Trust index increased significantly │               │
│  │ • FC defected in round 4, but RC      │               │
│  │   forgave and continued cooperating   │               │
│  │ • Mutual cooperation rate of 73% is   │               │
│  │   excellent                              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Round-by-Round Analysis

**Detailed Breakdown:**
```
┌───────┬──────────┬──────────┬───────┬───────┬───────┬──────────────┐
│ Round │ FC       │ RC       │ FC$   │ RC$   │ Trust │ Outcome      │
├───────┼──────────┼──────────┼───────┼───────┼───────┼──────────────┤
│   1   │ Cooperate│ Cooperate│   5   │   5   │  55   │ Mutual Coop  │
│   2   │ Cooperate│ Cooperate│   6   │   6   │  60   │ Mutual Coop  │
│   3   │ Cooperate│ Cooperate│   7   │   7   │  65   │ Mutual Coop  │
│   4   │ Defect   │ Cooperate│  12   │   0   │  58   │ FC Exploits  │
│   5   │ Cooperate│ Defect   │   0   │  12   │  51   │ RC Exploits  │
│   6   │ Cooperate│ Cooperate│   5   │   5   │  56   │ Mutual Coop  │
│   7   │ Cooperate│ Cooperate│   6   │   6   │  61   │ Mutual Coop  │
│   8   │ Cooperate│ Cooperate│   7   │   7   │  66   │ Mutual Coop  │
│   9   │ Cooperate│ Cooperate│   8   │   8   │  71   │ Mutual Coop  │
│  10   │ Cooperate│ Cooperate│   8   │   8   │  76   │ Mutual Coop  │
│  11   │ Cooperate│ Cooperate│   9   │   9   │  81   │ Mutual Coop  │
│  12   │ Defect   │ Defect   │   3   │   3   │  76   │ Mutual Defect│
│  13   │ Cooperate│ Cooperate│   9   │   9   │  81   │ Mutual Coop  │
│  14   │ Cooperate│ Cooperate│   9   │   9   │  86   │ Mutual Coop  │
│  15   │ Cooperate│ Cooperate│  10   │  10   │  91   │ Mutual Coop  │
└───────┴──────────┴──────────┴───────┴───────┴───────┴──────────────┘
```

### Trust Evolution Chart

```
Trust Index Over Time:

100 │                                    ●
 90 │                              ●   ●   ●
 80 │                        ●   ●
 70 │                  ●   ●
 60 │            ●   ●
 50 │      ●   ●
 40 │
 30 │
 20 │
 10 │
  0 └──────────────────────────────────────────
     1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
                    Rounds

Interpretation:
- Trust increased from 50 to 91
- Dips in rounds 4-5 (one-sided defection)
- Recovery in rounds 6-11 (mutual cooperation)
- Brief dip in round 12 (mutual defection)
- Strong finish (rounds 13-15)
```

### Payoff Evolution Chart

```
Cumulative Payoffs Over Time:

100 │
 90 │
 80 │                                    ● RC
 70 │                              ●
 60 │                        ●
 50 │                  ●
 40 │            ●
 30 │      ●
 20 │  ●
 10 │
  0 └──────────────────────────────────────────
     1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
                    Rounds

Legend:
- FC: Farmer-Coordinator
- RC: Retailer-Coordinator
```

### Strategic Recommendations

**Based on Performance:**
```
1. COOPERATION SUCCESS
   Achievement: 73% mutual cooperation rate
   Recommendation: Excellent cooperation achieved
   Rationale: Players overcame Prisoner's Dilemma

2. TRUST BUILDING
   Achievement: Trust increased from 50 to 91
   Recommendation: Maintain high trust
   Rationale: High trust enables better payoffs

3. DEFECTION PATTERNS
   Observation: Brief defections in rounds 4, 5, 12
   Recommendation: Minimize defections
   Rationale: Defections reduce trust and payoffs

4. LONG-TERM STRATEGY
   Observation: Cooperation increased over time
   Recommendation: Continue cooperative strategy
   Rationale: Long-term cooperation maximizes payoffs
```

---

## 🎨 UI/UX Requirements

### Main Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  ONION DILEMMA - Round 5 of 15                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CURRENT STATUS                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Trust Index:        65                │               │
│  │ Market Condition:   Stable            │               │
│  │ Round:              5 / 15            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  YOUR ROLE: Farmer-Coordinator (FC)                      │
│                                                          │
│  CUMULATIVE PAYOFFS                                       │
│  ┌──────────────────────────────────────┐               │
│  │ FC: 25 points                         │               │
│  │ RC: 23 points                         │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  YOUR DECISION                                           │
│  ┌──────────────────────────────────────┐               │
│  │ ⚪ Cooperate                           │               │
│  │    Share information, build trust      │               │
│  │    Expected payoff: 5-7 points         │               │
│  │                                        │               │
│  │ ⚫ Defect                               │               │
│  │    Withhold information, exploit       │               │
│  │    Expected payoff: 8-12 points        │               │
│  │                                        │               │
│  │ [Submit Decision]                       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  PAYOFF MATRIX                                            │
│  ┌──────────────────────────────────────┐               │
│  │         RC: Coop    RC: Defect        │               │
│  │ FC: Coop  (5, 5)    (0, 8)            │               │
│  │ FC: Defect (8, 0)    (2, 2)            │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  HISTORY                                                  │
│  ┌──────────────────────────────────────┐               │
│  │ Round │ FC │ RC │ FC$ │ RC$ │ Trust ││
│  ├───────┼────┼────┼─────┼─────┼───────┤│
│  │   1   │ C  │ C  │  5  │  5  │  55   ││
│  │   2   │ C  │ C  │  6  │  6  │  60   ││
│  │   3   │ C  │ C  │  7  │  7  │  65   ││
│  │   4   │ D  │ C  │ 12  │  0  │  58   ││
│  └──────────────────────────────────────┘               │
│                                                          │
│  [View Full Report]                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Decision Result View

```
┌─────────────────────────────────────────────────────────┐
│  ROUND 5 RESULTS                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Decisions:                                              │
│  • FC: Cooperate                                         │
│  • RC: Cooperate                                         │
│                                                          │
│  Payoffs:                                                │
│  • FC: 7 points (base: 5, trust multiplier: 1.4)        │
│  • RC: 7 points (base: 5, trust multiplier: 1.4)        │
│                                                          │
│  Trust Update:                                           │
│  • Trust Index: 65 → 70 (+5)                             │
│  • Mutual cooperation increases trust                    │
│                                                          │
│  Cumulative Payoffs:                                     │
│  • FC: 32 points                                         │
│  • RC: 30 points                                         │
│                                                          │
│  [Continue to Next Round]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialize Simulation

```typescript
POST /api/sessions/:sessionId/games/onion-dilemma/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    numRounds?: number,              // Default: 15
    initialTrustIndex?: number,       // Default: 50
    trustUpdateRate?: number,         // Default: 5
    marketVolatility?: number         // Default: 0
  }
}

Response: {
  success: true,
  state: {
    round: 0,
    numRounds: 15,
    trustIndex: 50,
    marketCondition: 'stable',
    players: {
      FC: { cumulativePayoff: 0, trust: 50 },
      RC: { cumulativePayoff: 0, trust: 50 }
    },
    isComplete: false
  }
}
```

### Submit Decision

```typescript
POST /api/sessions/:sessionId/games/onion-dilemma/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  decision: 'COOPERATE' | 'DEFECT',
  contractTerms?: {
    price?: number,
    quantity?: number,
    informationSharing?: boolean
  }
}

Response: {
  success: true,
  message: "Decision submitted",
  data: {
    decision: 'COOPERATE',
    waitingForOpponent: true,  // If opponent hasn't decided yet
    roundResult: null  // Will be populated when both decide
  }
}
```

### Get Round Results

```typescript
GET /api/sessions/:sessionId/games/onion-dilemma/round-results
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  round: 5,
  fcDecision: 'COOPERATE',
  rcDecision: 'COOPERATE',
  fcPayoff: 7,
  rcPayoff: 7,
  trustIndex: 70,
  cumulativePayoffs: {
    FC: 32,
    RC: 30
  },
  isComplete: false
}
```

### Get Metrics

```typescript
GET /api/sessions/:sessionId/games/onion-dilemma/metrics
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  cumulativePayoffs: {
    FC: 75,
    RC: 78
  },
  averagePayoffs: {
    FC: "5.00",
    RC: "5.20"
  },
  cooperationRates: {
    FC: "80%",
    RC: "87%"
  },
  mutualCooperationRate: "73%",
  trustIndex: 82,
  trustEvolution: "+32",
  equilibriumType: "Pareto Optimal"
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class OnionDilemmaEngine extends BaseGameEngine {
  private state: OnionDilemmaGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'onion-dilemma');
  }
  
  // Core methods
  async initialize(config: OnionDilemmaConfig): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Decision processing
  private processDecisions(fcDecision: Decision, rcDecision: Decision): PayoffResult
  private updateTrustIndex(fcDecision: Decision, rcDecision: Decision): void
  
  // Equilibrium analysis
  private determineEquilibriumType(): string
  
  // Helper methods
  private generateMarketCondition(): 'stable' | 'volatile'
  private async saveGameState(): Promise<void>
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `OnionDilemmaEngine` class
- [ ] Create state management structures
- [ ] Implement payoff matrix system
- [ ] Build decision processing logic
- [ ] Create trust index system

### Phase 2: Game Logic (Week 2-3)

- [ ] Implement simultaneous decision system
- [ ] Build payoff calculation
- [ ] Create trust update logic
- [ ] Implement market condition system
- [ ] Build round processing loop

### Phase 3: Bot Strategies (Week 3)

- [ ] Implement Tit-for-Tat strategy
- [ ] Build Grim Trigger strategy
- [ ] Create Adaptive strategy
- [ ] Implement Always Cooperate/Defect
- [ ] Build bot decision logic

### Phase 4: Analytics & Metrics (Week 3-4)

- [ ] Build cooperation rate calculation
- [ ] Implement equilibrium identification
- [ ] Create trust evolution tracking
- [ ] Build payoff analysis
- [ ] Implement metrics computation

### Phase 5: UI Development (Week 4-5)

- [ ] Design main dashboard
- [ ] Build decision interface
- [ ] Create payoff matrix visualization
- [ ] Design history table
- [ ] Build trust evolution chart
- [ ] Create metrics dashboard

### Phase 6: Reporting (Week 5)

- [ ] Build comprehensive report generation
- [ ] Create round-by-round analysis
- [ ] Implement strategic recommendations
- [ ] Build visualization charts

### Phase 7: Testing & Refinement (Week 6)

- [ ] Unit tests for calculations
- [ ] Integration tests for decision processing
- [ ] Balance testing (cooperation vs. defection)
- [ ] Performance testing
- [ ] UI/UX testing

---

## 📝 Strategy Examples

### Strategy 1: Always Cooperate

**Approach:** Cooperate every round
- Builds trust quickly
- Promotes mutual cooperation
- Vulnerable to exploitation

**Result:** High trust, moderate payoffs (if partner cooperates)

### Strategy 2: Tit-for-Tat

**Approach:** Start cooperating, mirror opponent
- Forgiving and retaliatory
- Promotes cooperation
- Effective in repeated games

**Result:** High cooperation rate, good payoffs

### Strategy 3: Grim Trigger

**Approach:** Cooperate until defection, then always defect
- Strong deterrent
- Can prevent defection
- Risky if triggered

**Result:** High cooperation (if not triggered), mutual defection (if triggered)

### Strategy 4: Adaptive

**Approach:** Adjust based on opponent's behavior
- Adapts to opponent
- Balances cooperation and retaliation
- More complex

**Result:** Variable, depends on opponent

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Game Theory Introduction**
   - Explain Prisoner's Dilemma
   - Show payoff matrix
   - Discuss Nash Equilibrium

2. **Game Mechanics**
   - Two-player simultaneous decisions
   - Trust dynamics
   - Market conditions

3. **Objectives**
   - Maximize cumulative payoff
   - Build trust
   - Achieve Pareto optimal outcome

### During Game (45 minutes)

- Make decisions each round
- Observe opponent's behavior
- Track trust and payoffs
- Adjust strategy based on results

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final payoffs
   - Analyze cooperation rate
   - Discuss trust evolution

2. **Strategic Discussion**
   - What strategy worked best?
   - How did trust affect decisions?
   - Why did cooperation succeed/fail?

3. **Key Learnings**
   - Individual vs. collective rationality
   - Importance of trust
   - Solutions to coordination problems

---

## ✅ Implementation Checklist

### Backend
- [x] OnionDilemmaEngine class structure (skeleton)
- [ ] State management
- [ ] Payoff matrix system
- [ ] Decision processing
- [ ] Trust index system
- [ ] Bot strategies
- [ ] Metrics computation
- [ ] Report generation
- [ ] API endpoints
- [ ] Database schema

### Frontend
- [ ] Main dashboard
- [ ] Decision interface
- [ ] Payoff matrix visualization
- [ ] History table
- [ ] Trust evolution chart
- [ ] Metrics dashboard
- [ ] Performance report view

### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (decision processing)
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
**Based on:** OnionDilemmaEngine.ts (skeleton), Theory Documentation, Game Theory

---

*This document provides a complete blueprint for replicating the Onion Dilemma simulation. All mechanics, flows, scoring, and report analysis are documented based on the skeleton implementation and game theory principles.*
