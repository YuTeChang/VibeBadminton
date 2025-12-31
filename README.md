# PoweredByPace

A web app that helps groups of friends track their badminton games (doubles or singles) during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

## Live Demo

🌐 **Live App**: [View on Vercel](https://poweredbypace.vercel.app)

> **Note**: Update the URL above if your deployment uses a different domain.

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

### Groups Feature (NEW)
- **Create Groups**: Organize recurring badminton groups (e.g., "Friday Night Badminton")
- **Shareable Links**: Share group links with friends so they can view sessions and stats
- **Player Pool**: Maintain a player pool per group for quick session setup
- **Group Sessions**: Track all sessions within a group over time
- **Cross-Session Stats**: View aggregated player statistics across all group sessions

### Optional Betting (NEW)
- **Toggle Betting**: Enable or disable betting per session
- **Universal Stats**: Always see win rate, points scored/conceded, and point differential
- **Conditional Betting UI**: Betting-related fields and calculations only shown when enabled
- **Stats-Only Mode**: Use the app purely for tracking games without betting

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
```

3. Initialize database:
   - **New database**: Run the SQL schema from `scripts/init-db-schema.sql` in your Supabase SQL Editor
   - **Existing database**: Run the migration script `scripts/migrate-add-groups.sql` in Supabase SQL Editor
   - **Automatic migration**: On Vercel deployments, migrations run automatically via `postbuild` script
     - Ensure `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING` is set in Vercel environment variables
     - Or run manually: `npm run migrate:run` (requires connection string in environment)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

To enable shared sessions across users, set up Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and service role key from Settings → API
3. Add environment variables (see Installation step 2)
4. Run the database schema from `scripts/init-db-schema.sql` in Supabase SQL Editor

See [docs/SETUP_BACKEND.md](docs/SETUP_BACKEND.md) for detailed instructions.

## Project Structure

```
PoweredByPace/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page (groups and sessions)
│   ├── create-group/      # Create group page
│   ├── create-session/    # Create session page
│   ├── group/[id]/        # Group detail page
│   ├── session/[id]/      # Live session page
│   └── api/               # API routes
├── components/            # React components
├── contexts/              # React Context (SessionContext)
├── lib/                   # Utilities and services
│   ├── services/         # Database service layer
│   ├── calculations.ts   # Money and stats calculations
│   └── roundRobin.ts     # Round robin scheduling
├── types/                # TypeScript type definitions
├── docs/                 # Documentation
└── scripts/              # Database migration scripts
```

## Documentation

**📖 Start here**: **[docs/README.md](docs/README.md)** - Complete guide covering everything you need to know.

**Quick Reference**:
- [Product Overview](docs/PRODUCT.md) - Product vision and features
- [Features Log](docs/FEATURES_LOG.md) - Complete feature history
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Test guide
- [Backend Setup](docs/SETUP_BACKEND.md) - Database setup instructions

All documentation is organized for easy navigation. The main README has everything essential; detailed reference docs are in `docs/`.

## Development

### Key Concepts

- **Groups**: Organize recurring playing groups with shareable links
- **Sessions**: Individual badminton sessions (can belong to a group or standalone)
- **Players**: Can be linked to group player pool for tracking across sessions
- **Betting**: Optional per-session feature for tracking gambling nets
- **Stats**: Universal stats (win rate, points) always shown; betting stats shown when enabled

### Database Schema

- `groups` - Badminton groups with shareable links
- `group_players` - Player pool per group
- `sessions` - Badminton sessions (can belong to a group)
- `players` - Session players (can link to group players)
- `games` - Individual games within sessions

See `scripts/init-db-schema.sql` for complete schema.

## License

MIT
