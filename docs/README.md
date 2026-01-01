# PoweredByPace Documentation

**Complete guide to understanding and working with PoweredByPace.**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Development](#development)
5. [API Reference](#api-reference)
6. [Testing](#testing)
7. [Reference Docs](#reference-documentation)

---

## Quick Start

### What It Does

Helps groups of friends track badminton games (doubles or singles) during a session and automatically calculates:
- Wins/losses per player
- Win rates and point statistics (always shown)
- Gambling net (from per-game bets, optional)
- Final money settlement (who owes the organizer how much)

### Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```

See [SETUP_BACKEND.md](SETUP_BACKEND.md) for database setup.

---

## Features

### Core Features

**Session Management**
- Create sessions with players and financial settings
- Edit session name and date after creation
- Delete sessions with confirmation
- Search standalone sessions by name

**Game Modes**
- **Doubles**: 4-6 players, team-based gameplay
- **Singles**: 2-6 players, 1v1 matchups
- Simplified UI for singles (player names instead of Team A/B)

**Game Recording**
- Quick game logging with team/player selection
- Round robin scheduling (optional)
- Pre-fill from scheduled games
- Auto-select last player in 4-player doubles mode

**Stats & Calculations**
- Real-time win/loss tracking
- Win rate and point statistics (always shown)
- Automatic settlement calculations
- Shareable summary text

### Groups Feature

**Group Management**
- Create recurring badminton groups
- Shareable links (no accounts required)
- Delete groups with all sessions (confirmation required)

**Player Pool**
- Maintain player pool per group
- Quick-add players when creating sessions
- Link session players to group pool

**Cross-Session Tracking**
- View all sessions within a group
- Aggregated player statistics across sessions
- Track players over time

### Optional Betting

- **Toggle**: Enable/disable per session (default: OFF)
- **Universal Stats**: Win rate, points always shown
- **Conditional UI**: Betting fields only when enabled
- **Stats-Only Mode**: Use app without betting

### Performance Optimizations

- **Lightweight APIs**: Summary endpoint for dashboard (~80% smaller payload)
- **Batch Queries**: Eliminated N+1 problems
- **Smart Caching**: Duplicate call prevention
- **Lazy Loading**: Data loaded only when needed
- **Instant Tab Switching**: No refresh on tab clicks
- **Smart Refresh**: Only refreshes when returning to page

---

## Architecture

### Frontend vs Backend

This is a **full-stack Next.js application** with clear separation.

**Frontend (Client-Side)**
- **Location**: `app/**/*.tsx` (except `app/api/`), `components/`, `contexts/`
- **Purpose**: UI rendering, user interactions, client-side calculations
- **State**: React Context API with optimistic updates
- **Key Files**:
  - `app/dashboard/page.tsx` - Dashboard
  - `app/create-session/page.tsx` - Create session
  - `app/group/[id]/page.tsx` - Group detail
  - `app/session/[id]/page.tsx` - Live session
  - `contexts/SessionContext.tsx` - State management
  - `lib/api/client.ts` - API client

**Backend (Server-Side)**
- **Location**: `app/api/**/*.ts`, `lib/services/**/*.ts`
- **Purpose**: HTTP requests, database operations, business logic
- **Key Files**:
  - `app/api/sessions/route.ts` - Session endpoints
  - `app/api/sessions/summary/route.ts` - Lightweight summaries
  - `lib/services/sessionService.ts` - Session operations
  - `lib/services/groupService.ts` - Group operations
  - `lib/supabase.ts` - Database client

### Data Flow

```
User Action (Frontend)
    ↓
ApiClient (Frontend)
    ↓ HTTP Request
API Route (Backend)
    ↓
Service Layer (Backend)
    ↓
Supabase Database
    ↓ JSON Response
Frontend Updates UI
```

### Data Model

```typescript
Group {
  id, name, shareableLink, createdAt
}

Session {
  id, name, date, players[], organizerId,
  courtCostType, courtCostValue, birdCostTotal, betPerPlayer,
  gameMode: "doubles" | "singles",
  groupId?: string,  // Optional
  bettingEnabled: boolean
}

Player {
  id, name,
  groupPlayerId?: string  // Optional - links to group pool
}

Game {
  id, sessionId, gameNumber,
  teamA: [playerId, playerId] | [playerId],  // doubles or singles
  teamB: [playerId, playerId] | [playerId],
  winningTeam: "A" | "B",
  teamAScore?, teamBScore?
}
```

See [engineering/architecture.md](engineering/architecture.md) for detailed architecture.

---

## Development

### Project Structure

```
app/
├── page.tsx              # Home (landing)
├── dashboard/            # Dashboard
├── create-group/         # Create group
├── create-session/       # Create session
├── group/[id]/           # Group detail
├── session/[id]/         # Live session
└── api/                  # API routes [BACKEND]

components/               # React components
contexts/                 # SessionContext
lib/
├── api/client.ts        # API client [FRONTEND]
├── services/            # Database services [BACKEND]
├── calculations.ts      # Stats calculations [FRONTEND]
└── roundRobin.ts        # Round robin scheduling [FRONTEND]
```

### Key Concepts

- **Groups**: Recurring playing groups with shareable links
- **Sessions**: Individual badminton sessions (can belong to a group or standalone)
- **Players**: Can be linked to group player pool for cross-session tracking
- **Betting**: Optional per-session feature (default: OFF)
- **Stats**: Universal stats always shown; betting stats when enabled

### Database Schema

- `groups` - Badminton groups with shareable links
- `group_players` - Player pool per group
- `sessions` - Badminton sessions (can belong to a group)
- `players` - Session players (can link to group players)
- `games` - Individual games within sessions

See `scripts/init-db-schema.sql` for complete schema.

---

## API Reference

### Endpoints

**Sessions**
- `GET /api/sessions` - Get all sessions (full details)
- `GET /api/sessions/summary` - Get lightweight summaries (dashboard)
- `GET /api/sessions/[id]` - Get one session
- `POST /api/sessions` - Create session
- `DELETE /api/sessions/[id]` - Delete session

**Groups**
- `GET /api/groups` - Get all groups
- `GET /api/groups/[id]` - Get one group
- `GET /api/groups/[id]/sessions` - Get group sessions
- `POST /api/groups` - Create group
- `DELETE /api/groups/[id]` - Delete group

**Games**
- `GET /api/sessions/[id]/games` - Get session games
- `POST /api/sessions/[id]/games` - Create game
- `PUT /api/sessions/[id]/games/[gameId]` - Update game
- `DELETE /api/sessions/[id]/games/[gameId]` - Delete game

See [API_ANALYSIS.md](API_ANALYSIS.md) for detailed API documentation and optimization notes.

---

## Testing

### Automated Screenshots
```bash
npm run test:screenshots
```
Captures screenshots of all features. See `screenshots/test-results/`.

### Manual Testing
See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for comprehensive test scenarios.

---

## Reference Documentation

### Essential
- **[Product Overview](PRODUCT.md)** - Product vision, problem statement, roadmap
- **[Features Log](FEATURES_LOG.md)** - Complete feature development history
- **[Changelog](../CHANGELOG.md)** - Change history
- **[Testing Checklist](TESTING_CHECKLIST.md)** - Manual testing guide
- **[Design Decisions](decisions.md)** - Technical and design decisions

### Setup & Configuration
- **[Backend Setup](SETUP_BACKEND.md)** - Database setup instructions
- **[Migration Guide](../scripts/migrations/README.md)** - Database migration system

### Engineering
- **[Architecture](engineering/architecture.md)** - Frontend/backend separation, data flow
- **[System Overview](engineering/system_overview.md)** - High-level system design
- **[Frontend Details](engineering/frontend.md)** - React components and state management
- **[User Flows](engineering/flows.md)** - Key interaction flows
- **[Sync Strategy](engineering/sync-strategy.md)** - Event-driven sync (no polling)
- **[Design System](engineering/design-system.md)** - Design tokens and styling
- **[Component System](engineering/component-system.md)** - Component architecture

### API & Performance
- **[API Analysis](API_ANALYSIS.md)** - API endpoint documentation and optimization

### Test Results
- **[Screenshot Test Results](screenshots/test-results/)** - Visual proof of all features

---

## License

MIT
