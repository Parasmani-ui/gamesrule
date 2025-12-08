# 🎮 MSgames Simulation Platform

A full-stack, multi-simulation learning platform with **11 business simulations** covering supply chain, operations, strategy, game theory, quality management, and decision-making. Built with Next.js, Node.js, Socket.io, and PostgreSQL.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Simulations](#simulations)
- [API Documentation](#api-documentation)
- [Adding New Simulations](#adding-new-simulations)
- [Deployment](#deployment)
- [Architecture Notes](#architecture-notes)

---

## 🎯 Overview

This platform is a complete replication of MSgames.in with **11 simulations** designed for educational institutions, business schools, and corporate training. Students experience real-world business scenarios through interactive, multiplayer games while facilitators monitor progress in real-time.

### Key Highlights

- ✅ **11 Simulations** - Supply chain, operations, HR, strategy, quality, and more
- ✅ **Fruit Beer Game** - Fully implemented end-to-end (4-tier supply chain)
- ✅ **Skeleton Engines** - 10 other simulations with detailed implementation guides
- ✅ **Real-time Gameplay** - Socket.io for instant updates
- ✅ **Facilitator Dashboard** - Create and manage sessions
- ✅ **JWT Authentication** - Secure user management
- ✅ **No Docker** - Direct Node.js deployment
- ⚠️ **Reports Disabled** - PDF/Excel generation commented out for MVP

---

## ✨ Features

### Platform Features

- **Landing Page** - Grid of 11 simulation cards with filtering
- **User Authentication** - JWT-based login/signup with role-based access
- **Session Management** - Create, join, start, and end game sessions
- **Real-time Communication** - Socket.io for live game updates
- **Responsive UI** - Modern design with Tailwind CSS

### User Roles

1. **Student** - Join sessions, play games, view personal performance
2. **Facilitator** - Create sessions, configure games, monitor analytics
3. **Admin** - Manage simulations, users, and global settings

### Simulation Types

| # | Name | Type | Status | Players |
|---|------|------|--------|---------|
| 1 | Fruit Beer Game | Supply Chain | ✅ **Implemented** | 1-4 |
| 2 | TOC Factory | Operations | 🔨 Skeleton | 1 |
| 3 | Order Ops | Logistics | 🔨 Skeleton | 1-4 |
| 4 | HR Compensation | HR Management | 🔨 Skeleton | 1 |
| 5 | Sustainable Select | Decision Analysis | 🔨 Skeleton | 1 |
| 6 | Onion Dilemma | Game Theory | 🔨 Skeleton | 1-2 |
| 7 | Dual Source Dilemma | Procurement | 🔨 Skeleton | 1 |
| 8 | Defect Detectives | Quality Control | 🔨 Skeleton | 1 |
| 9 | Customer in Store | Cognitive Science | 🔨 Skeleton | 1 |
| 10 | EV Gambit | Strategic Management | 🔨 Skeleton | 1-4 |
| 11 | Demand Forecast | Forecasting | 🔨 Skeleton | 1 |

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io Client** - Real-time communication
- **Recharts** - Data visualization
- **Lucide React** - Icons

### Backend
- **Node.js + Express** - REST API
- **TypeScript** - Type safety
- **Socket.io** - WebSocket server
- **Prisma** - ORM for PostgreSQL
- **JWT** - Authentication
- **Winston** - Logging
- **BullMQ** - Job queue (optional)
- **Redis** - Caching (optional)

### Database
- **PostgreSQL** - Primary database

---

## 📁 Project Structure

```
msg-simulation-platform/
├── backend/                     # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration files
│   ├── src/
│   │   ├── controllers/        # API controllers
│   │   ├── routes/             # Express routes
│   │   ├── services/
│   │   │   └── gameEngines/    # Game engine implementations
│   │   │       ├── FruitBeerEngine.ts      ✅ Full implementation
│   │   │       ├── TOCFactoryEngine.ts     🔨 Skeleton
│   │   │       ├── OnionDilemmaEngine.ts   🔨 Skeleton
│   │   │       └── factory.ts              # Engine factory
│   │   ├── sockets/            # Socket.io handlers
│   │   ├── middleware/         # Auth, validation
│   │   ├── utils/              # Helpers
│   │   ├── types/              # TypeScript types
│   │   └── index.ts            # Server entry point
│   ├── __tests__/              # Unit tests
│   └── package.json
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.tsx       # Landing page (11 simulations)
│   │   │   ├── login.tsx       # Login page
│   │   │   ├── signup.tsx      # Signup page
│   │   │   └── simulations/
│   │   │       └── [slug].tsx  # Simulation detail page
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── SimulationCard.tsx
│   │   ├── services/
│   │   │   ├── api.ts          # REST API client
│   │   │   └── socket.ts       # Socket.io client
│   │   ├── stores/
│   │   │   └── authStore.ts    # Auth state (Zustand)
│   │   └── styles/
│   │       └── globals.css
│   └── package.json
├── simulations-data.json        # Metadata for all 11 simulations
├── package.json                 # Root package.json (concurrent scripts)
└── README.md                    # This file
```

---

## 🔧 Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** or **pnpm** - Comes with Node.js

Optional:
- **Redis** (for session caching) - [Download](https://redis.io/download)

---

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
cd games  # Already in the workspace
```

### 2. Install Dependencies

```bash
# Install root dependencies (concurrently)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### 3. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

Create a database:

```sql
CREATE DATABASE msgames_db;
```

#### Option B: Use Supabase (Free Cloud PostgreSQL)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings > Database

### 4. Configure Environment Variables

#### Backend `.env`

The `.env` file already exists in `backend/`. Update it with your database credentials:

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/msgames_db?schema=public"
PORT=4000
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
FRONTEND_URL="http://localhost:3000"
REDIS_ENABLED=false  # Set to true if using Redis
```

#### Frontend `.env.local`

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### 5. Run Database Migrations

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

This will create all necessary tables based on the Prisma schema.

### 6. Seed the Database

```bash
cd backend
npm run prisma:seed
```

This will:
- Create sample users (admin, facilitator, student)
- Populate all 11 simulations
- Create sample demand patterns for Fruit Beer Game

**Default Test Credentials:**
- Student: `student@msgames.local` / `password123`
- Facilitator: `facilitator@msgames.local` / `password123`
- Admin: `admin@msgames.local` / `password123`

---

## 🚀 Running the Application

### Option 1: Run Everything Concurrently (Recommended)

From the **root directory**:

```bash
npm run dev
```

This starts both backend (port 4000) and frontend (port 3000) simultaneously.

### Option 2: Run Backend and Frontend Separately

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **API Docs:** See [API Documentation](#api-documentation) below

---

## 🧪 Testing

### Run Unit Tests

```bash
cd backend
npm test
```

### Run Tests with Coverage

```bash
cd backend
npm test -- --coverage
```

### Test Structure

- **Unit Tests:** `backend/src/__tests__/FruitBeerEngine.test.ts`
- **Integration Tests:** TODO - Add E2E tests with Playwright

### Manual Testing Flow

1. **Sign Up** as a facilitator at `/signup`
2. **Navigate** to Fruit Beer Game
3. **Create Session** (facilitator only)
4. **Join Session** as a player (can open multiple browser tabs)
5. **Start Session**
6. **Place Orders** and watch the supply chain dynamics
7. **View Metrics** after each round

---

## 🎮 Simulations

### 1. ✅ Fruit Beer Game (Fully Implemented)

**Purpose:** Experience the bullwhip effect in a 4-tier supply chain.

**Roles:** Retailer, Wholesaler, Distributor, Manufacturer

**Mechanics:**
- Weekly ordering decisions
- Lead time delays (pipeline)
- Customer demand changes (4 → 8 units)
- Inventory holding and stockout costs

**Implementation:** `backend/src/services/gameEngines/FruitBeerEngine.ts`

**How to Test:**
1. Create a session for "Fruit Beer Game"
2. Join as all 4 roles (or use bots)
3. Place orders each week
4. Observe inventory, backorders, and costs

### 2-11. 🔨 Other Simulations (Skeleton Engines)

All other simulations have **skeleton implementations** with:
- Detailed TODO comments
- Game state structure defined
- Metrics and mechanics documented
- Ready for full implementation

**Implementation Guide:** See `backend/src/services/gameEngines/_SKELETON_ENGINES_README.md`

---

## 📚 API Documentation

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "role": "STUDENT"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "...", "role": "..." }
}
```

**GET /api/auth/me**
- Requires: `Authorization: Bearer <token>`

### Simulations

**GET /api/simulations**
- Returns: Array of all 11 simulations

**GET /api/simulations/:slug**
- Returns: Simulation details + active sessions

### Sessions

**POST /api/sessions** (Facilitator only)
```json
{
  "simulationSlug": "fruit-beer-game",
  "sessionName": "Demo Session",
  "configuration": {},
  "maxRounds": 20
}
```

**POST /api/sessions/:sessionId/join**
```json
{
  "playerName": "Alice",
  "role": "RETAILER"
}
```

**POST /api/sessions/:sessionId/start** (Facilitator only)

**POST /api/sessions/:sessionId/end** (Facilitator only)

### Socket.io Events

**Client → Server:**
- `join_session` - Join a game session
- `player_action` - Submit a decision
- `heartbeat` - Keep-alive

**Server → Client:**
- `session_update` - Game state changed
- `action_result` - Action processed
- `round_complete` - Round ended
- `game_complete` - Game finished
- `error` - Error occurred

---

## 🏗 Adding New Simulations

### Step 1: Create Engine Class

```typescript
// backend/src/services/gameEngines/MyGameEngine.ts
import { BaseGameEngine } from './BaseGameEngine';

export class MyGameEngine extends BaseGameEngine {
  constructor(sessionId: string) {
    super(sessionId, 'my-game-slug');
  }

  async initialize(config: any): Promise<void> {
    // Initialize game state
  }

  async applyAction(participantId: string, action: any): Promise<ActionResult> {
    // Handle player decision
  }

  async advanceRound(): Promise<RoundResult> {
    // Progress to next round
  }

  // ... implement other methods
}
```

### Step 2: Register in Factory

```typescript
// backend/src/services/gameEngines/factory.ts
case 'my-game-slug':
  engine = new MyGameEngine(sessionId);
  break;
```

### Step 3: Add to Database

Add entry to `simulations-data.json` and re-run seed script.

### Step 4: Create Frontend UI

Create game-specific components in `frontend/src/components/games/MyGame/`

---

## 🌐 Deployment

### Recommended Stack (No Docker)

- **Frontend:** [Vercel](https://vercel.com) (automatic Next.js deployment)
- **Backend:** [Render](https://render.com) or [Railway](https://railway.app)
- **Database:** [Supabase](https://supabase.com) or AWS RDS
- **Redis:** [Upstash](https://upstash.com) (optional)

### Deployment Steps

#### 1. Deploy Backend to Render

1. Connect GitHub repo to Render
2. Create new Web Service
3. Set build command: `cd backend && npm install && npm run build`
4. Set start command: `cd backend && npm start`
5. Add environment variables from `.env`

#### 2. Deploy Frontend to Vercel

1. Import project from GitHub
2. Set root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL
   - `NEXT_PUBLIC_WS_URL`: Your Render backend URL

#### 3. Update CORS

Update `backend/.env`:
```
FRONTEND_URL=https://your-app.vercel.app
```

### Environment Variables for Production

**Backend:**
```
DATABASE_URL=<Supabase connection string>
JWT_SECRET=<strong random string>
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://your-backend.render.com
NEXT_PUBLIC_WS_URL=https://your-backend.render.com
```

---

## 🏛 Architecture Notes

### Report Generation (REPORTS_DISABLED)

PDF and Excel report generation has been **removed** from this MVP. To re-enable:

1. Uncomment report tables in `backend/prisma/schema.prisma`
2. Uncomment report routes in `backend/src/routes/`
3. Install Puppeteer: `npm install puppeteer`
4. Implement report service in `backend/src/services/reportService.ts`

Look for `REPORTS_DISABLED` comments throughout the codebase.

### Game Engine Pattern

All game engines extend `BaseGameEngine` and implement:
- `initialize()` - Set up game state
- `applyAction()` - Process player decision
- `advanceRound()` - Progress game
- `computeMetrics()` - Calculate analytics
- `getPublicState()` - State for all players
- `getParticipantState()` - State for specific player

Engines are **stateful** and cached in memory per session.

### Session State Management

- **Option 1 (Current):** In-memory in engine + periodic DB snapshots
- **Option 2:** Redis for distributed caching
- **Option 3:** Database-only (use `SessionStateCache` table)

### Real-time Flow

```
Player Action → Socket.io → Engine → State Update → Broadcast to Room
```

---

## 📝 TODOs and Future Work

### High Priority
- [ ] Implement remaining 10 simulation engines
- [ ] Add bot strategies for single-player mode
- [ ] Complete Fruit Beer Game UI components
- [ ] Add facilitator dashboard with analytics

### Medium Priority
- [ ] Re-enable report generation (PDF/Excel)
- [ ] Add session replay feature
- [ ] Implement leaderboards
- [ ] Add email notifications

### Low Priority
- [ ] Add institutional branding
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with ML

---

## 🤝 Contributing

This is an educational project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Implement with tests
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🙏 Acknowledgments

- Inspired by [MSgames.in](https://msgames.in)
- Beer Game concept by MIT Sloan
- Built with guidance from `cursor_build_instructions.txt`

---

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Email: support@msgames.local (placeholder)

---

**Built with ❤️ for experiential learning in business education.**
