#!/bin/bash

# Connection Test Script
# Tests API server connectivity and endpoints

set -e

API_BASE="${API_BASE:-http://localhost:3001}"
API_TOKEN="${API_TOKEN:-local-dev-token}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 API Connection Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Server URL: ${API_BASE}"
echo "API Token: ${API_TOKEN:0:10}..."
echo ""

# Test 1: Server reachability
echo -n "1. Server reachability... "
if curl -s -f "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo ""
    echo "❌ Server is not reachable at ${API_BASE}"
    echo ""
    echo "To start the server:"
    echo "  cd /Users/george/MatrizInc/MarketBrewer/Clients/marketbrewer-seo-platform"
    echo "  NODE_ENV=development npm run dev:server"
    echo ""
    exit 1
fi

# Test 2: Health endpoint
echo -n "2. Health check endpoint... "
HEALTH=$(curl -s "${API_BASE}/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL (status: $HEALTH)${NC}"
fi

# Test 3: API authentication
echo -n "3. API authentication... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    "${API_BASE}/api/businesses")
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ WARN (HTTP $STATUS)${NC}"
fi

# Test 4: CORS headers
echo -n "4. CORS headers... "
CORS_HEADERS=$(curl -s -I \
    -H "Origin: http://localhost:3002" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    "${API_BASE}/api/businesses" | grep -i "access-control")
if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${YELLOW}⚠ WARN (no CORS headers)${NC}"
fi

# Test 5: Business data
echo -n "5. Business data available... "
BUSINESS_COUNT=$(curl -s \
    -H "Authorization: Bearer ${API_TOKEN}" \
    "${API_BASE}/api/businesses" | jq 'length' 2>/dev/null)
if [ -n "$BUSINESS_COUNT" ] && [ "$BUSINESS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} ($BUSINESS_COUNT businesses)"
else
    echo -e "${YELLOW}⚠ WARN (0 businesses)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Connection tests complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  • Start dashboard: npm run dev:dashboard"
echo "  • Open browser: http://localhost:3002"
echo "  • Check browser console for API logs"
echo ""
