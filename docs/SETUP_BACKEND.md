# Backend Setup Guide

## Overview

VibeBadminton uses **Vercel Postgres** for shared session storage. This allows multiple users to see and edit the same sessions in real-time.

## Architecture

- **Frontend**: Next.js React app (client-side)
- **Backend**: Next.js API routes (server-side)
- **Database**: Vercel Postgres (shared PostgreSQL database)
- **Sync Strategy**: Event-driven (syncs on user actions, no constant polling)

See [docs/engineering/architecture.md](engineering/architecture.md) for detailed architecture documentation.

## Quick Setup (Automated)

### Option 1: Using Setup Script (Recommended)

Run the automated setup script:

```bash
npm run setup:vercel
```

This script will:
1. ✅ Check/install Vercel CLI
2. ✅ Log you in to Vercel
3. ✅ Link your project
4. ✅ Guide you through database creation
5. ✅ Pull environment variables
6. ✅ Initialize database schema

### Option 2: Manual Setup

Follow the manual steps below if you prefer more control.

## Manual Setup Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Your Project

```bash
vercel link
```

This will:
- Ask if you want to link to an existing project or create a new one
- Create a `.vercel` directory with project configuration

### 4. Create Vercel Postgres Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** → **Create Database** → **Postgres**
4. Choose a name and region
5. Click **Create**

### 5. Pull Environment Variables

Vercel CLI can automatically pull environment variables:

```bash
vercel env pull .env.local
```

This will create `.env.local` with all the Postgres connection strings:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

**Note**: If you prefer manual setup, copy from Vercel Dashboard → Settings → Environment Variables

### 6. Initialize Database Schema

After setting up environment variables, initialize the database:

#### Option A: Using npm script (Easiest)

```bash
npm run dev
# In another terminal:
npm run init:db
```

#### Option B: Via API Endpoint

1. Start your dev server: `npm run dev`
2. Open: `http://localhost:3000/api/init`
3. Or use curl:
   ```bash
   curl -X POST http://localhost:3000/api/init
   ```

#### Option C: Via Vercel Dashboard (Production)

1. Deploy your project to Vercel
2. Go to your project → **Functions** → **API Routes**
3. Call the `/api/init` endpoint

### 5. Verify Setup

1. Create a session in the app
2. Check Vercel Postgres dashboard to see if data appears
3. Open the session in another browser/device
4. You should see the same session!

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

### Manual Refresh

Users can manually refresh to see other users' changes:
- Add a "Refresh" button in the session header
- Pulls latest data from server
- Only when needed, not automatic

## Troubleshooting

### Database Not Initialized

**Error**: `relation "sessions" does not exist`

**Solution**: Call `/api/init` endpoint to create tables

### Connection Errors

**Error**: `Connection refused` or `Authentication failed`

**Solution**: 
1. Check environment variables are set correctly
2. Verify connection strings from Vercel dashboard
3. Make sure database is created and active

### API Not Available

The app falls back to localStorage if API is unavailable:
- Sessions stored locally
- Works offline
- Data not shared across devices

## Testing

### Test Local Setup

1. Start dev server: `npm run dev`
2. Create a session
3. Check browser Network tab for API calls
4. Verify data in Vercel Postgres dashboard

### Test Multi-User

1. Open app in two different browsers/devices
2. Create session in Browser 1
3. Refresh Browser 2 - should see the session
4. Add game in Browser 1
5. Click "Refresh" in Browser 2 - should see the game

## Production Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Initialize database: `POST https://your-app.vercel.app/api/init`
6. Test!

## Future Enhancements

- **Smart Polling**: Only poll when multiple users are active
- **WebSockets**: Real-time updates (for high usage)
- **Conflict Resolution**: Handle simultaneous edits
- **Offline Queue**: Queue actions when offline, sync when online

