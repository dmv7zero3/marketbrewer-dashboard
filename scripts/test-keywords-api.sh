#!/bin/bash
# 
# Smoke Test for Keywords API
# Tests the basic functionality without heavy Jest setup
# 

set -e

API_BASE="${API_BASE:-http://localhost:3001}"
API_TOKEN="${API_TOKEN:-local-dev-token}"

echo "🧪 Keywords API Smoke Tests"
echo "================================"
echo "API Base: $API_BASE"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -n "Testing $description... "

  local cmd="curl -s -w '\n%{http_code}' -X $method '$API_BASE$endpoint'"
  if [ ! -z "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi
  cmd="$cmd -H 'Authorization: Bearer $API_TOKEN'"

  local response=$(eval $cmd)
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} ($http_code)"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} (expected $expected_status, got $http_code)"
    echo "  Response: $body"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Test 1: Health check
echo "1. Server Health"
test_endpoint "GET" "/health" "" "200" "health check endpoint"
echo ""

# Test 2: Create a test business
echo "2. Setup: Create Test Business"
BUSINESS_JSON=$(curl -s -X POST "$API_BASE/api/businesses" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "name": "Test Keywords Business",
    "location": "Test Location",
    "industry": "Restaurant"
  }')

BUSINESS_ID=$(echo "$BUSINESS_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BUSINESS_ID" ]; then
  echo -e "${RED}✗${NC} Failed to create test business"
  echo "Response: $BUSINESS_JSON"
  ((TESTS_FAILED++))
else
  echo -e "${GREEN}✓${NC} Created business: $BUSINESS_ID"
  ((TESTS_PASSED++))
fi
echo ""

# Test 3: Keywords CRUD Operations
echo "3. Keywords API Operations"

# 3a. List empty keywords
test_endpoint "GET" "/api/businesses/$BUSINESS_ID/keywords" "" "200" "list keywords (empty)"

# 3b. Create keyword without priority
KEYWORD_JSON=$(curl -s -X POST "$API_BASE/api/businesses/$BUSINESS_ID/keywords" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "keyword": "Best Nashville Hot Chicken",
    "search_intent": "commercial"
  }')

KEYWORD_ID=$(echo "$KEYWORD_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$KEYWORD_ID" ]; then
  echo -e "${GREEN}✓${NC} Create keyword (no priority field)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗${NC} Create keyword failed"
  echo "Response: $KEYWORD_JSON"
  ((TESTS_FAILED++))
fi

# 3c. List keywords
test_endpoint "GET" "/api/businesses/$BUSINESS_ID/keywords" "" "200" "list keywords (populated)"

# 3d. Update keyword
test_endpoint "PUT" "/api/businesses/$BUSINESS_ID/keywords/$KEYWORD_ID" \
  '{"search_intent": "transactional"}' "200" "update keyword search intent"

# 3e. Delete keyword
test_endpoint "DELETE" "/api/businesses/$BUSINESS_ID/keywords/$KEYWORD_ID" "" "204" "delete keyword"

echo ""

# Test 4: Error handling
echo "4. Error Handling"
test_endpoint "POST" "/api/businesses/$BUSINESS_ID/keywords" \
  '{}' "400" "reject keyword without text"

test_endpoint "GET" "/api/businesses/invalid-id/keywords" "" "200" "handle invalid business ID gracefully"

echo ""

# Cleanup
echo "5. Cleanup"
curl -s -X DELETE "$API_BASE/api/businesses/$BUSINESS_ID" \
  -H "Authorization: Bearer $API_TOKEN" > /dev/null
echo -e "${GREEN}✓${NC} Deleted test business"
((TESTS_PASSED++))

echo ""
echo "================================"
echo "Results:"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "  ${RED}Failed: $TESTS_FAILED${NC}"
echo "================================"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
