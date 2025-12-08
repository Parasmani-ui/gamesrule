# HR Compensation Simulation - API Integration Guide

## Overview

The HR Compensation simulation (`hr-compensation`) is a **stage-based, single-player** MCDM (Multi-Criteria Decision Making) simulation that teaches participants how to make structured compensation and hiring decisions.

**Key Features:**
- ✅ Three sequential stages (Expert Selection → Attribute Weighting → Candidate Ranking)
- ✅ Single player per session
- ✅ Stage-based progression (not round-based)
- ✅ Real-time scoring and feedback
- ✅ Final compensation package calculation
- ✅ Optimal solution reveal after completion

---

## Session Flow

### 1. Create Session

**Endpoint:** `POST /api/sessions`

**Headers:**
```json
{
  "Authorization": "Bearer {facilitator_token}"
}
```

**Request Body:**
```json
{
  "simulationSlug": "hr-compensation",
  "sessionName": "HR Compensation Workshop - Batch A",
  "configuration": {
    "baseSalary": 500000
  },
  "maxRounds": 1
}
```

**Response:**
```json
{
  "message": "Session created successfully",
  "session": {
    "id": "session-uuid",
    "code": "ABC123",
    "name": "HR Compensation Workshop - Batch A",
    "simulation": "To Pay or Not to Pay - HR Compensation",
    "simulationSlug": "hr-compensation",
    "status": "SETUP"
  }
}
```

**Notes:**
- `maxRounds` should be 1 (simulation is stage-based, not round-based)
- `configuration.baseSalary` is optional (default: ₹5,00,000)
- Only facilitators/admins can create sessions

---

### 2. Join Session

**Endpoint:** `POST /api/sessions/:sessionId/join`

**Headers:**
```json
{
  "Authorization": "Bearer {participant_token}"
}
```

**Request Body:**
```json
{
  "playerName": "Rahul Kumar",
  "role": "PLAYER"
}
```

**Response:**
```json
{
  "message": "Joined session successfully",
  "participant": {
    "id": "participant-uuid",
    "playerName": "Rahul Kumar",
    "role": "PLAYER"
  }
}
```

**Notes:**
- HR Compensation is single-player: only 1 human participant allowed per session
- Participants join before the session starts

---

### 3. Start Session

**Endpoint:** `POST /api/sessions/:sessionId/start`

**Headers:**
```json
{
  "Authorization": "Bearer {facilitator_token}"
}
```

**Response:**
```json
{
  "message": "Session started successfully",
  "sessionId": "session-uuid"
}
```

**What Happens:**
- Session status changes to `IN_PROGRESS`
- Game engine is initialized with default configuration
- Participant receives initial state via Socket.IO

---

## WebSocket Integration

### Connect to Socket

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:4000', {
  auth: {
    token: 'participant-jwt-token',
  },
});

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

### Join Session Room

```typescript
socket.emit('join_session', {
  sessionId: 'session-uuid',
  participantId: 'participant-uuid',
});

socket.on('session_update', (data) => {
  console.log('Session state:', data);
  // data.publicState - visible to all
  // data.participantState - participant-specific data
});
```

**Response Data:**
```typescript
{
  publicState: {
    currentStage: 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete',
    baseSalary: 500000,
    experts: Expert[],
    attributes: Attribute[],
    candidates: Candidate[],
    isComplete: false
  },
  participantState: {
    ...publicState,
    selectedExperts: string[],
    attributeWeights: { [attributeId: string]: number },
    candidateRanking: string[],
    scores: {
      expertSelectionScore: number,
      attributeWeightScore: number,
      rankingMatchScore: number,
      totalScore: number
    },
    finalCompensation: number,
    metrics?: { ... },
    optimalValues?: { ... } // Only revealed after completion
  }
}
```

---

## Game Stages

### Stage 1: Expert Selection

**Objective:** Choose 1-4 experts to consult for compensation advice.

