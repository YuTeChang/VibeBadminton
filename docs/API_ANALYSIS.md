# API Endpoint Analysis & Optimization

## Current Endpoints

### 1. `GET /api/sessions` - Get All Sessions
**Purpose**: Fetch all sessions for listing (e.g., home page)

**Current Implementation**:
- Fetches all sessions from database
- For EACH session, makes a separate query to get players (N+1 query problem)
- Returns full Session objects with complete player arrays

**Returns**:
```typescript
Session[] {
  id: string
  name?: string
  date: Date
  players: Player[]  // FULL player list for each session
  organizerId: string
  courtCostType: 'per_person' | 'total'
  courtCostValue: number
  birdCostTotal: number
  betPerPlayer: number
  gameMode: 'doubles' | 'singles'
  groupId?: string
  bettingEnabled: boolean
}
```

**Performance Issues**:
- ❌ N+1 queries: 1 query for sessions + N queries for players (one per session)
- ❌ Returns unnecessary data: Full player objects when only `players.length` is needed
- ❌ Slow with many sessions: Each session requires a separate database query
- ❌ High memory usage: Loading all player data for all sessions

**Current Usage**:
- Home page: Shows standalone sessions list
- Only needs: `id`, `name`, `date`, `players.length`, `gameMode`
- Does NOT need: Full player arrays, cost details, betting details

---

### 2. `GET /api/sessions/[id]` - Get Single Session
**Purpose**: Fetch a specific session with full details (e.g., session page)

**Current Implementation**:
- Fetches one session by ID
- Makes one query to get players for that session
- Returns full Session object with complete player array

**Returns**:
```typescript
Session {
  // Same structure as above, but for ONE session
}
```

**Performance**:
- ✅ Efficient: Only 2 queries (1 for session, 1 for players)
- ✅ Returns necessary data: Full details needed for session page
- ✅ Fast: Single session lookup

**Current Usage**:
- Session page: Needs full session details including all players
- Uses: All fields including full player arrays

---

## Optimization Recommendations

### Option 1: Create Lightweight Endpoint for Home Page (Recommended)
Create a new endpoint that returns minimal data for listing:

**New Endpoint**: `GET /api/sessions?lightweight=true`
- Returns sessions without full player arrays
- Only includes `players.length` instead of full player objects
- Uses a single JOIN query instead of N+1 queries

**Benefits**:
- ✅ Eliminates N+1 query problem
- ✅ Reduces payload by ~80%
- ✅ Faster response time
- ✅ Lower database load

**Implementation**:
```typescript
// In SessionService
static async getAllSessionsLightweight(): Promise<SessionSummary[]> {
  // Single query with JOIN to get player counts
  const { data } = await supabase
    .from('sessions')
    .select(`
      *,
      players(count)
    `)
    .order('created_at', { ascending: false });
  
  return data.map(session => ({
    id: session.id,
    name: session.name,
    date: session.date,
    playerCount: session.players.length, // Just count, not full objects
    gameMode: session.game_mode,
    groupId: session.group_id,
    // ... other minimal fields
  }));
}
```

### Option 2: Optimize Existing Endpoint with Batch Query
Modify `getAllSessions` to use a single batch query:

**Implementation**:
```typescript
static async getAllSessions(): Promise<Session[]> {
  // Fetch all sessions
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  // Batch fetch all players in one query
  const sessionIds = sessionsData.map(s => s.id);
  const { data: allPlayers } = await supabase
    .from('players')
    .select('*')
    .in('session_id', sessionIds);

  // Group players by session_id
  const playersBySession = new Map<string, Player[]>();
  allPlayers.forEach(player => {
    const sessionId = player.session_id;
    if (!playersBySession.has(sessionId)) {
      playersBySession.set(sessionId, []);
    }
    playersBySession.get(sessionId)!.push(player);
  });

  // Map sessions with their players
  return sessionsData.map(session => ({
    ...this.mapRowToSession(session),
    players: playersBySession.get(session.id) || []
  }));
}
```

**Benefits**:
- ✅ Reduces from N+1 queries to 2 queries total
- ✅ Much faster with many sessions
- ✅ Still returns full data (backward compatible)

### Option 3: Use Supabase JOIN (Best Performance)
Use Supabase's built-in JOIN capabilities:

```typescript
static async getAllSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      players (*)
    `)
    .order('created_at', { ascending: false });

  // Supabase automatically joins and groups players
  return data.map(session => this.mapRowToSession(session, session.players));
}
```

**Benefits**:
- ✅ Single database query
- ✅ Fastest option
- ✅ Supabase handles the JOIN automatically

---

## Recommendation

**For Home Page**: Use Option 1 (lightweight endpoint)
- Home page only needs summary data
- Reduces payload and improves performance
- Clear separation of concerns

**For Session Page**: Keep current `/api/sessions/[id]`
- Already efficient (2 queries)
- Returns necessary full data
- No changes needed

**For Backward Compatibility**: Implement Option 3 (JOIN optimization)
- Improves `getAllSessions` performance
- Maintains same API contract
- Can be used by other parts of the app that need full data

---

## Current State Summary

| Endpoint | Queries | Data Returned | Used By | Optimization Needed |
|----------|---------|---------------|---------|---------------------|
| `/api/sessions` | N+1 | Full sessions with all players | Home page | ✅ Yes - N+1 problem |
| `/api/sessions/[id]` | 2 | Full session with all players | Session page | ❌ No - already efficient |

---

## Next Steps

1. **Immediate**: Implement Option 3 (JOIN) to fix N+1 problem in `getAllSessions`
2. **Future**: Consider Option 1 (lightweight endpoint) for home page if performance is still an issue
3. **Monitor**: Track API response times and payload sizes after optimization

