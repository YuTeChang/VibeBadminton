# Architecture & Frontend/Backend Separation

## Overview

VibeBadminton follows a **modern full-stack Next.js architecture** with clear separation between frontend (client-side React) and backend (server-side API routes + database).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (UI Layer)                            │ │
│  │  - Pages: Home, Create Session, Live Session, Summary  │ │
│  │  - Components: Forms, Tables, Navigation               │ │
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
│  │  - Fallback to localStorage if API unavailable         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Vercel/Next.js)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (Backend Layer)                             │ │
│  │  - /api/sessions/*                                      │ │
│  │  - /api/sessions/[id]/games/*                           │ │
│  │  - Request validation                                  │ │
│  │  - Business logic orchestration                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer (Business Logic)                        │ │
│  │  - SessionService: Session CRUD operations             │ │
│  │  - GameService: Game CRUD operations                   │ │
│  │  - Data transformation (DB ↔ Domain models)          │ │
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
│  - sessions table                                            │
│  - players table                                             │
│  - games table                                               │
└─────────────────────────────────────────────────────────────┘
```

## Frontend (Client-Side)

### Location
- **Pages**: `app/**/*.tsx` (Next.js App Router pages)
- **Components**: `components/**/*.tsx`
- **State Management**: `contexts/SessionContext.tsx`
- **API Client**: `lib/api/client.ts`

### Responsibilities
1. **User Interface**
   - Render pages and components
   - Handle user interactions (clicks, form submissions)
   - Display data (sessions, games, stats)
   - Mobile-responsive design

2. **State Management**
   - Manage local application state (current session, games, all sessions)
   - Optimistic updates (update UI immediately, sync in background)
   - Cache data in localStorage as fallback

3. **API Communication**
   - Make HTTP requests to backend API routes
   - Handle API responses and errors
   - Fallback to localStorage if API unavailable

4. **Client-Side Logic**
   - Form validation
   - Calculations (stats, settlements) - can be done client-side for performance
   - Routing and navigation

### Key Files
```
app/
├── page.tsx                    # Home page (client component)
├── create-session/page.tsx      # Create session page (client component)
└── session/[id]/
    ├── page.tsx                # Live session page (client component)
    └── summary/page.tsx        # Summary page (client component)

components/                      # Reusable UI components
contexts/
└── SessionContext.tsx          # Global state management
lib/
└── api/
    └── client.ts               # API client for making requests
```

## Backend (Server-Side)

### Location
- **API Routes**: `app/api/**/*.ts` (Next.js API routes)
- **Services**: `lib/services/**/*.ts`
- **Database**: `lib/supabase.ts` (Supabase REST API client)

### Responsibilities
1. **API Endpoints**
   - Handle HTTP requests (GET, POST, PUT, DELETE)
   - Validate request data
   - Return JSON responses
   - Handle errors and return appropriate status codes

2. **Business Logic**
   - Session creation/retrieval/deletion
   - Game creation/updates/deletion
   - Data validation and transformation
   - Business rules enforcement

3. **Database Operations**
   - Execute SQL queries
   - Manage database connections
   - Handle transactions (if needed)
   - Schema management

4. **Data Persistence**
   - Store sessions, players, and games in PostgreSQL
   - Ensure data consistency
   - Handle concurrent access

### Key Files
```
app/api/
├── sessions/
│   ├── route.ts                # GET all, POST create
│   └── [id]/
│       ├── route.ts           # GET one, DELETE
│       └── games/
│           ├── route.ts       # GET all games, POST create game
│           └── [gameId]/
│               └── route.ts  # PUT update, DELETE game
└── init/
    └── route.ts               # Initialize database schema

lib/services/
├── sessionService.ts           # Session business logic
└── gameService.ts              # Game business logic

