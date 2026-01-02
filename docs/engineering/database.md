# Database Documentation

This document provides a comprehensive overview of the PoweredByPace database schema, relationships, and migration system.

## Overview

PoweredByPace uses **PostgreSQL** hosted on **Supabase**. The database stores all application data including groups, players, sessions, and games.

### Key Design Decisions

1. **Supabase REST API**: All database operations go through Supabase's REST API (not direct SQL connections)
2. **Soft References**: Some relationships use IDs without foreign keys for flexibility
3. **JSONB for Teams**: Game teams stored as JSONB arrays to support both singles and doubles
4. **ELO on Group Players**: ELO ratings stored on `group_players` for cross-session tracking
5. **Pairing ELO**: Doubles pairings have their own independent ELO ratings
6. **Migration System**: Versioned migrations with automatic execution on deploy
7. **Smart Caching**: API responses cached at edge with stale-while-revalidate strategy

---

## Schema Diagram

```
┌─────────────────┐       ┌──────────────────────┐
│     groups      │       │    group_players     │
├─────────────────┤       ├──────────────────────┤
│ id (PK)         │──┐    │ id (PK)              │
│ name            │  │    │ group_id (FK)────────┼──┐
│ shareable_link  │  │    │ name                 │  │
│ created_at      │  │    │ elo_rating (1500)    │  │
│ updated_at      │  │    │ wins, losses         │  │
└─────────────────┘  │    │ total_games          │  │
                     │    │ current_streak       │  │
                     │    │ best_win_streak      │  │
                     │    │ created_at           │  │
                     │    └──────────────────────┘  │
                     │              │               │
                     │    ┌─────────┴─────────┐     │
                     │    ▼                   ▼     │
                     │  ┌─────────────┐  ┌─────────────────┐
                     │  │partner_stats│  │pairing_matchups │
                     │  ├─────────────┤  ├─────────────────┤
                     │  │ group_id    │  │ group_id        │
                     │  │ player1_id  │  │ team1_p1/p2     │
                     │  │ player2_id  │  │ team2_p1/p2     │
                     │  │ wins/losses │  │ team1_wins/loss │
                     │  │ elo_rating  │  │ total_games     │
                     │  │ points_for  │  └─────────────────┘
                     │  │ points_agst │
                     │  └─────────────┘
                     │
                     │    ┌──────────────────────┐
                     │    │      sessions        │
                     │    ├──────────────────────┤
                     └───►│ id (PK)              │
                          │ name                 │
                          │ date                 │
                          │ organizer_id         │
                          │ court_cost_type      │
                          │ court_cost_value     │
                          │ bird_cost_total      │
                          │ bet_per_player       │
                          │ game_mode            │
                          │ group_id (FK)────────┼──┘
                          │ betting_enabled      │
                          │ created_at           │
                          └──────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
        ┌──────────────────────┐     ┌──────────────────────┐
        │       players        │     │        games         │
        ├──────────────────────┤     ├──────────────────────┤
        │ id (PK)              │     │ id (PK)              │
        │ session_id (FK)──────┼─────│ session_id (FK)      │
        │ name                 │     │ game_number          │
        │ group_player_id (FK)─┼──┐  │ team_a (JSONB)       │
        │ created_at           │  │  │ team_b (JSONB)       │
        └──────────────────────┘  │  │ winning_team         │
                                  │  │ team_a_score         │
                                  │  │ team_b_score         │
                                  │  │ created_at           │
                                  │  │ updated_at           │
                                  │  └──────────────────────┘
                                  │
                                  └─► Links to group_players
                                      for cross-session tracking
```

---

## Tables

### `groups`

Represents a recurring badminton group.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key (format: `group-{timestamp}`) |
| `name` | VARCHAR(255) | Group name (e.g., "Monday Night Badminton") |
| `shareable_link` | VARCHAR(50) | 8-character code for sharing (unique) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `shareable_link`

---

### `group_players`

Player pool for a group. Players here can be linked to session players for cross-session stats.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key (format: `gp-{timestamp}-{random}`) |
| `group_id` | VARCHAR(255) | Foreign key to `groups.id` |
| `name` | VARCHAR(255) | Player name |
| `elo_rating` | INTEGER | ELO rating (default: 1500) |
| `wins` | INTEGER | Total wins across all sessions (default: 0) |
| `losses` | INTEGER | Total losses across all sessions (default: 0) |
| `total_games` | INTEGER | Total games played (default: 0) |
| `current_streak` | INTEGER | Current win/loss streak: positive=wins, negative=losses (default: 0) |
| `best_win_streak` | INTEGER | Best win streak ever achieved (default: 0) |
| `sessions_attended` | INTEGER | Number of sessions attended (default: 0) |
| `created_at` | TIMESTAMP | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `group_id`
- Index on `elo_rating DESC` (for leaderboard queries)

**On Delete:** CASCADE (deleting a group deletes all its players)

---

### `sessions`