**Available Data:**
```typescript
interface Expert {
  id: string;              // e.g., 'exp1'
  name: string;            // e.g., 'Dr. Sarah Johnson'
  specialty: string;       // e.g., 'Compensation Strategy'
  cost: number;            // e.g., 5000 (displayed to player)
  // credibility is HIDDEN (0-1, revealed after completion)
}
```

**Default Experts:**
1. **Dr. Sarah Johnson** - Compensation Strategy (credibility: 0.9, cost: ₹5,000)
2. **Prof. Raj Patel** - Talent Acquisition (credibility: 0.85, cost: ₹4,000)
3. **Ms. Emily Chen** - Market Analysis (credibility: 0.7, cost: ₹3,000)
4. **Mr. David Brown** - Performance Metrics (credibility: 0.6, cost: ₹2,000)

**Action:**
```typescript
socket.emit('player_action', {
  sessionId: 'session-uuid',
  participantId: 'participant-uuid',
  actionType: 'select_experts',
  payload: {
    stage: 'expert-selection',
    data: {
      expertIds: ['exp1', 'exp2']  // Array of expert IDs
    }
  }
});
```

**Response:**
```typescript
socket.on('action_result', (result) => {
  {
    success: true,
    message: "Experts selected successfully",
    data: {
      selectedExperts: [
        { id: 'exp1', name: 'Dr. Sarah Johnson', specialty: 'Compensation Strategy' },
        { id: 'exp2', name: 'Prof. Raj Patel', specialty: 'Talent Acquisition' }
      ],
      expertScore: 43750,  // (0.9 + 0.85) / 2 * 50000 = 43750
      nextStage: 'attribute-weighting'
    }
  }
});
```

**Scoring:**
```
Expert Selection Score = (Average Credibility) × ₹50,000
Range: ₹0 - ₹50,000
```

**Validation:**
- ✅ Must select at least 1 expert
- ✅ Can select up to 4 experts
- ✅ Expert IDs must be valid

---

### Stage 2: Attribute Weighting

**Objective:** Assign importance weights to 5 attributes (must sum to 100%).

**Available Data:**
```typescript
interface Attribute {
  id: string;              // e.g., 'tech'
  name: string;            // e.g., 'Technical Skills'
  // optimalWeight is HIDDEN (0-1, revealed after completion)
}
```

**Default Attributes:**
1. **Technical Skills** (id: `tech`, optimal: 0.35)
2. **Leadership Ability** (id: `leadership`, optimal: 0.25)
3. **Experience (Years)** (id: `experience`, optimal: 0.20)
4. **Education** (id: `education`, optimal: 0.10)
5. **Cultural Fit** (id: `cultural`, optimal: 0.10)

**Action:**
```typescript
socket.emit('player_action', {
  sessionId: 'session-uuid',
  participantId: 'participant-uuid',
  actionType: 'set_weights',
  payload: {
    stage: 'attribute-weighting',
    data: {
      weights: {
        tech: 0.35,
        leadership: 0.25,
        experience: 0.20,
        education: 0.10,
        cultural: 0.10
      }
    }
  }
});
```

**Response:**
```typescript
socket.on('action_result', (result) => {
  {
    success: true,
    message: "Attribute weights set successfully",
    data: {
      attributeWeightScore: 100000,  // Perfect match with optimal weights
      nextStage: 'candidate-ranking'
    }
  }
});
```

**Scoring:**
```
Weight Difference = Σ |player_weight - optimal_weight|
Attribute Weight Score = (1 - Weight Difference) × ₹1,00,000
Range: ₹0 - ₹1,00,000
```

**Validation:**
- ✅ All 5 attributes must be provided
- ✅ Weights must sum to 1.0 (±0.01 tolerance)
- ✅ Each weight must be between 0 and 1

---

### Stage 3: Candidate Ranking

