# PoweredByPace Documentation

**A web app for tracking badminton games and calculating money settlements.**

> **📖 This is the main documentation file.** Everything you need to understand and work with PoweredByPace is here. Detailed reference docs are linked at the bottom.

## Quick Start

### What It Does
Helps groups of friends track badminton games (doubles or singles) during a session and automatically calculates:
- Wins/losses per player
- Win rates and point statistics (always shown)
- Gambling net (from per-game bets, optional)
- Final money settlement (who owes the organizer how much)

### Key Features

#### Core Features
- ✅ **Game Modes**: Support for both doubles (4-6 players) and singles (2-6 players)
- ✅ Create session with players and financial settings
- ✅ Default player names (Player 1, Player 2, etc.) if not provided
- ✅ Multiple session management - create and switch between sessions
- ✅ Log games with team/player selection
- ✅ Real-time stats (wins/losses, gambling net)
- ✅ Round robin scheduling (optional)
- ✅ Automatic final settlement calculation
- ✅ Shareable summary text
- ✅ Mobile-optimized UI with bottom tab navigation
- ✅ **Edit Sessions**: Edit session name and date after creation
- ✅ **Delete Sessions**: Delete sessions and groups with confirmation
- ✅ **Search Sessions**: Search standalone sessions by name on dashboard

#### Groups Feature (NEW)
- ✅ **Create Groups**: Organize recurring badminton groups
- ✅ **Shareable Links**: Share group links with friends (no accounts required)
- ✅ **Player Pool**: Maintain a player pool per group for quick session setup
- ✅ **Group Sessions**: Track all sessions within a group over time
- ✅ **Player Linking**: Link session players to group player pool for cross-session tracking

#### Optional Betting
- ✅ **Toggle Betting**: Enable or disable betting per session (default: OFF)
- ✅ **Universal Stats**: Always see win rate, points scored/conceded, point differential
- ✅ **Conditional UI**: Betting fields and calculations only shown when enabled
- ✅ **Stats-Only Mode**: Use app purely for game tracking without betting

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API with optimistic updates
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) for shared sessions and groups
- **Sync Strategy**: Event-driven (no wasteful polling)

---

## Product Overview

See **[PRODUCT.md](PRODUCT.md)** for complete product overview, problem statement, and future roadmap.

---

## Features

### 1. Groups

**Create and Manage Groups:**
- Create a group (e.g., "Friday Night Badminton")
- Get a shareable link to invite friends
- Add players to the group's player pool
- View all sessions within the group

**Benefits:**
- Organize recurring playing groups
- Track players across multiple sessions
- Share group with friends (no accounts needed)
- View aggregated stats across sessions

### 2. Create Session

- Session name (optional, defaults to date) and date
- **Group Selection** (optional): Link session to a group
- **Game Mode**: Toggle between doubles (4-6 players) and singles (2-6 players)
- **Player Suggestions**: Quick-add players from group pool
- Add players (minimum required based on mode)
  - Default names (Player 1, Player 2, etc.) assigned automatically
  - Can start session without entering all names
- Financial settings:
  - Court cost (per person or total)
  - Bird/shuttle cost
  - **Betting Toggle**: Enable or disable betting for this session
  - Bet per player per game (only shown when betting enabled)
- Select organizer (auto-selects first player if none chosen)
- Optional: Round robin scheduling

### 3. Live Session
Three tabs for managing the session:

**Stats Tab** (default):
- Live W/L record for each player
- Win rate and point statistics
- Current gambling net (+$X or -$X) if betting enabled
- Next scheduled game (if round robin enabled)
- Upcoming games list
- Recent games

**Record Tab**:
- Select Team A (2 players for doubles, 1 player for singles)
- Select Team B (2 players for doubles, 1 player for singles)
- Auto-selects last player in 4-player doubles mode when 3 are selected
- Mark winning team
- Optional scores
- Save game

**History Tab**:
- Complete list of all played games
- Undo last game option

### 4. Summary
- Final stats table:
  - **Universal Stats**: W/L, Win %, Point Differential (always shown)
  - **Betting Stats**: Net, Amount to Pay (only when betting enabled)
- Cost breakdown (court, birds, betting if enabled)
- Shareable text (copy to WhatsApp/Discord)
- All calculations automatic

---

## Architecture: Frontend vs Backend

