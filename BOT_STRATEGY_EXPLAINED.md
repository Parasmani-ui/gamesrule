# 🤖 Bot Strategy Guide - How Bots Decide Orders

## Overview

Bots use **3 different strategies** to decide how much to order each week. Currently, all bots use **SMOOTHING** strategy by default.

---

## Strategy 1: NAIVE (Simple Pass-Through)

### Logic:
**Order exactly what the downstream customer ordered last week**

### Formula:
```
next_order = last_outgoing_shipment
```

### Example Over 20 Weeks (4→8 Demand Pattern):

| Week | Demand | Bot Orders |
|------|--------|------------|
| 0    | 4      | 4          |
| 1    | 4      | 4          |
| 2    | 4      | 4          |
| 3    | 4      | 4          |
| 4    | 4      | 4          |
| 5    | **8**  | 4 (last week's demand) |
| 6    | 8      | 8          |
| 7    | 8      | 8          |
| 8    | 8      | 8          |
| 9+   | 8      | 8          |

### Characteristics:
- ✅ Very simple
- ✅ Exact pass-through of demand
- ❌ Always one week behind demand changes
- ❌ No inventory management
- ❌ Creates stockouts during demand jumps

### When Bot Uses This:
- Pass downstream demand upstream
- No forecasting or buffer

---

## Strategy 2: SMOOTHING (Exponential Smoothing) ⭐ DEFAULT

### Logic:
**Use exponential smoothing to forecast demand + maintain target inventory**

### Formula:
```
forecast = α × current_demand + (1 - α) × average_past_demand
order = forecast + (inventory_gap × 0.5)

where:
  α (alpha) = 0.3 (smoothing factor)
  target_inventory = forecast × 2 weeks
  inventory_gap = target_inventory - current_inventory_position
```

### Example Over 20 Weeks (4→8 Demand Pattern):

| Week | Demand | Inventory | Backlog | Bot Orders | Reasoning |
|------|--------|-----------|---------|------------|-----------|
| 0    | 4      | 12        | 0       | 4          | Steady state |
| 1    | 4      | 12        | 0       | 4          | Demand stable |
| 2    | 4      | 12        | 0       | 4          | Demand stable |
| 3    | 4      | 12        | 0       | 4          | Demand stable |
| 4    | 4      | 12        | 0       | 4          | Demand stable |
| 5    | **8**  | 8         | 0       | 5          | Detects increase, orders more |
| 6    | 8      | 5         | 0       | 6          | Inventory dropping, order more |
| 7    | 8      | 3         | 0       | 7          | Still adjusting |
| 8    | 8      | 2         | 0       | 8          | Reaching equilibrium |
| 9    | 8      | 2         | 0       | 8          | Stable at new level |
| 10+  | 8      | ~4        | 0       | 8          | Maintains new demand level |

### Characteristics:
- ✅ Adapts to demand changes gradually
- ✅ Maintains target inventory (2 weeks coverage)
- ✅ Smooths out volatility
- ✅ Good balance of responsiveness and stability
- ⚠️ Takes 3-5 weeks to fully adjust to demand changes

### Formula Breakdown:

**Step 1: Forecast Demand**
```javascript
recent_4_weeks = [4, 4, 4, 8] // last 4 weeks
average_demand = (4 + 4 + 4 + 8) / 4 = 5
current_demand = 8

forecast = 0.3 × 8 + 0.7 × 5 = 2.4 + 3.5 = 5.9 ≈ 6
```

**Step 2: Calculate Inventory Position**
```javascript
inventory_position = inventory - backlog = 8 - 0 = 8
desired_inventory = forecast × 2 = 6 × 2 = 12
inventory_gap = 12 - 8 = 4
```

**Step 3: Calculate Order**
```javascript
order = forecast + (inventory_gap × 0.5)
order = 6 + (4 × 0.5) = 6 + 2 = 8
```

### Why It Works:
- **Alpha = 0.3**: Not too reactive (prevents overreaction)
- **Target coverage = 2 weeks**: Safety buffer
- **50% of gap**: Gradual adjustment, not aggressive

---

## Strategy 3: COST_AWARE (Economic Order Quantity)

### Logic:
**Minimize holding + backlog costs using inventory theory**

### Formula:
```
inventory_position = inventory + pipeline - backlog
lead_time_demand = demand × lead_time
safety_stock = z_score × demand_std_dev
reorder_point = lead_time_demand + safety_stock
order = max(0, reorder_point - inventory_position)
order = min(order, demand × 2)  // cap at 2x demand
```

### Example Over 20 Weeks (4→8 Demand Pattern):

| Week | Demand | Inventory | Pipeline | Backlog | Safety Stock | Bot Orders |
|------|--------|-----------|----------|---------|--------------|------------|
| 0    | 4      | 12        | [4,4]    | 0       | 1            | 4          |
| 1    | 4      | 12        | [4,4]    | 0       | 1            | 4          |
| 5    | **8**  | 8         | [4,4]    | 0       | 2            | 10         |
| 6    | 8      | 4         | [4,10]   | 0       | 2            | 8          |
| 7    | 8      | 6         | [10,8]   | 0       | 2            | 2          |
| 8    | 8      | 8         | [8,2]    | 0       | 2            | 10         |
| 9+   | 8      | ~8        | [~8,~8]  | 0       | 2            | ~8         |

### Characteristics:
- ✅ Considers costs (holding vs backlog)
- ✅ Uses safety stock for uncertainty
- ✅ More aggressive response to demand changes
- ✅ Looks at pipeline (in-transit inventory)
- ⚠️ Can over-order initially
- ⚠️ More complex calculations

### Formula Breakdown:

**Step 1: Calculate Safety Stock**
```javascript
service_level = 90% → z_score = 1.28
demand_std_dev = last_order × 20% = 4 × 0.2 = 0.8
safety_stock = 1.28 × 0.8 ≈ 1 unit
```

**Step 2: Calculate Reorder Point**
```javascript
lead_time = 2 weeks
lead_time_demand = 8 × 2 = 16 units
reorder_point = 16 + 1 = 17 units
```

**Step 3: Calculate Inventory Position**
```javascript
inventory = 8
pipeline = 4 + 4 = 8 (in-transit)
backlog = 0
inventory_position = 8 + 8 - 0 = 16
```

**Step 4: Calculate Order**
```javascript
order = reorder_point - inventory_position
order = 17 - 16 = 1 unit
order = min(1, 8 × 2) = 1 (no cap needed)
```

### Why It Works:
- Considers **lead time** (orders arrive 2 weeks later)
- Maintains **safety stock** (buffer for uncertainty)
- **Service level 90%**: Low stockout probability
- **Caps at 2x demand**: Prevents over-ordering

---

## Default Bot Configuration

In your code, bots are created with **SMOOTHING** strategy:

```typescript
// From backend/src/routes/sessions.ts line 280
await prisma.player.create({
  data: {
    chain_id: chain.id,
    name: `Bot ${role}`,
    role,
    is_bot: true,
    bot_strategy: BotStrategy.SMOOTHING, // ← This is the default
  },
});
```

---

## Visual Example: 4→8 Demand Pattern (20 Weeks)

### Customer Demand (Retailer faces this):
```
Weeks:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
Demand: 4  4  4  4  4  8  8  8  8  8  8  8  8  8  8  8  8  8  8  8  8
        └─────────┘  └──────────────────────────────────────────────┘
        Stable: 4    Jump to 8 and stays
```

### Bot Wholesaler Orders (Using SMOOTHING):
```
Week 0-4:  Orders 4 (steady state)
Week 5:    Orders 5 (detects increase, +25%)
Week 6:    Orders 6 (ramping up, +20%)
Week 7:    Orders 7 (still adjusting, +17%)
Week 8:    Orders 8 (reaches new level)
Week 9+:   Orders 8 (maintains)
```

### Bot Distributor Orders (Using SMOOTHING):
```
Week 0-4:  Orders 4
Week 5:    Orders 4 (hasn't seen wholesaler's increase yet)
Week 6:    Orders 5 (sees wholesaler ordered 5)
Week 7:    Orders 6 (sees wholesaler ordered 6)
Week 8:    Orders 7 (amplification!)
Week 9:    Orders 9 (over-ordering!)
Week 10:   Orders 8 (correcting)
Week 11+:  Orders 8 (stable)
```

### Result: Bullwhip Effect! 🌊
```
Customer:     4 → 8 (2x increase)
Retailer:     4 → 8 (2x)
Wholesaler:   4 → 8 (2x, gradual)
Distributor:  4 → 9 (2.25x, over-shoots!)
Manufacturer: 4 → 10 (2.5x, amplified!)
```

Each tier upstream sees **amplified variability** - this is the bullwhip effect!

---

## How to Change Bot Strategy

### Option 1: Change Default (All Bots)

Edit `backend/src/routes/sessions.ts` line ~280:

```typescript
bot_strategy: BotStrategy.NAIVE,    // Simple pass-through
// OR
bot_strategy: BotStrategy.SMOOTHING, // Current default
// OR
bot_strategy: BotStrategy.COST_AWARE, // Advanced
```

### Option 2: Mix Strategies (Different Bots)

```typescript
// Retailer bot: Naive (simple)
// Wholesaler bot: Smoothing (balanced)
// Distributor bot: Cost-aware (advanced)
```

---

## Comparison Table

| Strategy | Complexity | Responsiveness | Stability | Typical Performance |
|----------|------------|----------------|-----------|---------------------|
| **NAIVE** | Low | Instant | Low | Creates bullwhip |
| **SMOOTHING** | Medium | Gradual (3-5 weeks) | High | Best balanced |
| **COST_AWARE** | High | Fast (1-2 weeks) | Medium | Lowest costs |

---

## Real Example Simulation

### Scenario: 4→8 Demand Jump at Week 5

**Bot Wholesaler (SMOOTHING strategy):**

```
Week 0: 
  - Downstream (Retailer) ordered: 4
  - outgoing_shipment: 4
  - Order: 4

Week 5 (Demand jumps):
  - Downstream ordered: 8
  - Recent history: [4, 4, 4, 4]
  - Average: 4
  - forecast = 0.3 × 8 + 0.7 × 4 = 5.2
  - inventory = 12, backlog = 0
  - desired_inventory = 5.2 × 2 = 10.4
  - inventory_gap = 10.4 - 12 = -1.6 (no gap)
  - Order: max(0, round(5.2 + (-1.6 × 0.5))) = 5

Week 6:
  - Downstream ordered: 8
  - Recent history: [4, 4, 4, 8]
  - Average: 5
  - forecast = 0.3 × 8 + 0.7 × 5 = 5.9
  - inventory = 9 (dropped from 12)
  - desired_inventory = 5.9 × 2 = 11.8
  - inventory_gap = 11.8 - 9 = 2.8
  - Order: round(5.9 + 2.8 × 0.5) = 7

Week 7:
  - Downstream ordered: 8
  - Recent history: [4, 4, 8, 8]
  - Average: 6
  - forecast = 0.3 × 8 + 0.7 × 6 = 6.6
  - inventory = 6 (still dropping)
  - desired_inventory = 6.6 × 2 = 13.2
  - inventory_gap = 13.2 - 6 = 7.2
  - Order: round(6.6 + 7.2 × 0.5) = 10

Week 8-20:
  - Stabilizes around 8 units per week
```

---

## Key Bot Decision Factors

### 1. **Historical Data** (Smoothing & Cost-Aware)
```
Look back 4 weeks:
- Week N-4: ordered 4
- Week N-3: ordered 4  
- Week N-2: ordered 6
- Week N-1: ordered 8
Average = (4+4+6+8)/4 = 5.5
```

### 2. **Current Inventory Position**
```
inventory_position = inventory + pipeline - backlog

Example:
  inventory = 10
  pipeline = [6, 8] = 14 (in-transit)
  backlog = 3
  
  inventory_position = 10 + 14 - 3 = 21 units available
```

### 3. **Target Inventory Level**
```
target = forecasted_demand × coverage_weeks

Example:
  forecast = 8 units/week
  coverage = 2 weeks
  
  target = 8 × 2 = 16 units
```

### 4. **Inventory Gap**
```
gap = target_inventory - current_inventory

If gap > 0: Order more (inventory low)
If gap < 0: Order less (inventory high)

Example:
  target = 16
  current = 10
  gap = 6 → Order extra 3 units (50% of gap)
```

---

## Full 20-Week Simulation Example

### Setup:
- Demand Pattern: 4→8 at week 5
- Initial inventory: 12
- Lead time: 2 weeks
- Bot: Wholesaler using SMOOTHING

### Detailed Week-by-Week:

```
Week 0:
  Retailer demands: 4
  Inventory: 12
  Receives: 4 (from pipeline)
  Ships: 4
  New inventory: 12
  Orders: 4 ✅

Week 1-4: (Same pattern)
  Demand: 4
  Orders: 4
  Inventory: stable at 12

Week 5: (DEMAND JUMPS!)
  Retailer demands: 8 (doubled!)
  Inventory: 12
  Receives: 4 (old orders)
  Ships: 8
  New inventory: 8
  
  Calculation:
    recent_avg = 4
    forecast = 0.3 × 8 + 0.7 × 4 = 5.2
    target_inv = 5.2 × 2 = 10.4
    gap = 10.4 - 8 = 2.4
    order = 5.2 + 2.4 × 0.5 = 6.4 ≈ 6 ✅

Week 6:
  Retailer demands: 8
  Inventory: 8
  Receives: 4 (from week 4 order)
  Ships: 8
  New inventory: 4
  
  Calculation:
    recent_avg = 5
    forecast = 0.3 × 8 + 0.7 × 5 = 5.9
    target_inv = 5.9 × 2 = 11.8
    gap = 11.8 - 4 = 7.8
    order = 5.9 + 7.8 × 0.5 = 9.8 ≈ 10 ✅

Week 7:
  Retailer demands: 8
  Inventory: 4
  Receives: 6 (from week 5 order)
  Ships: 8
  New inventory: 2
  
  Calculation:
    recent_avg = 6
    forecast = 0.3 × 8 + 0.7 × 6 = 6.6
    target_inv = 6.6 × 2 = 13.2
    gap = 13.2 - 2 = 11.2
    order = 6.6 + 11.2 × 0.5 = 12.2 (capped at 16) ≈ 12 ✅

Week 8-10: (Adjustment period)
  Orders gradually stabilize
  Inventory builds back up
  
Week 11+:
  Demand: 8
  Orders: 8
  Inventory: stable at 8-12
  ✅ Equilibrium reached!
```

---

## Why Bots Behave This Way

### Purpose of Each Strategy:

1. **NAIVE** - Teaches about:
   - Lack of forecasting
   - Always reactive, never proactive
   - Simple but problematic

2. **SMOOTHING** - Teaches about:
   - Forecasting techniques
   - Balancing responsiveness vs stability
   - Real-world inventory management
   - **Most realistic behavior**

3. **COST_AWARE** - Teaches about:
   - Economic optimization
   - Safety stock concepts
   - Service level vs cost tradeoff
   - Advanced inventory theory

---

## How to See Bot Behavior

### In Worker Logs:
```
🤖 Bot order scheduled
🤖 BOT WORKER: Processing bot order
Bot order placed {"playerId":"xxx", "quantity":6, "strategy":"SMOOTHING"}
```

### In Database (Prisma Studio):
```bash
npx prisma studio
```

Go to **decisions** table:
- Filter by `player_id` (bot)
- See `quantity` column across weeks
- Watch how orders change with demand

### In CSV Report:
Download report shows:
- Bot orders per week
- Inventory levels
- Costs accumulated
- Compare human vs bot performance

---

## Adjusting Bot Behavior

### Make Bots More Reactive:
```typescript
// In bot-strategies.ts, line 43:
const alpha = 0.5; // Increase from 0.3 (was 0.3)
// Higher alpha = more reactive to recent changes
```

### Make Bots More Conservative:
```typescript
// Line 45:
const targetCoverage = 3; // Increase from 2
// More coverage = larger inventory buffer
```

### Change All Bots to Naive:
```typescript
// In sessions.ts, line ~280:
bot_strategy: BotStrategy.NAIVE,
```

---

## Testing Bot Strategies

### Experiment 1: Pure Bots (4 bots)
```
All bots use SMOOTHING:
- See how they respond to demand change
- Notice bullwhip amplification
- Observe adjustment period
```

### Experiment 2: Human vs Bot
```
1 human + 3 bots:
- See how your orders compare to bots
- Can you beat the bot's costs?
- Test different ordering approaches
```

### Experiment 3: Mixed Strategies
```
Edit code to give each bot a different strategy:
- Retailer: NAIVE
- Wholesaler: SMOOTHING  
- Distributor: COST_AWARE
- Manufacturer: NAIVE
```

---

## Summary

**Bot order decisions based on:**

| Factor | Naive | Smoothing | Cost-Aware |
|--------|-------|-----------|------------|
| Downstream demand | ✅ | ✅ | ✅ |
| Historical average | ❌ | ✅ | ❌ |
| Inventory level | ❌ | ✅ | ✅ |
| Pipeline (in-transit) | ❌ | ❌ | ✅ |
| Backlog | ❌ | ✅ | ✅ |
| Safety stock | ❌ | ❌ | ✅ |
| Cost optimization | ❌ | ⚠️ | ✅ |

**Default:** SMOOTHING (best balance for teaching)

**Bot orders adapt over 20 weeks by:**
- Observing downstream demand patterns
- Forecasting future demand
- Adjusting for inventory levels
- Maintaining target stock levels
- Responding to demand changes gradually

**This creates the bullwhip effect that students learn about!** 🌊

---

Want to experiment? Change the strategy in `backend/src/routes/sessions.ts` and restart! 🚀

