# Defect Detectives: A Quality Control Simulation - Complete Analysis & Replication Guide

**Simulation Name:** Defect Detectives: A Quality Control Simulation  
**Authors:** Dr. Arvind Shroff, Dr. Soumyadeep Kundu  
**Category:** Quality Management, Statistical Process Control, Six Sigma  
**Duration:** 45 minutes  
**Difficulty:** ⭐⭐⭐⭐ (Advanced)  
**Players:** 1 player (QC Lead role)  
**Framework:** Statistical Quality Control (SQC), 7 QC Tools

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Theoretical Foundation](#theoretical-foundation)
3. [Simulation Overview](#simulation-overview)
4. [Complete Game Logic & Flow](#complete-game-logic--flow)
5. [State Management](#state-management)
6. [The 7 QC Tools](#the-7-qc-tools)
7. [Inspection Strategies](#inspection-strategies)
8. [Control Charts & Statistical Process Control](#control-charts--statistical-process-control)
9. [Cost-Benefit Analysis](#cost-benefit-analysis)
10. [Defect Reduction System](#defect-reduction-system)
11. [Scoring & Metrics](#scoring--metrics)
12. [UI/UX Requirements](#uiux-requirements)
13. [API & Data Flow](#api--data-flow)
14. [Implementation Details](#implementation-details)
15. [Replication Roadmap](#replication-roadmap)

---

## 🎯 Executive Summary

**Defect Detectives: A Quality Control Simulation** is a statistical quality control simulation that teaches students how to use the 7 QC Tools to identify root causes of defects, reduce defect rates, and optimize inspection strategies. Players analyze defect data, apply quality control tools, set inspection strategies, and balance inspection costs against defect costs to achieve target quality levels.

### Key Features

- ✅ **7 QC Tools** (Check Sheet, Histogram, Pareto Chart, Fishbone Diagram, Scatter Plot, Flowchart, Control Chart)
- ✅ **Inspection strategies** (100% inspection, sampling, no inspection)
- ✅ **Control charts** with UCL/LCL calculation
- ✅ **Cost-benefit analysis** (inspection costs vs. defect costs)
- ✅ **Defect reduction** through tool application (5-18% per tool)
- ✅ **Batch processing** (20 batches, 1000 units each)
- ✅ **Statistical process control** principles

### Learning Outcomes

- Understand Statistical Quality Control (SQC) principles
- Master the 7 QC Tools for root cause analysis
- Design inspection strategies and sampling plans
- Calculate cost trade-offs between inspection and defects
- Interpret control charts and identify out-of-control processes
- Understand Type I and Type II errors in quality decisions

---

## 📚 Theoretical Foundation

### Core Concept: Statistical Quality Control (SQC)

**Statistical Quality Control (SQC):**
A methodology that uses statistical methods to monitor and control quality in manufacturing processes. It distinguishes between:
- **Common Cause Variation:** Inherent process variation (normal)
- **Special Cause Variation:** Unusual events causing defects (abnormal)

**Key Principle:** Variation is inherent in all processes; control limits help separate common causes from special causes.

### The 7 QC Tools

**History:** Developed by Kaoru Ishikawa in the 1960s as fundamental tools for quality improvement.

**1. Check Sheet**
- **Purpose:** Data collection and organization
- **Use:** Record defect occurrences by category
- **Output:** Structured data table

**2. Histogram**
- **Purpose:** Distribution visualization
- **Use:** Show frequency distribution of defects
- **Output:** Bar chart showing defect patterns

**3. Pareto Chart**
- **Purpose:** 80/20 rule identification
- **Use:** Identify "vital few" defect types causing most problems
- **Output:** Bar chart sorted by frequency with cumulative line

**4. Fishbone Diagram (Ishikawa Diagram)**
- **Purpose:** Root cause analysis
- **Use:** Identify potential causes of defects
- **Categories:** Man, Machine, Material, Method, Measurement, Environment
- **Output:** Cause-and-effect diagram

**5. Scatter Plot**
- **Purpose:** Correlation analysis
- **Use:** Identify relationships between variables
- **Output:** X-Y plot showing correlation

**6. Flowchart**
- **Purpose:** Process mapping
- **Use:** Visualize process steps and identify bottlenecks
- **Output:** Process flow diagram

**7. Control Chart**
- **Purpose:** Process control and monitoring
- **Use:** Monitor process stability over time
- **Output:** Time-series chart with control limits

### Control Chart Theory

**Control Limits:**
```
Upper Control Limit (UCL) = μ + 3σ
Center Line (CL) = μ
Lower Control Limit (LCL) = μ - 3σ

Where:
μ = Process mean
σ = Process standard deviation
```

**3-Sigma Rule:**
- 99.73% of data points should fall within ±3σ
- Points outside limits indicate special causes
- Process is "in control" when all points are within limits

**Out-of-Control Indicators:**
1. Point outside UCL or LCL
2. 7 consecutive points on one side of center line
3. Trend (7 consecutive points increasing/decreasing)
4. Cycle pattern

### Type I and Type II Errors

**Type I Error (α) - False Positive:**
- **Definition:** Rejecting a good batch (Producer's risk)
- **Impact:** Unnecessary rework, increased costs
- **Example:** Batch has 2% defects but inspection incorrectly flags it

**Type II Error (β) - False Negative:**
- **Definition:** Accepting a bad batch (Consumer's risk)
- **Impact:** Defects reach customer, reputation damage
- **Example:** Batch has 8% defects but inspection incorrectly accepts it

**Trade-off:** Reducing one error type increases the other. Optimal sampling plans balance both risks.

### Cost of Quality

**Total Quality Cost Model:**
```
Total Quality Cost = Prevention + Appraisal + Internal Failure + External Failure
```

**1. Prevention Costs:**
- Quality planning
- Training
- Process design
- Supplier qualification
- **Goal:** Prevent defects from occurring

**2. Appraisal Costs:**
- Inspection
- Testing
- Quality audits
- Calibration
- **Goal:** Detect defects before they reach customer

**3. Internal Failure Costs:**
- Scrap
- Rework
- Downtime
- **Found:** Before customer receives product

**4. External Failure Costs:**
- Warranty claims
- Returns
- Reputation damage
- Lost customers
- **Found:** After customer receives product

**Cost Ratio:** External failure costs are typically 10-100x higher than prevention costs.

---

## 🎮 Simulation Overview

### Game Setup

**Duration:** 20 batches (configurable)  
**Batch Size:** 1000 units per batch  
**Initial Defect Rate:** 8.0% (configurable)  
**Target Defect Rate:** 2.0% (configurable)  
**Goal:** Reduce defect rate from 8% to 2% using QC tools

### Initial Configuration

**Default Settings:**
- **Number of Batches:** 20
- **Initial Defect Rate:** 8.0%
- **Target Defect Rate:** 2.0%
- **Inspection Cost per Unit:** $2
- **Defect Cost per Unit:** $50 (cost of letting defect reach customer)
- **Initial Inspection Strategy:** Sampling (50 units per batch)

### Defect Data Structure

**Defect Data Fields:**
- **Batch ID:** Sequential batch number
- **Shift:** A, B, or C
- **Operator:** John, Mary, Bob, Alice, Charlie
- **Machine:** M1, M2, M3, M4
- **Defect Type:** Scratch, Dent, Misalignment, Color defect, Size error
- **Defect Count:** Number of defects found
- **Sample Size:** Units inspected (typically 100)
- **Timestamp:** When batch was produced

### Game Flow

```
1. EXPLORE DATA
   ├─ View defect data (10 initial batches)
   ├─ Analyze patterns
   └─ Identify potential root causes

2. APPLY QC TOOLS
   ├─ Select tool from 7 QC Tools
   ├─ Analyze data with tool
   ├─ Receive insight
   └─ Defect rate reduces (5-18% per tool)

3. SET INSPECTION STRATEGY
   ├─ Choose: 100%, Sampling, or None
   ├─ If sampling: Set sample size
   └─ Strategy affects costs and defect detection

4. PROCESS BATCHES
   ├─ Process batch (1000 units)
   ├─ Calculate inspection costs
   ├─ Calculate defect costs
   ├─ Update control chart
   └─ Repeat for 20 batches

5. ACHIEVE TARGET
   ├─ Reduce defect rate to ≤2%
   ├─ Minimize total costs
   └─ Get performance grade
```

---

## 🔄 Complete Game Logic & Flow

### Initialization

```typescript
initialize(config) {
  // 1. Set default configuration
  config = {
    numBatches: 20,
    initialDefectRate: 8.0%,
    targetDefectRate: 2.0%,
    inspectionCostPerUnit: $2,
    defectCostPerUnit: $50
  }
  
  // 2. Generate initial defect data (10 batches)
  defectData = generateDefectData(10, 8.0%)
  
  // 3. Initialize state
  state = {
    currentBatch: 10,  // Start at batch 10 (have 10 historical batches)
    currentDefectRate: 8.0%,
    toolsApplied: [],
    inspectionStrategy: 'sampling',
    sampleSize: 50,
    totalCost: 0,
    defectsDetected: 0,
    defectsPassedToCustomer: 0,
    controlChartData: []
  }
}
```

### Main Game Loop

```
FOR each batch (11 to 20):

  STEP 1: PLAYER ACTIONS
  ├─ Apply QC Tool (optional)
  │   ├─ Select tool from 7 QC Tools
  │   ├─ Tool not already applied
  │   ├─ Calculate tool impact
  │   ├─ Reduce defect rate (5-18%)
  │   └─ Record insight
  │
  ├─ Set Inspection Strategy (optional)
  │   ├─ Choose: 100%, Sampling, or None
  │   ├─ If sampling: Set sample size
  │   └─ Update strategy
  │
  └─ Process Batch
      ├─ Calculate defects in batch
      ├─ Apply inspection strategy
      ├─ Calculate costs
      └─ Update metrics

  STEP 2: BATCH PROCESSING
  ├─ Calculate defect count
  │   defectCount = batchSize × (currentDefectRate / 100)
  │
  ├─ Apply inspection strategy
  │   IF strategy = '100%':
  │     ├─ inspectionCost = batchSize × $2
  │     ├─ defectsDetected = defectCount
  │     └─ defectsPassedToCustomer = 0
  │
  │   IF strategy = 'sampling':
  │     ├─ inspectionCost = sampleSize × $2
  │     ├─ sampleDefects = sampleSize × (defectRate / 100)
  │     ├─ IF sampleDefects > 0:
  │     │   ├─ defectsDetected = defectCount × 0.7 (catch 70%)
  │     │   └─ defectsPassedToCustomer = defectCount × 0.3
  │     └─ ELSE:
  │         └─ defectsPassedToCustomer = defectCount (all pass)
  │
  │   IF strategy = 'none':
  │     ├─ inspectionCost = 0
  │     ├─ defectsDetected = 0
  │     └─ defectsPassedToCustomer = defectCount
  │
  ├─ Calculate costs
  │   defectCost = defectsPassedToCustomer × $50
  │   batchCost = inspectionCost + defectCost
  │
  ├─ Update cumulative metrics
  │   totalCost += batchCost
  │   defectsDetected += defectsDetected
  │   defectsPassedToCustomer += defectsPassedToCustomer
  │
  ├─ Update control chart
  │   ├─ Calculate UCL/LCL from recent data
  │   ├─ Check if out of control
  │   └─ Add data point
  │
  └─ Advance to next batch

  STEP 3: CHECK COMPLETION
  └─ IF currentBatch >= numBatches:
      └─ isComplete = true
```

### QC Tool Application

```typescript
applyQCTool(tool, analysis) {
  // 1. Validate tool not already applied
  if (toolsApplied.includes(tool)) {
    return error: "Tool already applied"
  }
  
  // 2. Calculate tool impact
  result = calculateToolImpact(tool, analysis)
  // Returns: { reduction: 5-18%, insight: string }
  
  // 3. Reduce defect rate
  newDefectRate = currentDefectRate × (1 - reduction / 100)
  // Minimum: targetDefectRate (2%)
  currentDefectRate = max(targetDefectRate, newDefectRate)
  
  // 4. Record tool application
  toolsApplied.push({
    tool: tool,
    applied: true,
    insight: result.insight,
    defectReduction: result.reduction
  })
  
  return success
}
```

### Control Chart Calculation

```typescript
calculateControlLimits() {
  // Get last 10 data points
  recentData = controlChartData.slice(-10)
  
  // If insufficient data, use defaults
  if (recentData.length < 3) {
    return {
      ucl: initialDefectRate × 1.5,  // 12%
      lcl: max(0, initialDefectRate × 0.5)  // 4%
    }
  }
  
  // Calculate mean
  mean = sum(recentData.defectRate) / recentData.length
  
  // Calculate standard deviation
  variance = sum((defectRate - mean)²) / recentData.length
  stdDev = sqrt(variance)
  
  // Calculate limits
  return {
    ucl: mean + 3 × stdDev,
    lcl: max(0, mean - 3 × stdDev)
  }
}
```

---

## 💾 State Management

### Game State Structure

```typescript
interface DefectDetectivesGameState {
  sessionId: string;
  participantId: string;
  
  config: {
    numBatches: number;              // Default: 20
    initialDefectRate: number;        // Default: 8.0%
    inspectionCostPerUnit: number;    // Default: $2
    defectCostPerUnit: number;        // Default: $50
    targetDefectRate: number;         // Default: 2.0%
  };
  
  currentBatch: number;               // Current batch number (10-20)
  
  defectData: DefectData[];           // Historical defect data
  
  toolsApplied: QCToolResult[];       // Applied QC tools
  
  currentDefectRate: number;          // Current defect rate (%)
  
  inspectionStrategy: '100%' | 'sampling' | 'none';
  sampleSize: number;                 // If sampling: sample size
  
  totalCost: number;                  // Cumulative total cost
  defectsDetected: number;             // Total defects caught
  defectsPassedToCustomer: number;    // Total defects that reached customer
  
  controlChartData: {
    batchId: number;
    defectRate: number;
    ucl: number;
    lcl: number;
    outOfControl: boolean;
  }[];
  
  isComplete: boolean;
}
```

### Defect Data Structure

```typescript
interface DefectData {
  batchId: number;
  shift: 'A' | 'B' | 'C';
  operator: string;                   // John, Mary, Bob, Alice, Charlie
  machine: string;                     // M1, M2, M3, M4
  defectType: string;                  // Scratch, Dent, Misalignment, Color defect, Size error
  defectCount: number;
  sampleSize: number;                  // Typically 100
  timestamp: Date;
}
```

### QC Tool Result Structure

```typescript
interface QCToolResult {
  tool: string;                        // One of 7 QC Tools
  applied: boolean;                    // Always true when applied
  insight: string;                     // Tool-specific insight
  defectReduction: number;             // Percentage reduction (5-18%)
}
```

---

## 🛠️ The 7 QC Tools

### Tool 1: Check Sheet

**Purpose:** Data collection and organization  
**Defect Reduction:** 5%  
**Insight:** "Data collection revealed Shift B has 30% more defects than other shifts."

**How It Works:**
- Organizes defect data by category
- Reveals patterns in data collection
- Identifies data gaps

**Example Output:**
```
Check Sheet Results:
┌──────────┬─────────┬─────────┬─────────┐
│ Category │ Shift A │ Shift B │ Shift C │
├──────────┼─────────┼─────────┼─────────┤
│ Scratch  │   12    │   18    │   10    │
│ Dent     │    8    │   15    │    7    │
│ Misalign │   10    │   20    │    9    │
└──────────┴─────────┴─────────┴─────────┘

Insight: Shift B has consistently higher defects.
```

### Tool 2: Histogram

**Purpose:** Distribution visualization  
**Defect Reduction:** 8%  
**Insight:** "Distribution shows defect clustering around specific machines."

**How It Works:**
- Shows frequency distribution of defects
- Identifies clustering patterns
- Reveals normal vs. abnormal distributions

**Example Output:**
```
Histogram: Defects by Machine
M1: ████████░░░░░░░░░░░░ (8 defects)
M2: ████████████████░░░░ (18 defects) ← Peak
M3: ██████░░░░░░░░░░░░░░ (6 defects)
M4: ████████░░░░░░░░░░░░ (8 defects)

Insight: Machine M2 has significantly more defects.
```

### Tool 3: Pareto Chart

**Purpose:** 80/20 rule identification  
**Defect Reduction:** 15% (Most effective)  
**Insight:** "80% of defects come from 2 defect types: Scratch and Misalignment."

**How It Works:**
- Sorts defects by frequency
- Identifies "vital few" causes
- Shows cumulative percentage

**Example Output:**
```
Pareto Chart: Defects by Type
┌─────────────────────────────────────────┐
│ Scratch:        ████████████ 45 (45%)  │
│ Misalignment:    ████████ 30 (75%)      │ ← 80% threshold
│ Dent:            ████ 15 (90%)           │
│ Color defect:    ██ 7 (97%)             │
│ Size error:      █ 3 (100%)              │
└─────────────────────────────────────────┘

Insight: Focus on Scratch and Misalignment for maximum impact.
```

### Tool 4: Fishbone Diagram

**Purpose:** Root cause analysis  
**Defect Reduction:** 12%  
**Insight:** "Root cause identified: Machine M2 calibration drift."

**How It Works:**
- Categorizes potential causes
- Identifies root causes
- Visualizes cause-and-effect relationships

**Example Output:**
```
Fishbone Diagram: Why are defects high?

        Machine        │        Method
    ┌─────────────────┼─────────────────┐
    │ M2 calibration  │ Missing         │
    │ drift           │ inspection step │
    └─────────────────┼─────────────────┘
                      │
        ──────────────┼──────────────
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │   Material      │   Measurement   │
    │   Quality OK    │   Equipment OK  │
    └─────────────────┴─────────────────┘

Root Cause: Machine M2 calibration drift
```

### Tool 5: Scatter Plot

**Purpose:** Correlation analysis  
**Defect Reduction:** 7%  
**Insight:** "Strong correlation between operator experience and defect rate."

**How It Works:**
- Shows relationship between two variables
- Identifies correlations
- Reveals patterns

**Example Output:**
```
Scatter Plot: Operator Experience vs. Defect Rate

Defect Rate
   20% │                    ●
   15% │              ●   ●
   10% │        ●   ●
    5% │  ●   ●
    0% └──────────────────────────
       0    1    2    3    4    5
           Experience (years)

Insight: Less experienced operators have higher defect rates.
```

### Tool 6: Flowchart

**Purpose:** Process mapping  
**Defect Reduction:** 10%  
**Insight:** "Process mapping revealed inspection step was being skipped."

**How It Works:**
- Maps process steps
- Identifies bottlenecks
- Reveals missing steps

**Example Output:**
```
Flowchart: Manufacturing Process

Start → Material Prep → Assembly → [INSPECTION MISSING] → Packaging → Ship
                              │
                              └─ Defects pass through

Insight: Inspection step is being skipped, allowing defects to pass.
```

### Tool 7: Control Chart

**Purpose:** Process control and monitoring  
**Defect Reduction:** 18% (Most effective)  
**Insight:** "Process brought into statistical control; special causes eliminated."

**How It Works:**
- Monitors process over time
- Identifies out-of-control points
- Separates common vs. special causes

**Example Output:**
```
Control Chart: Defect Rate Over Time

Defect Rate (%)
   12% │──────────────────────────── UCL
   10% │
    8% │  ●   ●   ●   ●   ●   ●   ●   ●
    6% │
    4% │──────────────────────────── LCL
    2% │
    0% └──────────────────────────────────
        1  2  3  4  5  6  7  8  9  10
                    Batches

Insight: Process is in statistical control after tool application.
```

### Tool Effectiveness Summary

| Tool | Defect Reduction | Effectiveness | Best Use Case |
|------|-----------------|---------------|---------------|
| Control Chart | 18% | ⭐⭐⭐⭐⭐ | Process monitoring |
| Pareto Chart | 15% | ⭐⭐⭐⭐⭐ | Prioritization |
| Fishbone Diagram | 12% | ⭐⭐⭐⭐ | Root cause analysis |
| Flowchart | 10% | ⭐⭐⭐⭐ | Process improvement |
| Histogram | 8% | ⭐⭐⭐ | Pattern identification |
| Scatter Plot | 7% | ⭐⭐⭐ | Correlation analysis |
| Check Sheet | 5% | ⭐⭐ | Data organization |

**Optimal Strategy:** Apply all 7 tools for maximum reduction (cumulative effect).

---

## 🔍 Inspection Strategies

### Strategy 1: 100% Inspection

**Definition:** Inspect every unit in the batch

**Cost Calculation:**
```
inspectionCost = batchSize × inspectionCostPerUnit
               = 1000 × $2
               = $2,000 per batch
```

**Defect Detection:**
```
defectsDetected = defectCount (all defects found)
defectsPassedToCustomer = 0
```

**Pros:**
- ✅ Catches all defects
- ✅ Zero defects reach customer
- ✅ Highest quality assurance

**Cons:**
- ❌ Very expensive
- ❌ Time-consuming
- ❌ May not be cost-effective

**Best For:**
- Critical products (medical devices, aerospace)
- High defect cost scenarios
- Low production volumes

### Strategy 2: Sampling Inspection

**Definition:** Inspect a random sample from the batch

**Cost Calculation:**
```
inspectionCost = sampleSize × inspectionCostPerUnit
               = 50 × $2
               = $100 per batch
```

**Defect Detection:**
```
IF sample shows defects:
  defectsDetected = defectCount × 0.7 (catch 70%)
  defectsPassedToCustomer = defectCount × 0.3
ELSE:
  defectsPassedToCustomer = defectCount (all pass)
```

**Pros:**
- ✅ Cost-effective
- ✅ Reasonable defect detection
- ✅ Balanced approach

**Cons:**
- ⚠️ Some defects may pass through
- ⚠️ Sampling risk (Type II error)

**Best For:**
- Standard production
- Moderate defect costs
- Balanced cost-quality trade-off

**Sample Size Guidelines:**
- **Small (20-30):** Lower cost, higher risk
- **Medium (50-100):** Balanced (recommended)
- **Large (200+):** Higher cost, lower risk

### Strategy 3: No Inspection

**Definition:** Accept all units without inspection

**Cost Calculation:**
```
inspectionCost = 0
```

**Defect Detection:**
```
defectsDetected = 0
defectsPassedToCustomer = defectCount (all defects pass)
```

**Pros:**
- ✅ Zero inspection cost
- ✅ Fastest processing

**Cons:**
- ❌ All defects reach customer
- ❌ Highest defect costs
- ❌ Reputation risk

**Best For:**
- Very low defect rates (<1%)
- Low-value products
- Internal processes only

### Cost Comparison Example

**Scenario:** Batch of 1000 units, 5% defect rate (50 defects)

| Strategy | Inspection Cost | Defects Passed | Defect Cost | Total Cost |
|----------|----------------|----------------|-------------|------------|
| 100% | $2,000 | 0 | $0 | **$2,000** |
| Sampling (50) | $100 | 15 | $750 | **$850** |
| None | $0 | 50 | $2,500 | **$2,500** |

**Optimal Strategy:** Sampling (in this example)

### Decision Matrix

```
IF defectRate > 10%:
  → Use 100% inspection (high risk)
  
ELSE IF defectRate > 3%:
  → Use sampling (moderate risk)
  
ELSE IF defectRate < 1%:
  → Consider no inspection (low risk)
  
ELSE:
  → Use sampling (default)
```

---

## 📊 Control Charts & Statistical Process Control

### Control Chart Components

**Upper Control Limit (UCL):**
- Maximum acceptable process variation
- Calculated as: `μ + 3σ`
- Points above UCL indicate special causes

**Center Line (CL):**
- Process mean (average defect rate)
- Calculated as: `μ`
- Target for process performance

**Lower Control Limit (LCL):**
- Minimum acceptable process variation
- Calculated as: `μ - 3σ`
- Points below LCL may indicate improvement

### Control Limit Calculation

```typescript
calculateControlLimits() {
  // Get recent data (last 10 batches)
  recentData = controlChartData.slice(-10)
  
  // Calculate mean
  mean = sum(recentData.defectRate) / recentData.length
  
  // Calculate standard deviation
  variance = sum((defectRate - mean)²) / recentData.length
  stdDev = sqrt(variance)
  
  // Calculate limits
  ucl = mean + 3 × stdDev
  lcl = max(0, mean - 3 × stdDev)
  
  return { ucl, lcl }
}
```

### Out-of-Control Detection

**Rule 1: Point Outside Limits**
```
IF defectRate > UCL OR defectRate < LCL:
  → Process is OUT OF CONTROL
  → Special cause present
```

**Rule 2: Seven Points on One Side**
```
IF 7 consecutive points above CL:
  → Process shift upward
IF 7 consecutive points below CL:
  → Process shift downward
```

**Rule 3: Trend**
```
IF 7 consecutive points increasing:
  → Upward trend (deteriorating)
IF 7 consecutive points decreasing:
  → Downward trend (improving)
```

**Rule 4: Cycle Pattern**
```
IF repeating pattern detected:
  → Systematic variation
  → Special cause present
```

### Control Chart Example

```
Control Chart: Defect Rate Over 20 Batches

Defect Rate (%)
   12% │──────────────────────────── UCL (11.2%)
   10% │
    8% │  ●   ●   ●   ●   ●   ●   ●   ●   ●   ●
    6% │      ●   ●   ●   ●   ●   ●   ●   ●   ●
    4% │──────────────────────────── LCL (4.8%)
    2% │
    0% └──────────────────────────────────────────
        1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
                    Batches

Interpretation:
- Batches 1-10: Out of control (above UCL)
- Batches 11-20: In control (within limits)
- Process improved after QC tools applied
```

### Process Capability

**Capability Index (Cp):**
```
Cp = (USL - LSL) / (6σ)

Where:
USL = Upper Specification Limit
LSL = Lower Specification Limit
σ = Process standard deviation
```

**Capability Index (Cpk):**
```
Cpk = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)]

Interpretation:
Cpk > 1.33: Capable process
Cpk 1.0-1.33: Marginally capable
Cpk < 1.0: Not capable
```

---

## 💰 Cost-Benefit Analysis

### Cost Structure

**Total Cost per Batch:**
```
Total Cost = Inspection Cost + Defect Cost

Where:
Inspection Cost = Units Inspected × $2
Defect Cost = Defects Passed to Customer × $50
```

### Cost Calculation Examples

**Example 1: 100% Inspection**
```
Batch: 1000 units, 5% defect rate (50 defects)

Inspection Cost = 1000 × $2 = $2,000
Defects Detected = 50
Defects Passed = 0
Defect Cost = 0 × $50 = $0

Total Cost = $2,000 + $0 = $2,000
```

**Example 2: Sampling (50 units)**
```
Batch: 1000 units, 5% defect rate (50 defects)

Inspection Cost = 50 × $2 = $100
Sample Defects = 50 × (5% / 100) = 2.5 ≈ 3 defects
Defects Detected = 50 × 0.7 = 35 (catch 70%)
Defects Passed = 50 - 35 = 15
Defect Cost = 15 × $50 = $750

Total Cost = $100 + $750 = $850
```

**Example 3: No Inspection**
```
Batch: 1000 units, 5% defect rate (50 defects)

Inspection Cost = 0
Defects Detected = 0
Defects Passed = 50
Defect Cost = 50 × $50 = $2,500

Total Cost = $0 + $2,500 = $2,500
```

### Break-Even Analysis

**Break-even occurs when:**
```
Inspection Cost = Defect Cost Saved

For 100% inspection:
$2,000 = Defects Caught × $50
Defects Caught = 40

If batch has >40 defects, 100% inspection is cost-effective.
If batch has <40 defects, sampling is better.
```

### Optimal Strategy Selection

**Decision Rule:**
```
IF (defectRate × batchSize × defectCost) > (batchSize × inspectionCost):
  → Use 100% inspection
ELSE IF (defectRate × batchSize × defectCost × 0.3) > (sampleSize × inspectionCost):
  → Use sampling
ELSE:
  → Consider no inspection (if defect rate very low)
```

---

## 📉 Defect Reduction System

### Tool Impact Calculation

**Defect Rate Reduction:**
```typescript
newDefectRate = currentDefectRate × (1 - toolReduction / 100)

Example:
Current: 8.0%
Tool: Pareto Chart (15% reduction)
New: 8.0% × (1 - 15/100) = 8.0% × 0.85 = 6.8%
```

**Minimum Defect Rate:**
- Cannot go below target defect rate (2.0%)
- Tools continue to apply but rate caps at 2.0%

### Cumulative Effect

**Applying Multiple Tools:**
```
Initial: 8.0%

After Check Sheet (5%):    8.0% × 0.95 = 7.6%
After Histogram (8%):       7.6% × 0.92 = 6.99%
After Pareto (15%):         6.99% × 0.85 = 5.94%
After Fishbone (12%):       5.94% × 0.88 = 5.23%
After Scatter Plot (7%):    5.23% × 0.93 = 4.87%
After Flowchart (10%):      4.87% × 0.90 = 4.38%
After Control Chart (18%):  4.38% × 0.82 = 3.59%

Final: 3.59% (still above 2% target)
```

**Note:** Tools have diminishing returns when applied sequentially.

### Optimal Tool Sequence

**Recommended Order:**
1. **Check Sheet** - Organize data first
2. **Histogram** - Identify patterns
3. **Pareto Chart** - Prioritize (high impact)
4. **Fishbone Diagram** - Root cause analysis
5. **Scatter Plot** - Correlation analysis
6. **Flowchart** - Process improvement
7. **Control Chart** - Monitor and control (highest impact)

**Rationale:**
- Start with data organization
- Use Pareto to focus efforts
- Apply root cause analysis
- End with control chart for monitoring

---

## 📊 Scoring & Metrics

### Key Performance Indicators (KPIs)

#### 1. **Defect Rate Reduction**
- **Definition:** Percentage reduction from initial to current
- **Formula:** `((initial - current) / initial) × 100%`
- **Target:** ≥75% reduction (from 8% to 2%)

#### 2. **Target Achievement**
- **Definition:** Whether current defect rate ≤ target
- **Target:** Current ≤ 2.0%
- **Grade Impact:** Critical for "Excellent" grade

#### 3. **Tools Applied**
- **Definition:** Number of QC tools used
- **Range:** 0-7 tools
- **Target:** Apply all 7 tools

#### 4. **Total Cost**
- **Definition:** Cumulative cost across all batches
- **Components:** Inspection costs + Defect costs
- **Target:** Minimize

#### 5. **Cost per Batch**
- **Definition:** Average cost per batch
- **Formula:** `Total Cost / Number of Batches`
- **Target:** Minimize

#### 6. **Defect Detection Rate**
- **Definition:** Percentage of defects caught
- **Formula:** `(Defects Detected / Total Defects) × 100%`
- **Target:** Maximize

#### 7. **Defects Passed to Customer**
- **Definition:** Total defects that reached customer
- **Target:** Minimize (ideally 0)

### Performance Grading

```typescript
calculatePerformanceGrade(targetAchieved, reductionRate) {
  IF targetAchieved AND reductionRate >= 70:
    return 'Excellent (Six Sigma Level) ⭐⭐⭐⭐⭐'
  
  IF targetAchieved AND reductionRate >= 50:
    return 'Very Good ⭐⭐⭐⭐'
  
  IF reductionRate >= 40:
    return 'Good ⭐⭐⭐'
  
  IF reductionRate >= 25:
    return 'Fair ⭐⭐'
  
  ELSE:
    return 'Needs Improvement ⭐'
}
```

### Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  DEFECT DETECTIVES - Performance Metrics               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  DEFECT RATES                                            │
│  ┌──────────────────────────────────────┐               │
│  │ Initial:        8.00%                  │               │
│  │ Current:        3.59%                   │               │
│  │ Target:         2.00%                   │               │
│  │ Reduction:      55.13%                  │               │
│  │ Target Achieved: ❌ No                   │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  QC TOOLS                                                │
│  ┌──────────────────────────────────────┐               │
│  │ Applied:         7 / 7                │               │
│  │ Tools Used:      All tools applied     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  COSTS                                                   │
│  ┌──────────────────────────────────────┐               │
│  │ Total Cost:      $18,500              │               │
│  │ Cost per Batch: $925                  │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  DEFECTS                                                 │
│  ┌──────────────────────────────────────┐               │
│  │ Detected:        1,240                │               │
│  │ Passed to Customer: 360                │               │
│  │ Detection Rate:  77.5%                 │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  PERFORMANCE GRADE                                       │
│  ┌──────────────────────────────────────┐               │
│  │ Grade:           Good ⭐⭐⭐              │               │
│  │                  (Target not achieved) │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Requirements

### Main Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  DEFECT DETECTIVES - Batch 15 of 20                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CURRENT STATUS                                          │
│  ┌──────────────────────────────────────┐               │
│  │ Defect Rate:     3.59%                 │               │
│  │ Target:          2.00%                  │               │
│  │ Progress:       55.13% reduction        │               │
│  │ Status:          ⚠️ Above Target         │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  QC TOOLS (7/7 Applied)                                 │
│  ┌──────────────────────────────────────┐               │
│  │ ✅ Check Sheet      (5% reduction)     │               │
│  │ ✅ Histogram        (8% reduction)     │               │
│  │ ✅ Pareto Chart     (15% reduction)    │               │
│  │ ✅ Fishbone Diagram (12% reduction)    │               │
│  │ ✅ Scatter Plot     (7% reduction)     │               │
│  │ ✅ Flowchart        (10% reduction)    │               │
│  │ ✅ Control Chart    (18% reduction)    │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  INSPECTION STRATEGY                                     │
│  ┌──────────────────────────────────────┐               │
│  │ Current: Sampling (50 units)          │               │
│  │ [Change Strategy]                     │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Process Next Batch]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### QC Tool Selection Interface

```
┌─────────────────────────────────────────────────────────┐
│  APPLY QC TOOL                                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Available Tools:                                        │
│  ┌──────────────────────────────────────┐               │
│  │ ✅ Check Sheet      [Applied]         │               │
│  │ ✅ Histogram        [Applied]         │               │
│  │ ✅ Pareto Chart     [Applied]         │               │
│  │ ✅ Fishbone Diagram [Applied]         │               │
│  │ ✅ Scatter Plot     [Applied]         │               │
│  │ ✅ Flowchart        [Applied]         │               │
│  │ ✅ Control Chart    [Applied]          │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  All tools have been applied.                            │
│                                                          │
│  [Close]                                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tool Application Result

```
┌─────────────────────────────────────────────────────────┐
│  PARETO CHART APPLIED                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Tool Applied Successfully                            │
│                                                          │
│  Insight:                                                │
│  "80% of defects come from 2 defect types:              │
│   Scratch and Misalignment."                             │
│                                                          │
│  Impact:                                                 │
│  • Defect Reduction: 15%                                 │
│  • Previous Rate: 7.60%                                  │
│  • New Rate: 6.46%                                       │
│                                                          │
│  Tools Applied: 3 / 7                                    │
│                                                          │
│  [Continue]                                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Control Chart Visualization

```
┌─────────────────────────────────────────────────────────┐
│  CONTROL CHART - Defect Rate Over Time                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Defect Rate (%)                                         │
│   12% │──────────────────────────── UCL (11.2%)          │
│   10% │                                                    │
│    8% │  ●   ●   ●   ●   ●   ●   ●   ●   ●   ●          │
│    6% │      ●   ●   ●   ●   ●   ●   ●   ●   ●          │
│    4% │──────────────────────────── LCL (4.8%)           │
│    2% │                                                    │
│    0% └──────────────────────────────────────────         │
│        1  2  3  4  5  6  7  8  9  10 11 12 13 14 15      │
│                    Batches                                │
│                                                          │
│  Status: ✅ In Control (last 10 batches)                 │
│                                                          │
│  [View Details]                                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Inspection Strategy Selection

```
┌─────────────────────────────────────────────────────────┐
│  SET INSPECTION STRATEGY                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Select Strategy:                                        │
│  ┌──────────────────────────────────────┐               │
│  │ ⚪ 100% Inspection                    │               │
│  │    Cost: $2,000 per batch            │               │
│  │    Detection: 100%                    │               │
│  │                                        │               │
│  │ ⚫ Sampling Inspection                │               │
│  │    Cost: $100 per batch (50 units)   │               │
│  │    Detection: ~70%                    │               │
│  │    Sample Size: [50] units            │               │
│  │                                        │               │
│  │ ⚪ No Inspection                      │               │
│  │    Cost: $0 per batch                │               │
│  │    Detection: 0%                       │               │
│  └──────────────────────────────────────┘               │
│                                                          │
│  [Apply Strategy] [Cancel]                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Batch Processing Results

```
┌─────────────────────────────────────────────────────────┐
│  BATCH 15 PROCESSED                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Batch Details:                                          │
│  • Batch Size: 1,000 units                              │
│  • Defect Rate: 3.59%                                    │
│  • Defects in Batch: 36                                  │
│                                                          │
│  Inspection Results:                                     │
│  • Strategy: Sampling (50 units)                        │
│  • Inspection Cost: $100                                │
│  • Defects Detected: 25                                  │
│  • Defects Passed: 11                                    │
│  • Defect Cost: $550                                     │
│                                                          │
│  Batch Cost: $650                                        │
│  Cumulative Cost: $9,750                                 │
│                                                          │
│  Control Chart: ✅ In Control                           │
│                                                          │
│  [Process Next Batch] [View Metrics]                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 API & Data Flow

### Initialize Simulation

```typescript
POST /api/sessions/:sessionId/games/defect-detectives/initialize
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  config?: {
    numBatches?: number,              // Default: 20
    initialDefectRate?: number,       // Default: 8.0
    inspectionCostPerUnit?: number,    // Default: 2
    defectCostPerUnit?: number,        // Default: 50
    targetDefectRate?: number          // Default: 2.0
  }
}

Response: {
  success: true,
  state: {
    currentBatch: 10,
    maxBatches: 20,
    currentDefectRate: 8.0,
    targetDefectRate: 2.0,
    defectData: DefectData[],
    toolsApplied: [],
    inspectionStrategy: 'sampling',
    sampleSize: 50,
    totalCost: 0,
    isComplete: false
  }
}
```

### Apply QC Tool

```typescript
POST /api/sessions/:sessionId/games/defect-detectives/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  actionType: 'apply-qc-tool',
  data: {
    tool: 'Pareto Chart',
    analysis: { /* optional analysis data */ }
  }
}

Response: {
  success: true,
  message: "Pareto Chart applied successfully",
  data: {
    tool: 'Pareto Chart',
    insight: '80% of defects come from 2 defect types: Scratch and Misalignment.',
    defectReduction: '15%',
    newDefectRate: '6.46%',
    toolsAppliedCount: 3
  }
}
```

### Set Inspection Strategy

```typescript
POST /api/sessions/:sessionId/games/defect-detectives/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  actionType: 'set-inspection-strategy',
  data: {
    strategy: 'sampling',
    sampleSize: 50
  }
}

Response: {
  success: true,
  message: "Inspection strategy set to: sampling",
  data: {
    strategy: 'sampling',
    sampleSize: 50
  }
}
```

### Process Batch

```typescript
POST /api/sessions/:sessionId/games/defect-detectives/action
Headers: {
  Authorization: "Bearer {token}"
}
Body: {
  actionType: 'process-batch'
}

Response: {
  success: true,
  message: "Batch 15 processed",
  data: {
    batchId: 15,
    batchSize: 1000,
    defectCount: 36,
    defectsDetected: 25,
    defectsPassedToCustomer: 11,
    costs: {
      inspection: 100,
      defect: 550,
      total: 650
    },
    cumulativeCost: 9750,
    outOfControl: false,
    isComplete: false
  }
}
```

### Get Current State

```typescript
GET /api/sessions/:sessionId/games/defect-detectives/state
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  currentBatch: 15,
  maxBatches: 20,
  currentDefectRate: 3.59,
  targetDefectRate: 2.0,
  toolsApplied: ['Check Sheet', 'Histogram', 'Pareto Chart', ...],
  inspectionStrategy: 'sampling',
  sampleSize: 50,
  totalCost: 9750,
  isComplete: false
}
```

### Get Metrics (After Completion)

```typescript
GET /api/sessions/:sessionId/games/defect-detectives/metrics
Headers: {
  Authorization: "Bearer {token}"
}

Response: {
  defectRates: {
    initial: '8.00%',
    current: '3.59%',
    target: '2.00%',
    reductionRate: '55.13%'
  },
  targetAchieved: false,
  toolsApplied: '7 / 7',
  costs: {
    total: '$18,500',
    perBatch: '$925'
  },
  defects: {
    detected: 1240,
    passedToCustomer: 360,
    detectionRate: '77.5%'
  },
  performanceGrade: 'Good ⭐⭐⭐'
}
```

---

## 🛠️ Implementation Details

### Engine Class Structure

```typescript
export class DefectDetectivesEngine extends BaseGameEngine {
  private state: DefectDetectivesGameState;
  
  constructor(sessionId: string) {
    super(sessionId, 'defect-detectives');
  }
  
  // Core methods
  async initialize(config: Partial<DefectDetectivesConfig>): Promise<void>
  async applyAction(participantId: string, action: any): Promise<ActionResult>
  async advanceRound(): Promise<RoundResult>
  async computeMetrics(): Promise<any>
  
  // State methods
  getPublicState(): any
  getParticipantState(participantId: string): any
  
  // QC Tool methods
  private async applyQCTool(data: any): Promise<ActionResult>
  private calculateToolImpact(tool: string, analysis: any): QCToolResult
  
  // Inspection methods
  private async setInspectionStrategy(data: any): Promise<ActionResult>
  
  // Batch processing
  private async processBatch(): Promise<ActionResult>
  
  // Control chart methods
  private calculateControlLimits(): { ucl: number; lcl: number }
  
  // Helper methods
  private generateDefectData(count: number, defectRate: number): DefectData[]
  private calculatePerformanceGrade(targetAchieved: boolean, reductionRate: number): string
  private async saveGameState(): Promise<void>
}
```

### Batch Processing Logic

```typescript
private async processBatch(): Promise<ActionResult> {
  const batchSize = 1000
  const defectCount = Math.round(batchSize * (this.state.currentDefectRate / 100))
  
  let inspectionCost = 0
  let defectsDetected = 0
  let defectsPassedToCustomer = 0
  
  // Apply inspection strategy
  switch (this.state.inspectionStrategy) {
    case '100%':
      inspectionCost = batchSize * this.state.config.inspectionCostPerUnit
      defectsDetected = defectCount
      defectsPassedToCustomer = 0
      break
      
    case 'sampling':
      inspectionCost = this.state.sampleSize * this.state.config.inspectionCostPerUnit
      const sampleDefects = Math.round(
        this.state.sampleSize * (this.state.currentDefectRate / 100)
      )
      
      if (sampleDefects > 0) {
        // Catch 70% of defects through sampling
        defectsDetected = Math.round(defectCount * 0.7)
        defectsPassedToCustomer = defectCount - defectsDetected
      } else {
        // Sample shows no defects, all pass
        defectsPassedToCustomer = defectCount
      }
      break
      
    case 'none':
      inspectionCost = 0
      defectsDetected = 0
      defectsPassedToCustomer = defectCount
      break
  }
  
  // Calculate costs
  const defectCost = defectsPassedToCustomer * this.state.config.defectCostPerUnit
  const batchCost = inspectionCost + defectCost
  
  // Update cumulative metrics
  this.state.totalCost += batchCost
  this.state.defectsDetected += defectsDetected
  this.state.defectsPassedToCustomer += defectsPassedToCustomer
  
  // Update control chart
  const { ucl, lcl } = this.calculateControlLimits()
  const outOfControl = 
    this.state.currentDefectRate > ucl || 
    this.state.currentDefectRate < lcl
  
  this.state.controlChartData.push({
    batchId: this.state.currentBatch,
    defectRate: this.state.currentDefectRate,
    ucl,
    lcl,
    outOfControl
  })
  
  // Advance batch
  this.state.currentBatch++
  
  // Check completion
  if (this.state.currentBatch >= this.state.config.numBatches) {
    this.state.isComplete = true
  }
  
  await this.saveGameState()
  
  return {
    success: true,
    message: `Batch ${this.state.currentBatch - 1} processed`,
    data: {
      batchId: this.state.currentBatch - 1,
      batchSize,
      defectCount,
      defectsDetected,
      defectsPassedToCustomer,
      costs: {
        inspection: inspectionCost,
        defect: defectCost,
        total: batchCost
      },
      cumulativeCost: this.state.totalCost,
      outOfControl,
      isComplete: this.state.isComplete
    }
  }
}
```

---

## 🚀 Replication Roadmap

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement `DefectDetectivesEngine` class
- [ ] Create state management structures
- [ ] Implement defect data generation
- [ ] Build QC tool application system
- [ ] Create inspection strategy logic

### Phase 2: QC Tools System (Week 2-3)

- [ ] Implement 7 QC Tools
- [ ] Build tool impact calculation
- [ ] Create tool application validation
- [ ] Implement defect rate reduction logic
- [ ] Build tool insights system

### Phase 3: Inspection Strategies (Week 3)

- [ ] Implement 100% inspection logic
- [ ] Build sampling inspection system
- [ ] Create no inspection option
- [ ] Implement cost calculations
- [ ] Build defect detection logic

### Phase 4: Control Charts (Week 3-4)

- [ ] Implement control limit calculation
- [ ] Build control chart data tracking
- [ ] Create out-of-control detection
- [ ] Implement statistical calculations
- [ ] Build control chart visualization

### Phase 5: Cost-Benefit Analysis (Week 4)

- [ ] Implement cost calculation system
- [ ] Build break-even analysis
- [ ] Create optimal strategy selection
- [ ] Implement cost tracking

### Phase 6: Metrics & Analytics (Week 4-5)

- [ ] Build performance metrics calculation
- [ ] Implement performance grading
- [ ] Create metrics dashboard
- [ ] Build defect tracking system

### Phase 7: UI Development (Week 5-6)

- [ ] Design main dashboard
- [ ] Build QC tool selection interface
- [ ] Create tool application results display
- [ ] Design control chart visualization
- [ ] Build inspection strategy selector
- [ ] Create batch processing interface
- [ ] Design metrics dashboard

### Phase 8: Testing & Refinement (Week 6)

- [ ] Unit tests for calculations
- [ ] Integration tests for tool application
- [ ] Balance testing (cost vs. quality)
- [ ] Performance testing
- [ ] UI/UX testing

---

## 📝 Strategy Examples

### Strategy 1: Maximum Quality

**Approach:** Apply all tools, use 100% inspection
- Apply all 7 QC tools early
- Use 100% inspection for all batches
- Focus on quality over cost

**Result:** Lowest defect rate, highest cost

### Strategy 2: Cost Optimization

**Approach:** Apply tools strategically, use sampling
- Apply high-impact tools first (Pareto, Control Chart)
- Use sampling inspection
- Balance cost and quality

**Result:** Good quality, reasonable cost

### Strategy 3: Balanced Approach

**Approach:** Apply all tools, use adaptive inspection
- Apply all 7 tools
- Start with sampling, switch to 100% if needed
- Monitor control chart

**Result:** Balanced metrics across all KPIs

### Strategy 4: Tool Optimization

**Approach:** Apply tools in optimal sequence
- Check Sheet → Histogram → Pareto → Fishbone → Scatter → Flowchart → Control Chart
- Use sampling inspection
- Monitor and adjust

**Result:** Maximum defect reduction, efficient cost

---

## 🎓 Educational Integration

### Pre-Game Briefing (10 minutes)

1. **SQC Introduction**
   - Explain statistical quality control
   - Introduce 7 QC Tools
   - Discuss inspection strategies

2. **Game Mechanics**
   - Defect data structure
   - Tool application system
   - Cost-benefit analysis

3. **Objectives**
   - Reduce defect rate to ≤2%
   - Minimize total costs
   - Apply all 7 QC tools

### During Game (45 minutes)

- Analyze defect data
- Apply QC tools strategically
- Set inspection strategies
- Process batches
- Monitor control charts
- Track costs and metrics

### Post-Game Debrief (15 minutes)

1. **Results Analysis**
   - Show final defect rate
   - Analyze cost breakdown
   - Discuss tool effectiveness

2. **SQC Discussion**
   - How did tools help identify root causes?
   - What was the optimal inspection strategy?
   - How did control charts help?

3. **Key Learnings**
   - Importance of data-driven decisions
   - Cost-quality trade-offs
   - Statistical process control principles

---

## ✅ Implementation Checklist

### Backend
- [x] DefectDetectivesEngine class structure
- [x] State management
- [x] Defect data generation
- [x] QC tool application
- [x] Inspection strategies
- [x] Control chart calculation
- [x] Cost calculations
- [x] Metrics computation
- [ ] API endpoints
- [ ] Database schema

### Frontend
- [ ] Main dashboard
- [ ] QC tool selection interface
- [ ] Tool application results
- [ ] Control chart visualization
- [ ] Inspection strategy selector
- [ ] Batch processing interface
- [ ] Metrics dashboard
- [ ] Defect data visualization

### Testing
- [ ] Unit tests (calculations)
- [ ] Integration tests (tool application)
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
**Based on:** DefectDetectivesEngine.ts, Theory Documentation, Statistical Quality Control

---

*This document provides a complete blueprint for replicating the Defect Detectives simulation. All mechanics, flows, and logic are documented based on the engine implementation and statistical quality control theory.*
