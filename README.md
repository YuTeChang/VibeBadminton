# VibeBadminton

A tiny web app that helps groups of friends track their badminton games (doubles or singles) during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

## Features

- **Create Sessions**: Set up a badminton session with players and financial settings
- **Game Modes**: Support for both doubles (4-6 players) and singles (2-6 players) gameplay
- **Round Robin Scheduling**: Generate scheduled game combinations with customizable count
- **Log Games**: Quickly log games during play (select teams/players, mark winner, or use scheduled games)
- **Live Stats**: Real-time win/loss tracking and gambling net calculations
- **Game Planning**: See upcoming scheduled games to plan your session time
- **Auto-Calculate**: Automatically calculates wins/losses, gambling net, and final settlement
- **Multiple Sessions**: Create and manage multiple sessions, switch between them easily
- **Mobile-First**: Designed for use at the court with optimized mobile navigation

## Screenshots

Screenshots are available in `docs/screenshots/test-results/` showing all current features:

**Home Page:**
- Empty state, single session, and multiple sessions view

**Create Session:**
- Game mode toggle (doubles/singles)
- Filled form with players and settings
- Round robin scheduling enabled
- Singles mode with 2 players

**Session Management:**
- Stats tab (empty and with games)
- Record tab (empty and with teams selected)
- History tab with all recorded games

**Summary:**
- Final settlement page with improved table layout and action buttons

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
- **Database**: Vercel Postgres (shared sessions across users)
- **Sync Strategy**: Event-driven (no wasteful polling)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup (For Shared Sessions)

To enable shared sessions across users, set up Vercel Postgres:

**Quick Setup (Automated):**
```bash
npm run setup:vercel
```

This will guide you through:
- Installing Vercel CLI
- Linking your project
- Creating Postgres database
- Pulling environment variables
- Initializing database schema

**Manual Setup:**
1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`
4. Create Postgres database in Vercel dashboard
5. Pull env vars: `vercel env pull .env.local`
6. Initialize: `npm run dev` then `npm run init:db`

See [docs/SETUP_BACKEND.md](docs/SETUP_BACKEND.md) for detailed instructions.

## Project Structure

```
VibeBadminton/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── create-session/    # Create session page
│   └── ...
├── docs/                   # Documentation
│   ├── vision/            # Product vision
│   ├── mvp/               # MVP specifications
│   ├── process/           # Dev plans, progress logs
│   ├── engineering/       # Technical documentation
│   └── prompts/           # AI agent prompts
├── types/                 # TypeScript type definitions
└── ...
```

## Documentation

**📖 Start here**: **[docs/README.md](docs/README.md)** - Complete guide covering everything you need to know.

**Quick Reference**:
- [MVP Specification](docs/reference/mvp/mvp_spec.md) - Detailed requirements
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Test guide

All documentation is organized for easy navigation. The main README has everything essential; detailed reference docs are in `docs/reference/` and `docs/_archive/`.

## Development

### Using AI Agents

This project uses specialized AI agents for different tasks:

- **PM Agent**: "PM agent, update the docs based on what we just did"
- **QA Agent**: "QA agent: design tests for [feature]"
- **Engineer Agent**: "Engineer agent: implement [feature]"

See `docs/prompts/USAGE_GUIDE.md` for more details.

## MVP Scope

The MVP focuses on:
- Creating a session with players and financial settings
- Logging games during the session
- Automatically calculating final money settlement

**Out of scope for MVP:**
- User authentication
- Persistence across sessions
- Elo ratings
- Multi-session history

## License

MIT

