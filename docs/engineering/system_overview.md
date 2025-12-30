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
- **Pages**: Home, Create Session, Live Session, Summary
- **Components**: Reusable UI components (buttons, forms, tables)
- **State Management**: React Context API for session state
- **Routing**: Next.js App Router

### Backend
- **None for MVP**: All state kept in browser memory
- **Future**: Can add API routes and database for persistence

## Data Flow

### Session Creation Flow
1. User fills out create session form
2. Form data validated
3. Session object created in memory
4. Navigate to live session page
5. Session state stored in React Context

### Game Logging Flow
1. User selects Team A (2 players)
2. User selects Team B (2 players)
3. User marks winning team
4. Game object created and added to session
5. UI updates with new game in list

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
- Stores current session data
- Stores games array
- Provides methods to add games, update session

### No External State Management
- MVP uses React built-in state
- Can migrate to Zustand/Redux if needed later