**Objective:** Rank 4 candidates from best (1st) to worst (4th) based on weighted attributes.

**Available Data:**
```typescript
interface Candidate {
  id: string;              // e.g., 'cand1'
  name: string;            // e.g., 'Alice Kumar'
  scores: {                // Attribute scores (0-100)
    tech: number,
    leadership: number,
    experience: number,
    education: number,
    cultural: number
  }
  // optimalRank is HIDDEN (1-4, revealed after completion)
}
```

**Default Candidates:**
```typescript
[
  {
    id: 'cand1',
    name: 'Alice Kumar',
    scores: { tech: 92, leadership: 85, experience: 78, education: 90, cultural: 88 },
    optimalRank: 1  // HIDDEN
  },
  {
    id: 'cand2',
    name: 'Bob Martinez',
    scores: { tech: 88, leadership: 90, experience: 85, education: 82, cultural: 85 },
    optimalRank: 2  // HIDDEN
  },
  {
    id: 'cand3',
    name: 'Carol Lee',
    scores: { tech: 85, leadership: 75, experience: 90, education: 88, cultural: 80 },
    optimalRank: 3  // HIDDEN
  },
  {
    id: 'cand4',
    name: 'Dan Wilson',
    scores: { tech: 78, leadership: 82, experience: 75, education: 85, cultural: 90 },
    optimalRank: 4  // HIDDEN
  }
]
```

**Action:**
```typescript
socket.emit('player_action', {
  sessionId: 'session-uuid',
  participantId: 'participant-uuid',
  actionType: 'rank_candidates',
  payload: {
    stage: 'candidate-ranking',
    data: {
      ranking: ['cand1', 'cand2', 'cand3', 'cand4']  // Best to worst
    }
  }
});
```

**Response:**
```typescript
socket.on('action_result', (result) => {
  {
    success: true,
    message: "Ranking submitted. Compensation calculated!",
    data: {
      rankingMatchScore: 300000,  // Perfect ranking correlation
      correlation: "1.000",  // Spearman's rank correlation coefficient
      totalScore: 443750,
      finalCompensation: 943750,  // baseSalary + totalScore
      breakdown: {
        expertSelectionScore: 43750,
        attributeWeightScore: 100000,
        rankingMatchScore: 300000
      },
      isComplete: true
    }
  }
});
```

**Scoring:**
```
Spearman Correlation = 1 - (6 × Σd²) / (n × (n² - 1))
Where:
- d = difference in ranks for each candidate
- n = number of candidates (4)

Ranking Match Score = ((Correlation + 1) / 2) × ₹3,00,000
Range: ₹0 - ₹3,00,000
```

**Validation:**
- ✅ Must rank all 4 candidates
- ✅ No duplicate candidate IDs
- ✅ All candidate IDs must be valid

---

## Final Compensation

After completing all 3 stages:

```typescript
Final Compensation = Base Salary + Total Score

Where:
Total Score = Expert Selection Score + Attribute Weight Score + Ranking Match Score

Base Salary: ₹5,00,000
Max Total Score: ₹4,50,000
Max Final Compensation: ₹9,50,000
```

**Performance Levels:**
- ≥90%: **Expert Level** ⭐⭐⭐⭐⭐
- ≥80%: **Advanced** ⭐⭐⭐⭐
- ≥70%: **Proficient** ⭐⭐⭐
- ≥60%: **Intermediate** ⭐⭐
- <60%: **Beginner** ⭐

---

## Metrics & Reporting

### Get Metrics

```typescript
const participantState = data.participantState;

if (participantState.isComplete) {
  const metrics = participantState.metrics;
  console.log(metrics);
  
  // Output:
  {
    finalCompensation: "₹9,43,750",
    scoreBreakdown: {
      expertSelection: "₹43,750",
      attributeWeighting: "₹1,00,000",
      candidateRanking: "₹3,00,000"
    },
    percentageOfMax: "99.34%",
    expertiseLevel: "Expert Level ⭐⭐⭐⭐⭐"
  }
}
```

