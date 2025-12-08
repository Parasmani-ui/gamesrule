# 🎮 Game Flow - How It Works

## Order of Operations

---

## Week Progression Flow

### Step 1: Week Starts
```

All 4 players see: "Week 0" - place your order
```

### Step 2: Players Place Orders (In Any Order)
```
Player 1 (Retailer):    Orders 5 units  ✅
Player 2 (Wholesaler):  Orders 6 units  ✅
Bot 3 (Distributor):    Orders 4 units  ✅ (automatic)
Bot 4 (Manufacturer):   Orders 4 units  ✅ (automatic)
```

**Players can order in ANY sequence:**
- Manufacturer → Retailer → Wholesaler → Distributor ✅
- Retailer → Distributor → Manufacturer → Wholesaler ✅
- Any random order works! ✅

### Step 3: Week Advances When...

**EITHER of these happens:**

1. **All orders placed** → Week advances immediately
   ```
   All 4 players ordered → Week progression triggered!
   ```


### Step 4: Game Engine Processes Week
```
Backend calculates:
- Shipments received
- Inventory updated
- Demand fulfilled
- Backlog calculated
- Costs computed
- Pipelines shifted


```

### Step 5: Next Week Starts
```
Week 1 begins
New timer starts 
All players can place orders again
```

---

## Complete Game Cycle

```
Week 0: Start
  ├─ Players place orders (any order)
  ├─ All orders placed
  ├─ Backend processes week
  └─ Advance to Week 1

Week 1: Start
  ├─ Players place orders (any order)
  ├─ All orders placed
  ├─ Backend processes week
  └─ Advance to Week 2

... continues for 20 weeks ...

Week 20: End
  └─ Session complete
  └─ View analytics
```

---

## Important Rules

### ✅ DO:
- Order in any sequence
- Order anytime during the 60-second timer
- Submit before timer expires

### ❌ DON'T:
- Can't order twice in same week
- Can't order after timer expires (uses fallback)
- Can't change order after submitting

---

## What Happens in Background?

### When You Place an Order:

1. **Order saved** to database
2. **Socket event** sent to all players in chain
3. **Check**: Are all orders in?
   - **YES** → Trigger week progression immediately
   - **NO** → Wait for others or timer

### When Week Advances:

1. **Game engine runs** (game-engine.ts)
2. **Each player's state updated:**
   - Receive incoming shipments
   - Fulfill downstream demand
   - Update inventory/backlog
   - Calculate costs
   - Shift pipelines

3. **New state saved** to database
4. **Socket event** broadcasts new week to all players
5. **New timer starts** for next week

---

## Supply Chain Flow (Per Week)

```
Customer
  ↓ (demands 4 units)
Retailer
  ├─ Has inventory: 12
  ├─ Ships: 4 to customer
  ├─ Inventory left: 8
  ├─ Orders: 5 from Wholesaler
  ↓
Wholesaler
  ├─ Has inventory: 12
  ├─ Ships: 5 to Retailer (after lead time)
  ├─ Orders: 6 from Distributor
  ↓
Distributor
  ├─ Has inventory: 12
  ├─ Ships: 6 to Wholesaler (after lead time)
  ├─ Orders: 7 from Manufacturer
  ↓
Manufacturer
  ├─ Produces what they ordered
  ├─ Ships: 7 to Distributor (after lead time)
```

**Lead Time = 2 weeks**
- Order placed Week 0 → Arrives Week 2
- Creates pipeline effect
- Causes bullwhip amplification

---

## Why "Order already placed for this week"?

This happens when:

1. ✅ You already submitted an order for Week 0
2. ❌ Week hasn't advanced to Week 1 yet

**Solutions:**
- **Wait** for all players to order
- **Wait** for timer to expire (60 seconds)
- Week will advance automatically

**Check:**
- Is the worker running? ⚠️
- Are bots placing orders? (check worker logs)
- Did timer expire? (check worker logs)

---

## Troubleshooting Week Not Advancing

### If stuck on Week 0:

1. **Check worker is running:**
   ```bash
   npm run dev:worker
   ```

2. **Check worker logs for:**
   ```
   Bot order placed ✅
   All orders placed, triggering progression ✅
   Processing week progression ✅
   Week progression complete ✅
   ```

3. **If not seeing these:**
   - Restart worker
   - Check backend logs
   - Check Redis is running

---

## Summary

**Order Sequence:** Any order, anytime (async)  
**Week Advances:** When all orders in OR timer expires  
**Who Waits:** System waits for slowest player  
**Bots:** Place orders automatically (5-15 seconds)  
**Timer:** Default 60 seconds per week  
**Lead Time:** 2 weeks delay for shipments  

**The beauty:** Players don't see each other's orders until week ends! This creates the bullwhip effect. 🌊

---

Need help? Check if all 3 processes are running:
1. Backend (PORT 3001)
2. **Worker** (handles week progression)
3. Frontend (PORT 3000)