This is a **full-stack Next.js application** with clear separation between frontend (client-side) and backend (server-side).

### Frontend (Client-Side)
**Runs in the browser** - React components that users interact with.

**Location:**
- `app/**/*.tsx` - All pages (except `app/api/`)
- `components/**/*.tsx` - Reusable UI components
- `contexts/SessionContext.tsx` - State management
- `lib/api/client.ts` - API client (makes requests to backend)
- `lib/calculations.ts` - Client-side calculations (stats, settlements)
- `lib/roundRobin.ts` - Round robin game generation

**What it does:**
- Renders UI and handles user interactions
- Manages client-side state (React Context)
- Makes HTTP requests to backend API
- Performs client-side calculations (stats, settlements)
- Provides optimistic UI updates

**Key Components:**
- **Pages**: Home, Dashboard, Create Group, Create Session, Group Detail, Live Session, Summary
- **State**: SessionContext (stores current session, games, all sessions, groups)
- **Calculations**: Client-side stats and settlement calculations
- **Routing**: Next.js App Router

### Backend (Server-Side)
**Runs on the server** - API routes and business logic that handle data operations.

**Location:**
- `app/api/**/*.ts` - API route handlers
- `lib/services/**/*.ts` - Business logic layer
- `lib/supabase.ts` - Database client
- `lib/migration.ts` - Database migration system

**What it does:**
- Handles HTTP requests (GET, POST, DELETE, etc.)
- Validates and processes data
- Executes database operations
- Enforces business rules
- Returns JSON responses

**Key Components:**
- **API Routes**: `/api/sessions/*`, `/api/groups/*`, `/api/sessions/summary`
- **Services**: SessionService, GameService, GroupService, StatsService
- **Database**: Supabase (PostgreSQL) via REST API

### System Overview
```
Browser (Frontend)
    ↓ HTTP Requests
Next.js API Routes (Backend)
    ↓
Service Layer (Backend)
    ↓
Supabase Database (PostgreSQL)
```

### Communication Flow

**Example: Creating a Session**

1. **Frontend**: User fills form → React component (`app/create-session/page.tsx`)
2. **Frontend**: Form submission → `ApiClient.createSession()` (`lib/api/client.ts`)
3. **HTTP**: POST request → `/api/sessions`
4. **Backend**: API route handler (`app/api/sessions/route.ts`)
5. **Backend**: Business logic → `SessionService.createSession()` (`lib/services/sessionService.ts`)
6. **Backend**: Database save → Supabase (`lib/supabase.ts`)
7. **Backend**: Returns JSON response
8. **Frontend**: Updates UI with response → SessionContext updates

### Data Model
```typescript
Group {
  id, name, shareableLink, createdAt
}

GroupPlayer {
  id, groupId, name, createdAt
}

Session {
  id, name, date, players[], organizerId,
  courtCostType, courtCostValue, birdCostTotal, betPerPlayer,
  gameMode: "doubles" | "singles",
  groupId?: string,  // Optional - links to group
  bettingEnabled: boolean  // Per-session toggle
}

Player {
  id, name,
  groupPlayerId?: string  // Optional - links to group player pool
}

Game {
  id, sessionId, gameNumber,
  teamA: [playerId, playerId] | [playerId],  // doubles or singles
  teamB: [playerId, playerId] | [playerId],  // doubles or singles
  winningTeam: "A" | "B",
  teamAScore?, teamBScore?
}
```

### Calculation Logic
1. **Non-Betting Stats** (always calculated):
   - Wins, losses, games played
   - Win rate (wins / games played * 100)
   - Points scored, points conceded
   - Point differential (scored - conceded)

2. **Betting Stats** (only when betting enabled):
   - Gambling Net: Winners get +bet, losers get -bet per game
   - Shared Costs: Court cost + bird cost
   - Even Share: Total shared costs / number of players
   - Fair Total: Even share - gambling net
   - Final Amount: Fair total (organizer pays $0)

---

## Development

### Getting Started
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Project Structure
```
app/              # Next.js pages
components/       # React components
contexts/         # SessionContext
lib/              # Utilities and services
  services/       # Database service layer
  calculations.ts # Money and stats calculations
  roundRobin.ts   # Round robin scheduling
types/            # TypeScript definitions
docs/             # Documentation
scripts/          # Database migration scripts
```

