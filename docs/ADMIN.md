# Admin Operations Guide

This guide covers administrative operations that are intentionally **not exposed in the user interface** for safety and data integrity reasons.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Migrations](#database-migrations)
3. [Stats Recalculation](#stats-recalculation)
4. [Data Deletion](#data-deletion)
5. [Database Access](#database-access)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Finding IDs

**Group ID**: Visible in the URL when viewing a group
```
https://poweredbypace.vercel.app/group/{GROUP_ID}
```

**Session ID**: Visible in the URL when viewing a session
```
https://poweredbypace.vercel.app/session/{SESSION_ID}
```

**Player ID**: Available in Supabase dashboard
- Go to Table Editor → `group_players` or `players` table

### Tools Needed

Choose one of these methods to run admin commands:

1. **Browser Console** (easiest) - Open DevTools (F12) on any page of the app
2. **curl** (command line) - For scripting or terminal users
3. **Postman** (GUI) - For those who prefer visual tools
4. **Supabase Dashboard** - For direct database access

---

## How to Run Admin Commands

### Method 1: Browser Console (Easiest)

1. Go to your app in the browser (e.g., https://poweredbypace.vercel.app)
2. Open DevTools: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to the **Console** tab
4. Paste the JavaScript command and press Enter

**Examples:**

```javascript
// Recalculate ELO and W/L stats
fetch('/api/groups/YOUR_GROUP_ID/stats', { method: 'POST' })
  .then(r => r.json()).then(console.log)

// Recalculate pairing stats
fetch('/api/groups/YOUR_GROUP_ID/pairings', { method: 'POST' })
  .then(r => r.json()).then(console.log)

// Delete a group
fetch('/api/groups/YOUR_GROUP_ID', { method: 'DELETE' })
  .then(r => r.json()).then(console.log)

// Run migrations
fetch('/api/migrate', { method: 'POST' })
  .then(r => r.json()).then(console.log)
```

### Method 2: curl (Command Line)

```bash
# Recalculate stats
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/stats

# Recalculate pairings
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/pairings

# Delete a group
curl -X DELETE https://poweredbypace.vercel.app/api/groups/{GROUP_ID}
```

---

## Database Migrations

### Automatic (Recommended)

Migrations run automatically on every Vercel deployment:
```
git push origin main → Vercel builds → postbuild → migrations run
```

### Manual via API

```bash
curl -X POST https://poweredbypace.vercel.app/api/migrate
```

### Manual via Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Open the migration file from `scripts/migrations/`
3. Run the SQL

### Check Migration Status

```bash
curl https://poweredbypace.vercel.app/api/migrate
```

---

## Stats Recalculation

Use recalculation when stats appear out of sync (e.g., after manual database edits or bugs).

### Recalculate Individual Player Stats (ELO, W/L)

Rebuilds all ELO ratings and win/loss records from game history for a group.

```bash
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/stats
```

**Example:**
```bash
curl -X POST https://poweredbypace.vercel.app/api/groups/group-1704067200000/stats
```

**Response:**
```json
{
  "success": true,
  "message": "Stats recalculated successfully",
  "playersReset": 8,
  "gamesProcessed": 45,
  "playersUpdated": ["gp-123", "gp-456", ...]
}
```

**Rate Limit:** 1 request per 5 minutes per group

### Recalculate Pairing Stats

Rebuilds all partner stats and head-to-head matchup records.

```bash
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/pairings
```

**Example:**
```bash
curl -X POST https://poweredbypace.vercel.app/api/groups/group-1704067200000/pairings
```

**Response:**
```json
{
  "success": true,
  "message": "Pairing stats recalculated successfully",
  "partnerStatsCreated": 15,
  "matchupsCreated": 28,
  "gamesProcessed": 45
}
```

**Rate Limit:** 1 request per 5 minutes per group

### When to Recalculate

- After manually editing data in the database
- If stats appear incorrect or out of sync
- After recovering from a bug or data issue
- After running a new migration that affects stats

---

## Data Deletion

### Delete a Group

**⚠️ Warning:** This permanently deletes the group AND all its sessions, players, games, and stats.

**Via API:**
```bash
curl -X DELETE https://poweredbypace.vercel.app/api/groups/{GROUP_ID}
```

**Via Supabase:**
1. Go to Supabase Dashboard → Table Editor → `groups`
2. Find the row with the group ID
3. Click the row → Delete

All related data (sessions, players, games, pairing stats) will be deleted via CASCADE.

### Delete a Session

**⚠️ Warning:** This permanently deletes the session AND all its players and games.

**Via API:**
```bash
curl -X DELETE https://poweredbypace.vercel.app/api/sessions/{SESSION_ID}
```

**Via Supabase:**
1. Go to Supabase Dashboard → Table Editor → `sessions`
2. Find the row with the session ID
3. Click the row → Delete

### Delete a Specific Game

```bash
curl -X DELETE https://poweredbypace.vercel.app/api/sessions/{SESSION_ID}/games/{GAME_ID}
```

**Note:** Deleting a game automatically reverses its stats impact (ELO, W/L, pairing stats).

### Delete a Player from Group Pool

```bash
curl -X DELETE https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/players/{PLAYER_ID}
```

---

## Database Access

### Supabase Dashboard

For direct database access:

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor** for visual data management
4. Go to **SQL Editor** for raw SQL queries

### Key Tables

| Table | Description |
|-------|-------------|
| `groups` | Badminton groups with shareable links |
| `group_players` | Player pool per group (includes ELO, W/L stats) |
| `sessions` | Individual badminton sessions |
| `players` | Session-specific players (can link to group players) |
| `games` | Individual games within sessions |
| `partner_stats` | Win/loss when two players are paired together |
| `pairing_matchups` | Head-to-head between specific pairings |
| `migrations` | Tracks applied database migrations |

### Useful Queries

**Check all groups:**
```sql
SELECT id, name, shareable_link, created_at 
FROM groups 
ORDER BY created_at DESC;
```

**Check player stats for a group:**
```sql
SELECT name, elo_rating, wins, losses, total_games
FROM group_players
WHERE group_id = 'your-group-id'
ORDER BY elo_rating DESC;
```

**Check pairing stats:**
```sql
SELECT 
  gp1.name as player1, 
  gp2.name as player2, 
  ps.wins, ps.losses, ps.total_games
FROM partner_stats ps
JOIN group_players gp1 ON ps.player1_id = gp1.id
JOIN group_players gp2 ON ps.player2_id = gp2.id
WHERE ps.group_id = 'your-group-id'
ORDER BY ps.wins DESC;
```

**Check migration status:**
```sql
SELECT version, name, applied_at 
FROM migrations 
ORDER BY version;
```

---

## Troubleshooting

### Stats Don't Match Game History

**Symptoms:** Leaderboard shows incorrect W/L or ELO

**Solution:** Run stats recalculation
```bash
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/stats
curl -X POST https://poweredbypace.vercel.app/api/groups/{GROUP_ID}/pairings
```

### Pairings Tab Empty

**Symptoms:** Pairings tab shows "No pairings yet" despite having games

**Possible Causes:**
1. New migration not run yet
2. Players not linked to group player pool
3. Only singles games recorded (pairings require doubles)

**Solution:**
1. Run the migration: `curl -X POST https://your-app.vercel.app/api/migrate`
2. Recalculate pairing stats: `curl -X POST https://your-app.vercel.app/api/groups/{GROUP_ID}/pairings`

### Rate Limited

**Symptoms:** API returns 429 error

**Solution:** Wait 5 minutes before retrying

```json
{
  "error": "Rate limited. Please wait 4 minute(s) before recalculating again.",
  "retryAfter": 240
}
```

### Migration Failed

**Symptoms:** Features not working after deployment

**Solution:**
1. Check Vercel deployment logs
2. Run migration manually via API or Supabase SQL Editor
3. Check `migrations` table for applied versions

### Player Stats Not Updating

**Symptoms:** New games don't affect player stats

**Possible Causes:**
1. Session not linked to a group
2. Players not linked to group player pool

**Solution:** Check that `group_id` on session and `group_player_id` on players are set correctly.

---

## Security Notes

1. **No Authentication**: This app has no auth - anyone with the URL can access data
2. **Admin Operations**: Keep admin API endpoints private - don't share with regular users
3. **Rate Limiting**: Recalculation endpoints have rate limiting to prevent abuse
4. **Cascade Deletes**: Deleting groups/sessions cascades to all child data

---

## Quick Reference

### API Endpoints (Admin)

| Operation | Method | Endpoint | Rate Limit |
|-----------|--------|----------|------------|
| Run migrations | `POST` | `/api/migrate` | None |
| Recalculate ELO/W-L | `POST` | `/api/groups/{id}/stats` | 5 min |
| Recalculate pairings | `POST` | `/api/groups/{id}/pairings` | 5 min |
| Delete group | `DELETE` | `/api/groups/{id}` | None |
| Delete session | `DELETE` | `/api/sessions/{id}` | None |
| Delete game | `DELETE` | `/api/sessions/{sid}/games/{gid}` | None |

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
POSTGRES_URL=postgresql://...  # For migrations
```

---

## See Also

- [Database Schema](engineering/database.md) - Full database documentation
- [API Analysis](API_ANALYSIS.md) - All API endpoints
- [Migration Guide](../scripts/migrations/README.md) - How migrations work

