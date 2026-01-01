# System Overview

## Architecture

```
[User Browser]
    ↓
[Next.js App Router]
    ↓
[React Components]
    ↓
[React State (useState/useContext)]
    ↓
[In-Memory State]
```

## Components

### Frontend
- **Pages**: 
  - Home (displays all sessions, allows switching)
  - Create Session (with game mode toggle: doubles/singles)
  - Live Session (tabs: Stats, Record, History)
  - Summary (final settlement with improved table layout)
- **Components**: Reusable UI components (buttons, forms, tables, bottom tab navigation)
- **State Management**: React Context API for session state and multi-session management
- **Routing**: Next.js App Router

### Backend
- **None for MVP**: All state kept in browser memory
- **Future**: Can add API routes and database for persistence

## Data Flow

### Session Creation Flow
1. User selects game mode (doubles or singles)
2. User adds players (minimum required: 2 for singles, 4 for doubles)
   - Default names assigned if not provided
   - Can create session without all names entered
3. User sets financial settings (optional, defaults to 0)
4. User selects organizer (auto-selects first player if none chosen)
5. Optional: Enable round robin scheduling
6. Form data validated
7. Session object created with gameMode field
8. Session added to all sessions list
9. Navigate to live session page
10. Session state stored in React Context and localStorage

### Game Logging Flow
1. User selects Team A (2 players for doubles, 1 player for singles)
2. User selects Team B (2 players for doubles, 1 player for singles)
3. User marks winning team
4. Game object created and added to session
5. UI updates with new game in list
6. In 4-player doubles mode, last player auto-selected when 3 are chosen

### Summary Calculation Flow
1. User navigates to summary page
2. App calculates:
   - Wins/losses per player
   - Gambling net per player
   - Total shared costs
   - Final settlement amounts
3. Results displayed in table
4. Shareable text generated

## State Management

### Session Context
- **Current Session**: Active session data (with gameMode: "doubles" | "singles")
- **Games Array**: All games for current session
- **All Sessions List**: Complete list of all created sessions for multi-session support
- **Methods**:
  - `setSession`: Create or update session
  - `addGame`: Add new game to current session
  - `updateGame`: Update existing game
  - `loadSession`: Switch to different session
  - `clearSession`: End current session
- **Persistence**: Uses localStorage to persist sessions and games across page refreshes
- **Smart Refresh**: Data refreshes only when needed (on mount, returning from create-session, explicit refresh)
- **No Aggressive Auto-Refresh**: Removed visibility/focus handlers that caused unnecessary refreshes

### No External State Management
- MVP uses React built-in state
- Can migrate to Zustand/Redux if needed later

