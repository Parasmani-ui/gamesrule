# EV Gambit Implementation Notes

## Overview
The EV Gambit simulation has been updated to precisely match the workflow document. This simulation teaches Porter's Five Forces framework through a strategic management game set in the Indian Electric Vehicle industry.

## Key Changes Made

### 1. **Event-Specific Decision Structure**
Modified `getAvailableDecisions()` method to return exact decisions per event as specified in the workflow:

#### Event 1: Government Push
- **Business Strategy** (2 options)
  - Scale up operations of existing product (₹2 cr)
  - Announce the launch of a new two-wheeler (₹3 cr)
- **Operations Strategy** (2 options)
  - Pre-order batteries and store in inventory from LiOn (₹1.5 cr)
  - Open more stores in the country (₹2 cr)
- **Corporate Strategy** (2 options)
  - Partner with SmartRide (₹1.5 cr)
  - Reach out to Tesla for a possible JV (₹2 cr)

#### Event 2: Import Ban
- **Business Strategy** (2 options)
  - Increase sourcing from Rusloth (₹1 cr)
  - Create a coalition with Electrify to negotiate with governments (₹2.5 cr)
- **Operations Strategy** (3 options)
  - Expedite mining of Indian Lithium (₹3.5 cr)
  - Decrease production of four wheelers (₹0)
  - Increase your stake in India Mines (₹5 cr)
- **Corporate Strategy** (2 options)
  - Shut down retail stores (saves ₹0.5 cr)
  - Reduce exports till standoff ends (₹0)

#### Event 3: Buyer Acquisition
- **Business Strategy** (2 options)
  - Explore opportunities to export (₹1 cr)
  - Settle for lower prices from Rexa (₹0)
- **Sales Strategy** (2 options)
  - Scout for more domestic and international clients (₹1.5 cr)
  - Offer discounts on non-best-selling products (₹0.5 cr)
- **Corporate Strategy** (2 options)
  - Reduce production of shuttles and buses (₹0)
  - Increase production of shuttles and buses (₹2.5 cr)

#### Event 4: Emission Norms
- **Marketing Strategy** (2 options)
  - Create a marketing campaign maligning their actions (₹1 cr)
  - Launch a marketing campaign for EVans' best selling EV (₹1.5 cr)
- **Sales Strategy** (2 options)
  - Increase sales channels to sell EVans' highest selling EVs (₹1.8 cr)
  - Offer discounts and financing schemes for EVans EVs (₹1.2 cr)
- **Corporate Strategy** (2 options)
  - Set up an EV research centre at a premier university (₹3 cr)
  - Report EVans' Carbon Footprint and ESG numbers (₹0.5 cr)

#### Event 5: Tesla Coming
- **Business Strategy** (2 options)
  - Increase production to pre-emptively increase loyal customer base (₹2.5 cr)
  - Launch a range of premium offerings (₹4 cr)
- **Corporate Strategy** (2 options)
  - Offer a partnership to Electrify for a JV (₹3 cr)
  - Ask the government to negotiate to lower tariffs for exports (₹1 cr)

## Game Flow

### Workflow Per Round
1. **Event Introduction**: Player sees the event description and context
2. **Decision Making**: Player selects ONE decision from available categories
3. **Rationale Input**: Player provides reasoning for their decision
4. **Alternatives Input**: Player describes what other options they considered
5. **Submit Decision**: Decision is processed and outcomes are shown
6. **Quiz**: Player answers 4 multiple-choice questions about the event
7. **Continue**: Player clicks "Continue to Next Event" to proceed

### Scoring System
- **Decision Score**: Based on decision quality and impact (0-100 per round)
- **Quiz Score**: Percentage correct (0-100 per round)
- **Total Score**: Sum of decision and quiz scores across all rounds

## Porter's Five Forces Integration

### Forces Tracked
1. **Competitive Rivalry** (Initial: 70/100)
   - Affected by: Event 4 (Emission Norms)
2. **Threat of New Entrants** (Initial: 60/100)
   - Affected by: Event 5 (Tesla Coming)
3. **Bargaining Power of Suppliers** (Initial: 75/100)
   - Affected by: Event 2 (Import Ban)
4. **Bargaining Power of Buyers** (Initial: 65/100)
   - Affected by: Event 1 (Government Push), Event 3 (Buyer Acquisition)
5. **Threat of Substitutes** (Initial: 70/100)
   - No specific event, but affected by decisions

