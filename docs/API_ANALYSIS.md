# API Endpoint Analysis & Optimization

## Current Endpoints

### 1. `GET /api/sessions` - Get All Sessions
**Purpose**: Fetch all sessions with full details (used by context and other pages)

**Current Implementation**:
- Fetches all sessions from database
- Uses batch query to fetch all players in one query (optimized from N+1)
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

**Performance**:
- ✅ Optimized: Uses batch query instead of N+1 queries
- ✅ Returns full data needed for session pages
- ⚠️ Large payload: Includes all player data for all sessions

**Current Usage**:
- SessionContext: Loads all sessions for caching
- Session pages: Needs full session details
- Not used by dashboard (uses summary endpoint instead)

---

### 2. `GET /api/sessions/summary` - Get Session Summaries (NEW)
**Purpose**: Fetch lightweight session summaries for dashboard listing

**Current Implementation**:
- Fetches sessions with minimal fields
- Uses batch query to count players (not fetch full player objects)
- Returns only essential fields for listing

**Returns**:
```typescript
Array<{
  id: string
  name: string | null
  date: Date
  playerCount: number  // Just count, not full player array
  gameMode: string
  groupId: string | null
}>
```

**Performance**:
- ✅ Very fast: Single query with batch player counting
- ✅ Small payload: ~80% smaller than full sessions endpoint
- ✅ Optimized for dashboard: Only returns what's needed for listing

**Current Usage**:
- Dashboard page: Lists standalone sessions and calculates group session counts
- Much faster than loading full sessions when only need summary data

---

### 3. `GET /api/sessions/[id]` - Get Single Session
**Purpose**: Fetch a specific session with full details (e.g., session page)

**Current Implementation**:
- Fetches one session by ID
- Makes one query to get players for that session
- Returns full Session object with complete player array

**Returns**:
```typescript
Session {
  // Same structure as getAllSessions, but for ONE session
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

### 4. `GET /api/groups/[id]/sessions` - Get Group Sessions
**Purpose**: Fetch all sessions within a specific group

**Current Implementation**:
- Fetches sessions filtered by group_id
- Uses batch query to fetch all players for those sessions
- Returns full Session objects with players

**Performance**:
- ✅ Optimized: Uses batch query for players (not N+1)
- ✅ Efficient: Only fetches sessions for one group

**Current Usage**:
- Group page: Displays all sessions in a group
- Group stats: Calculates aggregated statistics

---

## Optimization Summary

### Implemented Optimizations

1. **Batch Player Queries**: All endpoints now use batch queries instead of N+1 queries
   - `getAllSessions`: Fetches all players in one query, then maps to sessions
   - `getGroupSessions`: Same batch approach
   - `getSessionSummaries`: Counts players in batch query

2. **Lightweight Summary Endpoint**: Created `/api/sessions/summary` for dashboard
   - Reduces payload by ~80%
   - Faster response times
   - Eliminates unnecessary data transfer

3. **Duplicate Call Prevention**: 
   - Context uses refs to prevent duplicate simultaneous calls
   - Lazy loading: Dashboard only loads summaries when needed
   - Pathname-based loading: Only loads data on relevant pages
   - Tab switching doesn't trigger API calls (UI state only)
   - Smart refresh only when returning to page, not when navigating away
   - Removed aggressive visibility/focus auto-refresh

### Performance Improvements

| Endpoint | Before | After | Improvement |
|----------|--------|-------|-------------|
| `/api/sessions` | N+1 queries | 2 queries (batch) | ~90% faster with many sessions |
| `/api/sessions/summary` | N/A (new) | 2 queries (batch) | ~80% smaller payload |
| `/api/groups/[id]/sessions` | N+1 queries | 2 queries (batch) | ~90% faster with many sessions |

---

## Current State Summary

| Endpoint | Queries | Data Returned | Used By | Status |
|----------|---------|---------------|---------|--------|
| `/api/sessions` | 2 (batch) | Full sessions with all players | Context, session pages | ✅ Optimized |
| `/api/sessions/summary` | 2 (batch) | Lightweight summaries | Dashboard | ✅ Optimized |
| `/api/sessions/[id]` | 2 | Full session with all players | Session page | ✅ Efficient |
| `/api/groups/[id]/sessions` | 2 (batch) | Full sessions with all players | Group page | ✅ Optimized |

---

## Best Practices

### When to Use Each Endpoint

- **Dashboard/List Views**: Use `/api/sessions/summary` for faster loading
- **Session Detail Pages**: Use `/api/sessions/[id]` for full details
- **Group Pages**: Use `/api/groups/[id]/sessions` for group-specific sessions
- **Context/Full Data**: Use `/api/sessions` when you need all sessions with full details

### Performance Tips

1. **Use Summary Endpoint**: Always use `/api/sessions/summary` for listing views
2. **Batch Queries**: All player fetching uses batch queries (no N+1)
3. **Lazy Loading**: Only load data when needed (dashboard vs session pages)
4. **Caching**: Context caches data to prevent duplicate calls

---

## Future Considerations

### Potential Enhancements

1. **Pagination**: For very large datasets, consider pagination
2. **Filtering**: Add query parameters for filtering (by date, group, etc.)
3. **Caching**: Consider HTTP caching headers for summary endpoint
4. **GraphQL**: If API grows complex, consider GraphQL for flexible queries

### Monitoring

- Track API response times
- Monitor payload sizes
- Watch for N+1 query regressions
- Measure dashboard load times
