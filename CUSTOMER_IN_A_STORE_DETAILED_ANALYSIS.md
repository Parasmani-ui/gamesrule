# Customer In A Store: Complete Simulation Analysis & Replication Guide

**Simulation Name:** Customer In A Store: A Supply Chain Management Simulation  
**Author:** T. T. Niranjan  
**Category:** Operations Management, Systems Thinking, Cognitive Science  
**Duration:** 20 minutes  
**Difficulty:** ⭐⭐ (Easy)  
**Players:** 1 player (single-player, quiz-based)  
**Framework:** Stock-Flow Dynamics, Cognitive Bias Research

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Question System & Generation](#question-system--generation)
7. [Learning Intervention Groups](#learning-intervention-groups)
8. [Stock-Flow Calculation System](#stock-flow-calculation-system)
9. [Correlation Heuristic Detection](#correlation-heuristic-detection)
10. [Scoring & Metrics](#scoring--metrics)
11. [UI/UX Requirements](#uiux-requirements)
12. [API & Data Flow](#api--data-flow)
13. [Implementation Details](#implementation-details)
14. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**Customer In A Store** is a cognitive science simulation that teaches students about **stock-flow reasoning** and helps them overcome the **correlation heuristic**—a common cognitive bias where people confuse flows (rates) with stocks (accumulations). Players view inflow/outflow graphs and must determine when the stock level is at maximum, learning that stock peaks when inflow equals outflow (crossover point), not when inflow rate peaks.

### Key Features

- ✅ **Quiz-based format** with 10 progressive difficulty questions
- ✅ **Multiple scenarios** (store, reservoir, inventory, hospital, bank account)
- ✅ **Three learning intervention groups** for research
- ✅ **Real-time stock calculation** feedback
- ✅ **Correlation heuristic detection** and reporting
- ✅ **Improvement tracking** across questions
- ✅ **Immediate feedback** with detailed explanations

### Learning Outcomes

- Understand the difference between stocks (accumulations) and flows (rates)
- Recognize and overcome the correlation heuristic cognitive bias
- Develop systems thinking capabilities
- Learn to interpret time-series graphs correctly
- Apply integration concepts to business problems

---

## 📚 Theoretical Foundation

### Core Concept: Stock-Flow Reasoning

**Stock-Flow Dynamics** is a fundamental concept in systems thinking:

- **Stocks:** Accumulated quantities (customers in store, inventory, water in reservoir)
- **Flows:** Rates of change (arrivals per hour, orders per day, inflow per minute)
- **Relationship:** Stock changes based on the difference between inflow and outflow

**Key Principle:** Stocks and flows have fundamentally different behaviors. Stocks are **integrals** of flows, not correlations.

### The Correlation Heuristic

**What is it?**
The correlation heuristic is a cognitive bias where people incorrectly assume that stocks follow the same pattern as flows.

**Common Mistake:**
```
Question: "When is the number of customers in the store at maximum?"
❌ Wrong Answer: "When customer arrivals (inflow) peak"
✅ Correct Answer: "When cumulative (arrivals - departures) peaks"
```

**Why People Make This Mistake:**

1. **Pattern Matching:** The brain seeks correlations and similarities
2. **Intuitive Physics:** Confusing velocity (flow) with position (stock)
3. **Cognitive Load:** Integration (calculus) is mentally taxing
4. **Education Gap:** More algebra taught than calculus in schools

### Mathematical Foundation

**Discrete Stock-Flow Relationship:**
```
Stock(t) = Stock(t-1) + Inflow(t) - Outflow(t)

Where:
- Stock(t) = Stock level at time t
- Inflow(t) = Inflow rate during period t
- Outflow(t) = Outflow rate during period t
```

**Continuous Form:**
```
dStock/dt = Inflow(t) - Outflow(t)

Or in integral form:
Stock(t) = Stock(0) + ∫[Inflow(τ) - Outflow(τ)]dτ from 0 to t
```

**When Stock is Maximum:**
```
Maximum Stock occurs when:
- Net Flow = 0 (Inflow = Outflow)
- This is the crossover point, NOT when inflow peaks!
```

**Example:**
```
Period | Inflow | Outflow | Net Flow | Stock Level
-------|--------|---------|----------|------------
  0    |   -    |    -    |    -     |    10
  1    |   2    |    3    |    -1    |     9
  2    |   4    |    3    |    +1    |    10
  3    |   6    |    3    |    +3    |    13
  4    |   8    |    3    |    +5    |    18 ⭐ MAX
  5    |   6    |    3    |    +3    |    21
  6    |   4    |    3    |    +1    |    22
  7    |   2    |    3    |    -1    |    21

Note: Inflow peaks at period 4 (8 units), but stock continues 
growing until period 6 (22 units) when net flow becomes negative.
```

---

## 🎮 Simulation Overview

### Game Structure

**Format:** Quiz-based, single-player  
**Number of Questions:** 10 (default, configurable)  
**Question Types:** Multiple choice or numeric input  
**Time Limit:** None (player-paced)  
**Scenarios:** 5 different contexts

### Scenarios

1. **Customers in a Store**
   - Context: Retail store customer traffic
   - Inflow: Customers entering per hour
   - Outflow: Customers leaving per hour
   - Stock: Total customers in store

2. **Water in a Reservoir**
   - Context: Water management system
   - Inflow: Water flowing in (liters/min)
   - Outflow: Water flowing out (liters/min)
   - Stock: Total water in reservoir

3. **Inventory in Warehouse**
   - Context: Supply chain inventory
   - Inflow: Goods arriving (units/day)
   - Outflow: Goods being sold (units/day)
   - Stock: Total inventory on hand

4. **Patients in Hospital**
   - Context: Healthcare facility
   - Inflow: Patients admitted (per day)
   - Outflow: Patients discharged (per day)
   - Stock: Total patients in hospital

5. **Money in Bank Account**
   - Context: Financial account
   - Inflow: Deposits (₹/day)
   - Outflow: Withdrawals (₹/day)
   - Stock: Account balance

### Difficulty Levels

**Easy (Questions 1-3):**
- Simple patterns
- Triangular inflow, constant outflow
- Clear crossover points
- Example: `[2, 4, 6, 8, 6, 4, 2]` vs `[3, 3, 3, 3, 3, 3, 3]`

**Medium (Questions 4-7):**
- More complex patterns
- Varying inflow and outflow
- Less obvious crossover
- Example: `[1, 3, 5, 7, 9, 7, 5, 3, 1]` vs `[2, 2, 3, 4, 5, 6, 6, 5, 4]`

**Hard (Questions 8-10):**
- Very complex patterns
- Multiple peaks
- Counterintuitive results
- Example: `[2, 5, 8, 6, 9, 7, 4, 6, 3, 2]` vs `[1, 2, 3, 5, 6, 8, 9, 7, 5, 3]`

---

## 🔄 Complete Game Logic & Flow

### Game Flow Structure

```
STEP 1: INITIALIZATION
├─ Load learning group configuration
├─ Generate questions based on difficulty progression
├─ Set initial state (question index = 0)
└─ Display first question

STEP 2: QUESTION PRESENTATION
├─ Show scenario description
├─ Display inflow/outflow graph
├─ Show initial stock level
└─ Ask: "When is the stock level maximum?"

STEP 3: PLAYER RESPONSE
├─ Player selects time period (or enters number)
├─ Record answer and time spent
├─ Validate answer format
└─ Submit answer

STEP 4: ANSWER PROCESSING
├─ Calculate correct answer from stock levels
├─ Compare player answer with correct answer
├─ Update score and accuracy
├─ Detect correlation heuristic (if applicable)
└─ Move to next question

STEP 5: FEEDBACK & EXPLANATION
├─ Show correct/incorrect indicator
├─ Display correct answer
├─ Show detailed explanation table
├─ Highlight correlation heuristic if detected
└─ Update progress indicators

STEP 6: NEXT QUESTION OR COMPLETE
├─ If more questions: Return to STEP 2
├─ If all questions done: Show final results
└─ Display metrics and improvement analysis
```

### Question Processing Algorithm

```typescript
processQuestion(playerAnswer: number, timeSpent: number) {
  const question = questions[currentQuestionIndex]
  
  // 1. Calculate stock levels
  const stockLevels = calculateStockLevels(
    question.inflowPattern, 
    question.outflowPattern
  )
  
  // 2. Find correct answer (period with max stock)
  const correctAnswer = stockLevels.indexOf(Math.max(...stockLevels))
  
  // 3. Check if player answer is correct
  const isCorrect = (playerAnswer === correctAnswer)
  
  // 4. Detect correlation heuristic
  const inflowPeak = question.inflowPattern.indexOf(
    Math.max(...question.inflowPattern)
  )
  const usedHeuristic = (playerAnswer === inflowPeak && !isCorrect)
  
  // 5. Record answer
  answers.push({
    questionId: question.id,
    playerAnswer,
    correctAnswer,
    isCorrect,
    timeSpent,
    usedHeuristic
  })
  
  // 6. Update metrics
  if (isCorrect) score++
  accuracyRate = (score / (currentQuestionIndex + 1)) * 100
  
  // 7. Generate explanation
  const explanation = generateExplanation(question, stockLevels, playerAnswer)
  
  // 8. Move to next question
  currentQuestionIndex++
  
  return {
    isCorrect,
    correctAnswer,
    explanation,
    usedHeuristic,
    newScore: score,
    accuracyRate
  }
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface CustomerInStoreGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    learningGroup: 'learning-by-doing' | 'task-decomposition' | 'binary-feedback';
    numQuestions: number;              // Default: 10
  };
  
  questions: Question[];                // All questions for this session
  
  currentQuestionIndex: number;         // 0 to numQuestions-1
  
  answers: Answer[];                    // All submitted answers
  
  score: number;                        // Number of correct answers
  accuracyRate: number;                 // Percentage (0-100)
  
  isComplete: boolean;
}
```

### Question Structure

```typescript
interface Question {
  id: number;                           // Question number (1-10)
  inflowPattern: number[];              // Inflow rate per period
  outflowPattern: number[];             // Outflow rate per period
  correctAnswer: number;                // Period when stock is maximum
  difficulty: 'easy' | 'medium' | 'hard';
  scenario: string;                     // Scenario description
}
```

### Answer Structure

```typescript
interface Answer {
  questionId: number;
  playerAnswer: number;                 // Period selected by player
  correctAnswer: number;                // Actual correct period
  isCorrect: boolean;
  timeSpent: number;                    // Seconds taken
  stockCalculation?: number[];          // For task-decomposition group
  usedCorrelationHeuristic?: boolean;   // Detected heuristic usage
}
```

---

## 📝 Question System & Generation

### Question Generation Algorithm

```typescript
generateQuestions(count: number): Question[] {
  const questions: Question[] = []
  const scenarios = [
    'Customers entering and leaving a store',
    'Water flowing into and out of a reservoir',
    'Inventory arriving and being sold',
    'Patients admitted to and discharged from a hospital',
    'Money deposited to and withdrawn from an account'
  ]
  
  for (let i = 0; i < count; i++) {
    // Determine difficulty
    const difficulty = i < 3 ? 'easy' 
                     : i < 7 ? 'medium' 
                     : 'hard'
    
    // Get scenario (cycle through)
    const scenario = scenarios[i % scenarios.length]
    
    // Generate question
    const question = generateSingleQuestion(
      i + 1,      // Question ID
      difficulty,
      scenario
    )
    
    questions.push(question)
  }
  
  return questions
}
```

### Difficulty-Specific Patterns

#### Easy Questions (1-3)

**Pattern Type:** Simple triangular inflow, constant outflow

```typescript
// Example Easy Question
inflowPattern = [2, 4, 6, 8, 6, 4, 2]  // Peak at period 4
outflowPattern = [3, 3, 3, 3, 3, 3, 3]  // Constant

// Stock Calculation:
Stock[0] = 10
Stock[1] = 10 + 2 - 3 = 9
Stock[2] = 9 + 4 - 3 = 10
Stock[3] = 10 + 6 - 3 = 13
Stock[4] = 13 + 8 - 3 = 18
Stock[5] = 18 + 6 - 3 = 21  ⭐ MAX (period 5)
Stock[6] = 21 + 4 - 3 = 22
Stock[7] = 22 + 2 - 3 = 21

Correct Answer: Period 5 (not period 4 when inflow peaks!)
```

#### Medium Questions (4-7)

**Pattern Type:** Varying inflow and outflow

```typescript
// Example Medium Question
inflowPattern = [1, 3, 5, 7, 9, 7, 5, 3, 1]
outflowPattern = [2, 2, 3, 4, 5, 6, 6, 5, 4]

// More complex crossover points
// Requires careful calculation of net flows
```

#### Hard Questions (8-10)

**Pattern Type:** Complex patterns with multiple peaks

```typescript
// Example Hard Question
inflowPattern = [2, 5, 8, 6, 9, 7, 4, 6, 3, 2]
outflowPattern = [1, 2, 3, 5, 6, 8, 9, 7, 5, 3]

// Multiple peaks, counterintuitive results
// Maximum stock may occur after inflow peaks
```

### Question Validation

Each generated question is validated to ensure:
- Stock levels are always non-negative
- At least one period has maximum stock
- Patterns are non-trivial (not all periods equal)
- Correct answer is within valid range (0 to pattern.length)

---

## 🎓 Learning Intervention Groups

The simulation supports **three different learning intervention groups** for research purposes. The facilitator can assign participants to different groups to compare learning effectiveness.

### Group 1: Learning-by-Doing

**Approach:** Implicit learning through repetition

**Features:**
- Players solve multiple variations
- No explicit instruction
- Build intuition through practice
- Minimal guidance

**Question Flow:**
```
1. Show graph
2. Player answers
3. Show brief feedback (✓ or ✗)
4. Next question immediately
```

**Feedback:**
- Minimal: "Correct" or "Incorrect"
- No detailed explanation until end
- Focus on pattern recognition

**Learning Mechanism:**
- Implicit pattern learning
- Trial and error
- Intuitive development

### Group 2: Task Decomposition

**Approach:** Explicit instruction with step-by-step reasoning

**Features:**
- Break problem into smaller steps
- Show stock calculation table
- Guide through reasoning process
- Explicit instruction

**Question Flow:**
```
1. Show graph
2. Show calculation table template
3. Player calculates stock for each period
4. Player identifies maximum
5. Show detailed explanation
```

**Feedback:**
- Detailed step-by-step explanation
- Stock calculation table shown
- Guided reasoning process
- Explicit methodology

**Calculation Table:**
```
Period | Inflow | Outflow | Net Flow | Stock Level
-------|--------|---------|----------|------------
  0    |   -    |    -    |    -     |    10
  1    |   2    |    3    |    -1    |     9
  2    |   4    |    3    |    +1    |    10
  3    |   6    |    3    |    +3    |    13
  4    |   8    |    3    |    +5    |    18
  5    |   6    |    3    |    +3    |    21 ⭐ MAX
  6    |   4    |    3    |    +1    |    22
  7    |   2    |    3    |    -1    |    21
```

**Learning Mechanism:**
- Explicit instruction
- Step-by-step reasoning
- Structured approach
- Concept understanding

### Group 3: Binary Feedback

**Approach:** Immediate feedback with reinforcement learning

**Features:**
- Immediate right/wrong feedback
- Fast error correction
- Reinforcement learning approach
- Highlight mistakes immediately

**Question Flow:**
```
1. Show graph
2. Player answers
3. Immediate feedback:
   - ✓ Correct! (green highlight)
   - ✗ Incorrect. Correct answer is period X (red highlight)
4. Show explanation table
5. Next question
```

**Feedback:**
- Immediate binary feedback
- Correct answer revealed if wrong
- Explanation table shown
- Visual highlighting (green/red)

**Learning Mechanism:**
- Fast error correction
- Reinforcement learning
- Immediate pattern adjustment
- Rapid feedback loops

---

## 📊 Stock-Flow Calculation System

### Stock Level Calculation Algorithm

```typescript
calculateStockLevels(
  inflow: number[], 
  outflow: number[]
): number[] {
  // Start with initial stock
  const stocks: number[] = [10]  // Initial stock = 10
  
  // Calculate stock for each period
  for (let t = 0; t < inflow.length; t++) {
    const netFlow = inflow[t] - outflow[t]
    const newStock = stocks[t] + netFlow
    
    // Stock cannot be negative
    stocks.push(Math.max(0, newStock))
  }
  
  return stocks
}
```

### Maximum Stock Identification

```typescript
findMaximumStockPeriod(stockLevels: number[]): number {
  // Find the period with maximum stock
  let maxStock = Math.max(...stockLevels)
  let maxPeriod = stockLevels.indexOf(maxStock)
  
  // Handle multiple periods with same max stock
  // Return the first occurrence (earliest period)
  
  return maxPeriod
}
```

### Net Flow Calculation

```typescript
calculateNetFlow(
  inflow: number[], 
  outflow: number[]
): number[] {
  return inflow.map((in, index) => in - outflow[index])
}
```

### Crossover Point Detection

```typescript
findCrossoverPoints(inflow: number[], outflow: number[]): number[] {
  const crossovers: number[] = []
  
  for (let i = 0; i < inflow.length - 1; i++) {
    const netFlowBefore = inflow[i] - outflow[i]
    const netFlowAfter = inflow[i + 1] - outflow[i + 1]
    
    // Check for crossover (sign change or zero crossing)
    if (netFlowBefore > 0 && netFlowAfter <= 0) {
      crossovers.push(i + 1)  // Stock starts declining
    }
    if (netFlowBefore < 0 && netFlowAfter >= 0) {
      crossovers.push(i + 1)  // Stock starts increasing
    }
  }
  
  return crossovers
}
```

---

## 🧠 Correlation Heuristic Detection

### Detection Algorithm

```typescript
detectCorrelationHeuristic(
  playerAnswer: number,
  question: Question,
  isCorrect: boolean
): boolean {
  // Find period where inflow peaks
  const maxInflow = Math.max(...question.inflowPattern)
  const inflowPeakPeriod = question.inflowPattern.indexOf(maxInflow)
  
  // Check if player chose inflow peak period when it's wrong
  if (!isCorrect && playerAnswer === inflowPeakPeriod) {
    return true  // Player fell for correlation heuristic
  }
  
  return false
}
```

### Overall Heuristic Usage Analysis

```typescript
analyzeHeuristicUsage(answers: Answer[], questions: Question[]): {
  totalDetections: number;
  detectionRate: number;
  affectedQuestions: number[];
} {
  let heuristicCount = 0
  const affectedQuestions: number[] = []
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId)
    if (!question) continue
    
    const inflowPeak = question.inflowPattern.indexOf(
      Math.max(...question.inflowPattern)
    )
    
    // Check if player chose inflow peak when wrong
    if (!answer.isCorrect && answer.playerAnswer === inflowPeak) {
      heuristicCount++
      affectedQuestions.push(answer.questionId)
    }
  }
  
  const detectionRate = answers.length > 0
    ? (heuristicCount / answers.length) * 100
    : 0
  
  return {
    totalDetections: heuristicCount,
    detectionRate,
    affectedQuestions
  }
}
```

### Heuristic Detection Criteria

**Strong Indicator (50%+ of wrong answers):**
- Player chose inflow peak period for wrong answers
- Consistent pattern across multiple questions
- Shows reliance on correlation heuristic

**Moderate Indicator (25-50%):**
- Some instances of heuristic usage
- Mix of correct reasoning and heuristic

**Weak Indicator (<25%):**
- Occasional heuristic usage
- Mostly correct reasoning

---

## 📊 Scoring & Metrics

### Primary Metrics

#### 1. **Score**
- **Definition:** Number of correct answers
- **Range:** 0 to total questions
- **Calculation:** Count of `isCorrect = true` in answers

#### 2. **Accuracy Rate**
- **Definition:** Percentage of correct answers
- **Formula:** `(Score / Total Questions) × 100`
- **Range:** 0% to 100%
- **Target:** 70%+ indicates good understanding

#### 3. **Average Time Per Question**
- **Definition:** Mean time spent on each question
- **Formula:** `Sum of all timeSpent / Number of questions`
- **Unit:** Seconds
- **Interpretation:** Faster with practice = learning

#### 4. **Improvement Trend**
- **Definition:** Accuracy improvement from first half to second half
- **Calculation:**
  ```typescript
  firstHalfAccuracy = (correct in first 50%) / (first 50% questions) × 100
  secondHalfAccuracy = (correct in second 50%) / (second 50% questions) × 100
  improvement = secondHalfAccuracy - firstHalfAccuracy
  ```
- **Categories:**
  - Significant improvement: >20%
  - Good improvement: 10-20%
  - Slight improvement: 1-10%
  - Consistent: 0%
  - Decline: Negative

#### 5. **Correlation Heuristic Detection Rate**
- **Definition:** Percentage of wrong answers that used correlation heuristic
- **Formula:** `(Heuristic Errors / Total Wrong Answers) × 100`
- **Interpretation:** Higher rate = stronger bias

### Performance Levels

**Excellent (A):**
- Accuracy: 90-100%
- Improvement: Significant (>20%)
- Heuristic Rate: <10%

**Good (B):**
- Accuracy: 70-89%
- Improvement: Good (10-20%)
- Heuristic Rate: 10-25%

**Average (C):**
- Accuracy: 50-69%
- Improvement: Slight (1-10%)
- Heuristic Rate: 25-50%

**Needs Improvement (D):**
- Accuracy: <50%
- Improvement: Negative or none
- Heuristic Rate: >50%

---

## 🎨 UI/UX Requirements

### Question Display Screen

```
┌─────────────────────────────────────────────────────────┐
│  CUSTOMER IN A STORE - Question 3 of 10                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Scenario: Customers entering and leaving a store       │
│                                                          │
│  The graph below shows the number of customers          │
│  entering (inflow) and leaving (outflow) the store      │
│  each hour. The store starts with 10 customers.         │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │                                                │     │
│  │  10 │                                           │     │
│  │   8 │        ●                                 │     │
│  │   6 │      ●   ●                               │     │
│  │   4 │    ●       ●                             │     │
│  │   2 │  ●           ●                           │     │
│  │   0 └─────────────────────────────────────────│     │
│  │     0   1   2   3   4   5   6   7   8         │     │
│  │                                                │     │
│  │  Inflow:  ──── (Blue line)                    │     │
│  │  Outflow: ──── (Red line)                     │     │
│  │                                                │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  Question: At which hour is the number of customers     │
│            in the store at maximum?                     │
│                                                          │
│  Select Period:                                         │
│  [ 0 ] [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ]│
│                                                          │
│  Or enter manually: [____] hours                        │
│                                                          │
│  [Submit Answer]                                        │
│                                                          │
│  Time spent: 45 seconds                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Feedback Screen (After Answer)

```
┌─────────────────────────────────────────────────────────┐
│  ANSWER FEEDBACK                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ❌ Incorrect                                            │
│                                                          │
│  Correct Answer: Period 5                               │
│  Your Answer: Period 4                                  │
│                                                          │
│  ──────────────────────────────────────────────────     │
│                                                          │
│  EXPLANATION                                             │
│                                                          │
│  The stock level is the cumulative sum of               │
│  (inflow - outflow) over time.                          │
│                                                          │
│  Period | Inflow | Outflow | Net Flow | Stock Level    │
│  -------|--------|---------|----------|----------------│
│    0    |   -    |    -    |    -     |    10          │
│    1    |   2    |    3    |    -1    |     9          │
│    2    |   4    |    3    |    +1    |    10          │
│    3    |   6    |    3    |    +3    |    13          │
│    4    |   8    |    3    |    +5    |    18          │
│    5    |   6    |    3    |    +3    |    21 ⭐ MAX   │
│    6    |   4    |    3    |    +1    |    22          │
│    7    |   2    |    3    |    -1    |    21          │
│                                                          │
│  Key Insight: Stock peaks when cumulative (inflow -     │
│  outflow) is maximum, not when inflow rate peaks!       │
│                                                          │
│  ⚠️ You fell for the correlation heuristic!            │
│     Stock ≠ Flow rate.                                  │
│                                                          │
│  [Next Question]                                        │
│                                                          │
│  Progress: 3/10  ●●●○○○○○○○  Score: 2/3 (67%)          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Task Decomposition Group UI

```
┌─────────────────────────────────────────────────────────┐
│  CUSTOMER IN A STORE - Question 3                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Calculate Stock Level for Each Period          │
│                                                          │
│  Use the formula: Stock(t) = Stock(t-1) + Inflow(t) -  │
│                     Outflow(t)                          │
│                                                          │
│  Fill in the table:                                     │
│                                                          │
│  Period | Inflow | Outflow | Net Flow | Stock Level    │
│  -------|--------|---------|----------|----------------│
│    0    |   -    |    -    |    -     |  [10]          │
│    1    |   2    |    3    |  [____]  |  [____]        │
│    2    |   4    |    3    |  [____]  |  [____]        │
│    3    |   6    |    3    |  [____]  |  [____]        │
│    4    |   8    |    3    |  [____]  |  [____]        │
│    5    |   6    |    3    |  [____]  |  [____]        │
│    6    |   4    |    3    |  [____]  |  [____]        │
│    7    |   2    |    3    |  [____]  |  [____]        │
│                                                          │
│  [Calculate] [Check Answers]                            │
│                                                          │
│  Step 2: Identify Maximum Stock Period                  │
│                                                          │
│  Which period has the highest stock level?              │
│  Answer: [____]                                         │
│                                                          │
│  [Submit Final Answer]                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Final Results Screen

```
┌─────────────────────────────────────────────────────────┐
│  SIMULATION COMPLETE!                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINAL RESULTS                                           │
│  ┌──────────────────────────────────────┐               │
│  │ Total Questions:      10             │               │
│  │ Correct Answers:      7              │               │
│  │ Accuracy Rate:        70%            │               │               │
│  │                                      │               │
│  │ Average Time:         38.5 seconds   │               │
│  │                                      │               │
│  │ Improvement Trend:    Good ⬆️        │               │
│  │   First Half:  60%                   │               │
│  │   Second Half: 80%                   │               │
│  │                                      │               │
│  │ Correlation Heuristic:               │               │
│  │   Detected:    2 times (67% of errors)│               │
│  │   Status:      Moderate usage        │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  QUESTION-BY-QUESTION BREAKDOWN                         │
│  ┌──────────────────────────────────────┐               │
│  │ Q1: ✅ Correct  (12s)                │               │
│  │ Q2: ✅ Correct  (25s)                │               │
│  │ Q3: ❌ Wrong    (45s) ⚠️ Heuristic   │               │
│  │ Q4: ✅ Correct  (30s)                │               │
│  │ Q5: ✅ Correct  (28s)                │               │
│  │ Q6: ❌ Wrong    (52s)                │               │
│  │ Q7: ✅ Correct  (35s)                │               │
│  │ Q8: ✅ Correct  (40s)                │               │
│  │ Q9: ❌ Wrong    (60s) ⚠️ Heuristic   │               │
│  │ Q10: ✅ Correct (38s)                │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Review Answers] [Retake] [Exit]                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Graph Visualization Requirements

**Chart Library:** Chart.js, D3.js, or similar

**Required Elements:**
- **Inflow Line:** Blue color, solid line
- **Outflow Line:** Red color, solid line
- **X-Axis:** Time periods (0, 1, 2, 3, ...)
- **Y-Axis:** Flow rate (customers/hour, liters/min, etc.)
- **Grid Lines:** For easier reading
- **Interactive:** Hover to see exact values

**Optional Enhancements:**
- Show stock level line on same graph (different scale)
- Highlight crossover points
- Animate stock accumulation

---

## 🔌 API & Data Flow

### Initialization

```typescript
POST /api/sessions/:sessionId/games/customer-in-store/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config: {
    learningGroup: 'learning-by-doing' | 'task-decomposition' | 'binary-feedback',
    numQuestions?: number  // Default: 10
  }
}

Response: {
  success: true,
  state: {
    currentQuestionIndex: 0,
    totalQuestions: 10,
    currentQuestion: {
      id: 1,
      scenario: "Customers entering and leaving a store",
      inflowPattern: [2, 4, 6, 8, 6, 4, 2],
      outflowPattern: [3, 3, 3, 3, 3, 3, 3],
      difficulty: "easy"
    },
    score: 0,
    accuracyRate: 0,
    isComplete: false
  }
}
```

### Submit Answer

```typescript
POST /api/sessions/:sessionId/games/customer-in-store/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  answer: number,           // Period number (0-8)
  timeSpent: number,        // Seconds
  stockCalculation?: number[]  // For task-decomposition group
}

Response: {
  success: true,
  message: "✅ Correct! Stock peaks when inflow equals outflow.",
  data: {
    isCorrect: true,
    correctAnswer: 5,
    explanation: "...",      // Detailed explanation
    currentScore: 3,
    totalQuestions: 10,
    accuracyRate: 75,
    isComplete: false,
    nextQuestion: {
      id: 4,
      scenario: "...",
      inflowPattern: [...],
      outflowPattern: [...]
    }
  }
}
```

### Get Current State

```typescript
GET /api/sessions/:sessionId/games/customer-in-store/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentQuestionIndex: 3,
  totalQuestions: 10,
  currentQuestion: {...},
  score: 2,
  accuracyRate: 66.67,
  isComplete: false,
  learningGroup: "learning-by-doing"
}
```

### Get Final Results

```typescript
GET /api/sessions/:sessionId/games/customer-in-store/results
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  score: 7,
  totalQuestions: 10,
  accuracyRate: 70,
  averageTimePerQuestion: 38.5,
  improvementTrend: "Good improvement ⬆️",
  correlationHeuristicDetected: true,
  answers: [...],
  metrics: {
    firstHalfAccuracy: 60,
    secondHalfAccuracy: 80,
    improvement: 20,
    heuristicErrors: 2,
    totalErrors: 3
  }
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class CustomerInStoreEngine extends BaseGameEngine {
  private state: CustomerInStoreGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'customer-in-store');
  }
  
  // Core methods
  async initialize(config: CustomerInStoreConfig): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Question methods
  private generateQuestions(count: number): Question[]
  private generateSingleQuestion(id: number, difficulty: string, scenario: string): Question
  private calculateStockLevels(inflow: number[], outflow: number[]): number[]
  
  // Analysis methods
  private getExplanation(question: Question, playerAnswer: number): string
  private calculateImprovementTrend(): string
  private detectCorrelationHeuristic(): boolean
  
  // Helper methods
  private async saveGameState(): Promise<void>
}
```

### Stock Calculation with Examples

**Example 1: Easy Question**

```typescript
// Input
inflowPattern = [2, 4, 6, 8, 6, 4, 2]
outflowPattern = [3, 3, 3, 3, 3, 3, 3]
initialStock = 10

// Calculation
stockLevels = calculateStockLevels(inflowPattern, outflowPattern)
// Result: [10, 9, 10, 13, 18, 21, 22, 21]

// Maximum stock
maxStock = Math.max(...stockLevels)  // 22
maxPeriod = stockLevels.indexOf(maxStock)  // 6
```

**Example 2: Medium Question**

```typescript
// Input
inflowPattern = [1, 3, 5, 7, 9, 7, 5, 3, 1]
outflowPattern = [2, 2, 3, 4, 5, 6, 6, 5, 4]
initialStock = 10

// Calculation
Period 0: Stock = 10
Period 1: Stock = 10 + 1 - 2 = 9
Period 2: Stock = 9 + 3 - 2 = 10
Period 3: Stock = 10 + 5 - 3 = 12
Period 4: Stock = 12 + 7 - 4 = 15
Period 5: Stock = 15 + 9 - 5 = 19 ⭐ MAX
Period 6: Stock = 19 + 7 - 6 = 20
Period 7: Stock = 20 + 5 - 6 = 19
Period 8: Stock = 19 + 3 - 5 = 17
Period 9: Stock = 17 + 1 - 4 = 14

// Correct Answer: Period 5
```

### Explanation Generation

```typescript
private getExplanation(question: Question, playerAnswer: number): string {
  const stocks = this.calculateStockLevels(
    question.inflowPattern, 
    question.outflowPattern
  )
  const correctPeriod = question.correctAnswer
  
  // Build explanation table
  let explanation = "📊 Understanding Stock-Flow Dynamics:\n\n"
  explanation += "Stock(t) = Stock(t-1) + Inflow(t) - Outflow(t)\n\n"
  explanation += "Period | Inflow | Outflow | Net Flow | Stock Level\n"
  explanation += "-------|--------|---------|----------|------------\n"
  explanation += `  0   |   -    |    -    |    -     |   ${stocks[0]}\n`
  
  for (let i = 0; i < question.inflowPattern.length; i++) {
    const netFlow = question.inflowPattern[i] - question.outflowPattern[i]
    const stock = stocks[i + 1]
    const marker = i === correctPeriod - 1 ? " ⭐ MAX" : ""
    
    explanation += `  ${i + 1}   |   ${question.inflowPattern[i]}    |    ${question.outflowPattern[i]}    |   ${netFlow >= 0 ? '+' : ''}${netFlow}    |   ${stock.toFixed(1)}${marker}\n`
  }
  
  explanation += "\n🔑 Key Insight: Stock peaks when cumulative "
  explanation += "(inflow - outflow) is maximum, not when inflow peaks!\n"
  
  // Check for correlation heuristic
  if (playerAnswer !== correctPeriod) {
    const inflowPeak = question.inflowPattern.indexOf(
      Math.max(...question.inflowPattern)
    )
    if (playerAnswer === inflowPeak) {
      explanation += "\n⚠️ You fell for the correlation heuristic! "
      explanation += "Stock ≠ Flow rate.\n"
    }
  }
  
  return explanation
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1)

- [ ] Implement `CustomerInStoreEngine` class
- [ ] Create question generation system
- [ ] Implement stock level calculation
- [ ] Build answer validation
- [ ] Create explanation generator

### Phase 2: Learning Groups (Week 1-2)

- [ ] Implement learning-by-doing group
- [ ] Implement task-decomposition group
- [ ] Implement binary-feedback group
- [ ] Create group-specific UI flows
- [ ] Add group configuration

### Phase 3: Analytics (Week 2)

- [ ] Implement improvement trend calculation
- [ ] Build correlation heuristic detector
- [ ] Create performance metrics
- [ ] Add answer history tracking

### Phase 4: UI Development (Week 2-3)

- [ ] Design question display screen
- [ ] Build graph visualization component
- [ ] Create feedback/explanation display
- [ ] Implement task-decomposition UI
- [ ] Build results screen
- [ ] Add progress indicators

### Phase 5: Graph Visualization (Week 3)

- [ ] Integrate chart library (Chart.js/D3.js)
- [ ] Create inflow/outflow line charts
- [ ] Add stock level overlay (optional)
- [ ] Implement interactive hover
- [ ] Add crossover point highlighting

### Phase 6: API & Integration (Week 3)

- [ ] Create REST API endpoints
- [ ] Implement state persistence
- [ ] Build session management integration
- [ ] Add WebSocket for real-time updates (if needed)

### Phase 7: Testing & Refinement (Week 4)

- [ ] Unit tests for stock calculation
- [ ] Question generation validation
- [ ] Heuristic detection accuracy tests
- [ ] UI/UX testing
- [ ] Cross-browser testing

---

## 📝 Question Examples

### Easy Question Example

**Scenario:** Customers entering and leaving a store

**Graph Data:**
- Inflow: `[2, 4, 6, 8, 6, 4, 2]` customers/hour
- Outflow: `[3, 3, 3, 3, 3, 3, 3]` customers/hour
- Initial: 10 customers

**Calculation:**
```
Period 0: 10 customers
Period 1: 10 + 2 - 3 = 9
Period 2: 9 + 4 - 3 = 10
Period 3: 10 + 6 - 3 = 13
Period 4: 13 + 8 - 3 = 18
Period 5: 18 + 6 - 3 = 21
Period 6: 21 + 4 - 3 = 22 ⭐ MAX
Period 7: 22 + 2 - 3 = 21
```

**Correct Answer:** Period 6

**Common Wrong Answer:** Period 4 (when inflow peaks at 8)

### Medium Question Example

**Scenario:** Water flowing into and out of a reservoir

**Graph Data:**
- Inflow: `[1, 3, 5, 7, 9, 7, 5, 3, 1]` liters/min
- Outflow: `[2, 2, 3, 4, 5, 6, 6, 5, 4]` liters/min
- Initial: 100 liters

**Calculation:** (More complex, requires careful tracking)

**Correct Answer:** Varies based on patterns

### Hard Question Example

**Scenario:** Inventory arriving and being sold

**Graph Data:**
- Inflow: `[2, 5, 8, 6, 9, 7, 4, 6, 3, 2]` units/day
- Outflow: `[1, 2, 3, 5, 6, 8, 9, 7, 5, 3]` units/day
- Initial: 20 units

**Challenge:** Multiple peaks, counterintuitive results

---

## 🎓 Educational Integration

### Pre-Game Briefing (5 minutes)

1. **Explain Stock-Flow Concept**
   - Stocks vs. Flows distinction
   - Show simple example
   - Introduce correlation heuristic

2. **Demonstrate Common Mistake**
   - Show example where people get it wrong
   - Explain why the mistake happens

3. **Set Expectations**
   - This is harder than it looks
   - Even experts struggle
   - Focus on learning, not perfection

### During Game (20 minutes)

- Player completes 10 questions at their own pace
- Immediate feedback after each question
- Learning group determines feedback style

### Post-Game Debrief (10 minutes)

1. **Results Discussion**
   - Show accuracy rate
   - Discuss improvement trend
   - Highlight correlation heuristic usage

2. **Key Learnings**
   - Stock ≠ Flow pattern
   - Integration matters
   - Systematic approach helps

3. **Real-World Applications**
   - Inventory management
   - Financial planning
   - Population dynamics

---

## ✅ Implementation Checklist

### Backend
- [x] CustomerInStoreEngine class structure
- [x] Question generation system
- [x] Stock calculation algorithm
- [x] Answer validation
- [x] Explanation generator
- [x] Heuristic detection
- [x] Improvement tracking
- [ ] API endpoints
- [ ] Database schema

### Frontend
- [ ] Question display screen
- [ ] Graph visualization component
- [ ] Answer input interface
- [ ] Feedback/explanation display
- [ ] Task-decomposition UI (for Group 2)
- [ ] Results screen
- [ ] Progress indicators

### Testing
- [ ] Unit tests (stock calculation)
- [ ] Question generation tests
- [ ] Heuristic detection accuracy
- [ ] UI/UX testing
- [ ] Cross-browser testing

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
**Based on:** CustomerInStoreEngine.ts, Theory Documentation, Cognitive Science Research

---

*This document provides a complete blueprint for replicating the Customer In A Store simulation. All mechanics, flows, and logic are documented based on the engine implementation and cognitive science research.*
