#!/bin/bash

################################################################################
# MarketBrewer SEO Platform — Load Testing
# Tests API performance with concurrent requests
# Requires: Apache Bench (ab) or wrk
# Usage: ./load-test.sh [local|staging|prod] [num_requests] [concurrency]
################################################################################

set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-local}"
NUM_REQUESTS="${2:-100}"
CONCURRENCY="${3:-10}"

case "$ENVIRONMENT" in
  local)
    API_URL="http://localhost:3001"
    ;;
  staging)
    API_URL="http://staging.marketbrewer.com:3001"
    ;;
  prod)
    API_URL="http://prod.marketbrewer.com:3001"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: ./load-test.sh [local|staging|prod] [num_requests] [concurrency]"
    exit 1
    ;;
esac

log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo "⚡ Load Testing Suite"
echo "Environment: $ENVIRONMENT"
echo "API URL: $API_URL"
echo "Requests: $NUM_REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for Apache Bench
if ! command -v ab &> /dev/null; then
  log_error "Apache Bench (ab) is required but not installed"
  echo "Install with:"
  echo "  macOS: brew install httpd"
  echo "  Ubuntu: sudo apt-get install apache2-utils"
  exit 1
fi

log_info "Apache Bench found"
echo ""

# Verify API is running
echo "Verifying API server..."
if ! curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  log_error "API server not accessible at $API_URL"
  exit 1
fi
log_info "API server is accessible"
echo ""

################################################################################
# Load Tests
################################################################################

echo "Running load tests..."
echo ""

# Test 1: Health check endpoint (simple, fast)
echo "Test 1: GET /health (baseline)"
ab -n "$NUM_REQUESTS" -c "$CONCURRENCY" -q "$API_URL/health" 2>&1 | \
  awk '
    /Requests per second/ { print "  Throughput: " $NF " req/s" }
    /Time per request.*mean/ { print "  Avg Response: " $NF " ms" }
    /Failed requests/ { 
      if ($NF > 0) print "  ⚠️  Failed: " $NF
      else print "  ✓ No failures"
    }
  '
echo ""

# Test 2: List businesses (more complex)
echo "Test 2: GET /businesses (medium complexity)"
ab -n "$NUM_REQUESTS" -c "$CONCURRENCY" -q "$API_URL/businesses" 2>&1 | \
  awk '
    /Requests per second/ { print "  Throughput: " $NF " req/s" }
    /Time per request.*mean/ { print "  Avg Response: " $NF " ms" }
    /Failed requests/ { 
      if ($NF > 0) print "  ⚠️  Failed: " $NF
      else print "  ✓ No failures"
    }
  '
echo ""

# Test 3: Create business (POST, most complex)
echo "Test 3: POST /businesses (high complexity)"

# Create test data
business_data=$(cat <<EOF
{
  "name": "Load Test Business",
  "industry": "Restaurant",
  "website": "https://test.example.com",
  "phone": "(555) 123-4567",
  "email": "test@example.com"
}
EOF
)

# Use curl with concurrency simulation for POST
echo "  Running $NUM_REQUESTS POST requests with $CONCURRENCY concurrency..."
total_time=0
success=0
failed=0

for i in $(seq 1 "$NUM_REQUESTS"); do
  # Run requests in background for concurrency
  if [ $((i % CONCURRENCY)) -eq 0 ] || [ $i -eq "$NUM_REQUESTS" ]; then
    wait
  fi
  
  {
    start=$(date +%s%N | cut -b1-13)
    response=$(curl -s -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$business_data" \
      "$API_URL/businesses")
    end=$(date +%s%N | cut -b1-13)
    
    http_code="${response: -3}"
    elapsed=$((end - start))
    
    if [ "$http_code" == "201" ]; then
      success=$((success + 1))
    else
      failed=$((failed + 1))
    fi
    
    total_time=$((total_time + elapsed))
  } &
done

wait

success_rate=$((success * 100 / NUM_REQUESTS))
avg_time=$((total_time / NUM_REQUESTS))

echo "  Success: $success/$NUM_REQUESTS ($success_rate%)"
echo "  Failed: $failed"
echo "  Avg Response: ${avg_time}ms"
echo ""

################################################################################
# Performance Analysis
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get current system stats
echo "System Information:"
if [ "$(uname)" == "Darwin" ]; then
  # macOS
  memory=$(vm_stat | grep "Pages free" | awk '{print $3}')
  cpu_load=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{print $1}')
  echo "  Memory (free pages): $memory"
  echo "  CPU Load: $cpu_load"
else
  # Linux
  memory=$(free -h | grep "^Mem" | awk '{print $7}')
  cpu_load=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{print $1}')
  echo "  Memory (available): $memory"
  echo "  CPU Load: $cpu_load"
fi

# API Health after load test
echo ""
echo "Post-Load API Health:"
health=$(curl -s "$API_URL/health")
if echo "$health" | jq empty 2>/dev/null; then
  status=$(echo "$health" | jq -r '.status' 2>/dev/null)
  if [ "$status" == "healthy" ]; then
    log_info "API is healthy after load test"
  else
    log_warning "API status: $status"
  fi
else
  log_warning "Could not parse health response"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $failed -eq 0 ]; then
  log_info "Load test completed successfully"
  echo ""
  echo "✅ Recommendations:"
  echo "   - Performance is acceptable for small concurrent load"
  echo "   - Monitor database disk usage if load increases"
  echo "   - Consider database indexing for GET operations"
  echo "   - Scale to larger EC2 instance if needed (t3.large)"
  exit 0
else
  log_error "Load test had failures"
  echo ""
  echo "⚠️  Recommendations:"
  echo "   - Check API server logs for errors"
  echo "   - Verify database has sufficient disk space"
  echo "   - Review application performance"
  echo "   - Consider scaling up EC2 instance type"
  exit 1
fi
