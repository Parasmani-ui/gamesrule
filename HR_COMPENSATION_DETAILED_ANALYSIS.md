# To Pay or Not to Pay: An HR Compensation & Hiring Simulation - Complete Analysis & Replication Guide

**Simulation Name:** To Pay or Not to Pay: An HR Compensation & Hiring Simulation  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Multi-Criteria Decision Making (MCDM), Human Resource Management, Decision Analysis  
**Duration:** 30 minutes  
**Difficulty:** ⭐⭐⭐ (Intermediate)  
**Players:** 1 player (HR Manager)  
**Framework:** Expert Systems, Weighted Sum Model (WSM), Spearman's Rank Correlation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [Three-Stage Decision Process](#three-stage-decision-process)
7. [Scoring System](#scoring-system)
8. [Compensation Calculation](#compensation-calculation)
9. [Expert System](#expert-system)
10. [Attribute Weighting](#attribute-weighting)
11. [Candidate Ranking](#candidate-ranking)
12. [Scoring & Metrics](#scoring--metrics)
13. [Report Analysis](#report-analysis)
14. [UI/UX Requirements](#uiux-requirements)
15. [API & Data Flow](#api--data-flow)
16. [Implementation Details](#implementation-details)
17. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**To Pay or Not to Pay: An HR Compensation & Hiring Simulation** is a Multi-Criteria Decision Making (MCDM) simulation that teaches students how to make structured compensation and hiring decisions using expert systems, attribute weighting, and candidate ranking. Players learn to decompose complex HR decisions into manageable components and use systematic approaches to evaluate candidates and design compensation packages.

### Key Features

- ✅ **Three-stage decision process** (Expert Selection → Attribute Weighting → Candidate Ranking)
- ✅ **Expert system** with credibility scoring
- ✅ **Multi-criteria evaluation** with weighted attributes
- ✅ **Candidate ranking** with Spearman correlation
- ✅ **Compensation calculation** based on decision quality
- ✅ **Performance scoring** across all three stages
- ✅ **Optimal solution comparison** for learning

### Learning Outcomes

- Apply Multi-Criteria Decision Making (MCDM) methods
- Understand expert systems and credibility weighting
- Learn attribute-based evaluation
- Design compensation structures
- Use ranking and scoring algorithms
- Recognize bias in hiring decisions
- Make data-driven HR decisions

---

## 📚 Theoretical Foundation

### Core Concept: Multi-Criteria Decision Making (MCDM)

**MCDM Definition:**
A decision-making approach that evaluates alternatives based on multiple, often conflicting, criteria. In HR context, this involves systematically evaluating candidates using weighted attributes to make objective, defensible hiring decisions.

**Key Principle:** Complex decisions can be decomposed into weighted criteria.

**Decision Decomposition:**
```
Complex Decision: "Who should we hire and how much should we pay?"

Decomposed into:
1. Expert Selection: Which experts to consult?
2. Attribute Weighting: What criteria matter most?
3. Candidate Ranking: How do candidates compare?
```

### Expert Systems

**Definition:**
A system that uses expert knowledge and reasoning to solve problems in a specific domain. In this simulation, experts provide credibility-weighted advice on compensation decisions.

**Credibility Weighting:**
- Experts have credibility scores (0-1)
- Higher credibility → Better recommendations
- Average credibility determines expert selection score

### Weighted Sum Model (WSM)

**Formula:**
```
Score(candidate) = Σ [w(i) × attribute_score(i)]
Where:
- w(i) = weight of attribute i
- attribute_score(i) = candidate's score on attribute i
- Σ = sum over all attributes
```

**Application:**
- Calculate weighted scores for each candidate
- Rank candidates by weighted score
- Compare player ranking with optimal ranking

### Spearman's Rank Correlation

**Formula:**
```
ρ = 1 - (6 × Σd²) / (n × (n² - 1))
Where:
- d = difference in ranks
- n = number of candidates
- ρ = correlation coefficient (-1 to +1)
```

**Interpretation:**
- ρ = +1: Perfect positive correlation (identical rankings)
- ρ = 0: No correlation (random rankings)
- ρ = -1: Perfect negative correlation (opposite rankings)

**Use:** Measure how well player ranking matches optimal ranking.

---

## 🎮 Simulation Overview

### Game Setup

**Scenario:** HR Manager designing compensation package and ranking candidates  
**Base Salary:** ₹5,00,000  
**Maximum Compensation:** ₹9,50,000  
**Objective:** Maximize final compensation through good decisions

### Game Stages

**Stage 1: Expert Selection**
- Choose 1-4 experts from available pool
- Experts have varying credibility scores (hidden)
- Higher credibility experts → Better score

**Stage 2: Attribute Weighting**
- Assign weights to 5 attributes
- Weights must sum to 1.0 (100%)
- Closer to optimal weights → Better score

**Stage 3: Candidate Ranking**
- Rank 4 candidates based on weighted attributes
- Compare with optimal ranking
- Higher correlation → Better score

### Default Configuration

**Experts (4 available):**
- Dr. Sarah Johnson (Compensation Strategy) - Credibility: 0.9
- Prof. Raj Patel (Talent Acquisition) - Credibility: 0.85
- Ms. Emily Chen (Market Analysis) - Credibility: 0.7
- Mr. David Brown (Performance Metrics) - Credibility: 0.6

**Attributes (5 criteria):**
- Technical Skills (Optimal Weight: 0.35)
- Leadership Ability (Optimal Weight: 0.25)
- Experience (Years) (Optimal Weight: 0.20)
- Education (Optimal Weight: 0.10)
- Cultural Fit (Optimal Weight: 0.10)

**Candidates (4 candidates):**
- Alice Kumar (Optimal Rank: 1)
- Bob Martinez (Optimal Rank: 2)
- Carol Lee (Optimal Rank: 3)
- Dan Wilson (Optimal Rank: 4)

---

## 🔄 Complete Game Logic & Flow

### Initialization

```typescript
initialize(config) {
  // 1. Set default configuration
  config = {
    baseSalary: 500000,
    experts: [
      {
        id: 'exp1',
        name: 'Dr. Sarah Johnson',
        specialty: 'Compensation Strategy',
        credibility: 0.9,
        cost: 5000
      },
      // ... 3 more experts
    ],
    attributes: [
      {
        id: 'tech',
        name: 'Technical Skills',
        optimalWeight: 0.35
      },
      // ... 4 more attributes
    ],
    candidates: [
      {
        id: 'cand1',
        name: 'Alice Kumar',
        scores: { tech: 92, leadership: 85, experience: 78, education: 90, cultural: 88 },
        optimalRank: 1
      },
      // ... 3 more candidates
    ]
  }
  
  // 2. Initialize state
  state = {
    sessionId: sessionId,
    participantId: participantId,
    config: config,
    currentStage: 'expert-selection',
    selectedExperts: [],
    attributeWeights: {},
    candidateRanking: [],
    scores: {
      expertSelectionScore: 0,
      attributeWeightScore: 0,
      rankingMatchScore: 0,
      totalScore: 0
    },
    finalCompensation: 500000,
    isComplete: false
  }
}
```

### Game Flow

```
STEP 1: EXPERT SELECTION
├─ Display available experts
│   ├─ Name, Specialty, Cost
│   └─ Credibility (hidden)
│
├─ Player selects experts (1-4)
├─ Calculate expert selection score
│   Score = Average Credibility × ₹50,000
│
└─ Move to attribute weighting stage

STEP 2: ATTRIBUTE WEIGHTING
├─ Display attributes
├─ Player assigns weights (sum to 1.0)
├─ Calculate attribute weight score
│   Difference = Σ |player_weight - optimal_weight|
│   Score = (1 - Difference) × ₹1,00,000
│
└─ Move to candidate ranking stage

STEP 3: CANDIDATE RANKING
├─ Display candidates with attribute scores
├─ Player ranks candidates
├─ Calculate ranking match score
│   Correlation = Spearman(player_ranking, optimal_ranking)
│   Score = ((Correlation + 1) / 2) × ₹3,00,000
│
├─ Calculate final compensation
│   Final = Base + Expert + Attribute + Ranking
│
└─ Complete simulation
```

### Stage Processing

**Expert Selection:**
```typescript
handleExpertSelection(expertIds) {
  // 1. Validate selection
  if (expertIds.length === 0) {
    return error('Select at least one expert');
  }
  
  // 2. Get selected experts
  const selectedExperts = experts.filter(e => expertIds.includes(e.id));
  
  // 3. Calculate average credibility
  const avgCredibility = selectedExperts.reduce((sum, e) => 
    sum + e.credibility, 0) / selectedExperts.length;
  
  // 4. Calculate score
  expertSelectionScore = Math.round(avgCredibility * 50000);
  
  // 5. Update state
  state.selectedExperts = expertIds;
  state.currentStage = 'attribute-weighting';
  
  return success;
}
```

**Attribute Weighting:**
```typescript
handleAttributeWeighting(weights) {
  // 1. Validate weights sum to 1.0
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    return error('Weights must sum to 1.0');
  }
  
  // 2. Calculate weight difference
  let weightDifference = 0;
  for (const attr of attributes) {
    const playerWeight = weights[attr.id] || 0;
    weightDifference += Math.abs(playerWeight - attr.optimalWeight);
  }
  
  // 3. Calculate score
  attributeWeightScore = Math.max(0, Math.round((1 - weightDifference) * 100000));
  
  // 4. Update state
  state.attributeWeights = weights;
  state.currentStage = 'candidate-ranking';
  
  return success;
}
```

**Candidate Ranking:**
```typescript
handleCandidateRanking(ranking) {
  // 1. Validate ranking
  if (ranking.length !== candidates.length) {
    return error('Invalid ranking');
  }
  
  // 2. Calculate Spearman correlation
  const optimalRanking = candidates.sort((a, b) => 
    a.optimalRank - b.optimalRank).map(c => c.id);
  
  const correlation = spearmanCorrelation(ranking, optimalRanking);
  
  // 3. Calculate ranking match score
  rankingMatchScore = Math.round((correlation + 1) / 2 * 300000);
  
  // 4. Calculate final compensation
  totalScore = expertSelectionScore + attributeWeightScore + rankingMatchScore;
  finalCompensation = baseSalary + totalScore;
  
  // 5. Complete simulation
  state.candidateRanking = ranking;
  state.currentStage = 'complete';
  state.isComplete = true;
  
  return success;
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface HRCompensationGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    baseSalary: number;              // Default: 500000
    experts: Expert[];
    attributes: Attribute[];
    candidates: Candidate[];
  };
  
  currentStage: 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete';
  selectedExperts: string[];        // Expert IDs
  attributeWeights: { [attributeId: string]: number };  // Player-assigned weights
  candidateRanking: string[];        // Candidate IDs in rank order
  
  scores: {
    expertSelectionScore: number;    // 0-50000
    attributeWeightScore: number;    // 0-100000
    rankingMatchScore: number;      // 0-300000
    totalScore: number;              // Sum of above
  };
  
  finalCompensation: number;         // baseSalary + totalScore
  isComplete: boolean;
}
```

### Expert Structure

```typescript
interface Expert {
  id: string;
  name: string;
  specialty: string;
  credibility: number;  // 0-1 (hidden from player)
  cost: number;         // Displayed to player
}
```

### Attribute Structure

```typescript
interface Attribute {
  id: string;
  name: string;
  importance: number;      // Player-assigned (0-1)
  optimalWeight: number;   // Hidden optimal weight (0-1)
}
```

### Candidate Structure

```typescript
interface Candidate {
  id: string;
  name: string;
  scores: { [attributeId: string]: number };  // 0-100 for each attribute
  optimalRank: number;                        // Hidden correct ranking (1-4)
}
```

---

## 🎯 Three-Stage Decision Process

### Stage 1: Expert Selection

**Objective:** Choose experts with high credibility

**Available Experts:**
```
┌─────────────────────────────────────────────────┐
│ Expert              │ Specialty          │ Cost │
├─────────────────────┼────────────────────┼──────┤
│ Dr. Sarah Johnson   │ Compensation       │ ₹5K  │
│ Prof. Raj Patel     │ Talent Acquisition│ ₹4K  │
│ Ms. Emily Chen      │ Market Analysis   │ ₹3K  │
│ Mr. David Brown     │ Performance Metrics│ ₹2K  │
└─────────────────────────────────────────────────┘
```

**Decision:**
- Select 1-4 experts
- Consider specialty relevance
- Balance cost vs. value

**Scoring:**
```
Expert Selection Score = Average Credibility × ₹50,000

Example:
- Selected: Dr. Sarah (0.9), Prof. Raj (0.85)
- Average: (0.9 + 0.85) / 2 = 0.875
- Score: 0.875 × ₹50,000 = ₹43,750
```

**Strategy:**
- Select high-credibility experts
- Consider multiple specialties
- Balance expert cost vs. score

### Stage 2: Attribute Weighting

**Objective:** Assign weights close to optimal weights

**Available Attributes:**
```
┌─────────────────────────┬──────────────────┐
│ Attribute                │ Optimal Weight   │
├─────────────────────────┼──────────────────┤
│ Technical Skills         │ 35%              │
│ Leadership Ability       │ 25%              │
│ Experience (Years)       │ 20%              │
│ Education                │ 10%              │
│ Cultural Fit             │ 10%              │
└─────────────────────────┴──────────────────┘
```

**Decision:**
- Assign weights to each attribute
- Weights must sum to 100%
- Reflect organizational priorities

**Scoring:**
```
Weight Difference = Σ |player_weight - optimal_weight|
Attribute Weight Score = (1 - Weight Difference) × ₹1,00,000

Example:
- Player weights: Tech=30%, Leadership=30%, Exp=20%, Edu=10%, Cultural=10%
- Differences: |30-35| + |30-25| + |20-20| + |10-10| + |10-10| = 10%
- Score: (1 - 0.10) × ₹1,00,000 = ₹90,000
```

**Strategy:**
- Prioritize technical skills (highest optimal weight)
- Balance leadership and experience
- Don't over-weight education or cultural fit

### Stage 3: Candidate Ranking

**Objective:** Rank candidates to match optimal ranking

**Candidates with Scores:**
```
┌──────────────┬──────┬───────────┬───────────┬──────────┬──────────┐
│ Candidate    │ Tech │ Leadership│ Experience│ Education│ Cultural │
├──────────────┼──────┼───────────┼───────────┼──────────┼──────────┤
│ Alice Kumar  │  92  │    85     │    78     │    90    │    88    │
│ Bob Martinez │  88  │    90     │    85     │    82    │    85    │
│ Carol Lee    │  85  │    75     │    90     │    88    │    80    │
│ Dan Wilson   │  78  │    82     │    75     │    85    │    90    │
└──────────────┴──────┴───────────┴───────────┴──────────┴──────────┘
```

**Optimal Ranking (Hidden):**
1. Alice Kumar (Rank 1)
2. Bob Martinez (Rank 2)
3. Carol Lee (Rank 3)
4. Dan Wilson (Rank 4)

**Decision:**
- Rank candidates based on weighted scores
- Consider all attributes
- Match optimal ranking

**Scoring:**
```
Spearman Correlation = 1 - (6 × Σd²) / (n × (n² - 1))
Ranking Match Score = ((Correlation + 1) / 2) × ₹3,00,000

Example:
- Player ranking: [Alice, Bob, Carol, Dan] (perfect match)
- Correlation: 1.0
- Score: ((1.0 + 1) / 2) × ₹3,00,000 = ₹3,00,000
```

**Strategy:**
- Calculate weighted scores for each candidate
- Rank by weighted score
- Consider all attributes, not just one

---

## 📊 Scoring System

### Score Components

**1. Expert Selection Score**
- **Range:** ₹0 - ₹50,000
- **Formula:** Average Credibility × ₹50,000
- **Max Score:** ₹50,000 (if all experts have credibility 1.0)
- **Weight:** 5.3% of total possible bonus

**2. Attribute Weight Score**
- **Range:** ₹0 - ₹1,00,000
- **Formula:** (1 - Weight Difference) × ₹1,00,000
- **Max Score:** ₹1,00,000 (if weights match optimal exactly)
- **Weight:** 10.5% of total possible bonus

**3. Ranking Match Score**
- **Range:** ₹0 - ₹3,00,000
- **Formula:** ((Spearman Correlation + 1) / 2) × ₹3,00,000
- **Max Score:** ₹3,00,000 (if ranking matches perfectly)
- **Weight:** 31.6% of total possible bonus

**Total Possible Bonus:** ₹4,50,000  
**Final Compensation Range:** ₹5,00,000 - ₹9,50,000

### Score Calculation Examples

**Example 1: Perfect Performance**
```
Expert Selection:
- Selected: Dr. Sarah (0.9), Prof. Raj (0.85)
- Average: 0.875
- Score: ₹43,750

Attribute Weighting:
- Player weights match optimal exactly
- Difference: 0%
- Score: ₹1,00,000

Candidate Ranking:
- Perfect match with optimal ranking
- Correlation: 1.0
- Score: ₹3,00,000

Total Score: ₹4,43,750
Final Compensation: ₹5,00,000 + ₹4,43,750 = ₹9,43,750
```

**Example 2: Average Performance**
```
Expert Selection:
- Selected: Ms. Emily (0.7), Mr. David (0.6)
- Average: 0.65
- Score: ₹32,500

Attribute Weighting:
- Player weights: Tech=30%, Leadership=30%, Exp=20%, Edu=10%, Cultural=10%
- Difference: 10%
- Score: ₹90,000

Candidate Ranking:
- Partial match (2 out of 4 correct)
- Correlation: 0.5
- Score: ₹2,25,000

Total Score: ₹3,47,500
Final Compensation: ₹5,00,000 + ₹3,47,500 = ₹8,47,500
```

**Example 3: Poor Performance**
```
Expert Selection:
- Selected: Mr. David (0.6) only
- Average: 0.6
- Score: ₹30,000

Attribute Weighting:
- Player weights: Tech=20%, Leadership=20%, Exp=20%, Edu=20%, Cultural=20%
- Difference: 30%
- Score: ₹70,000

Candidate Ranking:
- Poor match (opposite ranking)
- Correlation: -0.5
- Score: ₹75,000

Total Score: ₹1,75,000
Final Compensation: ₹5,00,000 + ₹1,75,000 = ₹6,75,000
```

---

## 💰 Compensation Calculation

### Formula

```
Final Compensation = Base Salary + Total Score

Where:
Total Score = Expert Selection Score + Attribute Weight Score + Ranking Match Score

Base Salary = ₹5,00,000
Max Total Score = ₹4,50,000
Max Final Compensation = ₹9,50,000
```

### Compensation Breakdown

```
┌─────────────────────────────────────────────────────────┐
│ COMPENSATION BREAKDOWN                                  │
├─────────────────────────────────────────────────────────┤
│ Base Salary:                    ₹5,00,000                │
│                                                          │
│ Bonuses:                                                 │
│ ├─ Expert Selection Score:      ₹43,750                 │
│ ├─ Attribute Weight Score:      ₹90,000                 │
│ └─ Ranking Match Score:         ₹2,25,000               │
│                                                          │
│ Total Bonus:                   ₹3,58,750                │
│                                                          │
│ FINAL COMPENSATION:             ₹8,58,750                │
│                                                          │
│ Performance Level:             Proficient ⭐⭐⭐         │
│ Percentage of Max:             90.4%                    │
└─────────────────────────────────────────────────────────┘
```

### Performance Levels

**Expertise Level Calculation:**
```
Percentage = (Final Compensation / ₹9,50,000) × 100

Levels:
- ≥90%: Expert Level ⭐⭐⭐⭐⭐
- ≥80%: Advanced ⭐⭐⭐⭐
- ≥70%: Proficient ⭐⭐⭐
- ≥60%: Intermediate ⭐⭐
- <60%: Beginner ⭐
```

---

## 👥 Expert System

### Expert Credibility

**Credibility Scores (Hidden):**
- Dr. Sarah Johnson: 0.9 (Highest)
- Prof. Raj Patel: 0.85 (High)
- Ms. Emily Chen: 0.7 (Moderate)
- Mr. David Brown: 0.6 (Lower)

**Scoring Impact:**
```
Expert Selection Score = Average Credibility × ₹50,000

Best Strategy:
- Select Dr. Sarah (0.9) + Prof. Raj (0.85)
- Average: 0.875
- Score: ₹43,750

Worst Strategy:
- Select Mr. David (0.6) only
- Average: 0.6
- Score: ₹30,000

Difference: ₹13,750 (27.5% of max expert score)
```

### Expert Selection Strategy

**Optimal Strategy:**
1. Select high-credibility experts
2. Consider multiple specialties
3. Balance cost vs. credibility

**Common Mistakes:**
- Selecting only low-credibility experts
- Ignoring specialty relevance
- Focusing only on cost

---

## ⚖️ Attribute Weighting

### Optimal Weights

**Default Optimal Weights:**
- Technical Skills: 35% (Highest priority)
- Leadership Ability: 25% (High priority)
- Experience: 20% (Moderate priority)
- Education: 10% (Lower priority)
- Cultural Fit: 10% (Lower priority)

**Rationale:**
- Technical skills most important for role
- Leadership important but secondary
- Experience valuable but not primary
- Education and cultural fit supporting factors

### Weight Scoring

**Calculation:**
```
Weight Difference = Σ |player_weight - optimal_weight|

Example:
- Optimal: Tech=35%, Leadership=25%, Exp=20%, Edu=10%, Cultural=10%
- Player: Tech=30%, Leadership=30%, Exp=20%, Edu=10%, Cultural=10%
- Differences: |30-35| + |30-25| + |20-20| + |10-10| + |10-10|
              = 5 + 5 + 0 + 0 + 0 = 10%

Score = (1 - 0.10) × ₹1,00,000 = ₹90,000
```

**Perfect Match:**
- If all weights match optimal exactly
- Difference: 0%
- Score: ₹1,00,000 (maximum)

**Poor Match:**
- If weights are far from optimal
- Difference: 50%+
- Score: ₹50,000 or less

---

## 🎯 Candidate Ranking

### Optimal Ranking Calculation

**Step 1: Calculate Weighted Scores**
```
For each candidate:
Weighted Score = Σ [optimal_weight × attribute_score]

Example (Alice Kumar):
- Tech: 0.35 × 92 = 32.2
- Leadership: 0.25 × 85 = 21.25
- Experience: 0.20 × 78 = 15.6
- Education: 0.10 × 90 = 9.0
- Cultural: 0.10 × 88 = 8.8
- Total: 86.85
```

**Step 2: Rank by Weighted Score**
```
Alice Kumar:   86.85 → Rank 1
Bob Martinez:  86.30 → Rank 2
Carol Lee:     83.50 → Rank 3
Dan Wilson:    79.80 → Rank 4
```

**Step 3: Compare with Player Ranking**
```
Spearman Correlation = 1 - (6 × Σd²) / (n × (n² - 1))

Where:
- d = difference in ranks for each candidate
- n = number of candidates (4)
```

### Ranking Examples

**Perfect Match:**
```
Player Ranking: [Alice, Bob, Carol, Dan]
Optimal Ranking: [Alice, Bob, Carol, Dan]

Differences: d₁=0, d₂=0, d₃=0, d₄=0
Σd² = 0
Correlation = 1 - 0 = 1.0
Score = ((1.0 + 1) / 2) × ₹3,00,000 = ₹3,00,000
```

**Partial Match:**
```
Player Ranking: [Bob, Alice, Carol, Dan]
Optimal Ranking: [Alice, Bob, Carol, Dan]

Differences: d₁=1, d₂=-1, d₃=0, d₄=0
Σd² = 1 + 1 + 0 + 0 = 2
Correlation = 1 - (6 × 2) / (4 × 15) = 1 - 0.2 = 0.8
Score = ((0.8 + 1) / 2) × ₹3,00,000 = ₹2,70,000
```

**Poor Match:**
```
Player Ranking: [Dan, Carol, Bob, Alice]
Optimal Ranking: [Alice, Bob, Carol, Dan]

Differences: d₁=3, d₂=1, d₃=-1, d₄=-3
Σd² = 9 + 1 + 1 + 9 = 20
Correlation = 1 - (6 × 20) / (4 × 15) = 1 - 2 = -1.0
Score = ((-1.0 + 1) / 2) × ₹3,00,000 = ₹0
```

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Expert Selection Score**
- **Definition:** Score based on selected experts' credibility
- **Range:** ₹0 - ₹50,000
- **Formula:** Average Credibility × ₹50,000
- **Target:** Maximize (select high-credibility experts)

#### 2. **Attribute Weight Score**
- **Definition:** Score based on how close weights are to optimal
- **Range:** ₹0 - ₹1,00,000
- **Formula:** (1 - Weight Difference) × ₹1,00,000
- **Target:** Maximize (match optimal weights)

#### 3. **Ranking Match Score**
- **Definition:** Score based on ranking correlation with optimal
- **Range:** ₹0 - ₹3,00,000
- **Formula:** ((Spearman Correlation + 1) / 2) × ₹3,00,000
- **Target:** Maximize (match optimal ranking)

#### 4. **Total Score**
- **Definition:** Sum of all three component scores
- **Range:** ₹0 - ₹4,50,000
- **Formula:** Expert + Attribute + Ranking
- **Target:** Maximize

#### 5. **Final Compensation**
- **Definition:** Base salary plus total score
- **Range:** ₹5,00,000 - ₹9,50,000
- **Formula:** Base Salary + Total Score
- **Target:** Maximize

#### 6. **Performance Level**
- **Definition:** Expertise level based on final compensation
- **Levels:** Beginner ⭐ to Expert Level ⭐⭐⭐⭐⭐
- **Calculation:** Percentage of maximum compensation
- **Target:** Achieve Expert Level (≥90%)

#### 7. **Spearman Correlation**
- **Definition:** Correlation between player and optimal ranking
- **Range:** -1.0 to +1.0
- **Formula:** Spearman's rank correlation coefficient
- **Target:** Maximize (closer to +1.0)

### Metrics Calculation

```typescript
computeMetrics() {
  return {
    finalCompensation: `₹${finalCompensation.toLocaleString('en-IN')}`,
    scoreBreakdown: {
      expertSelection: `₹${expertSelectionScore.toLocaleString('en-IN')}`,
      attributeWeighting: `₹${attributeWeightScore.toLocaleString('en-IN')}`,
      candidateRanking: `₹${rankingMatchScore.toLocaleString('en-IN')}`
    },
    percentageOfMax: ((finalCompensation / 950000) * 100).toFixed(2) + '%',
    expertiseLevel: getExpertiseLevel()
  };
}
```

---

## 📈 Report Analysis

### Comprehensive Performance Report

**Report Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  TO PAY OR NOT TO PAY - Performance Report               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  FINAL COMPENSATION                                      │
│  ┌──────────────────────────────────────┐               │
│  │ ₹8,58,750                              │               │
│  │ Performance Level: Proficient ⭐⭐⭐   │               │
│  │ Percentage of Max: 90.4%              │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  SCORE BREAKDOWN                                         │
│  ┌──────────────────────────────────────┐               │
│  │ Component              │ Score        │               │
│  ├────────────────────────┼──────────────┤               │
│  │ Expert Selection       │ ₹43,750      │               │
│  │ Attribute Weighting    │ ₹90,000      │               │
│  │ Candidate Ranking      │ ₹2,25,000    │               │
│  ├────────────────────────┼──────────────┤               │
│  │ Total Bonus            │ ₹3,58,750    │               │
│  │ Base Salary            │ ₹5,00,000    │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  STAGE 1: EXPERT SELECTION                              │
│  ┌──────────────────────────────────────┐               │
│  │ Selected Experts:                    │               │
│  │ • Dr. Sarah Johnson (Compensation)   │               │
│  │ • Prof. Raj Patel (Talent Acq.)      │               │
│  │                                        │               │
│  │ Average Credibility: 0.875            │               │
│  │ Score: ₹43,750                        │               │
│  │                                        │               │
│  │ Optimal Selection:                    │               │
│  │ • Dr. Sarah Johnson (0.9)              │               │
│  │ • Prof. Raj Patel (0.85)              │               │
│  │                                        │               │
│  │ Analysis: Excellent selection         │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  STAGE 2: ATTRIBUTE WEIGHTING                           │
│  ┌──────────────────────────────────────┐               │
│  │ Your Weights:                        │               │
│  │ • Technical Skills: 30%              │               │
│  │ • Leadership: 30%                    │               │
│  │ • Experience: 20%                      │               │
│  │ • Education: 10%                       │               │
│  │ • Cultural Fit: 10%                    │               │
│  │                                        │               │
│  │ Optimal Weights:                      │               │
│  │ • Technical Skills: 35%               │               │
│  │ • Leadership: 25%                     │               │
│  │ • Experience: 20%                       │               │
│  │ • Education: 10%                        │               │
│  │ • Cultural Fit: 10%                    │               │
│  │                                        │               │
│  │ Weight Difference: 10%                │               │
│  │ Score: ₹90,000                         │               │
│  │                                        │               │
│  │ Analysis: Good alignment, slight      │               │
│  │ under-weighting of technical skills   │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  STAGE 3: CANDIDATE RANKING                             │
│  ┌──────────────────────────────────────┐               │
│  │ Your Ranking:                        │               │
│  │ 1. Alice Kumar                        │               │
│  │ 2. Bob Martinez                        │               │
│  │ 3. Carol Lee                           │               │
│  │ 4. Dan Wilson                          │               │
│  │                                        │               │
│  │ Optimal Ranking:                      │               │
│  │ 1. Alice Kumar                         │               │
│  │ 2. Bob Martinez                         │               │
│  │ 3. Carol Lee                            │               │
│  │ 4. Dan Wilson                           │               │
│  │                                        │               │
│  │ Spearman Correlation: 1.0             │               │
│  │ Score: ₹2,25,000                       │               │
│  │                                        │               │
│  │ Analysis: Perfect ranking match!      │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  RECOMMENDATIONS                                         │
│  ┌──────────────────────────────────────┐               │
│  │ 1. Expert Selection: Excellent        │               │
│  │    • Selected high-credibility experts│               │
│  │    • Good specialty coverage          │               │
│  │                                        │               │
│  │ 2. Attribute Weighting: Good         │               │
│  │    • Close to optimal weights         │               │
│  │    • Consider increasing technical    │               │
│  │      skills weight to 35%             │               │
│  │                                        │               │
│  │ 3. Candidate Ranking: Perfect         │               │
│  │    • Matched optimal ranking exactly  │               │
│  │    • Excellent use of weighted scores │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Detailed Stage Analysis

**Stage 1: Expert Selection**
- Shows selected experts
- Reveals credibility scores (after completion)
- Compares with optimal selection
- Provides feedback

**Stage 2: Attribute Weighting**
- Shows player weights vs. optimal weights
- Calculates weight difference
- Identifies areas for improvement
- Provides recommendations

**Stage 3: Candidate Ranking**
- Shows player ranking vs. optimal ranking
- Calculates Spearman correlation
- Identifies ranking errors
- Provides weighted score analysis

---

## 🎨 UI/UX Requirements

### Stage 1: Expert Selection

```
┌─────────────────────────────────────────────────────────┐
│  STAGE 1: EXPERT SELECTION                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Select experts to consult for compensation advice:      │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ ☑ Dr. Sarah Johnson                   │               │
│  │   Specialty: Compensation Strategy    │               │
│  │   Cost: ₹5,000                        │               │
│  │                                        │               │
│  │ ☑ Prof. Raj Patel                     │               │
│  │   Specialty: Talent Acquisition        │               │
│  │   Cost: ₹4,000                        │               │
│  │                                        │               │
│  │ ☐ Ms. Emily Chen                      │               │
│  │   Specialty: Market Analysis          │               │
│  │   Cost: ₹3,000                        │               │
│  │                                        │               │
│  │ ☐ Mr. David Brown                     │               │
│  │   Specialty: Performance Metrics       │               │
│  │   Cost: ₹2,000                        │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Continue to Attribute Weighting]                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Stage 2: Attribute Weighting

```
┌─────────────────────────────────────────────────────────┐
│  STAGE 2: ATTRIBUTE WEIGHTING                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Assign weights to each attribute (must sum to 100%):   │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Attribute              │ Weight         │               │
│  ├────────────────────────┼────────────────┤               │
│  │ Technical Skills       │ [30] %         │               │
│  │ Leadership Ability      │ [30] %         │               │
│  │ Experience (Years)      │ [20] %         │               │
│  │ Education               │ [10] %         │               │
│  │ Cultural Fit            │ [10] %         │               │
│  ├────────────────────────┼────────────────┤               │
│  │ Total                   │ 100%           │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Continue to Candidate Ranking]                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Stage 3: Candidate Ranking

```
┌─────────────────────────────────────────────────────────┐
│  STAGE 3: CANDIDATE RANKING                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Rank candidates based on weighted attributes:          │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Candidate    │ Tech │ Lead │ Exp │ Edu │ Cult │       │
│  ├──────────────┼──────┼──────┼─────┼─────┼──────┤       │
│  │ Alice Kumar  │  92  │  85  │ 78  │ 90  │  88  │       │
│  │ Bob Martinez │  88  │  90  │ 85  │ 82  │  85  │       │
│  │ Carol Lee    │  85  │  75  │ 90  │ 88  │  80  │       │
│  │ Dan Wilson   │  78  │  82  │ 75  │ 85  │  90  │       │
│  └──────────────────────────────────────┘               │
│                                                          │
│  Drag to reorder:                                        │
│  1. [Alice Kumar ▼]                                      │
│  2. [Bob Martinez ▼]                                     │
│  3. [Carol Lee ▼]                                        │
│  4. [Dan Wilson ▼]                                       │
│                                                          │
│  [Submit Ranking & Calculate Compensation]             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Final Results View

```
┌─────────────────────────────────────────────────────────┐
│  FINAL RESULTS                                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  YOUR COMPENSATION: ₹8,58,750                            │
│  Performance Level: Proficient ⭐⭐⭐                     │
│                                                          │
│  Score Breakdown:                                        │
│  • Expert Selection: ₹43,750                             │
│  • Attribute Weighting: ₹90,000                          │
│  • Candidate Ranking: ₹2,25,000                          │
│                                                          │
│  [View Detailed Report]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialize Simulation

```typescript
POST /api/sessions/:sessionId/games/hr-compensation/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    baseSalary?: number,
    experts?: Expert[],
    attributes?: Attribute[],
    candidates?: Candidate[]
  }
}

Response: {
  success: true,
  state: {
    currentStage: 'expert-selection',
    baseSalary: 500000,
    experts: [...],
    attributes: [...],
    candidates: [...],
    isComplete: false
  }
}
```

### Submit Expert Selection

```typescript
POST /api/sessions/:sessionId/games/hr-compensation/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  stage: 'expert-selection',
  data: {
    expertIds: ['exp1', 'exp2']
  }
}

Response: {
  success: true,
  message: "Experts selected successfully",
  data: {
    selectedExperts: [...],
    expertScore: 43750,
    nextStage: 'attribute-weighting'
  }
}
```

### Submit Attribute Weights

```typescript
POST /api/sessions/:sessionId/games/hr-compensation/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  stage: 'attribute-weighting',
  data: {
    weights: {
      tech: 0.30,
      leadership: 0.30,
      experience: 0.20,
      education: 0.10,
      cultural: 0.10
    }
  }
}

Response: {
  success: true,
  message: "Attribute weights set successfully",
  data: {
    attributeWeightScore: 90000,
    nextStage: 'candidate-ranking'
  }
}
```

### Submit Candidate Ranking

```typescript
POST /api/sessions/:sessionId/games/hr-compensation/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  stage: 'candidate-ranking',
  data: {
    ranking: ['cand1', 'cand2', 'cand3', 'cand4']
  }
}

Response: {
  success: true,
  message: "Ranking submitted. Compensation calculated!",
  data: {
    rankingMatchScore: 225000,
    correlation: "1.000",
    totalScore: 358750,
    finalCompensation: 858750,
    breakdown: {
      expertSelectionScore: 43750,
      attributeWeightScore: 90000,
      rankingMatchScore: 225000
    },
    isComplete: true
  }
}
```

### Get Metrics

```typescript
GET /api/sessions/:sessionId/games/hr-compensation/metrics
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  finalCompensation: "₹8,58,750",
  scoreBreakdown: {
    expertSelection: "₹43,750",
    attributeWeighting: "₹90,000",
    candidateRanking: "₹2,25,000"
  },
  percentageOfMax: "90.40%",
  expertiseLevel: "Proficient ⭐⭐⭐"
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class HRCompensationEngine extends BaseGameEngine {
  private state: HRCompensationGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'hr-compensation');
  }
  
  // Core methods
  async initialize(config: Partial<HRCompensationConfig>): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // Stage handlers
  private handleExpertSelection(data: any): Promise<ActionResult>
  private handleAttributeWeighting(data: any): Promise<ActionResult>
  private handleCandidateRanking(data: any): Promise<ActionResult>
  
  // Helper methods
  private calculateRankCorrelation(): number
  private getExpertiseLevel(): string
  private generateExperts(): Expert[]
  private generateAttributes(): Attribute[]
  private generateCandidates(): Candidate[]
  private async saveGameState(): Promise<void>
}
```

### Spearman Correlation Implementation

```typescript
private calculateRankCorrelation(): number {
  const n = this.state.candidateRanking.length;
  
  // Get optimal ranking
  const optimalRanking = this.state.config.candidates
    .sort((a, b) => a.optimalRank - b.optimalRank)
    .map(c => c.id);
  
  // Calculate d² (squared difference in ranks)
  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const playerRank = this.state.candidateRanking.indexOf(optimalRanking[i]);
    const d = i - playerRank;
    sumD2 += d * d;
  }
  
  // Spearman's rho formula
  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));
  return rho;
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1)

- [x] Implement `HRCompensationEngine` class (✅ Complete)
- [x] Create state management structures (✅ Complete)
- [x] Implement three-stage flow (✅ Complete)
- [x] Build scoring system (✅ Complete)

### Phase 2: Scoring Logic (Week 1-2)

- [x] Implement expert selection scoring (✅ Complete)
- [x] Implement attribute weight scoring (✅ Complete)
- [x] Implement ranking match scoring (✅ Complete)
- [x] Build Spearman correlation function (✅ Complete)
- [x] Create compensation calculation (✅ Complete)

### Phase 3: UI Development (Week 2-3)

- [ ] Design three-stage wizard interface
- [ ] Build expert selection UI
- [ ] Create attribute weighting interface
- [ ] Design candidate ranking interface
- [ ] Build results visualization
- [ ] Create performance report view

### Phase 4: Advanced Features (Week 3)

- [ ] Implement optimal solution reveal
- [ ] Build comparison visualizations
- [ ] Create feedback system
- [ ] Add performance level badges

### Phase 5: Testing & Refinement (Week 4)

- [ ] Unit tests for calculations
- [ ] Integration tests for stages
- [ ] Validation tests for inputs
- [ ] Performance testing
- [ ] UI/UX testing

### Phase 6: Documentation (Week 4)

- [x] Theory documentation (✅ Complete)
- [x] Implementation guide (✅ Complete)
- [ ] API documentation
- [ ] User manual
- [ ] Facilitator guide

---

## 📝 Example Scenarios

### Scenario 1: Perfect Performance

**Expert Selection:**
- Selected: Dr. Sarah (0.9), Prof. Raj (0.85)
- Average Credibility: 0.875
- Score: ₹43,750

**Attribute Weighting:**
- Weights match optimal exactly
- Difference: 0%
- Score: ₹1,00,000

**Candidate Ranking:**
- Perfect match with optimal
- Correlation: 1.0
- Score: ₹3,00,000

**Final Compensation:** ₹9,43,750 (99.3% of max)

### Scenario 2: Average Performance

**Expert Selection:**
- Selected: Ms. Emily (0.7), Mr. David (0.6)
- Average Credibility: 0.65
- Score: ₹32,500

**Attribute Weighting:**
- Weights: Tech=30%, Leadership=30%, Exp=20%, Edu=10%, Cultural=10%
- Difference: 10%
- Score: ₹90,000

**Candidate Ranking:**
- Partial match (2/4 correct)
- Correlation: 0.5
- Score: ₹2,25,000

**Final Compensation:** ₹8,47,500 (89.2% of max)

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **MCDM Introduction**
   - Explain multi-criteria decision making
   - Show decision decomposition
   - Discuss expert systems

2. **Three-Stage Process**
   - Expert selection
   - Attribute weighting
   - Candidate ranking

3. **Objectives**
   - Maximize final compensation
   - Make systematic decisions
   - Learn from optimal solutions

### During Game (30 minutes)

- Stage 1: Select experts (5 min)
- Stage 2: Assign attribute weights (10 min)
- Stage 3: Rank candidates (10 min)
- Review results (5 min)

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final compensation
   - Break down scores
   - Reveal optimal solutions

2. **Decision Discussion**
   - Why did you select those experts?
   - How did you assign weights?
   - What influenced your ranking?

3. **Key Learnings**
   - Systematic approaches outperform intuition
   - Expert credibility matters
   - Weight alignment is crucial
   - Structured decisions are defensible

---

## ✅ Implementation Checklist

### Backend
- [x] HRCompensationEngine class (✅ Complete)
- [x] State management (✅ Complete)
- [x] Three-stage flow (✅ Complete)
- [x] Expert selection scoring (✅ Complete)
- [x] Attribute weight scoring (✅ Complete)
- [x] Ranking match scoring (✅ Complete)
- [x] Spearman correlation (✅ Complete)
- [x] Compensation calculation (✅ Complete)
- [x] API endpoints (✅ Complete)
- [x] Database schema (✅ Complete)

### Frontend
- [ ] Three-stage wizard
- [ ] Expert selection interface
- [ ] Attribute weighting interface
- [ ] Candidate ranking interface
- [ ] Results visualization
- [ ] Performance report view

<!-- ### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (stages)
- [ ] Validation tests (inputs)
- [ ] Performance testing
- [ ] UI/UX testing -->

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
**Based on:** HRCompensationEngine.ts (complete implementation), Theory Documentation, MCDM Principles

---

*This document provides a complete blueprint for replicating the HR Compensation simulation. All mechanics, flows, scoring, and report analysis are documented based on the complete implementation and MCDM theory principles.*
