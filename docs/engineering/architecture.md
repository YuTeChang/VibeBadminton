# Architecture & Frontend/Backend Separation

## Overview

PoweredByPace follows a **modern full-stack Next.js architecture** with clear separation between frontend (client-side React) and backend (server-side API routes + database).

> **Quick Answer**: 
> - **Frontend** = `app/**/*.tsx` (pages), `components/`, `contexts/` - runs in browser
> - **Backend** = `app/api/**/*.ts` (API routes), `lib/services/` - runs on server
> - **Setup** = Single Next.js app, both frontend and backend in same codebase

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (UI Layer)                            │ │
│  │  - Pages: Home, Dashboard, Group, Session, Summary     │ │
│  │  - Components: Forms, Leaderboard, PlayerProfileSheet  │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SessionContext (State Management)                      │ │
│  │  - Manages session state, games, all sessions          │ │
│  │  - Handles optimistic updates                         │ │
│  │  - Syncs with API on user actions                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ApiClient (API Communication Layer)                    │ │
│  │  - Type-safe API methods                               │ │
│  │  - Error handling                                       │ │
│  │  - Leaderboard & player stats endpoints                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Vercel/Next.js)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (Backend Layer)                             │ │
│  │  - /api/sessions/*                                      │ │
│  │  - /api/groups/[id]/stats (Leaderboard)                │ │
│  │  - /api/groups/[id]/players/[id]/stats (Player Profile)│ │
│  │  - Request validation                                  │ │
│  │  - Business logic orchestration                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer (Business Logic)                        │ │
│  │  - SessionService: Session CRUD operations             │ │
│  │  - GameService: Game CRUD + ELO trigger               │ │
│  │  - GroupService: Group & player pool management        │ │
│  │  - StatsService: Leaderboard & player detailed stats  │ │
│  │  - EloService: ELO calculation & updates              │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Database Layer (lib/supabase.ts)                     │ │
│  │  - Supabase REST API client                            │ │
│  │  - HTTP-based database operations                      │ │
│  │  - No direct SQL connections                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL via REST API)              │
│  - groups table                                              │
│  - group_players table (with elo_rating)                    │
│  - sessions table                                            │
│  - players table                                             │
│  - games table                                               │
│  - migrations table (tracking applied migrations)           │
└─────────────────────────────────────────────────────────────┘
```

## Service Layer

The backend business logic is organized into focused services:

### SessionService (`lib/services/sessionService.ts`)
- Session CRUD operations
- Player management within sessions
- Session summary queries

### GameService (`lib/services/gameService.ts`)
- Game CRUD operations
- **Triggers ELO updates** when game results are recorded
- Links to EloService for rating calculations

### GroupService (`lib/services/groupService.ts`)
- Group CRUD operations
- Player pool management
- Group sessions retrieval

### StatsService (`lib/services/statsService.ts`)
- **Leaderboard**: Get ranked players with ELO, W/L, recent form, best streak
- **Player Detailed Stats**: Partner synergy, opponent matchups, streaks, points scored/conceded
- Aggregates data across sessions for cross-session statistics

### PairingStatsService (`lib/services/pairingStatsService.ts`)
- **Pairing Leaderboard**: Get ranked doubles pairings by win rate
- **Pairing Detailed Stats**: W/L, ELO, streaks, points breakdown
- **Head-to-Head Matchups**: Stats against specific opponent pairings with game history
- **computeMatchupsFromGames()**: Computes points and game details per matchup

### EloService (`lib/services/eloService.ts`) - NEW
- **ELO Calculation**: Standard algorithm with K-factor of 32
- **Team Rating**: Averages player ratings for doubles
- **Rating Updates**: Called by GameService after game completion
- **Recalculation**: Can recalculate all ELO from game history

## Data Flow: ELO Update

When a game result is recorded:

```
1. User marks winner → React Component (frontend)
2. API call → PUT /api/sessions/[id]/games/[gameId] (frontend → backend)
3. GameService.updateGame() (backend)
   ├─ Updates game record in database
   └─ If winning_team changed from null:
      └─ Calls EloService.processGameResult()
         ├─ Gets current ratings from group_players
         ├─ Calculates team ratings (average for doubles)
         ├─ Computes expected scores
         ├─ Calculates new ratings
         └─ Updates group_players.elo_rating
4. Response → Updated game JSON (backend → frontend)
```

## Data Flow: Leaderboard

```
1. User clicks Leaderboard tab → Group Page (frontend)
2. API call → GET /api/groups/[id]/stats (frontend → backend)
3. StatsService.getLeaderboard() (backend)
   ├─ Query group_players ordered by elo_rating
   ├─ Get all games for group sessions
   ├─ Calculate W/L per player
   ├─ Determine recent form (last 5 games)
   └─ Build LeaderboardEntry[] response
4. Response → JSON array (backend → frontend)
5. UI renders ranked player list
```

## Data Flow: Player Profile

```
1. User clicks player in Leaderboard → Group Page (frontend)
2. API call → GET /api/groups/[id]/players/[playerId]/stats (frontend → backend)
3. StatsService.getPlayerDetailedStats() (backend)
   ├─ Get player info and rank
   ├─ Get all games player participated in
   ├─ Calculate W/L, points, win rate
   ├─ Build partner stats (win rate per teammate)
   ├─ Build opponent stats (win rate per opponent)
   └─ Determine current streak and recent form
4. Response → PlayerDetailedStats JSON (backend → frontend)
5. UI renders PlayerProfileSheet modal
```

## Frontend (Client-Side)

### Location
- **Pages**: `app/**/*.tsx` (Next.js App Router pages)
- **Components**: `components/**/*.tsx`
- **State Management**: `contexts/SessionContext.tsx`
- **API Client**: `lib/api/client.ts`

### Key Components

```
app/
├── page.tsx                    # Home page
├── dashboard/page.tsx          # Dashboard with session list
├── create-group/page.tsx       # Create group form
├── create-session/page.tsx     # Create session form
├── group/[id]/page.tsx         # Group page with tabs:
│                               #   - Sessions
│                               #   - Leaderboard (NEW)
│                               #   - Players
└── session/[id]/
    ├── page.tsx                # Live session page
    └── summary/page.tsx        # Summary page

