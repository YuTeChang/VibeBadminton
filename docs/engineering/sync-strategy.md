# Real-Time Sync Strategy

## Current Approach: Event-Driven Sync (Recommended for Low Usage)

Instead of constant polling, we use an **event-driven sync strategy** that only syncs when needed.

## Strategy Overview

### 1. Optimistic Updates (Immediate UI Response)
- User action → UI updates **immediately** (optimistic)
- API call happens in **background**
- If API fails → Rollback optimistic update

### 2. Sync on User Actions
- Create session → Sync to server
- Add game → Sync to server
- Update game → Sync to server
- Delete game → Sync to server

### 3. Manual Refresh (Optional)
- "Refresh" button for users to pull latest data
- Useful when multiple users are editing same session

### 4. Smart Polling (Future - Only When Needed)
- Only poll when:
  - Session is active (user is viewing/editing)
  - Multiple users detected (based on last activity timestamps)
  - User explicitly enables "Live Updates"
- Poll interval: 5-10 seconds (configurable)
- Stop polling when:
  - User navigates away
  - Session inactive for >5 minutes
  - No other users detected

## Implementation

### Current: Event-Driven (No Polling)

```typescript
// In SessionContext.tsx
const addGame = async (game) => {
  // 1. Optimistic update
  setGames(prev => [...prev, newGame]);
  
  // 2. Sync to server (background)
  try {
    await ApiClient.createGame(sessionId, game);
    // Success - optimistic update stays
  } catch (error) {
    // Rollback on error
    setGames(prev => prev.filter(g => g.id !== newGame.id));
    showError('Failed to save game');
  }
};
```

### Future: Smart Polling (When Needed)

```typescript
// Only poll when:
// 1. Session is active
// 2. Multiple users detected
// 3. User enabled "Live Updates"

useEffect(() => {
  if (!shouldPoll) return;
  
  const interval = setInterval(async () => {
    const latestGames = await ApiClient.getGames(sessionId);
    // Only update if data changed
    if (hasChanges(latestGames, games)) {
      setGames(latestGames);
    }
  }, 5000); // 5 second interval
  
  return () => clearInterval(interval);
}, [shouldPoll, sessionId]);
```

## Why Not Constant Polling?

### Problems with Constant Polling:
1. **Wasteful**: Most polls return no changes (empty results)
2. **Cost**: Unnecessary database queries and API calls
3. **Battery**: Drains device battery
4. **Server Load**: Unnecessary load on database
5. **Rate Limits**: May hit API rate limits unnecessarily

### When Polling Makes Sense:
- **High Activity**: Multiple users actively editing
- **Real-time Needs**: Users need to see changes within seconds
- **Collaborative**: Multiple people editing same session simultaneously

## Recommended Approach for VibeBadminton

### Phase 1: Event-Driven (Current)
✅ **Best for low usage**
- Sync only on user actions
- Optimistic updates for instant feedback
- Manual refresh button for pulling latest data
- **Zero unnecessary API calls**

### Phase 2: Smart Polling (Future)
- Add polling only when:
  - Session has >1 active user
  - User explicitly enables "Live Updates"
  - Session is actively being viewed
- Poll interval: 5-10 seconds
- Stop when inactive

### Phase 3: WebSockets (Future - High Usage)
- Real-time bidirectional communication
- Server pushes updates to clients
- Only when usage justifies the complexity

## Implementation Details

### Sync Triggers

```typescript
// Sync happens on these events:
1. User creates session → POST /api/sessions
2. User adds game → POST /api/sessions/[id]/games
3. User updates game → PUT /api/sessions/[id]/games/[id]
4. User deletes game → DELETE /api/sessions/[id]/games/[id]
5. User clicks "Refresh" → GET /api/sessions/[id]/games
6. User loads session → GET /api/sessions/[id] + GET games
```

### Error Handling

```typescript
// If API call fails:
1. Rollback optimistic update
2. Show error message to user
3. Keep localStorage backup
4. Allow retry
5. Fallback to localStorage mode
```

### Conflict Resolution

```typescript
// If multiple users edit simultaneously:
1. Last write wins (simple approach)
2. Or: Show conflict dialog to user
3. Or: Merge changes intelligently (complex)
```

## Performance Considerations

### API Call Frequency
- **Event-driven**: ~1-5 calls per user action
- **Constant polling**: 12-60 calls per minute (wasteful)
- **Smart polling**: 0-12 calls per minute (only when needed)

### Database Load
- **Event-driven**: Only on user actions
- **Constant polling**: Continuous, even when idle
- **Smart polling**: Only when session is active

## User Experience

### With Event-Driven (Current)
- ✅ Instant UI updates (optimistic)
- ✅ No unnecessary network activity
- ✅ Works offline (localStorage fallback)
- ✅ Fast and responsive
- ⚠️ Other users' changes not seen until refresh

### With Smart Polling (Future)
- ✅ See other users' changes automatically
- ✅ Still efficient (only when needed)
- ⚠️ Slight battery/network usage
- ⚠️ More complex implementation

## Recommendation

**For VibeBadminton's current usage level:**
- ✅ **Use event-driven sync** (current approach)
- ✅ Add manual "Refresh" button
- ✅ Optimistic updates for instant feedback
- ❌ **Don't add constant polling** (wasteful)

**When to add smart polling:**
- When you have multiple users editing same session regularly
- When users request "live updates" feature
- When usage justifies the added complexity

**When to add WebSockets:**
- High concurrent usage (10+ simultaneous users)
- Real-time collaboration is critical
- Budget allows for WebSocket infrastructure

