# 🚀 Quick Start Guide - Parasmani Skills Platform

Get up and running in **5 minutes**!

## 1️⃣ Prerequisites Check

```bash
node --version  # Should be v18+
psql --version  # PostgreSQL should be installed
```

## 2️⃣ Database Setup

### Create Database

```bash
# Option 1: Local PostgreSQL
psql -U postgres
CREATE DATABASE parasmani_skills_db;
\q

# Option 2: Use Supabase (free cloud database)
# Visit supabase.com, create project, copy connection string
```

## 3️⃣ Install Dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## 4️⃣ Configure Environment

Update `backend/.env` with your database URL:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/parasmani_skills_db?schema=public"
JWT_SECRET="your-super-secret-key"
FRONTEND_URL="http://localhost:3000"
```

## 5️⃣ Initialize Database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
cd ..
```

## 6️⃣ Run the Application

```bash
npm run dev
```

This starts:
- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000

## 7️⃣ Test the Platform

### Browse Without Login (✅ Works!)
1. **Open browser:** http://localhost:3000
2. **Explore landing page** - See project overview
3. **Click "Explore Simulations"** - View all 11 simulations
4. **Click any simulation** - Read full details
5. **Try "Create Session"** - See login prompt modal

### Sign Up and Play
1. **Click "Sign Up Free"** in modal or navbar
2. **Fill the form:**
   - Full Name: Your name
   - Email: any@example.com
   - Password: min 8 characters
   - Role: Choose "Facilitator" to create sessions
3. **Auto-login** after signup
4. **Create a session** for Fruit Beer Game
5. **Play the game!**

### Test with Pre-Seeded Accounts

Use these credentials to login immediately:

**Facilitator Account:**
```
Email: facilitator@parasmani.local
Password: password123
```

**Student Account:**
```
Email: student@parasmani.local
Password: password123
```

**Admin Account:**
```
Email: admin@parasmani.local
Password: password123
```

---

## 🎯 What You Get

✅ **Landing Page** - Professional project overview
✅ **11 Simulations** - All with dedicated pages
✅ **Browse Without Login** - Explore everything freely
✅ **Auth Guards** - Login required only for gameplay
✅ **Fruit Beer Game** - Fully playable end-to-end
✅ **10 Skeleton Engines** - Ready for implementation
✅ **Real-time Updates** via Socket.io
✅ **REST API** for all operations

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running: `pg_ctl status`
- Verify DATABASE_URL in `backend/.env`
- Try: `cd backend && npx prisma migrate dev`

### "Port already in use"
- Backend: Change PORT in `backend/.env`
- Frontend: `PORT=3001 npm run dev` from frontend folder

### "prisma command not found"
```bash
cd backend
npm install
npx prisma generate
```

### "No simulations showing"
- Run seed script: `cd backend && npm run prisma:seed`
- Check backend logs for errors
- Verify database connection

### "Login not working"
- Check browser console for errors
- Verify JWT_SECRET in `backend/.env`
- Clear localStorage and try again
- Check backend logs

---

## 📚 Key Features to Test

### 1. Browse Without Login
- ✅ Visit homepage
- ✅ Click "Explore Simulations"
- ✅ View simulation details
- ✅ No errors or blocks

### 2. Auth Required Modal
- ✅ Try to create/join session
- ✅ See professional modal
- ✅ Options to Login or Sign Up
- ✅ Cancel returns to browsing

### 3. Create Account
- ✅ Sign up as Student or Facilitator
- ✅ Auto-login after signup
- ✅ Token persists across refreshes
- ✅ See user info in navbar

### 4. Play Fruit Beer Game
- ✅ Sign up as Facilitator
- ✅ Create session
- ✅ Open multiple tabs as different players
- ✅ Join as each role
- ✅ Place orders
- ✅ See real-time updates

---

## 🎮 Complete User Flow

### First-Time Visitor
```
1. Visit http://localhost:3000
2. See project overview landing page
3. Click "Explore Simulations"
4. Browse all 11 simulations
5. Click "Fruit Beer Game"
6. Read description and objectives
7. Click "Create Session"
8. Modal: "Login Required"
9. Click "Sign Up Free"
10. Fill form (choose Facilitator role)
11. Auto-login
12. Redirected back to simulation
13. Click "Create Session" again (now works!)
14. Play the game
```

### Returning User
```
1. Visit site
2. Already logged in (token in localStorage)
3. Can immediately create/join sessions
4. Full gameplay access
```

---

## 📂 Project Structure

```
parasmani-skills-platform/
├── backend/           Backend API + Game Engines
│   ├── src/
│   │   ├── services/gameEngines/
│   │   │   ├── FruitBeerEngine.ts     ✅ Full
│   │   │   ├── TOCFactoryEngine.ts    🔨 Skeleton
│   │   │   └── ... (8 more skeletons)
│   │   └── sockets/  Real-time handlers
│   └── prisma/       Database schema
├── frontend/          Next.js UI
│   ├── src/pages/
│   │   ├── index.tsx                   Landing page
│   │   ├── simulations/
│   │   │   ├── index.tsx              All simulations
│   │   │   └── [slug].tsx             Individual page
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── ...
└── simulations-data.json  Metadata for 11 simulations
```

---

## 🚀 Next Steps

1. **Play with Fruit Beer Game** - Test full functionality
2. **Implement skeleton engines** - Start with TOC Factory
3. **Add game UI components** - For each simulation
4. **Create facilitator dashboard** - Session management
5. **Deploy to production** - Vercel + Render

---

## 🆘 Need Help?

- Check backend logs in terminal
- Open browser console (F12) for frontend errors
- Verify all `.env` variables are set
- Ensure PostgreSQL is running
- Run: `cd backend && npm run prisma:studio` to view database

---

## 📞 Support

For issues or questions:
- Check `README.md` for detailed documentation
- Review `IMPLEMENTATION_CHANGES.md` for recent updates
- Open GitHub issue

---

**Happy Learning with Parasmani Skills! 🎯**
