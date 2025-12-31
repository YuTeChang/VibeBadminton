#!/bin/bash
# Check Vercel deployment logs for migration errors
# Usage: ./scripts/check-migration-logs.sh [deployment-url]

set -e

DEPLOYMENT_URL="${1:-}"

if [ -z "$DEPLOYMENT_URL" ]; then
  echo "📋 Getting latest deployment..."
  DEPLOYMENT_ID=$(vercel ls --json 2>/dev/null | jq -r '.[0].uid' 2>/dev/null || echo "")
  
  if [ -z "$DEPLOYMENT_ID" ]; then
    echo "❌ Could not get deployment ID"
    echo "Usage: ./scripts/check-migration-logs.sh [deployment-url]"
    exit 1
  fi
  
  echo "   Deployment ID: $DEPLOYMENT_ID"
  echo ""
  echo "📜 Fetching logs (last 5 minutes)..."
  echo ""
  
  vercel logs "$DEPLOYMENT_ID" 2>&1 | grep -i -E "(migration|error|failed|success|migrate)" || echo "No migration-related logs found"
else
  echo "📜 Fetching logs for: $DEPLOYMENT_URL"
  echo ""
  vercel logs "$DEPLOYMENT_URL" 2>&1 | grep -i -E "(migration|error|failed|success|migrate)" || echo "No migration-related logs found"
fi

echo ""
echo "💡 Tip: Run without grep to see all logs:"
echo "   vercel logs $DEPLOYMENT_ID"

