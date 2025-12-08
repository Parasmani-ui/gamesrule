# The EV Gambit: Complete Simulation Analysis & Replication Guide

**Simulation Name:** The EV Gambit: A Strategy Simulation  
**Author:** Prof. Devasheesh Mathur  
**Category:** Business Strategy, Operations Management, Competitive Analysis  
**Duration:** 55 minutes  
**Difficulty:** ⭐⭐⭐ (Intermediate)  
**Players:** 1-4 players (supports bots)  
**Framework:** Porter's Five Forces Model

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Decision System](#decision-system)
7. [Five Forces Mechanics](#five-forces-mechanics)
8. [Industry Events System](#industry-events-system)
9. [Competitor AI System](#competitor-ai-system)
10. [Scoring & Metrics](#scoring--metrics)
11. [UI/UX Requirements](#uiux-requirements)
12. [API & Data Flow](#api--data-flow)
13. [Implementation Details](#implementation-details)
14. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**The EV Gambit** is a strategic management simulation that teaches students how to apply **Michael Porter's Five Forces Framework** to competitive strategy in the Indian Electric Vehicle (EV) industry. Players manage "Evans Motors" and make strategic decisions across  rounds, responding to industry events and competitive dynamics while trying to maximize market share and industry position.

### Key Features

- ✅ **round strategic simulation** with dynamic industry events
- ✅ **Porter's Five Forces** tracking and visualization
- ✅ **Competitor AI** simulation (3 competitors)
- ✅ **Strategic decision-making** (pricing, R&D, marketing, partnerships, expansion, quality)
- ✅ **Industry attractiveness calculation** based on five forces
- ✅ **Dynamic market share** allocation system
- ✅ **Resource management** (cash constraints)
- ✅ **Real-time competitor responses**

### Learning Outcomes

- Apply Porter's Five Forces framework to industry analysis
- Understand how external forces shape business strategy
- Make strategic decisions balancing short-term and long-term goals
- Analyze competitive dynamics in evolving markets
- Develop strategies to mitigate competitive threats

---

## 📚 Theoretical Foundation

### Core Concept: Porter's Five Forces Model (1979)

**Michael Porter's Five Forces Framework** analyzes the competitive intensity and attractiveness of an industry. The framework identifies five forces that determine industry profitability:

1. **Competitive Rivalry** - Intensity of competition among existing firms
2. **Threat of New Entrants** - Ease with which new competitors can enter
3. **Bargaining Power of Suppliers** - Supplier influence on pricing and terms
4. **Bargaining Power of Buyers** - Customer influence on pricing and terms
5. **Threat of Substitutes** - Availability of alternative products/services

**Key Principle:** Industry profitability is determined by the collective strength of these five forces. Strong forces = Low profitability, Weak forces = High profitability.

### Context: Indian Electric Vehicle Industry

The simulation is set in the **Indian EV market**, which presents unique challenges:

- **Rapid Growth:** Market expanding rapidly with government support
- **Price Sensitivity:** Indian consumers are highly price-conscious
- **Infrastructure:** Charging infrastructure still developing
- **Competition:** Mix of global players (Tesla) and local manufacturers
- **Government Policy:** Subsidies and regulations significantly impact forces
- **Supply Chain:** Dependence on global suppliers (lithium, batteries, chips)

---

## 🎮 Simulation Overview

### Game Setup

**Player Company:** Evans Motors  
**Starting Position:**
- Market Share: **15%**
- Starting Cash: **₹10,000,000** (₹10M)
- Brand Value: **50** (out of 100)
- Technology Level: **50** (out of 100)
- Production Capacity: **50** (out of 100)

**Competitors:**
1. **Electrify Inc.** - Market Leader (35% share)
   - Brand Value: 75, Technology: 70, Production: 80
   - Cash: ₹20M
   
2. **Tesla Motors** - Premium Player (25% share)
   - Brand Value: 90, Technology: 95, Production: 70
   - Cash: ₹50M
   
3. **Traditional Motors** - Established Player (25% share)
   - Brand Value: 80, Technology: 60, Production: 90
   - Cash: ₹30M

**Total Market Share:** 100% (15% + 35% + 25% + 25%)

### Initial Five Forces State

```javascript
fiveForces: {
  rivalry: 80,        // High - intense competition
  newEntrants: 60,    // Medium-High - barriers exist but not insurmountable
  suppliers: 75,      // High - limited battery suppliers, lithium concentration
  buyers: 55,         // Medium - price sensitive but growing market
  substitutes: 65     // Medium-High - ICE vehicles still dominant
}
```

**Initial Industry Attractiveness:** ~50% (calculated as 100 - average of forces)

---

## 🔄 Complete Game Logic & Flow

### Round Structure

Each round follows this sequence:

```
ROUND N EXECUTION:
1. DISPLAY CURRENT STATE
   ├─ Player company metrics
   ├─ Competitor positions
   ├─ Five Forces status
   └─ Industry attractiveness

2. CHECK FOR INDUSTRY EVENTS
   ├─ If event scheduled for this round
   ├─ Display event details
   ├─ Apply event impact to forces
   └─ Update industry attractiveness

3. PLAYER DECISION
   ├─ Player selects strategic action
   ├─ System validates (cash availability)
   ├─ Deduct cost from cash
   ├─ Apply decision impact to company metrics
   └─ Record decision in history

4. COMPETITOR ACTIONS
   ├─ AI simulates competitor moves
   ├─ Competitors adjust market share
   └─ Market share normalization

5. MARKET SHARE REALLOCATION
   ├─ Calculate total market share
   ├─ Normalize to 100% if needed
   ├─ Update all company shares
   └─ Record round results

6. CALCULATE METRICS
   ├─ Update industry attractiveness
   ├─ Calculate competitive position
   └─ Check game completion

7. SAVE STATE & BROADCAST
   ├─ Save game state to database
   ├─ Broadcast updates to all players
   └─ Wait for next round or end game
```

### Game Completion

The game ends after ** rounds** (configurable). Final state includes:
- Final market share
- Market share growth from starting 15%
- Remaining cash
- Final brand value, technology, production
- Competitive position ranking
- All decisions made throughout the game

---

## 💾 State Management

### Game State Structure

```typescript
interface EVGambitGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    numRounds: number;           // 
    startingCash: number;        // Default: ₹10,000,000
    competitors: Company[];      // Array of 3 competitors
    events: IndustryEvent[];     // Pre-scheduled events
  };
  
  playerCompany: {
    name: string;                // "Evans Motors"
    marketShare: number;         // 15% initially
    cash: number;                // ₹10M initially
    brandValue: number;          // 50-100 scale
    technology: number;          // 50-100 scale
    production: number;          // 50-100 scale
  };
  
  currentRound: number;          //
  
  events: IndustryEvent[];       // Events that have occurred
  
  decisions: {
    round: number;
    decision: Decision;
    outcome: string;
  }[];
  
  fiveForces: {
    rivalry: number;             // 0-100
    newEntrants: number;         // 0-100
    suppliers: number;           // 0-100
    buyers: number;              // 0-100
    substitutes: number;         // 0-100
  };
  
  industryAttractiveness: number; // 0-100 (calculated)
  isComplete: boolean;
}
```

### State Persistence

- **Database Storage:** Full state saved to `gameState` table after each round
- **Round Number:** Used as version identifier
- **State Data:** Stored as JSON in `state_data` column
- **Real-time Sync:** WebSocket broadcasts state updates to all participants

---

## 🎯 Decision System

### Decision Types

Players can make **ONE decision per round** from the following categories:

#### 1. **Pricing Strategy**

**Options:**
- **Aggressive Pricing** (Cost: ₹500,000)
  - Impact: Market Share +2-4%, Brand Value -1-2
  - Use: Quick market share gain, but hurts brand positioning
  
- **Competitive Pricing** (Cost: ₹200,000)
  - Impact: Market Share +0.5-1.5%, Brand Value +0-1
  - Use: Maintain position without brand erosion
  
- **Premium Pricing** (Cost: ₹300,000)
  - Impact: Market Share -0.5-1%, Brand Value +2-4, Cash +500K (higher margins)
  - Use: Build brand value, increase profitability

#### 2. **R&D Investment**

**Options:**
- **Battery Technology R&D** (Cost: ₹2,000,000)
  - Impact: Technology +5-10, Market Share +1-2% (long-term)
  - Use: Build technological advantage
  
- **Charging Infrastructure R&D** (Cost: ₹1,500,000)
  - Impact: Technology +3-6, Reduces Substitute Threat by 5-10 points
  - Use: Address infrastructure gap, reduce substitute threat
  
- **Autonomous Features R&D** (Cost: ₹3,000,000)
  - Impact: Technology +8-12, Brand Value +3-5
  - Use: Differentiate from competitors, premium positioning

#### 3. **Marketing & Brand Building**

**Options:**
- **Mass Marketing Campaign** (Cost: ₹1,000,000)
  - Impact: Brand Value +3-6, Market Share +1-3%
  - Use: Build brand awareness, gain market share
  
- **Digital Marketing Focus** (Cost: ₹600,000)
  - Impact: Brand Value +2-4, Market Share +0.5-1.5%
  - Use: Cost-effective brand building
  
- **Sustainability Marketing** (Cost: ₹800,000)
  - Impact: Brand Value +4-7, Reduces Buyer Price Sensitivity by 3-5 points
  - Use: Build premium brand, reduce buyer bargaining power

#### 4. **Strategic Partnerships**

**Options:**
- **Battery Supplier Partnership** (Cost: ₹1,200,000)
  - Impact: Production +5-8, Reduces Supplier Power by 8-12 points
  - Use: Secure supply chain, reduce supplier bargaining power
  
- **Charging Network Partnership** (Cost: ₹900,000)
  - Impact: Brand Value +2-4, Reduces Substitute Threat by 6-10 points
  - Use: Improve infrastructure, reduce substitute threat
  
- **Technology Licensing** (Cost: ₹2,500,000)
  - Impact: Technology +6-10, Brand Value +2-4
  - Use: Accelerate technology development

#### 5. **Capacity Expansion**

**Options:**
- **Production Capacity Increase** (Cost: ₹3,500,000)
  - Impact: Production +8-12, Market Share +2-4% (if demand exists)
  - Use: Scale operations, capture market share
  
- **Regional Distribution Network** (Cost: ₹2,000,000)
  - Impact: Production +4-6, Market Share +1-2%
  - Use: Expand market reach

#### 6. **Quality Improvement**

**Options:**
- **Quality Assurance Program** (Cost: ₹1,100,000)
  - Impact: Brand Value +3-6, Production +2-4
  - Use: Build reputation, reduce defects
  
- **Premium Material Upgrade** (Cost: ₹1,800,000)
  - Impact: Brand Value +5-8, Technology +2-4
  - Use: Enhance product quality, brand positioning

### Decision Impact System

**Impact Calculation:**
```javascript
// Base impact with 80-120% randomization
actualImpact = expectedImpact × (0.8 + random() × 0.4)

// Market share capped at 100%
marketShare = Math.min(100, currentMarketShare + actualImpact)

// Attributes capped at 100
brandValue = Math.min(100, currentBrandValue + actualImpact)
technology = Math.min(100, currentTechnology + actualImpact)
production = Math.min(100, currentProduction + actualImpact)
```

**Cash Validation:**
- Decision is rejected if `playerCompany.cash < decision.cost`
- Error message: "Insufficient funds for this decision"

**Outcome Feedback:**
After each decision, player receives immediate feedback:
```
"Decision 'Battery Technology R&D' executed successfully
Market share increased by 1.85%.
Technology level improved by 7.32 points.
Cash: ₹7,500,000"
```

---

## ⚡ Five Forces Mechanics

### Force Calculation & Updates

Each force is represented as a **0-100 scale**:
- **0-30:** Weak force (favorable for industry)
- **31-60:** Medium force
- **61-100:** Strong force (unfavorable for industry)

### Force Impact Sources

1. **Industry Events** (Primary driver)
   - Events directly modify specific forces
   - Impact magnitude: -1.5 to +2.0 (multiplied by 10 for force points)
   - Examples: Government subsidy → Reduces buyer power

2. **Player Decisions** (Indirect)
   - Some decisions can influence forces
   - Partnership decisions reduce supplier/buyer power
   - Marketing can affect buyer price sensitivity

3. **Dynamic Adjustments** (System)
   - Forces naturally evolve based on industry state
   - Competitor actions may influence rivalry

### Force Updates

```javascript
// Event impact application
forceValue = Math.max(0, Math.min(100, 
  currentForceValue + (event.impact × 10)
))

// Example: Government subsidy event
// impact: -1.5 means buyer power decreases by 15 points
buyersPower = Math.max(0, Math.min(100, buyersPower - 15))
```

### Industry Attractiveness Calculation

```javascript
// Average of all five forces
averageForce = (rivalry + newEntrants + suppliers + buyers + substitutes) / 5

// Industry attractiveness = inverse of average force
// Higher forces = Lower attractiveness
industryAttractiveness = 100 - averageForce

// Example:
// Forces: [80, 60, 75, 55, 65] → Average = 67
// Attractiveness = 100 - 67 = 33% (Low attractiveness)
```

**Interpretation:**
- **80-100:** Highly attractive industry
- **60-79:** Moderately attractive
- **40-59:** Neutral
- **20-39:** Low attractiveness
- **0-19:** Very unattractive

---

## 📰 Industry Events System

### Event Structure

```typescript
interface IndustryEvent {
  round: number;           // Round when event occurs (2, 3, 5, 7, 9, 11)
  title: string;
  description: string;
  forceAffected: 'rivalry' | 'new-entrants' | 'suppliers' | 'buyers' | 'substitutes';
  impact: number;          // -2.0 to +2.0 (negative = weakens force)
}
```

### Pre-defined Events

The simulation includes **6 industry events** scheduled across rounds:

#### Event 1: Government Subsidy Announced (Round 2)
- **Description:** "Government announces ₹1.5L subsidy per EV, boosting buyer power"
- **Force Affected:** `buyers`
- **Impact:** +1.5 (increases buyer power by 15 points)
- **Effect:** Buyers become more powerful, price sensitivity increases
- **Strategic Response:** May need to adjust pricing strategy

#### Event 2: Lithium Shortage (Round 3)
- **Description:** "Global lithium shortage increases supplier bargaining power"
- **Force Affected:** `suppliers`
- **Impact:** +2.0 (increases supplier power by 20 points)
- **Effect:** Battery suppliers gain leverage, costs may rise
- **Strategic Response:** Consider supplier partnership or vertical integration

#### Event 3: New Competitor Enters (Round 5)
- **Description:** "Chinese EV maker announces India entry, intensifying rivalry"
- **Force Affected:** `rivalry`
- **Impact:** +1.8 (increases rivalry by 18 points)
- **Effect:** More intense competition, potential price wars
- **Strategic Response:** Focus on differentiation or cost leadership

#### Event 4: Charging Infrastructure Expansion (Round 7)
- **Description:** "Major charging network rollout reduces substitute threat"
- **Force Affected:** `substitutes`
- **Impact:** -1.5 (decreases substitute threat by 15 points)
- **Effect:** EVs become more viable, reduces threat from ICE vehicles
- **Strategic Response:** Positive for industry, can focus on growth

#### Event 5: New Battery Technology (Round 9)
- **Description:** "Breakthrough in solid-state batteries lowers entry barriers"
- **Force Affected:** `new-entrants`
- **Impact:** +1.2 (increases new entrant threat by 12 points)
- **Effect:** Easier for new players to enter, more competition expected
- **Strategic Response:** Build barriers or accelerate innovation

#### Event 6: Trade Agreement Signed (Round 11)
- **Description:** "India-EU trade deal reduces component costs"
- **Force Affected:** `suppliers`
- **Impact:** -1.0 (decreases supplier power by 10 points)
- **Effect:** More supplier options, reduced costs
- **Strategic Response:** Opportunity to improve margins

### Event Processing

```javascript
// Check for events each round
roundEvents = events.filter(e => e.round === currentRound)

for (event of roundEvents) {
  // Display event to player
  showEventModal(event)
  
  // Apply impact to force
  fiveForces[event.forceAffected] += (event.impact × 10)
  
  // Clamp to 0-100
  fiveForces[event.forceAffected] = Math.max(0, Math.min(100, ...))
  
  // Recalculate industry attractiveness
  industryAttractiveness = calculateIndustryAttractiveness()
  
  // Record event in history
  state.events.push(event)
}
```

---

## 🤖 Competitor AI System

### Competitor Behavior

Competitors are **AI-simulated** and make automatic moves each round:

```javascript
simulateCompetitorActions() {
  // Each competitor adjusts market share
  for (competitor of competitors) {
    // Random market share change: -1% to +1%
    change = (Math.random() - 0.5) × 2
    competitor.marketShare += change
  }
  
  // Normalize market shares to sum to 100%
  totalShare = playerShare + sum(competitorShares)
  if (totalShare !== 100) {
    factor = 100 / totalShare
    playerShare *= factor
    competitorShares.forEach(share => share *= factor)
  }
}
```

### Competitor Profiles

**Electrify Inc. (Market Leader)**
- **Strategy:** Maintain market leadership
- **Strengths:** High production capacity, established brand
- **Behavior:** Aggressive in protecting market share

**Tesla Motors (Premium Player)**
- **Strategy:** Technology differentiation
- **Strengths:** Highest technology and brand value
- **Behavior:** Focus on premium segment, innovation

**Traditional Motors (Established Player)**
- **Strategy:** Leverage existing infrastructure
- **Strengths:** High production capacity, brand recognition
- **Behavior:** Transition from ICE to EV, cost efficiency

### Advanced Competitor AI (Future Enhancement)

Potential improvements:
- Competitors react to player decisions
- Competitive moves (price cuts, new products)
- Strategic alliances between competitors
- Market share battles based on company metrics

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Market Share**
- **Starting:** 15%
- **Target:** Maximize (industry leader >30%)
- **Calculation:** Directly tracked, normalized across all players

#### 2. **Market Share Growth**
```
Growth = Final Market Share - Starting Market Share (15%)
```

**Performance Levels:**
- **Excellent:** +15% or more (≥30% final)
- **Good:** +5% to +14% (20-29% final)
- **Average:** 0% to +4% (15-19% final)
- **Poor:** Negative growth (<15% final)

#### 3. **Cash Remaining**
- **Starting:** ₹10,000,000
- **Target:** Balance spending with growth
- **Final Display:** "₹X.XXM"

#### 4. **Brand Value**
- **Scale:** 0-100
- **Starting:** 50
- **Impact:** Affects market share growth, pricing power

#### 5. **Technology Level**
- **Scale:** 0-100
- **Starting:** 50
- **Impact:** Long-term competitive advantage

#### 6. **Production Capacity**
- **Scale:** 0-100
- **Starting:** 50
- **Impact:** Ability to meet demand, scale operations

### Competitive Position Ranking

```javascript
determineCompetitivePosition() {
  marketShare = playerCompany.marketShare
  
  if (marketShare >= 30) return 'Market Leader 👑'
  if (marketShare >= 20) return 'Strong Challenger 🚀'
  if (marketShare >= 15) return 'Holding Ground ⚖️'
  if (marketShare >= 10) return 'Struggling 📉'
  return 'Losing Ground 🔻'
}
```

### Final Metrics Calculation

```javascript
computeMetrics() {
  return {
    finalMarketShare: `${marketShare.toFixed(2)}%`,
    marketShareGrowth: `${(marketShare - 15).toFixed(2)}%`,
    brandValue: brandValue.toFixed(0),
    technology: technology.toFixed(0),
    cashRemaining: `₹${(cash / 1000000).toFixed(2)}M`,
    competitivePosition: determineCompetitivePosition(),
    industryAttractiveness: industryAttractiveness.toFixed(0),
    decisionsCount: decisions.length
  }
}
```

---

## 🎨 UI/UX Requirements

### Main Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  THE EV GAMBIT - X                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FIVE FORCES INDICATOR                                   │
│  ┌──────┬──────┬──────┬──────┬──────┐                  │
│  │Rivalry│New   │Suppliers│Buyers │Substitutes│         │
│  │  80   │ 60   │   75    │  55   │    65     │         │
│  │ ████  │ ███  │  ████   │  ██   │    ███    │         │
│  └──────┴──────┴──────┴──────┴──────┘                  │
│                                                          │
│  Industry Attractiveness: 33%                           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  YOUR COMPANY: Evans Motors                             │
│  ┌──────────────────────────────────────┐               │
│  │ Market Share:  15.0%                 │               │
│  │ Cash:          ₹10,000,000           │               │
│  │ Brand Value:   50/100                │               │
│  │ Technology:    50/100                │               │
│  │ Production:    50/100                │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  COMPETITORS                                            │
│  ┌──────────────────────────────────────┐               │
│  │ 1. Electrify Inc.     35.0%          │               │
│  │ 2. Tesla Motors       25.0%          │               │
│  │ 3. Traditional Motors 25.0%          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  INDUSTRY EVENT (if applicable)                         │
│  ┌──────────────────────────────────────┐               │
│  │ 🎯 Government Subsidy Announced      │               │
│  │                                      │               │
│  │ Government announces ₹1.5L subsidy  │               │
│  │ per EV, boosting buyer power.        │               │
│  │                                      │               │
│  │ Impact: Buyer Power ↑ +15 points     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  MAKE YOUR STRATEGIC DECISION                           │
│                                                          │
│  [Pricing] [R&D] [Marketing] [Partnerships]             │
│  [Expansion] [Quality]                                   │
│                                                          │
│  Selected: Battery Technology R&D                       │
│  Cost: ₹2,000,000  [Cash Available: ₹10,000,000]       │
│                                                          │
│  Expected Impact:                                       │
│  • Technology: +5 to +10                                │
│  • Market Share: +1% to +2% (long-term)                │
│                                                          │
│  [Submit Decision] [Cancel]                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Decision Selection UI

**Tab-based Interface:**
- **Pricing Tab:** 3 pricing strategy options
- **R&D Tab:** 3 research & development options
- **Marketing Tab:** 3 marketing campaign options
- **Partnerships Tab:** 3 partnership opportunities
- **Expansion Tab:** 2 capacity expansion options
- **Quality Tab:** 2 quality improvement options

**Each Option Shows:**
- Decision name and description
- Cost in ₹ (highlighted if insufficient funds)
- Expected impact breakdown
- Visual indicator of affordability

### Five Forces Visualization

**Radar Chart:**
- 5-pointed star/spider chart
- Each axis represents one force
- Current value plotted
- Color coding:
  - Red (60-100): Strong/Unfavorable
  - Yellow (31-59): Medium
  - Green (0-30): Weak/Favorable

**Alternative: Bar Chart**
- Horizontal bars for each force
- Color-coded by intensity
- Tooltip showing exact value

### History Panel

**Decision History:**
```
Round 1: Battery Technology R&D
  → Technology +7.3, Market Share +1.85%

Round 2: Mass Marketing Campaign
  → Brand Value +4.2, Market Share +2.1%

Round 3: Battery Supplier Partnership
  → Production +6.5, Supplier Power -9 points
```

**Event Timeline:**
```
Round 2: 🎯 Government Subsidy Announced
Round 3: ⚠️ Lithium Shortage
Round 5: 🏭 New Competitor Enters
...
```

### Final Results Screen

```
┌─────────────────────────────────────────────────────────┐
│  SIMULATION COMPLETE!                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINAL RESULTS                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Market Share:        22.5%           │               │
│  │ Market Share Growth: +7.5%           │               │
│  │ Competitive Position: Strong         │               │
│  │                    Challenger 🚀     │               │
│  │                                      │               │
│  │ Cash Remaining:      ₹4.2M           │               │
│  │ Brand Value:         67/100          │               │
│  │ Technology:          72/100          │               │
│  │ Production:          58/100          │               │
│  │                                      │               │
│  │ Industry Attractiveness: 38%         │               │
│  │ Decisions Made:      12              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  COMPETITOR FINAL POSITIONS                             │
│  1. Electrify Inc.        32.0%  👑                     │
│  2. Evans Motors (You)    22.5%  🚀                     │
│  3. Tesla Motors          24.0%                          │
│  4. Traditional Motors    21.5%                          │
│                                                          │
│  [View Detailed Report] [Restart] [Exit]                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialization

```typescript
POST /api/sessions/:sessionId/games/ev-gambit/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    numRounds?: number,
    startingCash?: number,
    competitors?: Company[],
    events?: IndustryEvent[]
  }
}

Response: {
  success: true,
  state: EVGambitGameState
}
```

### Submit Decision

```typescript
POST /api/sessions/:sessionId/games/ev-gambit/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  decision: {
    type: 'pricing' | 'r&d' | 'marketing' | 'partnership' | 'expansion' | 'quality',
    name: string,
    cost: number,
    expectedImpact: {
      marketShare?: number,
      brandValue?: number,
      technology?: number,
      production?: number
    }
  }
}

Response: {
  success: true,
  message: string,
  data: {
    outcome: string,
    newMarketShare: string,
    cash: number,
    industryAttractiveness: number,
    isComplete: boolean
  }
}
```

### Get Game State

```typescript
GET /api/sessions/:sessionId/games/ev-gambit/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentRound: number,
  maxRounds: number,
  playerCompany: Company,
  competitors: Company[],
  fiveForces: FiveForces,
  industryAttractiveness: number,
  recentEvents: IndustryEvent[],
  isComplete: boolean
}
```

### WebSocket Events

**State Update:**
```javascript
socket.on('game:state-update', (data) => {
  // Updated game state
  updateUI(data)
})
```

**Event Notification:**
```javascript
socket.on('game:event', (event) => {
  // Industry event occurred
  showEventModal(event)
})
```

**Round Advance:**
```javascript
socket.on('game:round-advance', (roundNumber) => {
  // New round started
  updateRoundDisplay(roundNumber)
})
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class EVGambitEngine extends BaseGameEngine {
  private state: EVGambitGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'ev-gambit');
  }
  
  // Core methods
  async initialize(config: Partial<EVGambitConfig>): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Helper methods
  private applyDecisionImpact(decision: Decision): string
  private processRound(): Promise<void>
  private applyEventToForces(event: IndustryEvent): void
  private simulateCompetitorActions(): void
  private calculateIndustryAttractiveness(): number
  private generateCompetitors(): Company[]
  private generateEvents(rounds: number): IndustryEvent[]
  private determineCompetitivePosition(): string
  private async saveGameState(): Promise<void>
}
```

### Database Schema

**Game State Table:**
```sql
CREATE TABLE game_state (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  round_number INTEGER NOT NULL,
  state_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**State Data Structure:**
```json
{
  "sessionId": "uuid",
  "participantId": "uuid",
  "config": {...},
  "playerCompany": {...},
  "currentRound": 5,
  "events": [...],
  "decisions": [...],
  "fiveForces": {...},
  "industryAttractiveness": 45,
  "isComplete": false
}
```

### Decision Validation Logic

```typescript
async applyAction(participantId: string, action: any): Promise<ActionResult> {
  // 1. Validate game not complete
  if (this.state.isComplete) {
    return { success: false, message: 'Simulation already complete' };
  }
  
  // 2. Validate decision structure
  if (!action.decision || !action.decision.type) {
    return { success: false, message: 'Invalid decision' };
  }
  
  // 3. Check cash availability
  if (this.state.playerCompany.cash < action.decision.cost) {
    return { success: false, message: 'Insufficient funds for this decision' };
  }
  
  // 4. Deduct cost
  this.state.playerCompany.cash -= action.decision.cost;
  
  // 5. Apply impact
  const outcome = this.applyDecisionImpact(action.decision);
  
  // 6. Record decision
  this.state.decisions.push({
    round: this.state.currentRound,
    decision: action.decision,
    outcome
  });
  
  // 7. Process round (events, competitors, etc.)
  await this.processRound();
  
  // 8. Save state
  await this.saveGameState();
  
  // 9. Return result
  return {
    success: true,
    message: `Decision "${action.decision.name}" executed successfully`,
    data: {...}
  };
}
```

### Impact Calculation with Randomization

```typescript
private applyDecisionImpact(decision: Decision): string {
  let outcome = '';
  
  // Market share impact (with 80-120% randomization)
  if (decision.expectedImpact.marketShare) {
    const impact = decision.expectedImpact.marketShare * (0.8 + Math.random() * 0.4);
    this.state.playerCompany.marketShare = Math.min(100, 
      this.state.playerCompany.marketShare + impact
    );
    outcome += `Market share ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)}%. `;
  }
  
  // Brand value impact
  if (decision.expectedImpact.brandValue) {
    const impact = decision.expectedImpact.brandValue * (0.8 + Math.random() * 0.4);
    this.state.playerCompany.brandValue = Math.min(100,
      this.state.playerCompany.brandValue + impact
    );
    outcome += `Brand value ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(2)} points. `;
  }
  
  // Technology impact
  if (decision.expectedImpact.technology) {
    const impact = decision.expectedImpact.technology * (0.8 + Math.random() * 0.4);
    this.state.playerCompany.technology = Math.min(100,
      this.state.playerCompany.technology + impact
    );
    outcome += `Technology level ${impact > 0 ? 'improved' : 'declined'} by ${Math.abs(impact).toFixed(2)} points. `;
  }
  
  return outcome.trim();
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `EVGambitEngine` class extending `BaseGameEngine`
- [ ] Create game state structure and interfaces
- [ ] Implement initialization logic
- [ ] Build decision system with all 6 categories
- [ ] Implement impact calculation with randomization
- [ ] Create competitor AI simulation
- [ ] Build five forces tracking system
- [ ] Implement industry attractiveness calculation

### Phase 2: Events & Dynamics (Week 2-3)

- [ ] Design event system structure
- [ ] Implement 6 pre-defined industry events
- [ ] Create event scheduling logic
- [ ] Build force update mechanism
- [ ] Implement event display and notification
- [ ] Add event history tracking

### Phase 3: State Management (Week 3)

- [ ] Design database schema for game state
- [ ] Implement state persistence (save/load)
- [ ] Build WebSocket integration for real-time updates
- [ ] Create state synchronization logic
- [ ] Implement round advancement system

### Phase 4: UI Development (Week 4-5)

- [ ] Design dashboard layout
- [ ] Build five forces visualization (radar/bar chart)
- [ ] Create decision selection interface (tabs)
- [ ] Implement company metrics display
- [ ] Build competitor comparison view
- [ ] Create event notification modal
- [ ] Design history panel
- [ ] Build final results screen

### Phase 5: API Integration (Week 5)

- [ ] Create REST API endpoints
- [ ] Implement WebSocket event handlers
- [ ] Build authentication middleware
- [ ] Create session management integration
- [ ] Implement error handling

<!-- ### Phase 6: Testing & Refinement (Week 6)

- [ ] Unit tests for engine logic
- [ ] Integration tests for API endpoints
- [ ] UI/UX testing and refinement
- [ ] Balance testing (decision impacts)
- [ ] Performance testing
- [ ] User acceptance testing -->

### Phase 7: Advanced Features (Week 7-8)

- [ ] Enhanced competitor AI (reactive)
- [ ] Additional industry events
- [ ] Custom event creation (facilitator)
- [ ] Advanced analytics dashboard
- [ ] Export functionality (PDF/Excel)
- [ ] Replay mode

---

## 📝 Decision Examples & Strategies

### Strategy 1: Technology Leadership

**Focus:** Maximize technology level through R&D
- Round 1: Battery Technology R&D (₹2M)
- Round 2: Autonomous Features R&D (₹3M)
- Round 3: Technology Licensing (₹2.5M)
- **Result:** High technology (80+), strong long-term position

### Strategy 2: Market Share Aggression

**Focus:** Rapid market share growth
- Round 1: Aggressive Pricing (₹500K)
- Round 2: Mass Marketing (₹1M)
- Round 3: Production Capacity Increase (₹3.5M)
- **Risk:** Cash depletion, brand erosion

### Strategy 3: Brand Building

**Focus:** Build premium brand value
- Round 1: Premium Pricing (₹300K)
- Round 2: Sustainability Marketing (₹800K)
- Round 3: Premium Material Upgrade (₹1.8M)
- **Result:** High brand value, premium positioning

### Strategy 4: Balanced Approach

**Focus:** Steady growth across all metrics
- Round 1: Competitive Pricing (₹200K)
- Round 2: Battery Technology R&D (₹2M)
- Round 3: Mass Marketing (₹1M)
- Round 4: Quality Assurance (₹1.1M)
- **Result:** Balanced metrics, sustainable growth

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **Introduce Porter's Five Forces**
   - Explain each force
   - Show framework diagram
   - Discuss industry profitability relationship

2. **EV Industry Context**
   - Market overview
   - Key players
   - Industry challenges

3. **Game Mechanics**
   - Round structure
   - Decision types
   - Scoring system

### During Game (55 minutes)


- Brief pauses for event discussions
- Optional mid-game check-in (after Round 6)

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final market share
   - Discuss competitive position
   - Analyze decisions made

2. **Five Forces Discussion**
   - How forces changed
   - Impact on industry attractiveness
   - Strategic implications

3. **Key Learnings**
   - What worked/didn't work
   - Alternative strategies
   - Real-world applications

---

## 🔍 Advanced Mechanics (Future Enhancements)

### Dynamic Competitor Reactions

- Competitors react to player decisions
- Price wars if player uses aggressive pricing
- Technology arms race if player focuses on R&D
- Market share battles based on relative metrics

### Multi-Player Mode

- 2-4 players competing simultaneously
- Real-time competitive dynamics
- Alliances and partnerships between players
- Winner determined by final market share

### Custom Scenarios

- Facilitator can create custom events
- Adjustable starting conditions
- Variable difficulty levels
- Industry-specific scenarios (e.g., solar, wind)

### Advanced Analytics

- Decision tree analysis
- What-if scenario modeling
- Competitive positioning matrix
- Industry lifecycle stage tracking

---

## 📊 Example Game Flow

### Round 1
- **State:** Starting position, 15% market share
- **Decision:** Player chooses "Battery Technology R&D" (₹2M)
- **Impact:** Technology +7.3, Market Share +1.85%
- **Result:** Market Share now 16.85%, Cash: ₹8M

### Round 2
- **Event:** Government Subsidy Announced
- **Impact:** Buyer Power increases from 55 to 70
- **Decision:** Player chooses "Mass Marketing Campaign" (₹1M)
- **Impact:** Brand Value +4.2, Market Share +2.1%
- **Result:** Market Share now 18.95%, Cash: ₹7M

### Round 3
- **Event:** Lithium Shortage
- **Impact:** Supplier Power increases from 75 to 95
- **Decision:** Player chooses "Battery Supplier Partnership" (₹1.2M)
- **Impact:** Production +6.5, Supplier Power -9 (now 86)
- **Result:** Production now 56.5, Market Share: 19.2%

... (continues through Round )

### Final Round
- **State:** All events occurred, final decisions made
- **Final Market Share:** 22.5%
- **Growth:** +7.5% from starting 15%
- **Position:** Strong Challenger 🚀
- **Cash Remaining:** ₹4.2M

---

## 🎯 Success Metrics

### Player Performance Levels

**Excellent (A):**
- Market Share Growth: +10% or more
- Final Market Share: ≥25%
- Competitive Position: Market Leader or Strong Challenger
- Balanced metrics (all >60)

**Good (B):**
- Market Share Growth: +5% to +9%
- Final Market Share: 20-24%
- Competitive Position: Strong Challenger or Holding Ground
- Most metrics >50

**Average (C):**
- Market Share Growth: 0% to +4%
- Final Market Share: 15-19%
- Competitive Position: Holding Ground
- Mixed metrics

**Needs Improvement (D):**
- Market Share Growth: Negative
- Final Market Share: <15%
- Competitive Position: Struggling or Losing Ground
- Low metrics across board

---

## 📚 References & Resources

### Academic References

- Porter, M. E. (1979). "How Competitive Forces Shape Strategy." *Harvard Business Review*
- Porter, M. E. (2008). "The Five Competitive Forces That Shape Strategy." *Harvard Business Review*
- Grant, R. M. (2016). *Contemporary Strategy Analysis*. Wiley

### Industry Context

- Indian EV Market Reports
- Government EV Policy Documents
- Competitive Analysis of EV Manufacturers

### Simulation Resources

- Porter's Five Forces Framework Templates
- Industry Analysis Case Studies
- Strategic Decision-Making Models

---

## ✅ Implementation Checklist

### Backend
- [x] EVGambitEngine class structure
- [x] State management interfaces
- [x] Decision system logic
- [x] Five forces calculation
- [x] Industry events system
- [x] Competitor AI simulation
- [x] Metrics computation
- [ ] API endpoints
- [ ] WebSocket integration
- [ ] Database schema

### Frontend
- [ ] Dashboard layout
- [ ] Five forces visualization
- [ ] Decision selection UI
- [ ] Company metrics display
- [ ] Competitor comparison
- [ ] Event notifications
- [ ] History panel
- [ ] Final results screen

<!-- ### Testing
- [ ] Unit tests (engine logic)
- [ ] Integration tests (API)
- [ ] Balance testing (impacts)
- [ ] UI/UX testing
- [ ] Performance testing -->

### Documentation
- [x] Theory documentation
- [x] Implementation guide
- [x] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Complete Analysis - Ready for Implementation  
**Based on:** EVGambitEngine.ts, Theory Documentation, Website Analysis

---

*This document provides a complete blueprint for replicating The EV Gambit simulation. All mechanics, flows, and logic are documented based on the actual implementation code and theoretical foundation.*


  - - -   - - -   -   -   - - -   - - -   - - - - - - -   - - - - - -   - --  - - --


  What's included
1. Simulation overview
Purpose: Porter's Five Forces Framework application
Context: Indian EV industry
Structure: rounds, strategic decision-making
2. Game logic and flow
Round-by-round execution flow
State management structure
Decision validation and processing
Competitor AI simulation
3. Decision system (6 categories)
Pricing Strategy (3 options)
R&D Investment (3 options)
Marketing & Brand Building (3 options)
Strategic Partnerships (3 options)
Capacity Expansion (2 options)
Quality Improvement (2 options)
Each decision includes:
Cost in ₹
Expected impact ranges
Impact calculation with randomization (80-120%)
4. Five Forces mechanics
Force tracking (0-100 scale)
Industry attractiveness calculation
Event impact system
Dynamic force updates
5. Industry events (6 pre-defined)
Government Subsidy (Round 2)
Lithium Shortage (Round 3)
New Competitor Enters (Round 5)
Charging Infrastructure Expansion (Round 7)
New Battery Technology (Round 9)
Trade Agreement (Round 11)
6. Competitor AI system
3 competitors with unique profiles
Market share adjustments
Automatic normalization
7. Scoring and metrics
Market share tracking
Growth calculation
Competitive position ranking
Final performance metrics
8. UI/UX requirements
Dashboard layout mockups
Five Forces visualization (radar/bar chart)
Decision selection interface
Event notification system
Final results screen
9. API and data flow
REST API endpoints
WebSocket events
State management structure
Request/response examples
10. Implementation details
Engine class structure
Database schema
Code examples
Validation logic
11. Replication roadmap
7-phase implementation plan
Week-by-week breakdown
Testing checklist
12. Educational integration
Pre-game briefing guide
Post-game debrief structure
Learning outcomes
Key findings
Starting conditions:
Player company: Evans Motors (15% market share)
Starting cash: ₹10,000,000
3 competitors with different strategies
Game mechanics:
rounds of strategic decisions
Dynamic industry events affecting forces
Market share reallocation system
Resource management (cash constraints)
Scoring system:
Primary: Market share growth
Secondary: Brand value, technology, production
Final ranking: Competitive position
Document structure
14 major sections
Code examples and interfaces
UI mockups and layouts
API documentation
Implementation roadmap
Educational guides
The document serves as a blueprint to replicate the simulation, covering logic, flow, mechanics, UI requirements, and implementation details.