Individual badminton sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key (format: `session-{timestamp}`) |
| `name` | VARCHAR(255) | Optional session name |
| `date` | TIMESTAMP | Session date and time |
| `organizer_id` | VARCHAR(255) | Player ID of the organizer |
| `court_cost_type` | VARCHAR(20) | `'per_person'` or `'total'` |
| `court_cost_value` | DECIMAL(10,2) | Court cost amount |
| `bird_cost_total` | DECIMAL(10,2) | Shuttlecock cost (total) |
| `bet_per_player` | DECIMAL(10,2) | Bet amount per player per game |
| `game_mode` | VARCHAR(10) | `'doubles'` or `'singles'` |
| `round_robin_count` | INTEGER | Number of round robin rounds (null if not used) |
| `group_id` | VARCHAR(255) | Foreign key to `groups.id` (null for standalone) |
| `betting_enabled` | BOOLEAN | Whether betting is enabled (default: true) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `group_id`

**On Delete:** CASCADE (deleting a group deletes all its sessions)

---

### `players`

Players within a specific session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key (format: `{session_id}-player-{index}`) |
| `session_id` | VARCHAR(255) | Foreign key to `sessions.id` |
| `name` | VARCHAR(255) | Player name |
| `group_player_id` | VARCHAR(255) | Foreign key to `group_players.id` (null if not linked) |
| `created_at` | TIMESTAMP | Creation timestamp |

**Player Linking:**
- **Linked Player**: `group_player_id` is set → Stats count toward group leaderboard, ELO tracked
- **Guest Player**: `group_player_id` is NULL → Stats don't affect leaderboard, shown as "Guest"
- Guests can be promoted later via `/api/groups/[id]/guests` which links all past session records

**Indexes:**
- Primary key on `id`
- Index on `session_id`
- Index on `group_player_id`

**On Delete:** CASCADE (deleting a session deletes all its players)

---

### `games`

