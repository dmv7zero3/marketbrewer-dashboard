#!/bin/bash

################################################################################
# MarketBrewer SEO Platform — API Smoke Test Suite
# Tests critical API endpoints to verify system health
# Usage: ./smoke-tests.sh [local|staging|prod]
################################################################################

set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-local}"
case "$ENVIRONMENT" in
  local)
    API_URL="http://localhost:3001"
    API_BASE_PATH="/api"
    ;;
  staging)
    API_URL="http://staging.marketbrewer.com:3001"
    API_BASE_PATH="/api"
    ;;
  prod)
    API_URL="http://prod.marketbrewer.com:3001"
    API_BASE_PATH="/api"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: ./smoke-tests.sh [local|staging|prod]"
    exit 1
    ;;
esac

# Tracking
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

################################################################################
# Utility Functions
################################################################################

log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"

  echo -n "Testing: $name ... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${API_TOKEN:-local-dev-token-12345}" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${API_TOKEN:-local-dev-token-12345}" \
      -d "$data" \
      "$API_URL$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" == "$expected_status" ]; then
    log_info "$name (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("✓ $name")
    return 0
  else
    log_error "$name (Expected $expected_status, got $http_code)"
    echo "Response: $body" | head -n 3
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("✗ $name")
    return 1
  fi
}

################################################################################
# Health Checks
################################################################################

echo ""
echo "🏥 MarketBrewer API Smoke Tests"
echo "Environment: $ENVIRONMENT"
echo "API URL: $API_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify server is accessible
echo "Checking server connectivity..."
if ! curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  log_error "Server not accessible at $API_URL"
  exit 1
fi
log_info "Server is accessible"
echo ""

################################################################################
# Core API Endpoints
################################################################################

echo "Testing core API endpoints..."

# Health check
test_endpoint \
  "GET /health" \
  "GET" \
  "/health" \
  "" \
  "200"

# Business endpoints
test_endpoint \
  "GET /api/businesses (list)" \
  "GET" \
  "$API_BASE_PATH/businesses" \
  "" \
  "200"

# Create business (test data)
business_data=$(cat <<EOF
{
  "name": "Smoke Test Business $(date +%s)",
  "industry": "restaurant",
  "website": "https://smoketest.example.com",
  "phone": "(555) 123-4567",
  "email": "smoketest@example.com"
}
EOF
)

test_endpoint \
  "POST /api/businesses (create)" \
  "POST" \
  "$API_BASE_PATH/businesses" \
  "$business_data" \
  "201"

# Extract business_id from response for subsequent tests
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_TOKEN:-local-dev-token}" \
  -d "$business_data" \
  "$API_URL$API_BASE_PATH/businesses")

business_id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$business_id" ]; then
  log_warning "Could not extract business_id from response, skipping business-specific tests"
else
  echo "Found business_id: $business_id"
  echo ""

  # Get specific business
  test_endpoint \
    "GET /api/businesses/{id}" \
    "GET" \
    "$API_BASE_PATH/businesses/$business_id" \
    "" \
    "200"

  # Get questionnaire
  test_endpoint \
    "GET /api/businesses/{id}/questionnaire" \
    "GET" \
    "$API_BASE_PATH/businesses/$business_id/questionnaire" \
    "" \
    "200"

  # Update questionnaire
  questionnaire_data=$(cat <<EOF
{
  "data": {
    "identity": {
      "businessName": "Updated Test Business"
    }
  }
}
EOF
)

  test_endpoint \
    "PUT /api/businesses/{id}/questionnaire" \
    "PUT" \
    "$API_BASE_PATH/businesses/$business_id/questionnaire" \
    "$questionnaire_data" \
    "200"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

################################################################################
# Summary
################################################################################

total=$((TESTS_PASSED + TESTS_FAILED))
pass_rate=$((TESTS_PASSED * 100 / total))

echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:  $total"
echo "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Pass Rate: ${pass_rate}%"
echo ""

# Print test results
echo "Test Results:"
for result in "${TEST_RESULTS[@]}"; do
  echo "  $result"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TESTS_FAILED -gt 0 ]; then
  echo ""
  log_error "Smoke tests FAILED"
  exit 1
else
  echo ""
  log_info "All smoke tests PASSED ✓"
  exit 0
fi
