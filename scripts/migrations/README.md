# Database Migrations

This directory contains versioned database migration files. Migrations are automatically detected and applied during deployment.

## How It Works

### Migration System Overview

1. **Migration Files**: SQL files in `scripts/migrations/` named `NNN-description.sql`
2. **Tracking Table**: A `migrations` table in the database tracks which migrations have been applied
3. **Automatic Execution**: Migrations run automatically during Vercel builds (`postbuild` script)
4. **Versioning**: Each migration has a unique version number (001, 002, 003, etc.)

### Migration Flow

```
1. Build starts → postbuild script runs
2. Migration system scans scripts/migrations/ directory
3. Checks migrations table for applied versions
4. Runs only pending migrations (not yet applied)
5. Records each migration in migrations table after success
6. Skips already-applied migrations (fast exit)
```

### When Migrations Run

- **During Build**: Automatically on every Vercel deployment (via `postbuild` script)
- **On API Request**: Fallback if build-time migration failed (e.g., `/api/groups` endpoint)
- **Manual**: Run `npm run migrate:run` locally (requires DB connection)

## File Naming Convention

Migration files must follow this naming pattern:

```
NNN-description.sql
```

Where:
- `NNN` = 3-digit version number (001, 002, 003, etc.)
- `description` = Short description with hyphens (e.g., `add-groups`, `add-notifications`)

**Examples:**
- `001-add-groups.sql` ✅
- `002-add-notifications.sql` ✅
- `003-update-sessions-table.sql` ✅
- `migrate-add-groups.sql` ❌ (missing version number)
- `1-add-groups.sql` ❌ (should be 001)

## Creating a New Migration

### Step 1: Create the Migration File

Create a new file in `scripts/migrations/` with the next sequential version:

```bash
# If last migration was 001-add-groups.sql
# Next migration should be:
scripts/migrations/002-add-notifications.sql
```

### Step 2: Write Your SQL

Write idempotent SQL statements (safe to run multiple times):

```sql
-- Migration: Add notifications feature
-- Version: 002

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON notifications FOR SELECT USING (true);
-- ... more policies
```

### Step 3: Best Practices

✅ **DO:**
- Use `IF NOT EXISTS` for tables, indexes, constraints
- Use `IF EXISTS` for drops (if needed)
- Add comments explaining what the migration does
- Test locally before pushing
- Keep migrations small and focused
- Use transactions if possible (though some DDL can't be rolled back)

❌ **DON'T:**
- Modify existing migration files (create new ones instead)
- Delete migration files (they're tracked in the database)
- Skip version numbers (001, 002, 003 - no gaps)
- Include data migrations in schema migrations (separate concerns)

### Step 4: Test Locally

```bash
# Run migration locally (requires POSTGRES_URL in .env.local)
npm run migrate:run
```

### Step 5: Deploy

Push to GitHub. Vercel will:
1. Build the app
2. Run `postbuild` script
3. Detect new migration file
4. Apply it automatically
5. Record it in migrations table

## Migration Tracking

The system uses a `migrations` table to track applied migrations:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "001"
  name VARCHAR(255) NOT NULL,            -- e.g., "add groups"
  filename VARCHAR(255) NOT NULL,         -- e.g., "001-add-groups.sql"
  applied_at TIMESTAMP DEFAULT NOW()
);
```

### View Applied Migrations

Query the migrations table in Supabase:

```sql
SELECT * FROM migrations ORDER BY version;
```

## Troubleshooting

### Migration Not Running

**Problem**: New migration file exists but isn't being applied.

**Solutions**:
1. Check file naming: Must be `NNN-description.sql` format
2. Check build logs: Look for migration output in Vercel deployment logs
3. Run manually: `npm run migrate:run` (if you have DB access)
4. Check migrations table: Verify previous migrations were recorded

### Migration Fails

**Problem**: Migration SQL has errors.

**Solutions**:
1. Check build logs for specific SQL error
2. Test SQL manually in Supabase SQL Editor first
3. Fix the migration file and push again
4. If migration partially applied, you may need to manually fix the database

### "Already Exists" Errors

**Problem**: Migration tries to create something that already exists.

**Solution**: Use `IF NOT EXISTS` in your SQL:
```sql
CREATE TABLE IF NOT EXISTS ...  ✅
CREATE INDEX IF NOT EXISTS ...  ✅
```

### Migration Runs Every Time

**Problem**: Migration runs on every deployment even though it's already applied.

**Solution**: Check that migrations table exists and contains the migration version. The system should skip already-applied migrations automatically.

## Manual Migration

If automatic migration fails, you can run migrations manually:

### Option 1: Via Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/migrations/001-add-groups.sql`
3. Paste and run
4. Manually insert into migrations table:
   ```sql
   INSERT INTO migrations (version, name, filename)
   VALUES ('001', 'add groups', '001-add-groups.sql');
   ```

### Option 2: Via API Endpoint

```bash
curl -X POST https://your-app.vercel.app/api/migrate
```

### Option 3: Via Script (Local)

```bash
npm run migrate:run
```

## Migration Best Practices

### 1. Idempotency

Always write migrations that can be run multiple times safely:

```sql
-- ✅ Good
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ❌ Bad
CREATE TABLE users (...);  -- Will fail if table exists
```

### 2. Order Matters

Migrations run in version order (001, 002, 003). Dependencies should be in order:

```sql
-- 001-add-groups.sql
CREATE TABLE groups (...);

-- 002-add-sessions-group-id.sql (depends on groups table)
ALTER TABLE sessions ADD COLUMN group_id VARCHAR(255);
ALTER TABLE sessions ADD CONSTRAINT fk_group 
  FOREIGN KEY (group_id) REFERENCES groups(id);
```

### 3. Backward Compatibility

When modifying existing tables, consider:
- Adding columns with defaults (non-breaking)
- Making columns nullable if needed
- Avoiding dropping columns without deprecation period

### 4. Testing

Always test migrations:
1. On local database first
2. On staging/preview deployment
3. Then production

### 5. Documentation

Include comments in migration files:

```sql
-- Migration: Add notifications feature
-- Version: 002
-- Date: 2024-01-15
-- Description: Creates notifications table for user notifications
-- Dependencies: None
```

## Migration File Structure

```
scripts/
  migrations/
    001-add-groups.sql              # Groups and group_players tables
    002-add-elo-rating.sql          # ELO rating column for group_players
    003-add-player-stats.sql        # Wins, losses, total_games columns
    004-add-pairing-stats.sql       # partner_stats and pairing_matchups tables
    005-add-extended-stats.sql      # Streaks, pairing ELO, point tracking
    README.md                       # This file
```

## Environment Variables

Required for migrations to run:

- `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING` (preferred)
- `VERCEL_POSTGRES_URL` (Vercel-specific)
- `DATABASE_URL` (fallback)

Set these in:
- `.env.local` (local development)
- Vercel Environment Variables (deployments)

## See Also

- [Main README](../README.md) - Project overview
- [Backend Setup Guide](../../docs/SETUP_BACKEND.md) - Database setup
- [Migration API](../../lib/migration.ts) - Migration implementation

