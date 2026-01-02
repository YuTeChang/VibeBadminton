# PoweredByPace

A web app that helps groups of friends track their badminton games (doubles or singles) during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

🌐 **Live App**: [poweredbypace.vercel.app](https://poweredbypace.vercel.app)

---

## How It Works

1. **Create a Group**: One person creates a group and gets a shareable code (e.g., `i1lcbcsl`)
2. **Share the Code**: Send the code to friends via text/chat
3. **Join via Code**: Friends enter the code on the home page to join
4. **Play & Track**: Record games, view stats, and settle up at the end

---

## Quick Start

### Installation

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Setup

1. **Environment Variables**: Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   POSTGRES_URL=your_postgres_connection_string  # For migrations
   ```

2. **Database**: Run `scripts/init-db-schema.sql` in Supabase SQL Editor

3. **Migrations**: Run automatically on Vercel deployments (see below)

See [docs/SETUP_BACKEND.md](docs/SETUP_BACKEND.md) for detailed setup instructions.

---

## Features

### Core
- ✅ **Game Modes**: Doubles (4-6 players) and Singles (2-6 players)
- ✅ **Session Management**: Create, edit sessions
- ✅ **Game Logging**: Quick game recording with team/player selection
- ✅ **Live Stats**: Real-time win/loss tracking and calculations
- ✅ **Round Robin**: Generate scheduled game combinations
- ✅ **Auto-Calculate**: Automatic settlement calculations
- ✅ **Search**: Search standalone sessions by name

### Groups
- ✅ **Create Groups**: Organize recurring badminton groups
- ✅ **Shareable Links**: Share groups with friends (no accounts needed)
- ✅ **Player Pool**: Maintain player pool per group
- ✅ **Group Sessions**: Track all sessions within a group
- ✅ **Cross-Session Stats**: View aggregated player statistics

### Leaderboard & Player Stats
- ✅ **ELO Rating System**: Track player skill with ELO ratings (starting at 1500)
- ✅ **Leaderboard**: Ranked view of all players in a group by ELO
- ✅ **Player Profiles**: Detailed stats for each player (click to view)
- ✅ **Partner Synergy**: See who you play best with (win rates by partner)
- ✅ **Opponent Matchups**: Track performance against specific opponents
- ✅ **Recent Form**: Visual display of last 5 games (W/L indicators)
- ✅ **Streak Tracking**: Current win/loss streak indicators

### Pairing Stats
- ✅ **Best Pairings Tab**: View doubles team combinations ranked by win rate
- ✅ **Pairing Profiles**: Detailed stats for each pairing (click to view)
- ✅ **Head-to-Head Matchups**: See how pairings perform against other pairings
- ✅ **Pairing Form**: Recent form and streaks for each pairing

### Optional Betting
- ✅ **Toggle Betting**: Enable/disable per session (default: OFF)
- ✅ **Universal Stats**: Win rate, points always shown
- ✅ **Conditional UI**: Betting fields only shown when enabled

### Performance
- ✅ **Optimized APIs**: Lightweight endpoints, batch queries
- ✅ **Smart Caching**: Duplicate call prevention
- ✅ **Fast Loading**: Dashboard loads ~72% faster (~500ms vs ~1800ms)

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)

---

## Database & Migrations

### Automatic Migrations

Migrations run **automatically on every Vercel deployment**. No manual steps required!

**How it works:**
```
Push to GitHub → Vercel builds → postbuild runs → Migrations applied → Deploy complete
```

**Under the hood:**
1. `postbuild` script executes after `next build`
2. Migration system scans `scripts/migrations/` for SQL files
3. Compares against `migrations` table to find pending migrations
4. Applies only new migrations in version order (001, 002, 003...)
5. Records applied migrations to prevent re-running

**Migration files follow this pattern:**
```
scripts/migrations/
├── 001-add-groups.sql          # Creates groups feature tables
├── 002-add-elo-rating.sql      # Adds ELO rating column
├── 003-add-player-stats.sql    # Adds wins/losses columns
├── 004-add-pairing-stats.sql   # Adds pairing stats tables
└── README.md                   # Detailed migration guide
```

**Manual migration (if needed):**
```bash
npm run migrate:run          # Run locally
# OR
curl -X POST https://your-app.vercel.app/api/migrate  # Via API
```

See [scripts/migrations/README.md](scripts/migrations/README.md) for detailed migration documentation.

---

## Project Structure

```
app/                    # Next.js pages [FRONTEND]
├── page.tsx            # Home (code input, recent groups)
├── dashboard/          # Admin dashboard (internal use)
├── create-*/           # Create forms
├── group/[id]/         # Group pages (Sessions, Leaderboard, Players, Pairings)
├── session/[id]/       # Session pages
└── api/                # API routes [BACKEND]
    ├── groups/         # Group endpoints
    │   └── [id]/
    │       ├── stats/          # Leaderboard endpoint
    │       ├── pairings/       # Pairing stats endpoint
    │       └── players/[playerId]/stats/  # Player profile endpoint
    └── sessions/       # Session endpoints

components/             # React components [FRONTEND]
├── PlayerProfileSheet.tsx   # Player profile modal
├── PairingProfileSheet.tsx  # Pairing profile modal
└── ...

lib/
├── api/client.ts       # API client [FRONTEND]
├── services/           # Database services [BACKEND]
│   ├── sessionService.ts
│   ├── gameService.ts
│   ├── groupService.ts
│   ├── statsService.ts       # Leaderboard & player stats
│   ├── eloService.ts         # ELO calculations
│   └── pairingStatsService.ts  # Pairing stats
├── calculations.ts     # Stats calculations [FRONTEND]
└── migration.ts        # Migration system

scripts/migrations/     # Database migrations (auto-applied)
types/index.ts          # TypeScript types
```

---

## Documentation

**📖 [Complete Documentation](docs/README.md)** - Full guide covering everything

**Quick Links**:
- [Product Overview](docs/PRODUCT.md) - Vision and roadmap
- [Features Log](docs/FEATURES_LOG.md) - Feature history
- [Changelog](CHANGELOG.md) - Change history
- [Testing Guide](docs/TESTING_CHECKLIST.md) - Test scenarios
- [Backend Setup](docs/SETUP_BACKEND.md) - Database setup
- [Database Schema](docs/engineering/database.md) - Database documentation
- [API Analysis](docs/API_ANALYSIS.md) - API documentation
- [Architecture](docs/engineering/architecture.md) - System design
- [Admin Guide](docs/ADMIN.md) - Admin operations

---

## Admin Operations

Some operations are admin-only and must be performed via API.

See [docs/ADMIN.md](docs/ADMIN.md) for complete admin guide.

### Quick Method: Browser Console

1. Open the app in your browser
2. Press `F12` to open DevTools → **Console** tab
3. Paste and run:

```javascript
// Recalculate stats (replace GROUP_ID with yours from the URL)
fetch('/api/groups/GROUP_ID/stats', { method: 'POST' }).then(r => r.json()).then(console.log)

// Recalculate pairings
fetch('/api/groups/GROUP_ID/pairings', { method: 'POST' }).then(r => r.json()).then(console.log)
```

**Tip:** Get your Group ID from the URL: `/group/{GROUP_ID}`

### API Reference

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Run migrations | `POST` | `/api/migrate` |
| Recalculate ELO/W-L | `POST` | `/api/groups/{id}/stats` |
| Recalculate Pairings | `POST` | `/api/groups/{id}/pairings` |
| Delete Group | `DELETE` | `/api/groups/{id}` |
| Delete Session | `DELETE` | `/api/sessions/{id}` |

---

## Deployment

Deployments happen automatically when you push to the `main` branch. Changes to documentation files only (`.md` files, `docs/` folder) will skip deployment.

---

## License

MIT