Individual games within a session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key (format: `{session_id}-game-{number}`) |
| `session_id` | VARCHAR(255) | Foreign key to `sessions.id` |
| `game_number` | INTEGER | Game sequence number |
| `team_a` | JSONB | Array of player IDs `["player1", "player2"]` or `["player1"]` |
| `team_b` | JSONB | Array of player IDs |
| `winning_team` | VARCHAR(1) | `'A'`, `'B'`, or NULL (unplayed) |
| `team_a_score` | INTEGER | Team A score (optional) |
| `team_b_score` | INTEGER | Team B score (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `session_id`

**On Delete:** CASCADE (deleting a session deletes all its games)

---

### `partner_stats`

Tracks win/loss record and ELO when two players are on the same team (doubles). Each pairing has its own ELO rating, treating the pair as a single competitive unit.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key |
| `group_id` | VARCHAR(255) | Foreign key to `groups.id` |
| `player1_id` | VARCHAR(255) | Foreign key to `group_players.id` (always < player2_id) |
| `player2_id` | VARCHAR(255) | Foreign key to `group_players.id` (always > player1_id) |
| `wins` | INTEGER | Games won together (default: 0) |
| `losses` | INTEGER | Games lost together (default: 0) |
| `total_games` | INTEGER | Total games played together |
| `elo_rating` | INTEGER | Pairing ELO rating (default: 1500) - independent of individual ELO |
| `current_streak` | INTEGER | Current win/loss streak: positive=wins, negative=losses (default: 0) |
| `best_win_streak` | INTEGER | Best win streak for this pairing (default: 0) |
| `points_for` | INTEGER | Total points scored as a pair (default: 0) |
| `points_against` | INTEGER | Total points conceded as a pair (default: 0) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `group_id`
- Index on `player1_id`
- Index on `player2_id`
- Unique constraint on `(group_id, player1_id, player2_id)`

**Constraints:**
- `player1_id < player2_id` ensures consistent key ordering

**On Delete:** CASCADE (deleting a group or player deletes related stats)

---

### `pairing_matchups`

Tracks head-to-head record between two specific pairings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(255) | Primary key |
| `group_id` | VARCHAR(255) | Foreign key to `groups.id` |
| `team1_player1_id` | VARCHAR(255) | Team 1, player 1 (sorted) |
| `team1_player2_id` | VARCHAR(255) | Team 1, player 2 (sorted) |
| `team2_player1_id` | VARCHAR(255) | Team 2, player 1 (sorted) |
| `team2_player2_id` | VARCHAR(255) | Team 2, player 2 (sorted) |
| `team1_wins` | INTEGER | Games won by team 1 (default: 0) |
| `team1_losses` | INTEGER | Games lost by team 1 (default: 0) |
| `total_games` | INTEGER | Total games between these pairings |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `group_id`
- Index on `(team1_player1_id, team1_player2_id)`
- Index on `(team2_player1_id, team2_player2_id)`

**Constraints:**
- Players within each team are ordered (player1 < player2)
- Teams are ordered (team1 < team2 by concatenated IDs)
- Ensures each matchup is stored exactly once

**On Delete:** CASCADE (deleting a group or player deletes related stats)

---

### `migrations`

Tracks applied database migrations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-incrementing primary key |
| `version` | VARCHAR(50) | Migration version (e.g., "001") |
| `name` | VARCHAR(255) | Migration description |
| `filename` | VARCHAR(255) | Migration filename |
| `applied_at` | TIMESTAMP | When migration was applied |

**Indexes:**
- Primary key on `id`
- Unique index on `version`

---

## Relationships

### Group → Group Players (1:N)
- A group has many players in its player pool
- Deleting a group cascades to delete all group players

### Group → Sessions (1:N)
- A group has many sessions
- Sessions can exist without a group (standalone sessions have `group_id = NULL`)
- Deleting a group cascades to delete all sessions

### Session → Players (1:N)
- A session has multiple players
- Deleting a session cascades to delete all players

### Session → Games (1:N)
- A session has multiple games
- Deleting a session cascades to delete all games

### Group Player → Session Player (1:N)
- A group player can be linked to multiple session players
- This enables cross-session stats tracking
- The link is via `players.group_player_id`

---

## ELO Rating System

### Storage
ELO ratings are stored in `group_players.elo_rating`:
- Default value: 1500
- Updated automatically when games are completed
- Only updated for group sessions (standalone sessions don't update ELO)

### Update Trigger
ELO updates happen in `GameService.updateGame()` when:
1. A game's `winning_team` changes from NULL to 'A' or 'B'
2. The session belongs to a group (`group_id` is not null)
3. Players are linked to group players (`group_player_id` is not null)

### Calculation (EloService)
```typescript
K_FACTOR = 32
expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
ratingChange = K_FACTOR * (actualScore - expectedScore)
// actualScore: 1 for win, 0 for loss
```

For doubles: Team rating = average of both players' ratings

---

## Migration System

### Overview
Migrations are versioned SQL files that run automatically on deployment.

### Location
```
scripts/migrations/
├── 001-add-groups.sql          # Initial groups feature
├── 002-add-elo-rating.sql      # ELO rating column
├── 003-add-player-stats.sql    # Wins/losses columns
├── 004-add-pairing-stats.sql   # Partner stats & pairing matchups (NEW)
└── README.md                   # Migration guide
```

### Automatic Execution
1. **When**: After every Vercel build (`postbuild` npm script)
2. **How**: `lib/migration.ts` scans for SQL files, compares with `migrations` table
3. **Result**: Only pending migrations run, each recorded to prevent re-running

### Writing Migrations
```sql
-- Migration: Add some feature
-- Use IF NOT EXISTS for idempotency

CREATE TABLE IF NOT EXISTS new_table (
  id VARCHAR(255) PRIMARY KEY,
  ...
);

ALTER TABLE existing_table 
ADD COLUMN IF NOT EXISTS new_column TYPE DEFAULT value;

CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

See [scripts/migrations/README.md](../../scripts/migrations/README.md) for detailed guide.

---

## Row Level Security (RLS)

All tables have RLS enabled with permissive policies for public access:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON table_name FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON table_name FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON table_name FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON table_name FOR DELETE USING (true);
```

**Note**: This is appropriate for a no-auth app. If authentication is added, these policies should be updated.

---

## Query Patterns

### Get Leaderboard
```sql
SELECT id, name, elo_rating
FROM group_players
WHERE group_id = ?
ORDER BY elo_rating DESC;
```

### Get Player's Partners (from games)
```sql
-- Complex query involving:
-- 1. Get all games where player participated
-- 2. Find teammates in those games
-- 3. Calculate win/loss per teammate
-- See: StatsService.getPlayerDetailedStats()
```

### Check Migration Status
```sql
SELECT version, name, applied_at 
FROM migrations 
ORDER BY version;
```

---

## Performance Considerations

1. **Indexes**: Key columns are indexed for fast queries
2. **Parallel Queries**: Services execute independent database queries in parallel using `Promise.all()`
3. **Lazy Loading**: Player stats computed on-demand, not stored
4. **Smart Caching**: API responses cached at edge with `s-maxage=5, stale-while-revalidate=30`
5. **Query Optimization**: Stats queries optimized to minimize database round-trips

### Caching Strategy

Stats APIs use smart caching to balance freshness and performance:

```typescript
// Cache for 5 seconds at edge, serve stale while revalidating for 30 seconds
headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
```

This means:
- Fresh data served for first 5 seconds after request
- After 5s, stale data served immediately while fresh data fetched in background
- After 35s, cache expires and fresh data fetched on next request

---

## Backup & Recovery

Supabase handles automatic backups. For manual backup:

```sql
-- Export via Supabase dashboard
-- Or use pg_dump with connection string
pg_dump $POSTGRES_URL > backup.sql
```

---

## See Also

- [Backend Setup](../SETUP_BACKEND.md) - Initial database setup
- [Migration Guide](../../scripts/migrations/README.md) - How to create migrations
- [Architecture](./architecture.md) - System architecture
- [API Analysis](../API_ANALYSIS.md) - API endpoints documentation

