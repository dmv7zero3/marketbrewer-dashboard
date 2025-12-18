#!/bin/bash

# Test Locations API Endpoints
# Tests CRUD operations and bulk import

set -e

API_BASE="${API_BASE:-http://localhost:3001}"
API_TOKEN="${API_TOKEN:-local-dev-token}"
BUSINESS_ID="nash-and-smashed"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Locations API Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Get all locations
echo -n "1. GET /locations (list all)... "
RESPONSE=$(curl -s -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations")
COUNT=$(echo "$RESPONSE" | jq '.locations | length')
if [ "$COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ PASS${NC} ($COUNT locations)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 2: Get location stats
echo -n "2. GET /locations/stats... "
RESPONSE=$(curl -s -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/stats")
TOTAL=$(echo "$RESPONSE" | jq '.stats.total')
ACTIVE=$(echo "$RESPONSE" | jq '.stats.active')
if [ "$TOTAL" -gt 0 ] && [ "$ACTIVE" -ge 0 ]; then
  echo -e "${GREEN}✓ PASS${NC} ($TOTAL total, $ACTIVE active)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 3: Filter by status
echo -n "3. GET /locations?status=active... "
RESPONSE=$(curl -s -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations?status=active")
COUNT=$(echo "$RESPONSE" | jq '.locations | length')
if [ "$COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ PASS${NC} ($COUNT active locations)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 4: Create new location
echo -n "4. POST /locations (create)... "
NEW_LOCATION=$(cat <<EOF
{
  "name": "Test Location",
  "city": "Test City",
  "state": "TS",
  "country": "US",
  "status": "upcoming",
  "address": "123 Test St",
  "zip_code": "12345"
}
EOF
)
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$NEW_LOCATION" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations")
LOCATION_ID=$(echo "$RESPONSE" | jq -r '.location.id')
if [ -n "$LOCATION_ID" ] && [ "$LOCATION_ID" != "null" ]; then
  echo -e "${GREEN}✓ PASS${NC} (ID: ${LOCATION_ID:0:8}...)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
  exit 1
fi

# Test 5: Get single location
echo -n "5. GET /locations/:id (single)... "
RESPONSE=$(curl -s -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/${LOCATION_ID}")
NAME=$(echo "$RESPONSE" | jq -r '.location.name')
if [ "$NAME" = "Test Location" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 6: Update location
echo -n "6. PUT /locations/:id (update)... "
UPDATE=$(cat <<EOF
{
  "name": "Updated Test Location",
  "status": "active"
}
EOF
)
RESPONSE=$(curl -s -X PUT \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/${LOCATION_ID}")
UPDATED_NAME=$(echo "$RESPONSE" | jq -r '.location.name')
if [ "$UPDATED_NAME" = "Updated Test Location" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 7: Delete location
echo -n "7. DELETE /locations/:id... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/${LOCATION_ID}")
if [ "$STATUS" = "204" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL (HTTP $STATUS)${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 8: Verify deletion
echo -n "8. Verify location deleted... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/${LOCATION_ID}")
if [ "$STATUS" = "404" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL (HTTP $STATUS)${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 9: Bulk import
echo -n "9. POST /locations/bulk-import... "
BULK_DATA=$(cat <<EOF
{
  "locations": [
    {
      "name": "Bulk Test 1",
      "city": "City1",
      "state": "ST",
      "country": "US",
      "status": "upcoming"
    },
    {
      "name": "Bulk Test 2",
      "city": "City2",
      "state": "ST",
      "country": "US",
      "status": "upcoming"
    }
  ],
  "auto_create_service_areas": false
}
EOF
)
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$BULK_DATA" \
  "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/bulk-import")
CREATED=$(echo "$RESPONSE" | jq '.created')
BULK_IDS=$(echo "$RESPONSE" | jq -r '.locations[].id')
if [ "$CREATED" = "2" ]; then
  echo -e "${GREEN}✓ PASS${NC} (created $CREATED)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

# Cleanup bulk imported locations
echo -n "10. Cleanup test data... "
CLEANUP_SUCCESS=true
for ID in $BULK_IDS; do
  curl -s -X DELETE \
    -H "Authorization: Bearer ${API_TOKEN}" \
    "${API_BASE}/api/businesses/seo/${BUSINESS_ID}/locations/${ID}" > /dev/null || CLEANUP_SUCCESS=false
done
if [ "$CLEANUP_SUCCESS" = true ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAIL${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! ($PASSED/$((PASSED + FAILED)))${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo -e "${RED}❌ Some tests failed ($PASSED passed, $FAILED failed)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
