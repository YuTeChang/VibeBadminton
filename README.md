# PoweredByPace

A web app that helps groups of friends track their badminton games (doubles or singles) during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

🌐 **Live App**: [poweredbypace.vercel.app](https://poweredbypace.vercel.app)

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

3. **Migrations**: Run automatically on Vercel deployments, or manually: `npm run migrate:run`

See [docs/SETUP_BACKEND.md](docs/SETUP_BACKEND.md) for detailed setup instructions.

---

## Features

### Core
- ✅ **Game Modes**: Doubles (4-6 players) and Singles (2-6 players)
- ✅ **Session Management**: Create, edit, delete sessions
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

## Deployment

**Manual Deployment Control**: Deployments only occur when `[deploy]` is in the commit message.

```bash
# Deploy
git commit -m "Fix bug [deploy]"
git push

# Skip deployment (default)
git commit -m "Update docs"
git push  # No deployment triggered
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
- [API Analysis](docs/API_ANALYSIS.md) - API documentation
- [Architecture](docs/engineering/architecture.md) - System design

---

## Project Structure

```
app/              # Next.js pages [FRONTEND]
├── page.tsx      # Home (landing)
├── dashboard/    # Dashboard
├── create-*/     # Create forms
├── group/[id]/     # Group pages
├── session/[id]/ # Session pages
└── api/          # API routes [BACKEND]

components/       # React components [FRONTEND]
contexts/         # State management [FRONTEND]
lib/
├── api/client.ts # API client [FRONTEND]
├── services/     # Database services [BACKEND]
└── calculations.ts # Stats calculations [FRONTEND]
```

See [docs/README.md](docs/README.md) for complete architecture details.

---

## License

MIT