components/
├── PlayerProfileSheet.tsx      # Player profile modal (NEW)
├── LiveStatsCard.tsx           # Real-time stats display
├── QuickGameForm.tsx           # Game recording form
└── ...
```

## Backend (Server-Side)

### Key Files

```
app/api/
├── groups/
│   ├── route.ts                # GET all, POST create
│   └── [id]/
│       ├── route.ts           # GET one, DELETE
│       ├── stats/
│       │   └── route.ts       # GET leaderboard (NEW)
│       ├── players/
│       │   ├── route.ts       # GET/POST/DELETE players
│       │   └── [playerId]/
│       │       └── stats/
│       │           └── route.ts # GET player stats (NEW)
│       └── sessions/
│           └── route.ts       # GET group sessions
├── sessions/
│   └── ...
└── migrate/
    └── route.ts               # POST run migrations

lib/services/
├── sessionService.ts           # Session operations
├── gameService.ts              # Game operations + ELO trigger
├── groupService.ts             # Group operations
├── statsService.ts             # Leaderboard & stats (NEW)
└── eloService.ts               # ELO calculations (NEW)

lib/
├── supabase.ts                # Database client
└── migration.ts               # Migration system
```

## API Endpoints

### Sessions
```
GET    /api/sessions                    # Get all sessions
GET    /api/sessions/summary            # Get lightweight summaries
POST   /api/sessions                    # Create session
GET    /api/sessions/[id]               # Get one session
DELETE /api/sessions/[id]               # Delete session
```

### Games
```
GET    /api/sessions/[id]/games         # Get all games
POST   /api/sessions/[id]/games         # Create game
PUT    /api/sessions/[id]/games/[id]   # Update game (triggers ELO)
DELETE /api/sessions/[id]/games/[id]  # Delete game
```

### Groups
```
GET    /api/groups                      # Get all groups
POST   /api/groups                      # Create group
GET    /api/groups/[id]                 # Get one group
DELETE /api/groups/[id]                 # Delete group
GET    /api/groups/[id]/sessions        # Get group sessions
GET    /api/groups/[id]/players         # Get player pool
POST   /api/groups/[id]/players         # Add player(s)
DELETE /api/groups/[id]/players         # Remove player
```

### Stats
```
GET    /api/groups/[id]/stats           # Get leaderboard
GET    /api/groups/[id]/players/[id]/stats  # Get player detailed stats
```

### Guests
```
GET    /api/groups/[id]/guests          # Get recent guests (unlinked session players)
POST   /api/groups/[id]/guests          # Promote guest to group player
```

### System
```
POST   /api/init                        # Initialize database
POST   /api/migrate                     # Run migrations
GET    /api/health/db                   # Database health check
```

## Type Definitions

Key types in `types/index.ts`:

```typescript
// Core types
interface Group { id, name, shareableLink, createdAt }
interface GroupPlayer { id, groupId, name, eloRating?, createdAt }
interface Session { id, name, date, players[], gameMode, groupId?, ... }
interface Player { id, name, groupPlayerId?, isGuest? }  // isGuest for unlinked players
interface Game { id, sessionId, teamA, teamB, winningTeam, ... }

