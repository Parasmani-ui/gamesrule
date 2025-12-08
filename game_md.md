# Game Simulation Platform — Comprehensive Specification (game.md)

## 1. Overview
This document defines the **complete specification** for building a full simulation platform replicating msgames.in. It includes detailed guidelines for backend architecture, frontend structure, data models, simulation logic, reporting pipeline, user roles, retention rules, analytics, and all 11 simulations in depth.


---

## 2. Platform Goal
Build a scalable, multi-simulation learning platform supporting:
- 11 simulations (supply chain, operations, HR, strategy, MADM, cognitive decision-making, quality, etc.)
- Single-player and multiplayer sessions
- Facilitator-led classrooms
- Real-time interactions (Socket.io)
- Performance analytics & reporting (PDF + Excel)
- S3-based report storage(Optional)

---

## 3. Key User Types
### 3.1 Participant (Student)
- Joins session via code
- Plays one simulation
- Submits decisions every round
- Receives personal performance report + certificate

### 3.2 Facilitator (Instructor)
- Creates sessions
- Configures game settings
- Monitors real-time analytics
- Downloads all reports
- Runs debrief sessions

### 3.3 Administrator
- Manages simulations, users, institutions
- Controls retention policies
- Views global analytics

---

## 4. High-Level Architecture
```
Frontend (Next.js + Tailwind)           Backend (Node)
│                                       │
├── User Flow (Auth, Dashboard)         ├── Auth Service (JWT + OAuth)
├── Simulation UI                       ├── Session Manager
├── Real-time Views                     ├── Game Engine Layer
│       ↳ via Socket.io                 ├── WebSocket Hub
├── Facilitator Dashboard                ├── Reporting Service
├── Report Viewer                        ├── Storage (S3)
│                                       ├── Redis (Cache + Pub/Sub)
│                                       └── PostgreSQL (Primary DB)
```

---

## 5. Tech Stack
### Frontend
- Next.js (React)
- TailwindCSS
- Zustand or Redux Toolkit
- Recharts / Chart.js
- Socket.io-client

### Backend
- Node.js + Express 
- Socket.io + Redis Adapter
- PostgreSQL
- Redis (cache + job queue)
- BullMQ (workers)
- Puppeteer (PDF rendering)
- Chart.js + node-canvas (charts)
- AWS S3 (storage)
- AWS SES / SendGrid (email)

---

## 6. Core Database Schema
### 6.1 Users Table
```
users(
  user_id PK,
  email UNIQUE,
  password_hash,
  full_name,
  role ENUM(student, facilitator, admin),
  oauth_provider,
  oauth_id,
  email_verified,
  created_at,
  last_login
)
```

### 6.2 Simulations Table
```
simulations(
  simulation_id PK,
  slug UNIQUE,
  name,
  type,
  author,
  description,
  duration_minutes,
  difficulty_level,
  created_at
)
```

### 6.3 Session Table
```
game_sessions(
  session_id PK,
  facilitator_id FK,
  simulation_id FK,
  session_code UNIQUE,
  configuration JSONB,
  status ENUM(setup, waiting, in_progress, completed),
  started_at,
  completed_at
)
```

### 6.4 Participants Table
```
session_participants(
  participant_id PK,
  session_id FK,
  user_id FK,
  role,
  is_bot,
  joined_at
)
```

### 6.5 Decisions Table
```
player_decisions(
  decision_id PK,
  session_id,
  participant_id,
  round_number,
  decision_payload JSONB,
  created_at
)
```

### 6.6 Reports Table
```
reports(
  report_id PK,
  session_id,
  participant_id,
  report_type ENUM(participant, facilitator),
  s3_key,
  presigned_url,
  generated_at,
  retention_expires_at
)
```

---

## 7. S3 Structure
```
s3://msgames/
  ├── sessions/
  │   ├── {sessionId}/
  │   │   ├── facilitator-report.pdf
  │   │   ├── participant-{pid}.pdf
  │   │   ├── participant-{pid}.xlsx
  │   │   └── metadata.json
```

---

## 8. Reporting System Specification
### 8.1 Formats
- PDF (primary)
- Excel (facilitator)

### 8.2 Components inside PDF
- Cover Page
- Summary Performance
- Detailed Metrics
- Round-by-Round Breakdown
- Graphs (PNG)
- Learning Insights
- Certificates (if eligible)

### 8.3 Chart Requirements
- Generated server-side using Chart.js + node-canvas
- 1200×600 px PNG
- Types:
  - Time series
  - Bar comparisons
  - Radar plots
  - Pie charts

### 8.4 Report Generation Flow
```
Collect data → Compute metrics → Render charts → Render HTML → Puppeteer PDF → Upload S3 → Notify users
```

---

