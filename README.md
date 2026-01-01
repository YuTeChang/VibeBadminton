# PoweredByPace

A web app that helps groups of friends track their badminton games (doubles or singles) during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

## Live Demo

🌐 **Live App**: [View on Vercel](https://poweredbypace.vercel.app)

## Features

### Core Features
- **Create Sessions**: Set up a badminton session with players and financial settings
- **Game Modes**: Support for both doubles (4-6 players) and singles (2-6 players) gameplay
- **Round Robin Scheduling**: Generate scheduled game combinations with customizable count
- **Log Games**: Quickly log games during play (select teams/players, mark winner, or use scheduled games)
- **Live Stats**: Real-time win/loss tracking and gambling net calculations
- **Game Planning**: See upcoming scheduled games to plan your session time
- **Auto-Calculate**: Automatically calculates wins/losses, gambling net, and final settlement
- **Mobile-First**: Designed for use at the court with optimized mobile navigation
- **Edit Sessions**: Edit session name and date after creation
- **Delete Sessions**: Delete sessions and groups with confirmation dialogs
- **Search Sessions**: Search standalone sessions by name on the dashboard

### Groups Feature
- **Create Groups**: Organize recurring badminton groups (e.g., "Friday Night Badminton")
- **Shareable Links**: Share group links with friends so they can view sessions and stats
- **Player Pool**: Maintain a player pool per group for quick session setup
- **Group Sessions**: Track all sessions within a group over time
- **Cross-Session Stats**: View aggregated player statistics across all group sessions
- **Delete Groups**: Delete groups with all their sessions (with confirmation)

### Optional Betting
- **Toggle Betting**: Enable or disable betting per session (default: OFF)
- **Universal Stats**: Always see win rate, points scored/conceded, and point differential
- **Conditional Betting UI**: Betting-related fields and calculations only shown when enabled
- **Stats-Only Mode**: Use the app purely for tracking games without betting

### Performance Optimizations
- **Lightweight API Endpoints**: Dashboard uses optimized `/api/sessions/summary` endpoint for faster loading
- **Batch Queries**: Eliminated N+1 query problems with batch player fetching
- **Duplicate Call Prevention**: Smart caching and deduplication to prevent unnecessary API calls
- **Lazy Loading**: Data loaded only when needed (dashboard vs session pages)

## Screenshots

Screenshots are available in `docs/screenshots/test-results/` showing all current features.

See [docs/screenshots/README.md](docs/screenshots/README.md) for complete details.

**To regenerate screenshots:**
```bash
npm run test:screenshots
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API with optimistic updates
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) for shared sessions and groups
- **Sync Strategy**: Event-driven (no wasteful polling)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for shared sessions)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy .env.example to .env.local and fill in your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
POSTGRES_URL=your_postgres_connection_string  # For migrations
```

3. Initialize database:
   - **New database**: Run the SQL schema from `scripts/init-db-schema.sql` in your Supabase SQL Editor
   - **Automatic migration**: On Vercel deployments, migrations run automatically via `postbuild` script
     - Migration system scans `scripts/migrations/` for versioned SQL files (e.g., `001-add-groups.sql`)
     - Only runs pending migrations (tracks applied migrations in `migrations` table)
     - Ensure `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING` is set in Vercel environment variables
     - Or run manually: `npm run migrate:run` (requires connection string in environment)
   - See [Migration Guide](scripts/migrations/README.md) for details on creating and managing migrations

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment

**Vercel Configuration:**
- Automatic deployments are configured to skip when only documentation or non-code files change
- To manually skip a deployment, add `[skip ci]` or `[vercel skip]` to your commit message:
  ```bash
  git commit -m "Update docs [skip ci]"
  ```
- Deployments will only trigger when code files (`app/`, `lib/`, `components/`, etc.) or config files change

### Backend Setup

To enable shared sessions across users, set up Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and service role key from Settings → API
3. Add environment variables (see Installation step 2)
4. Run the database schema from `scripts/init-db-schema.sql` in Supabase SQL Editor

See [docs/SETUP_BACKEND.md](docs/SETUP_BACKEND.md) for detailed instructions.

## Architecture: Frontend vs Backend

This is a **full-stack Next.js application** with clear separation between frontend (client-side) and backend (server-side).

### Frontend (Client-Side)
**Runs in the browser** - React components that users interact with.

**Location:**
- `app/**/*.tsx` - All pages (except `app/api/`)
- `components/**/*.tsx` - Reusable UI components
- `contexts/SessionContext.tsx` - State management
- `lib/api/client.ts` - API client (makes requests to backend)

**What it does:**
- Renders UI and handles user interactions
- Manages client-side state (React Context)
- Makes HTTP requests to backend API
- Performs client-side calculations (stats, settlements)
- Provides optimistic UI updates

**Key Files:**
```
app/
├── page.tsx                    # Home page (landing)
├── dashboard/page.tsx          # Dashboard (sessions & groups)
├── create-group/page.tsx       # Create group form
├── create-session/page.tsx     # Create session form
├── group/[id]/page.tsx         # Group detail page
└── session/[id]/page.tsx       # Live session page

components/                      # UI components
contexts/
└── SessionContext.tsx          # Global state management
lib/
└── api/
    └── client.ts               # API client (calls backend)
```

### Backend (Server-Side)
**Runs on the server** - API routes and business logic that handle data operations.

**Location:**
- `app/api/**/*.ts` - API route handlers
- `lib/services/**/*.ts` - Business logic layer
- `lib/supabase.ts` - Database client

**What it does:**
- Handles HTTP requests (GET, POST, DELETE, etc.)
- Validates and processes data
- Executes database operations
- Enforces business rules
- Returns JSON responses

**Key Files:**
```
app/api/                        # Backend API Routes
├── sessions/
│   ├── route.ts               # GET all, POST create
│   ├── summary/route.ts       # GET summaries (lightweight)
│   └── [id]/
│       ├── route.ts           # GET one, DELETE
│       └── games/route.ts     # GET/POST games
└── groups/
    └── [id]/
        └── sessions/route.ts  # GET group sessions

lib/services/                   # Backend Business Logic
├── sessionService.ts          # Session CRUD operations
├── gameService.ts             # Game CRUD operations
├── groupService.ts            # Group CRUD operations
└── statsService.ts            # Stats aggregation

lib/supabase.ts                 # Database Connection
```

### How They Communicate

```
Frontend (Browser)
    ↓ HTTP Request
ApiClient.createSession()
    ↓ POST /api/sessions
Backend API Route (app/api/sessions/route.ts)
    ↓
SessionService.createSession()
    ↓
Supabase Database (PostgreSQL)
```

**Example Flow:**
1. User clicks "Create Session" → Frontend React component
2. Form submission → `ApiClient.createSession()` (frontend)
3. HTTP POST → `/api/sessions` (backend API route)
4. Business logic → `SessionService.createSession()` (backend)
5. Database save → Supabase (backend)
6. JSON response → Frontend updates UI

### Setup & Deployment

**Development:**
- Single Next.js dev server runs both frontend and backend
- Frontend: React components served to browser
- Backend: API routes run as Node.js server functions
- Database: Supabase (cloud PostgreSQL)

**Production (Vercel):**
- Frontend: Static assets (HTML, CSS, JS) served via CDN
- Backend: Serverless functions (API routes) run on-demand
- Database: Supabase (shared PostgreSQL instance)

## Project Structure

```
PoweredByPace/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page (simple landing) [FRONTEND]
│   ├── dashboard/         # Dashboard page [FRONTEND]
│   ├── create-group/      # Create group page [FRONTEND]
│   ├── create-session/    # Create session page [FRONTEND]
│   ├── group/[id]/        # Group detail page [FRONTEND]
│   ├── session/[id]/      # Live session page [FRONTEND]
│   └── api/               # API routes [BACKEND]
│       ├── sessions/      # Session endpoints
│       │   └── summary/  # Lightweight summary endpoint
│       └── groups/        # Group endpoints
├── components/            # React components [FRONTEND]
├── contexts/              # React Context [FRONTEND]
├── lib/                   # Utilities and services
│   ├── api/client.ts     # API client [FRONTEND]
│   ├── services/         # Database service layer [BACKEND]
│   ├── calculations.ts   # Money and stats calculations [FRONTEND]
│   ├── migration.ts     # Migration system [BACKEND]
│   └── roundRobin.ts     # Round robin scheduling [FRONTEND]
├── types/                # TypeScript type definitions [SHARED]
├── docs/                 # Documentation
└── scripts/              # Scripts and migrations
    ├── migrations/      # Versioned migration files [BACKEND]
    └── init-db-schema.sql  # Initial database schema [BACKEND]
```

## Documentation

**📖 Start here**: **[docs/README.md](docs/README.md)** - Complete guide covering everything you need to know.

**Quick Reference**:
- [Product Overview](docs/PRODUCT.md) - Product vision and features
- [Features Log](docs/FEATURES_LOG.md) - Complete feature history
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Test guide
- [Backend Setup](docs/SETUP_BACKEND.md) - Database setup instructions
- [Migration Guide](scripts/migrations/README.md) - Database migration system and best practices
- [API Analysis](docs/API_ANALYSIS.md) - API endpoint documentation and optimization notes

All documentation is organized for easy navigation. The main README has everything essential; detailed reference docs are in `docs/`.

## Development

### Key Concepts

- **Groups**: Organize recurring playing groups with shareable links
- **Sessions**: Individual badminton sessions (can belong to a group or standalone)
- **Players**: Can be linked to group player pool for tracking across sessions
- **Betting**: Optional per-session feature for tracking gambling nets (default: OFF)
- **Stats**: Universal stats (win rate, points) always shown; betting stats shown when enabled

### Database Schema

- `groups` - Badminton groups with shareable links
- `group_players` - Player pool per group
- `sessions` - Badminton sessions (can belong to a group)
- `players` - Session players (can link to group players)
- `games` - Individual games within sessions

See `scripts/init-db-schema.sql` for complete schema.

## Recent Updates

### Latest Features (2025-01)
- ✅ **Delete Functionality**: Delete sessions and groups with confirmation dialogs
- ✅ **Search**: Search standalone sessions by name on dashboard
- ✅ **Edit Sessions**: Edit session name and date after creation
- ✅ **API Optimization**: Lightweight summary endpoint for faster dashboard loading
- ✅ **Betting Default**: Betting now defaults to OFF for new sessions
- ✅ **Home Page Refactor**: Simple landing page with dashboard for sessions/groups

See [CHANGELOG.md](CHANGELOG.md) and [docs/FEATURES_LOG.md](docs/FEATURES_LOG.md) for complete change history.

## License

MIT