// Stats types (NEW)
interface LeaderboardEntry {
  groupPlayerId, playerName, eloRating, rank,
  totalGames, wins, losses, winRate,
  recentForm: ('W' | 'L')[],
  trend: 'up' | 'down' | 'stable'
}

interface PlayerDetailedStats {
  groupPlayerId, playerName, eloRating, rank, totalPlayers,
  totalGames, wins, losses, winRate,
  pointsScored, pointsConceded, pointDifferential,
  sessionsPlayed, recentForm, currentStreak,
  partnerStats: PartnerStats[],
  opponentStats: OpponentStats[]
}

interface PartnerStats {
  partnerId, partnerName, gamesPlayed, wins, losses, winRate
}

interface OpponentStats {
  opponentId, opponentName, gamesPlayed, wins, losses, winRate
}
```

## Deployment Architecture

### Development
```
Local Machine
├── Next.js Dev Server (port 3000)
│   ├── Frontend (React)
│   └── Backend (API Routes)
└── Supabase (cloud database)
```

### Production (Vercel)
```
Vercel Platform
├── Edge Network (CDN)
│   └── Static assets (HTML, CSS, JS)
├── Serverless Functions
│   ├── API Routes (backend)
│   └── postbuild → migrations
└── Supabase
    └── PostgreSQL database
```

## Migration System

Migrations run automatically on every deployment:

```
scripts/migrations/
├── 001-add-groups.sql      # Groups feature
├── 002-add-elo-rating.sql  # ELO rating column
└── README.md               # Migration guide
```

See [Database Documentation](./database.md) for details.

## Future Enhancements

- **Real-time Sync**: WebSockets for live leaderboard updates
- **ELO History**: Track rating changes over time with graphs
- **Team Suggestions**: AI-powered team balancing based on ELO
- **Caching**: Redis for frequently accessed leaderboards
- **Authentication**: User accounts and session ownership
- **Push Notifications**: Game invites and results

## Guest Mode Architecture

Guest mode allows non-group players to participate in sessions without affecting group stats:

### Data Flow: Session Creation with Guest

```
1. User types player name in create-session form
2. On blur, check if name matches existing group player
3. If no match → Show guest prompt modal:
   ├─ "Add as Guest" → Create session player with isGuest=true
   └─ "Add to Group" → Call POST /api/groups/[id]/players
                       → Create session player linked to new group player
4. Session created with mix of linked and guest players
```

### Data Flow: Promote Guest to Group

```
1. Admin views Players tab → Sees "Recent Guests" section
2. Guests are unlinked players from last 30 days
3. Click "Add" on guest → POST /api/groups/[id]/guests
4. Backend:
   ├─ Creates new group_player record
   └─ Links ALL past session players with same name to new group_player
5. Guest now appears in group player pool with historical stats linked
```

### Guest vs Linked Player

```
Linked Player (groupPlayerId set):
  - Stats count toward group leaderboard
  - ELO rating tracked and updated
  - Appears in player pool for future sessions
  - Shows rank badge in session

Guest Player (isGuest=true, no groupPlayerId):
  - Stats don't affect group leaderboard
  - No ELO impact
  - Shows yellow "Guest" badge in session
  - Can be promoted later to link historical games
```
