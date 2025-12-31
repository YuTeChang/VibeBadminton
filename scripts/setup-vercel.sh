#!/bin/bash

# VibeBadminton Vercel Setup Script
# This script helps set up Vercel Postgres and configure the project

set -e

echo "🚀 VibeBadminton Vercel Setup"
echo "=============================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed"
    echo ""
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
    echo ""
else
    echo "✅ Vercel CLI is installed"
    echo ""
fi

# Check if user is logged in
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel"
    echo "🔑 Please log in..."
    vercel login
else
    echo "✅ Logged in to Vercel"
    USER=$(vercel whoami)
    echo "   User: $USER"
fi
echo ""

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Linking project to Vercel..."
    vercel link
else
    echo "✅ Project is linked to Vercel"
    PROJECT_NAME=$(cat .vercel/project.json | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo "   Project: $PROJECT_NAME"
fi
echo ""

# Check for Postgres database
echo "🗄️  Checking for Postgres database..."
echo ""
echo "📋 To create a Postgres database:"
echo "   1. Go to: https://vercel.com/dashboard"
echo "   2. Select your project"
echo "   3. Go to Storage → Create Database → Postgres"
echo "   4. Choose a name and region"
echo "   5. Click Create"
echo ""
read -p "Have you created the Postgres database? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  Please create the database first, then run this script again"
    exit 0
fi

# Pull environment variables
echo "📥 Pulling environment variables from Vercel..."
if vercel env pull .env.local 2>/dev/null; then
    echo "✅ Environment variables pulled to .env.local"
    
    # Check if required vars are present
    if grep -q "POSTGRES_URL" .env.local; then
        echo "✅ Postgres connection string found"
    else
        echo "⚠️  Postgres connection string not found"
        echo "   Please add it manually to .env.local"
    fi
else
    echo "⚠️  Could not pull environment variables"
    echo "   You may need to add them manually:"
    echo "   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
    echo "   2. Copy the Postgres connection strings"
    echo "   3. Add them to .env.local (see .env.example)"
fi
echo ""

# Initialize database
echo "🗄️  Initializing database schema..."
echo ""
read -p "Initialize database now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Starting dev server in background..."
    npm run dev > /tmp/vibebadminton-dev.log 2>&1 &
    DEV_PID=$!
    echo "   PID: $DEV_PID"
    
    echo "⏳ Waiting for server to start..."
    sleep 5
    
    echo "📡 Calling /api/init endpoint..."
    if curl -X POST http://localhost:3000/api/init 2>/dev/null | grep -q "success"; then
        echo "✅ Database initialized successfully!"
    else
        echo "⚠️  Database initialization may have failed"
        echo "   Check the response above or try manually:"
        echo "   curl -X POST http://localhost:3000/api/init"
    fi
    
    echo ""
    echo "🛑 Stopping dev server..."
    kill $DEV_PID 2>/dev/null || true
    echo "✅ Setup complete!"
else
    echo "⏭️  Skipping database initialization"
    echo "   You can initialize it later by:"
    echo "   1. Run: npm run dev"
    echo "   2. Visit: http://localhost:3000/api/init"
    echo "   Or use: curl -X POST http://localhost:3000/api/init"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Review .env.local to ensure all variables are set"
echo "   2. Run: npm run dev"
echo "   3. Test creating a session"
echo "   4. Check Vercel Postgres dashboard to see the data"
echo ""