### Optimal Values (Revealed After Completion)

```typescript
if (participantState.isComplete && participantState.optimalValues) {
  const optimal = participantState.optimalValues;
  
  console.log('Expert Credibilities:', optimal.expertCredibilities);
  // [{ id: 'exp1', credibility: 0.9 }, { id: 'exp2', credibility: 0.85 }, ...]
  
  console.log('Optimal Weights:', optimal.optimalWeights);
  // [{ id: 'tech', optimalWeight: 0.35 }, { id: 'leadership', optimalWeight: 0.25 }, ...]
  
  console.log('Optimal Ranking:', optimal.optimalRanking);
  // ['cand1', 'cand2', 'cand3', 'cand4']
}
```

---

## Complete Example Workflow

```typescript
import { io } from 'socket.io-client';

// 1. Connect to socket
const socket = io('http://localhost:4000', {
  auth: { token: participantToken },
});

// 2. Join session
socket.emit('join_session', {
  sessionId: 'abc-123',
  participantId: 'participant-uuid',
});

// 3. Listen for state updates
socket.on('session_update', (data) => {
  const stage = data.publicState.currentStage;
  
  if (stage === 'expert-selection') {
    // Display experts, let user select
    showExpertSelection(data.publicState.experts);
  } else if (stage === 'attribute-weighting') {
    // Display attributes, let user assign weights
    showAttributeWeighting(data.publicState.attributes);
  } else if (stage === 'candidate-ranking') {
    // Display candidates, let user rank them
    showCandidateRanking(data.publicState.candidates);
  } else if (stage === 'complete') {
    // Show final results
    showResults(data.participantState);
  }
});

// 4. Stage 1: Select experts
socket.emit('player_action', {
  sessionId: 'abc-123',
  participantId: 'participant-uuid',
  actionType: 'select_experts',
  payload: {
    stage: 'expert-selection',
    data: { expertIds: ['exp1', 'exp2'] }
  }
});

// 5. Stage 2: Set weights
socket.emit('player_action', {
  sessionId: 'abc-123',
  participantId: 'participant-uuid',
  actionType: 'set_weights',
  payload: {
    stage: 'attribute-weighting',
    data: {
      weights: {
        tech: 0.35,
        leadership: 0.25,
        experience: 0.20,
        education: 0.10,
        cultural: 0.10
      }
    }
  }
});

// 6. Stage 3: Rank candidates
socket.emit('player_action', {
  sessionId: 'abc-123',
  participantId: 'participant-uuid',
  actionType: 'rank_candidates',
  payload: {
    stage: 'candidate-ranking',
    data: {
      ranking: ['cand1', 'cand2', 'cand3', 'cand4']
    }
  }
});

// 7. Handle action results
socket.on('action_result', (result) => {
  if (result.success) {
    console.log('Action successful:', result.message);
    console.log('Data:', result.data);
  } else {
    console.error('Action failed:', result.message);
  }
});
```

---

## Error Handling

### Common Errors

**1. Wrong Stage**
```json
{
  "success": false,
  "message": "Invalid stage"
}
```

**2. Weights Don't Sum to 1.0**
```json
{
  "success": false,
  "message": "Weights must sum to 1.0 (100%)"
}
```

**3. Invalid Ranking**
```json
{
  "success": false,
  "message": "Invalid ranking provided"
}
```

**4. Already Complete**
```json
{
  "success": false,
  "message": "Simulation already complete"
}
```

**5. No Experts Selected**
```json
{
  "success": false,
  "message": "Please select at least one expert"
}
```

---

## Testing with Postman/curl

### Create Session
```bash
curl -X POST http://localhost:4000/api/sessions \
  -H "Authorization: Bearer {facilitator_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "simulationSlug": "hr-compensation",
    "sessionName": "Test Session",
    "configuration": { "baseSalary": 500000 },
    "maxRounds": 1
  }'
```

