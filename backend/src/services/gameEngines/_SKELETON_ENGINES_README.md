# Skeleton Game Engines

This directory contains skeleton implementations for simulations not yet fully developed.

## Implemented Engines

### ✅ FruitBeerEngine.ts
Fully implemented supply chain simulation with 4 tiers.

## Skeleton Engines (TODO)

### 🔨 TOCFactoryEngine.ts
- **Status**: Skeleton with detailed TODOs
- **Implementation Guide**: See file comments for state structure and mechanics
- **Priority**: High - Operations management core

### 🔨 OnionDilemmaEngine.ts
- **Status**: Skeleton with game theory framework
- **Implementation Guide**: Payoff matrix and trust dynamics defined
- **Priority**: Medium

### 🔨 Other Engines (Create similar skeletons for):

1. **OrderOpsEngine.ts** - Food delivery logistics
   - Real-time order generation
   - Driver assignment algorithm
   - Route optimization (simplified)
   - State: orders, drivers, deliveries, costs

2. **HRCompensationEngine.ts** - Salary negotiation
   - Stage-based: valuation -> evaluation -> negotiation
   - Expert selection and weighting
   - Candidate ranking with Spearman correlation
   - State: candidates, attributes, scores

3. **SustainableSelectEngine.ts** - MADM methods
   - Implement WSM, WPM, TOPSIS, MOORA
   - Matrix normalization
   - Weighting (entropy, CRITIC)
   - State: alternatives, attributes, rankings

4. **DualSourceDilemmaEngine.ts** - Procurement
   - Two suppliers with different cost/leadtime
   - Cash flow management
   - Pipeline tracking
   - State: inventory, cash, orders, arrivals

5. **DefectDetectivesEngine.ts** - Quality control
   - Sequential QC tool application
   - Pareto, histogram, control charts
   - Root cause analysis
   - State: defects, process params, charts

6. **CustomerInStoreEngine.ts** - Cognitive bias
   - Stock-flow reasoning tasks
   - Inflow/outflow interpretation
   - Heuristic detection
   - State: questions, responses, accuracy

7. **EVGambitEngine.ts** - Strategic management
   - Porter's Five Forces events
   - Strategic decisions
   - Market share calculation
   - State: forces, decisions, market_share

8. **DemandForecastEngine.ts** - Forecasting methods
   - Apply various forecasting techniques
   - Calculate forecast errors
   - Compare method performance
   - State: historical_data, forecasts, errors

## How to Implement a Skeleton Engine

1. **Copy BaseGameEngine pattern**
2. **Define game state structure** in comments
3. **List all player decisions** and their parameters
4. **Specify metrics to track**
5. **Add detailed TODOs** for each method
6. **Reference source documentation** (cursor_build_instructions.txt, game_md.md)

## Implementation Priority

1. FruitBeerEngine ✅ (Complete)
2. TOCFactoryEngine 🔨 (High priority)
3. OrderOpsEngine 🔨 (Real-time showcase)
4. OnionDilemmaEngine 🔨 (Game theory)
5. HRCompensationEngine 🔨
6. SustainableSelectEngine 🔨
7. Others as needed

## Testing Strategy

For each engine:
- Unit tests for core logic (payoff calculation, cost calculation, etc.)
- Integration test for full round progression
- Mock player decisions for automated testing

