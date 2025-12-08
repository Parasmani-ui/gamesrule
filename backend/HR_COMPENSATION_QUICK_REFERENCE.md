# HR Compensation - Quick Reference Card

## 🎯 Quick Facts

- **Slug:** `hr-compensation`
- **Type:** Single-player, stage-based, MCDM simulation
- **Duration:** ~30 minutes
- **Stages:** 3 (Expert Selection → Attribute Weighting → Candidate Ranking)
- **Players:** 1 per session
- **Bots:** Not supported

---

## 📊 Scoring Summary

| Component | Formula | Max Score | % of Max |
|-----------|---------|-----------|----------|
| **Expert Selection** | Avg(Credibility) × ₹50,000 | ₹50,000 | 5.3% |
| **Attribute Weighting** | (1 - Difference) × ₹1,00,000 | ₹1,00,000 | 10.5% |
| **Candidate Ranking** | ((Correlation+1)/2) × ₹3,00,000 | ₹3,00,000 | 31.6% |
| **Base Salary** | Fixed | ₹5,00,000 | 52.6% |
| **TOTAL** | Base + All Bonuses | **₹9,50,000** | 100% |

---

## 🎮 Stage Actions

### Stage 1: Expert Selection
```typescript
socket.emit('player_action', {
  sessionId: 'session-id',
  participantId: 'participant-id',
  actionType: 'select_experts',
  payload: {
    stage: 'expert-selection',
    data: {
      expertIds: ['exp1', 'exp2'] // 1-4 experts
    }
  }
});
```

**Validation:** Must select at least 1 expert

---

### Stage 2: Attribute Weighting
```typescript
socket.emit('player_action', {
  sessionId: 'session-id',
  participantId: 'participant-id',
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

**Validation:** Weights must sum to 1.0 (±0.01)

---

### Stage 3: Candidate Ranking
```typescript
socket.emit('player_action', {
  sessionId: 'session-id',
  participantId: 'participant-id',
  actionType: 'rank_candidates',
  payload: {
    stage: 'candidate-ranking',
    data: {
      ranking: ['cand1', 'cand2', 'cand3', 'cand4'] // Best to worst
    }
  }
});
```

**Validation:** Must rank all 4 candidates

---

## 📋 Default Configuration

### Experts (Credibility Hidden)
| ID | Name | Specialty | Credibility | Cost |
|----|------|-----------|-------------|------|
| exp1 | Dr. Sarah Johnson | Compensation Strategy | **0.9** | ₹5,000 |
| exp2 | Prof. Raj Patel | Talent Acquisition | **0.85** | ₹4,000 |
| exp3 | Ms. Emily Chen | Market Analysis | **0.7** | ₹3,000 |
| exp4 | Mr. David Brown | Performance Metrics | **0.6** | ₹2,000 |

### Attributes (Optimal Weights Hidden)
| ID | Name | Optimal Weight |
|----|------|----------------|
| tech | Technical Skills | **0.35** |
| leadership | Leadership Ability | **0.25** |
| experience | Experience (Years) | **0.20** |
| education | Education | **0.10** |
| cultural | Cultural Fit | **0.10** |

### Candidates (Optimal Rank Hidden)
| ID | Name | Tech | Lead | Exp | Edu | Cult | Optimal Rank |
|----|------|------|------|-----|-----|------|--------------|
| cand1 | Alice Kumar | 92 | 85 | 78 | 90 | 88 | **1** |
| cand2 | Bob Martinez | 88 | 90 | 85 | 82 | 85 | **2** |
| cand3 | Carol Lee | 85 | 75 | 90 | 88 | 80 | **3** |
| cand4 | Dan Wilson | 78 | 82 | 75 | 85 | 90 | **4** |

---

## 🔑 State Structure

```typescript
{
  publicState: {
    currentStage: 'expert-selection' | 'attribute-weighting' | 'candidate-ranking' | 'complete',
    baseSalary: 500000,
    experts: Expert[], // WITHOUT credibility
    attributes: Attribute[], // WITHOUT optimalWeight
    candidates: Candidate[], // WITHOUT optimalRank
    isComplete: false
  },
  participantState: {
    ...publicState,
    selectedExperts: string[],
    attributeWeights: { [id: string]: number },
    candidateRanking: string[],
    scores: {
      expertSelectionScore: number,
      attributeWeightScore: number,
      rankingMatchScore: number,
      totalScore: number
    },
    finalCompensation: number,
    metrics?: { ... }, // Only when complete
    optimalValues?: { ... } // Only when complete
  }
}
```

---

## 🏆 Performance Levels

| % of Max | Level | Stars |
|----------|-------|-------|
| ≥90% | Expert Level | ⭐⭐⭐⭐⭐ |
| ≥80% | Advanced | ⭐⭐⭐⭐ |
| ≥70% | Proficient | ⭐⭐⭐ |
| ≥60% | Intermediate | ⭐⭐ |
| <60% | Beginner | ⭐ |

---

## 🔧 Key Files

```
backend/src/services/gameEngines/HRCompensationEngine.ts  (517 lines)
backend/src/services/gameEngines/factory.ts              (Lines 67-69)
backend/src/sockets/index.ts                             (Lines 127-134)
backend/src/__tests__/HRCompensationEngine.test.ts       (Test suite)
simulations-data.json                                    (Lines 62-81)
```

---

## 🚀 Quick Test

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Run tests
npm test HRCompensationEngine.test.ts

# 3. Create session (REST)
curl -X POST http://localhost:4000/api/sessions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"simulationSlug":"hr-compensation","sessionName":"Test","maxRounds":1}'

# 4. Join & start session
curl -X POST http://localhost:4000/api/sessions/{id}/join \
  -H "Authorization: Bearer {token}" \
  -d '{"playerName":"Test","role":"PLAYER"}'

curl -X POST http://localhost:4000/api/sessions/{id}/start \
  -H "Authorization: Bearer {token}"

# 5. Play via Socket.IO (see API guide)
```

---

## ⚠️ Common Pitfalls

| Issue | Solution |
|-------|----------|
| Weights don't sum to 1.0 | Use `Math.round()` or validate sum |
| Stage not advancing | Check `action_result` for validation errors |
| Engine not initialized | Ensure session is started before actions |
| Optimal values not showing | Only revealed when `isComplete: true` |

---

## 📚 Documentation

- **API Guide:** `backend/HR_COMPENSATION_API_GUIDE.md` (Comprehensive)
- **Theory Doc:** `HR_COMPENSATION_DETAILED_ANALYSIS.md` (1543 lines)
- **Summary:** `HR_COMPENSATION_IMPLEMENTATION_SUMMARY.md` (This overview)
- **Quick Ref:** `backend/HR_COMPENSATION_QUICK_REFERENCE.md` (This file)

---

## ✅ Status

**Backend:** ✅ Production Ready  
**Tests:** ✅ 18 tests passing  
**Docs:** ✅ Complete  
**Frontend:** ⏳ Awaiting implementation

---

**Last Updated:** January 2025 | **Version:** 1.0