### Key Files
- `app/page.tsx` - Home page (simple landing)
- `app/dashboard/page.tsx` - Dashboard (groups and sessions)
- `app/create-group/page.tsx` - Create group form
- `app/create-session/page.tsx` - Create session form
- `app/group/[id]/page.tsx` - Group detail page
- `app/session/[id]/page.tsx` - Live session (tabs)
- `app/session/[id]/summary/page.tsx` - Final summary
- `contexts/SessionContext.tsx` - State management
- `lib/calculations.ts` - Money and stats calculations
- `lib/services/groupService.ts` - Group database operations
- `lib/services/sessionService.ts` - Session database operations (with summary endpoint)
- `lib/services/statsService.ts` - Cross-session stats aggregation

### Design System
- **Style**: Japandi/Scandinavian minimal
- **Colors**: Warm off-white (#F7F2EA), camel accent (#D3A676)
- **Mobile-first**: Touch-optimized, responsive
- **Components**: Rounded cards, soft shadows, clean typography

---

## Setup & Configuration

### Frontend Setup
No special setup needed - just run `npm run dev` and the frontend is served automatically.

### Backend Setup
The backend requires database configuration:

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Run database schema**: Execute `scripts/init-db-schema.sql` in Supabase SQL Editor
3. **Set environment variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   POSTGRES_URL=your_postgres_connection_string  # For migrations
   ```
4. **Migrations**: Run automatically on Vercel deployments, or manually with `npm run migrate:run`

See [SETUP_BACKEND.md](SETUP_BACKEND.md) for detailed instructions.

### How It Works Together

**Development:**
- Single command: `npm run dev`
- Frontend: React app on `http://localhost:3000`
- Backend: API routes on `http://localhost:3000/api/*`
- Both run in same Next.js process

**Production (Vercel):**
- Frontend: Static assets served via CDN
- Backend: API routes run as serverless functions
- Database: Supabase (shared PostgreSQL instance)

---

## Testing

### Automated Screenshots
```bash
npm run test:screenshots
```
Captures screenshots of all features. See `docs/screenshots/test-results/`.

### Manual Testing
See `docs/TESTING_CHECKLIST.md` for comprehensive test scenarios.

---

## Features Status

### ✅ Complete Features

**Core:**
- Game modes (doubles and singles)
- Session creation and management
- Game logging with team/player selection
- Real-time stats
- Round robin scheduling
- Automatic settlement calculation
- Mobile-responsive design

**Groups:**
- Create and manage groups
- Shareable links
- Player pool management
- Group sessions tracking
- Player linking across sessions
- Delete groups (with confirmation)

**Management:**
- Edit session name and date
- Delete sessions and groups
- Search standalone sessions by name

**Optional Betting:**
- Per-session betting toggle (default: OFF)
- Universal stats (always shown)
- Conditional betting UI
- Stats-only mode

**Performance:**
- Lightweight summary API endpoint
- Optimized batch queries (no N+1 problems)
- Duplicate call prevention
- Lazy loading for better performance

**What's Not (Future):**
- User authentication
- Elo ratings
- Head-to-head statistics
- Advanced analytics

---

## Architecture & Engineering

- **[Architecture](engineering/architecture.md)** - Frontend/backend separation, data flow, deployment
- **[Sync Strategy](engineering/sync-strategy.md)** - Event-driven sync (no wasteful polling)
- **[System Overview](engineering/system_overview.md)** - High-level system design
- **[Frontend Details](engineering/frontend.md)** - React components and state management

## Reference Documentation

### Essential References
- **[Product Overview](PRODUCT.md)** - Problem, solution, target users, future features
- **[Features Development Log](FEATURES_LOG.md)** - Complete log of all features, improvements, and fixes
- **[Testing Checklist](TESTING_CHECKLIST.md)** - Manual testing guide
- **[Design Decisions](decisions.md)** - Important technical and design decisions

### Engineering Documentation
- **[System Overview](engineering/system_overview.md)** - Architecture and data flow
- **[Frontend Structure](engineering/frontend.md)** - Pages, components, routing
- **[User Flows](engineering/flows.md)** - Key interaction flows
- **[Design System](engineering/design-system.md)** - Design tokens and styling guide
- **[Component System](engineering/component-system.md)** - Component architecture

### Test Results
- **[Screenshot Test Results](screenshots/test-results/)** - Visual proof of all features

---

## License

MIT
