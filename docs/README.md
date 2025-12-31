# VibeBadminton Documentation

**A web app for tracking badminton doubles games and calculating money settlements.**

> **📖 This is the main documentation file.** Everything you need to understand and work with VibeBadminton is here. Detailed reference docs are linked at the bottom.

## Quick Start

### What It Does
Helps groups of friends track badminton games (doubles or singles) during a session and automatically calculates:
- Wins/losses per player
- Gambling net (from per-game bets)
- Final money settlement (who owes the organizer how much)

### Key Features
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

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API with optimistic updates
- **Backend**: Next.js API Routes
- **Database**: Vercel Postgres (shared sessions)
- **Sync Strategy**: Event-driven (no wasteful polling)

---

## Product Overview

See **[PRODUCT.md](PRODUCT.md)** for complete product overview, problem statement, and future roadmap.

---

## Features

### 1. Create Session
- Session name (optional, defaults to date) and date
- **Game Mode**: Toggle between doubles (4-6 players) and singles (2-6 players)
- Add players (minimum required based on mode)
  - Default names (Player 1, Player 2, etc.) assigned automatically
  - Can start session without entering all names
- Financial settings:
  - Court cost (per person or total)
  - Bird/shuttle cost
  - Bet per player per game
- Select organizer (auto-selects first player if none chosen)
- Optional: Round robin scheduling

### 2. Live Session
Three tabs for managing the session:

**Stats Tab** (default):
- Live W/L record for each player
- Current gambling net (+$X or -$X)
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

### 3. Summary
- Final stats table (W/L, Net, Amount to Pay)
- Shareable text (copy to WhatsApp/Discord)
- All calculations automatic

---

## Architecture

### System Overview
```
Browser → Next.js App Router → React Components → Context API → In-Memory State
```

### Key Components
- **Pages**: Home (with session list), Create Session, Live Session, Summary
- **State**: SessionContext (stores current session, games, and all sessions list)
- **Calculations**: `lib/calculations.ts` (wins, losses, gambling net, settlement)
- **Round Robin**: `lib/roundRobin.ts` (generates game schedules for doubles and singles)
- **No Backend**: All state in browser memory (localStorage for persistence)

### Data Model
```typescript
Session {
  id, name, date, players[], organizerId,
  courtCostType, courtCostValue, birdCostTotal, betPerPlayer,
  gameMode: "doubles" | "singles"
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
1. **Gambling Net**: Winners get +bet, losers get -bet per game
2. **Shared Costs**: Court cost + bird cost
3. **Even Share**: Total shared costs / number of players
4. **Fair Total**: Even share - gambling net
5. **Final Amount**: Fair total (organizer pays $0)

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
lib/              # Utilities (calculations, round robin)
types/            # TypeScript definitions
docs/             # Documentation
```

### Key Files
- `app/page.tsx` - Home page
- `app/create-session/page.tsx` - Create session form
- `app/session/[id]/page.tsx` - Live session (tabs)
- `app/session/[id]/summary/page.tsx` - Final summary
- `contexts/SessionContext.tsx` - State management
- `lib/calculations.ts` - Money calculations

### Design System
- **Style**: Japandi/Scandinavian minimal
- **Colors**: Warm off-white (#F7F2EA), camel accent (#D3A676)
- **Mobile-first**: Touch-optimized, responsive
- **Components**: Rounded cards, soft shadows, clean typography

---

## Testing

### Automated Screenshots
```bash
npm run test:screenshots
```
Captures 11 screenshots of all features. See `docs/screenshots/test-results/`.

### Manual Testing
See `docs/TESTING_CHECKLIST.md` for comprehensive test scenarios.

---

## MVP Status: ✅ Complete + Post-MVP Features

All MVP features implemented, tested, and polished. Additional features have been added post-MVP.

**What's Included:**
- **Game Modes**: Doubles (4-6 players) and Singles (2-6 players)
- Session creation and management (multiple sessions supported)
- Default player names for faster setup
- Game logging with team/player selection
- Auto-select last player in 4-player doubles mode
- Real-time stats
- Round robin scheduling
- Automatic settlement calculation
- Mobile-responsive design with bottom tab navigation
- Error handling and validation
- Improved UI/UX (summary screen, table layouts, spacing)

**What's Not (Future):**
- User authentication
- Cloud persistence (currently uses localStorage)
- Elo ratings
- Player history across sessions
- Head-to-head statistics

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
- **[MVP Specification](reference/mvp/mvp_spec.md)** - Complete requirements and data model
- **[Testing Checklist](TESTING_CHECKLIST.md)** - Manual testing guide
- **[Design Decisions](decisions.md)** - Important technical and design decisions

### Engineering Documentation
- **[System Overview](engineering/system_overview.md)** - Architecture and data flow
- **[Frontend Structure](engineering/frontend.md)** - Pages, components, routing
- **[User Flows](engineering/flows.md)** - Key interaction flows
- **[Design System](engineering/design-system.md)** - Design tokens and styling guide
- **[Component System](engineering/component-system.md)** - Component architecture

### Test Results
- **[Screenshot Test Results](screenshots/test-results/)** - Visual proof of all features (11 screenshots)

### Historical/Planning Docs
For historical context and planning materials, see `_archive/`:
- Development process and progress logs
- AI agent system (if using AI agents)

---

## AI Agents (Optional)

If using AI agents for development, see `_archive/prompts/` for agent prompts and context files.

---

## License

MIT