lib/
└── db.ts                      # Database connection and schema
```

## Data Flow Examples

### Example 1: Creating a Session

```
1. User fills form → React Component (frontend)
2. Form submission → SessionContext.setSession() (frontend)
3. Optimistic update → UI updates immediately (frontend)
4. API call → ApiClient.createSession() (frontend)
5. HTTP POST → /api/sessions (backend)
6. Validation → API route handler (backend)
7. Business logic → SessionService.createSession() (backend)
8. Database insert → Supabase REST API via lib/supabase.ts (backend)
9. Response → JSON with created session (backend → frontend)
10. State update → SessionContext updates with server response (frontend)
11. UI refresh → Component re-renders with new data (frontend)
```

### Example 2: Recording a Game

```
1. User selects teams and winner → React Component (frontend)
2. Save button click → SessionContext.addGame() (frontend)
3. Optimistic update → Game appears in UI immediately (frontend)
4. API call → ApiClient.createGame() (frontend)
5. HTTP POST → /api/sessions/[id]/games (backend)
6. Business logic → GameService.createGame() (backend)
7. Database insert → SQL INSERT INTO games (backend)
8. Response → JSON with created game (backend → frontend)
9. State update → SessionContext updates with server game (frontend)
10. Stats recalculate → Client-side calculation (frontend)
```

## Separation of Concerns

### Frontend Should:
✅ Handle UI rendering and user interactions  
✅ Manage client-side state  
✅ Make API calls to backend  
✅ Perform client-side calculations (for performance)  
✅ Handle routing and navigation  
✅ Provide optimistic updates for better UX  

### Frontend Should NOT:
❌ Directly access the database  
❌ Execute SQL queries  
❌ Store sensitive business logic  
❌ Handle authentication/authorization (future)  
❌ Perform heavy server-side operations  

### Backend Should:
✅ Handle all database operations  
✅ Enforce business rules and validation  
✅ Provide secure API endpoints  
✅ Handle data transformation  
✅ Manage database schema  
✅ Ensure data consistency  

### Backend Should NOT:
❌ Render UI components  
❌ Manage client-side state  
❌ Handle client-side routing  
❌ Perform client-side calculations  

## Communication Protocol

### Request/Response Format
- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Methods**: GET, POST, PUT, DELETE
- **Base URL**: `/api` (relative, same domain)

### API Endpoints

```
GET    /api/sessions                    # Get all sessions
POST   /api/sessions                    # Create session
GET    /api/sessions/[id]               # Get one session
DELETE /api/sessions/[id]               # Delete session
GET    /api/sessions/[id]/games         # Get all games
POST   /api/sessions/[id]/games         # Create game
PUT    /api/sessions/[id]/games/[id]   # Update game
DELETE /api/sessions/[id]/games/[id]  # Delete game
POST   /api/init                        # Initialize database
```

## State Management Strategy

### Client-Side State (SessionContext)
- **Current Session**: Active session being viewed/edited
- **Games**: All games for current session
- **All Sessions**: List of all created sessions
- **Sync Strategy**: Optimistic updates + API sync

### Server-Side State (Database)
- **Sessions Table**: All session records
- **Players Table**: All player records (linked to sessions)
- **Games Table**: All game records (linked to sessions)
- **Source of Truth**: Database is the authoritative source

### Sync Strategy
1. **Optimistic Updates**: UI updates immediately on user action
2. **API Sync**: Background sync to server
3. **Error Handling**: Rollback optimistic update if API fails
4. **Fallback**: Use localStorage if API unavailable (offline mode)

## Deployment Architecture

### Development
```
Local Machine
├── Next.js Dev Server (port 3000)
│   ├── Frontend (React)
│   └── Backend (API Routes)
└── Vercel Postgres (cloud database)
```

### Production (Vercel)
```
Vercel Platform
├── Edge Network (CDN)
│   └── Static assets (HTML, CSS, JS)
├── Serverless Functions
│   ├── API Routes (backend)
│   └── Server Components (if used)
└── Vercel Postgres
    └── Database (shared across all instances)
```

## Benefits of This Architecture

1. **Scalability**: Backend can scale independently
2. **Separation**: Clear boundaries between frontend and backend
3. **Type Safety**: TypeScript ensures type consistency across layers
4. **Maintainability**: Changes to backend don't affect frontend code structure
5. **Testability**: Each layer can be tested independently
6. **Performance**: Optimistic updates provide instant feedback
7. **Reliability**: Fallback to localStorage ensures app works offline

## Future Enhancements

- **Real-time Sync**: WebSockets or Server-Sent Events for live updates
- **Caching**: Redis for frequently accessed data
- **Authentication**: User accounts and session ownership
- **Rate Limiting**: Protect API endpoints from abuse
- **Analytics**: Track usage patterns
- **Background Jobs**: Process calculations asynchronously