## 9. Retention Policy
- Free users: 30 days
- Educators: 90 days
- Premium: 1 year
- Enterprise: indefinite

Auto-deletion process: background worker checks expired files daily.

---

## 10. Notification System
### Email (SES / SendGrid)
- When report is ready
- When session starts
- When zip export is ready

### In-App Notifications
- Dashboard badge
- WebSocket push

---

## 11. Real-Time WebSocket System
### Namespace per Simulation
```
/ws/{simulationSlug}/{sessionId}
```

### Events
```
join
player_action
state_update
round_complete
leaderboard_update
facilitator_broadcast
session_end
```

---

## 12. Simulation Engine Interface (Universal)
```
init(sessionConfig)
applyAction(action)
advanceRound()
computeMetrics()
serializeState()
```

---

# 13. ALL 11 SIMULATIONS — FULL DEVELOPER DOCUMENTATION
Below is **complete implementation guidance** for all simulations.

---

# 13.1 Fruit Beer Game
### Purpose
Supply chain dynamics + bullwhip effect.

### Core Mechanics
- 4-tier chain
- Weekly simulation rounds
- Lead time pipeline
- Demand propagation
- Orders amplify variability

### Data Required
```
customer_demand
inventory_records
orders
shipments
bullwhip_metrics
```

### Engine Flow
```
receive_shipments()
process_demand()
compute_backorders()
place_orders()
update_pipeline()
compute_costs()
broadcast_state()
```

### Metrics (Facilitator)
- Total cost
- Inventory variance
- Bullwhip amplification
- Order variability

---

# 13.2 TOC Factory Simulation
### Purpose
Production bottlenecks, throughput, WIP.

### Mechanics
- 5 machines
- Product A/B
- Setup times
- WIP buffers
- DBR (Drum-Buffer-Rope)

### Engine Loops
- Compute machine availability
- Process units
- Update WIP
- Detect bottleneck

### Metrics
- Throughput
- Utilization
- WIP
- Profit

---

# 13.3 Order Ops
### Purpose
Food delivery logistics.

### Mechanics
- Orders generated
- Drivers assigned
- Real-time map updates
- Delivery cost calculation

### Tables
```
orders
delivery_partners
deliveries
team_metrics
```

---

# 13.4 HR Compensation Game
### Purpose
Salary decision-making + negotiation.

### Stages
1. Expert selection
2. Attribute weighting
3. Final ranking

### Scoring
- Expert credibility score
- Attribute deviation score
- Spearman ranking correlation

---

# 13.5 Sustainable Select (MADM)
### Purpose
Multi-criteria decision-making.

### Methods
- WSM
- WPM
- TOPSIS
- MOORA

### Steps
1. Normalize matrix
2. Apply weights
3. Compute scores
4. Rank alternatives

---

# 13.6 Onion Dilemma (Game Theory)
### Purpose
Cooperation vs defection under trust dynamics.

### Logic
- Simultaneous decisions
- Payoff matrix
- Trust index updated each round

### Bot Strategies
- Tit-for-tat
- Grim trigger
- Adaptive

---

# 13.7 Dual Source Dilemma
### Purpose
Procurement with lead-times and cost tradeoffs.

### Mechanics
- Two suppliers
- Pipeline arrivals
- Cash ledger updates

### Metrics
- Final bank balance
- Stockout rate
- Inventory turnover

---

# 13.8 Defect Detectives
### Purpose
Quality control and root cause analysis.

### Tools
- Pareto
- Histogram
- Scatter
- Control Charts

### Metrics
- Defect reduction
- Process capability
- Stability

---

# 13.9 Customer In A Store
### Purpose
Stock-flow reasoning & cognitive bias detection.

### Tasks
- Inflow/outflow graph interpretation
- Stock calculation
- Heuristic detection

### Metrics
- Accuracy
- Bias rate
- Learning improvement

---

# 13.10 EV Gambit
### Purpose
Strategy simulation based on Porter’s five forces.

### Metrics
- Profit
- Market share
- Strategic score

---

# 13.11 Additional Decision Simulations
Reusable frameworks should support:
- Round-based decisions
- Score-based outcomes
- Facilitator analytics

---

-  -  - -  -  - - -  -   - -  - -     - --  - - - - - -   - - - - - - - -   -- 

# 14. Certificates
Issued if:
- All rounds completed
- Performance ≥ FAIR

Includes QR verification.

---

# 15. Bulk Export
Export a ZIP containing:
```
facilitator-report.pdf
participant-*.pdf
session-data.xlsx
README.txt
```

---

# 16. Sprint Roadmap (Optional)
### Sprint 1 (MVP)
- Auth, Users
- Fruit Beer Game engine
- Socket.io
- Basic PDFs

### Sprint 2
- Add 4 more simulations
- Facilitator