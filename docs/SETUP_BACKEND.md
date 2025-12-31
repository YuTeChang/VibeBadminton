# Backend Setup Guide

## Overview

PoweredByPace uses **Supabase (PostgreSQL)** for shared session storage. This allows multiple users to see and edit the same sessions and groups.

## Architecture

- **Frontend**: Next.js React app (client-side)
- **Backend**: Next.js API routes (server-side)
- **Database**: Supabase (PostgreSQL database)
- **Sync Strategy**: Event-driven (syncs on user actions, no constant polling)

See [docs/engineering/architecture.md](engineering/architecture.md) for detailed architecture documentation.

## Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose a name, database password, and region
5. Wait for project to be created

### 2. Get Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Set Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important**: Never commit `.env.local` to git. It's already in `.gitignore`.

### 4. Initialize Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `scripts/init-db-schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

This creates:
- `groups` table (for recurring badminton groups)
- `group_players` table (player pool per group)
- `sessions` table (badminton sessions)
- `players` table (session players)
- `games` table (individual games)
- All necessary indexes and RLS policies

### 5. Verify Setup

1. Start your dev server: `npm run dev`
2. Open: `http://localhost:3000/api/health/db`
3. You should see:
   ```json
   {
     "ok": true,
     "db": "connected",
     "sessionsCount": 0
   }
   ```

### 6. Test Shared Sessions

1. Open the app in Browser A: `http://localhost:3000`
2. Create a new badminton session
3. Open the app in Browser B (or another device)
4. Refresh Browser B
5. You should see the session you just created!

## Migration (Upgrading Existing Database)

If you have an existing database without groups support:

1. Go to Supabase SQL Editor
2. Run `scripts/migrate-add-groups.sql`
3. This adds:
   - `groups` and `group_players` tables
   - `group_id` and `betting_enabled` columns to `sessions`
   - `group_player_id` column to `players`
   - All necessary indexes and policies

## How It Works

### Event-Driven Sync (No Polling)

The app uses **optimistic updates** with background sync:

1. **User Action** (e.g., creates a game)
2. **UI Updates Immediately** (optimistic update)
3. **API Call in Background** (syncs to database)
4. **If Success**: Update stays
5. **If Error**: Rollback and show error

This means:
- ✅ **No wasteful polling** - only syncs when user does something
- ✅ **Instant UI feedback** - optimistic updates
- ✅ **Works offline** - localStorage fallback
- ✅ **Efficient** - minimal API calls

### Database Schema

**Groups:**
- `groups` - Group information with shareable links
- `group_players` - Player pool per group

**Sessions:**
- `sessions` - Badminton sessions (can belong to a group)
- `players` - Session players (can link to group players)
- `games` - Individual games within sessions

See `scripts/init-db-schema.sql` for complete schema.

## Troubleshooting

### Database Not Initialized

**Error**: `relation "sessions" does not exist`

**Solution**: Run the SQL schema from `scripts/init-db-schema.sql` in Supabase SQL Editor

### Connection Errors

**Error**: `Connection refused` or `Authentication failed`

**Solution**: 
1. Check environment variables are set correctly in `.env.local`
2. Verify connection strings from Supabase dashboard
3. Make sure database is created and active
4. Check that you're using the `service_role` key (not `anon` key)

### API Not Available

The app falls back to localStorage if API is unavailable:
- Sessions stored locally
- Works offline
- Data not shared across devices

### RLS Policies

If you see permission errors, make sure the RLS policies were created:
1. Go to Supabase SQL Editor
2. Run the RLS policy creation statements from `scripts/init-db-schema.sql`

## Testing

### Test Local Setup

1. Start dev server: `npm run dev`
2. Create a session
3. Check browser Network tab for API calls
4. Verify data in Supabase Table Editor

### Test Multi-User

1. Open app in two different browsers/devices
2. Create session in Browser 1
3. Refresh Browser 2 - should see the session
4. Add game in Browser 1
5. Refresh Browser 2 - should see the game

### Test Groups

1. Create a group
2. Add players to group pool
3. Create a session linked to the group
4. Verify players can be linked to group players
5. Check group page shows the session

## Production Deployment

1. Push code to GitHub
2. Connect repository to Vercel (or your hosting platform)
3. Add environment variables in hosting platform:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy
5. Verify database is initialized (run schema if needed)
6. Test!

## Security Notes

- **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS policies. Keep it secret!
- **RLS Policies**: Currently set to allow public read/write for simplicity. For production, consider:
  - Adding authentication
  - Restricting write access
  - Using row-level security more strictly

## Future Enhancements

- **Smart Polling**: Only poll when multiple users are active
- **WebSockets**: Real-time updates (for high usage)
- **Conflict Resolution**: Handle simultaneous edits
- **Offline Queue**: Queue actions when offline, sync when online
- **Authentication**: User accounts with proper access control