### Industry Attractiveness
Calculated as: `100 - (average of all five forces)`
- Lower forces = More attractive industry
- Higher forces = Less attractive industry

## Key Features

### 1. Dynamic Supplier Management
- **LiOn (Chinese)**: 60% share initially, becomes unavailable after Event 2
- **Rusloth (Russian)**: 40% share initially, becomes 100% after import ban
- **India Mines**: Unavailable initially, becomes available after 2 years (can be expedited)

### 2. Dynamic Buyer Management
- **Rexa**: 50% of sales initially, acquires Ushuttle in Event 3 (becomes 80%)
- **Ushuttle**: 30% of sales initially, acquired by Rexa in Event 3

### 3. Decision Impact System
Each decision affects:
- Market share
- Brand value
- Technology level
- Production capacity
- Five forces intensities
- Cash flow

Impacts are randomized (80-120% of expected value) for realism.

### 4. Quiz Questions
Each event has 4 carefully crafted questions that test:
- Understanding of Porter's Five Forces
- Strategic thinking
- Industry dynamics
- Risk assessment

## State Management

### Player Company (EVans)
- Starting market share: 5% (35% in EV segment)
- Starting cash: ₹100 cr
- Initial brand value: 50/100
- Initial technology: 50/100
- Initial production: 50/100

### Competitors
1. **Electrify Inc.**: 12% market share, strong rival
2. **Tesla Motors**: 0% initially, enters in Event 5
3. **Other Competitors**: 83% market share (rest of market)

## Technical Architecture

### Game Engine Pattern
- Extends `BaseGameEngine`
- Implements all required methods:
  - `initialize()`: Sets up game state
  - `applyAction()`: Processes player actions
  - `advanceRound()`: Moves to next round
  - `computeMetrics()`: Calculates final scores
  - `getPublicState()`: Returns state visible to all
  - `getParticipantState()`: Returns player-specific state

### Action Types
1. `make-decision`: Submit strategic decision with rationale
2. `submit-quiz`: Submit quiz answers
3. `continue-to-next-event`: Move to next round

### State Flags
- `hasSubmittedDecision`: Prevents duplicate decision submissions
- `hasSubmittedQuiz`: Prevents duplicate quiz submissions
- `isComplete`: Marks simulation as finished after 5 rounds

## Differences from Original Implementation

### Before
- Generic decision pool with filtering
- All decision categories shown for all events
- Less structured workflow

### After
- Event-specific decision sets
- Exact match with workflow document
- Clear 2-3 options per category per event
- Precise cost and impact values
- Better alignment with Porter's Five Forces theory

## Future Enhancements

### Potential Additions
1. **Competitor AI**: More sophisticated competitor decision-making
2. **Market Events**: Random market fluctuations
3. **Detailed Analytics**: Breakdown of decision quality
4. **Learning Resources**: In-game explanations of Porter's Five Forces
5. **Multiplayer Mode**: Players compete as different companies
6. **Historical Playback**: Review past decisions and outcomes

## Testing Checklist

- [ ] Test Event 1 decisions and quiz
- [ ] Test Event 2 decisions and quiz (verify LiOn unavailability)
- [ ] Test Event 3 decisions and quiz (verify Rexa acquisition impact)
- [ ] Test Event 4 decisions and quiz
- [ ] Test Event 5 decisions and quiz
- [ ] Verify decision costs are deducted correctly
- [ ] Verify impacts are applied correctly
- [ ] Verify quiz scoring is accurate
- [ ] Test continue-to-next-event flow
- [ ] Test game completion after round 5
- [ ] Verify final metrics calculation

## Integration with Other Simulations

The architecture is designed to support other simulations:
- Same base engine pattern
- Consistent state management
- Reusable action handling
- Extensible decision framework

Other simulations can follow this pattern:
1. Define event structure
2. Create event-specific decision sets
3. Implement impact calculation logic
4. Add quiz questions
5. Configure workflow states

## Documentation References

- Workflow Document: `ev gambit Game workflow.txt`
- Implementation Summary: `SIMULATION_IMPLEMENTATION_SUMMARY.md`
- Engine Code: `backend/src/services/gameEngines/EVGambitEngine.ts`
- Skeleton Guide: `backend/src/services/gameEngines/_SKELETON_ENGINES_README.md`

---

**Last Updated**: 2025-12-07
**Status**: ✅ Complete - Ready for Frontend Integration
**Next Step**: Build frontend UI for EV Gambit simulation
