# Setup Instructions - Next Steps

## ✅ Completed
- Vercel CLI installed (v50.1.3)

## 🔄 Manual Steps Required

You'll need to complete these steps manually (they require browser authentication):

### 1. Login to Vercel
```bash
vercel login
```
This will open your browser to authenticate.

### 2. Link Your Project
```bash
vercel link
```
Choose:
- Link to existing project (if you have one on Vercel)
- Or create a new project

### 3. Create Postgres Database
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Storage** → **Create Database** → **Postgres**
4. Choose a name (e.g., "vibebadminton-db") and region
5. Click **Create**

### 4. Pull Environment Variables
After creating the database, run:
```bash
vercel env pull .env.local
```

### 5. Initialize Database
Start the dev server and initialize:
```bash
npm run dev
# In another terminal:
npm run init:db
```

Or visit: http://localhost:3000/api/init

## 🚀 Quick Commands

After completing the manual steps above:

```bash
# Pull environment variables
vercel env pull .env.local

# Start dev server
npm run dev

# Initialize database (in another terminal)
npm run init:db
```

## ✅ Verification

After setup, verify it works:
1. Create a session in the app
2. Check Vercel Postgres dashboard - you should see data in the tables
3. Open the same session in another browser - it should be visible!
