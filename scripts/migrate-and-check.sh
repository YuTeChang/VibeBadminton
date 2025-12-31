#!/bin/bash
# Run migration and automatically check logs
# Usage: ./scripts/migrate-and-check.sh [deployment-url]

set -e

DEPLOYMENT_URL="${1:-${VERCEL_URL:-}}"

if [ -z "$DEPLOYMENT_URL" ]; then
  echo "⚠️  No deployment URL provided"
  echo "Usage: ./scripts/migrate-and-check.sh https://your-app.vercel.app"
  exit 1
fi

echo "🔄 Step 1: Running migration..."
echo ""

# Run migration
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$DEPLOYMENT_URL/api/migrate" \
  -H "Content-Type: application/json" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response:"
if command -v jq &> /dev/null; then
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "$BODY"
fi

echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

# Check if successful
if echo "$BODY" | grep -q '"success":true' || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Migration completed successfully!"
  exit 0
else
  echo "❌ Migration failed - checking logs..."
  echo ""
  
  # Get deployment ID from URL or vercel ls
  DEPLOYMENT_ID=$(vercel ls --json 2>/dev/null | jq -r '.[0].uid' 2>/dev/null || echo "")
  
  if [ -n "$DEPLOYMENT_ID" ]; then
    echo "📜 Recent migration logs:"
    vercel logs "$DEPLOYMENT_ID" 2>&1 | grep -i -A 5 -B 5 -E "(migration|error|failed)" | tail -30
  else
    echo "⚠️  Could not fetch logs automatically"
    echo "Run manually: vercel logs"
  fi
  
  exit 1
fi