### Join Session
```bash
curl -X POST http://localhost:4000/api/sessions/{sessionId}/join \
  -H "Authorization: Bearer {participant_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "playerName": "Test Player",
    "role": "PLAYER"
  }'
```

### Start Session
```bash
curl -X POST http://localhost:4000/api/sessions/{sessionId}/start \
  -H "Authorization: Bearer {facilitator_token}"
```

---

## Frontend Implementation Tips

### State Management (React Example)

```typescript
interface GameState {
  stage: 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete';
  experts: Expert[];
  attributes: Attribute[];
  candidates: Candidate[];
  selectedExperts: string[];
  weights: { [key: string]: number };
  ranking: string[];
  scores: any;
  finalCompensation: number;
  isComplete: boolean;
}

const [gameState, setGameState] = useState<GameState | null>(null);

useEffect(() => {
  socket.on('session_update', (data) => {
    setGameState({
      stage: data.publicState.currentStage,
      experts: data.publicState.experts,
      attributes: data.publicState.attributes,
      candidates: data.publicState.candidates,
      selectedExperts: data.participantState.selectedExperts,
      weights: data.participantState.attributeWeights,
      ranking: data.participantState.candidateRanking,
      scores: data.participantState.scores,
      finalCompensation: data.participantState.finalCompensation,
      isComplete: data.publicState.isComplete,
    });
  });
}, [socket]);
```

### UI Components

1. **Expert Selection Card**
   - Show expert name, specialty, cost
   - Checkbox selection
   - Hide credibility until after completion

2. **Attribute Weighting Sliders**
   - 5 sliders (0-100%)
   - Real-time sum validation
   - Warning if sum ≠ 100%

3. **Candidate Ranking Drag & Drop**
   - Display candidate scores in table
   - Drag-and-drop to reorder
   - Calculate weighted scores (optional helper)

4. **Results Dashboard**
   - Final compensation (large, prominent)
   - Score breakdown (3 components)
   - Performance level badge
   - Comparison with optimal (show differences)

---

## Performance Considerations

- ✅ **Single player per session**: No concurrency issues
- ✅ **Stage-based**: No complex round synchronization
- ✅ **State persistence**: All state saved to database via `GameState` table
- ✅ **Real-time updates**: Socket.IO broadcasts state changes instantly
- ✅ **Isolated engine**: HR Compensation engine doesn't affect other simulations

---

## Security & Validation

**Backend Validation:**
- ✅ Stage progression enforced (can't skip stages)
- ✅ Input validation (weights, ranking, expert IDs)
- ✅ Completion check (can't submit after completion)
- ✅ Participant verification (only session participants can submit)

**Hidden Information:**
- ❌ Expert credibility (revealed after completion)
- ❌ Optimal attribute weights (revealed after completion)
- ❌ Optimal candidate ranking (revealed after completion)

---

## Support & Troubleshooting

### Logs
```bash
# Backend logs
cd backend
npm run dev

# Check for:
# [hr-compensation][session-id] Initializing...
# [hr-compensation][session-id] Experts selected successfully
# [hr-compensation][session-id] Attribute weights set successfully
# [hr-compensation][session-id] Ranking submitted...
```

### Common Issues

**Issue:** Engine not initialized
**Solution:** Ensure session is started before submitting actions

**Issue:** Socket not connecting
**Solution:** Verify JWT token is valid and passed in `auth.token`

**Issue:** Stage not advancing
**Solution:** Check `action_result` for validation errors

---

## Next Steps

1. ✅ **Backend:** HR Compensation engine fully implemented
2. ⏳ **Frontend:** Build UI components for 3 stages
3. ⏳ **Testing:** Unit tests for engine logic
4. ⏳ **Integration:** End-to-end testing with real sessions

For questions or issues, contact: **support@parasmani.com**

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
