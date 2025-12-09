# VibeBadminton

A tiny web app that helps groups of friends track their badminton doubles games during a session and automatically calculates wins/losses, gambling results, shared costs, and final "who owes who how much" at the end of the night.

## Features

- **Create Sessions**: Set up a badminton session with players and financial settings
- **Log Games**: Quickly log games during play (select teams, mark winner)
- **Auto-Calculate**: Automatically calculates wins/losses, gambling net, and final settlement
- **Mobile-First**: Designed for use at the court

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React useState/useContext (in-memory for MVP)

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

See `docs/` folder for:
- Product vision and use cases
- MVP specification
- Development plan
- Engineering documentation
- AI agent system

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

