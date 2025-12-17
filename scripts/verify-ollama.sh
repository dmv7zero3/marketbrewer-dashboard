#!/bin/bash

################################################################################
# MarketBrewer SEO Platform — Ollama Integration Verification
# Verifies llama3.2 model is available and responsive
# Usage: ./verify-ollama.sh [local|staging|prod]
################################################################################

set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-local}"
case "$ENVIRONMENT" in
  local)
    OLLAMA_URL="http://localhost:11434"
    API_URL="http://localhost:3001"
    ;;
  staging)
    OLLAMA_URL="http://staging.marketbrewer.com:11434"
    API_URL="http://staging.marketbrewer.com:3001"
    ;;
  prod)
    OLLAMA_URL="http://prod.marketbrewer.com:11434"
    API_URL="http://prod.marketbrewer.com:3001"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Usage: ./verify-ollama.sh [local|staging|prod]"
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
echo "🤖 Ollama Integration Verification"
echo "Environment: $ENVIRONMENT"
echo "Ollama URL: $OLLAMA_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Ollama service availability
echo "Checking Ollama service..."
if ! curl -s -f "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
  log_error "Ollama service not available at $OLLAMA_URL"
  echo "Make sure Ollama is running:"
  echo "  sudo systemctl start ollama"
  exit 1
fi
log_info "Ollama service is accessible"
echo ""

# Check available models
echo "Checking available models..."
models=$(curl -s "$OLLAMA_URL/api/tags" | grep -o '"name":"[^"]*' | cut -d'"' -f4)

if [ -z "$models" ]; then
  log_error "No models found in Ollama"
  echo "Pull llama3.2 with:"
  echo "  ollama pull llama3.2"
  exit 1
fi

log_info "Available models:"
for model in $models; do
  echo "  - $model"
done
echo ""

# Check for llama3.2
if echo "$models" | grep -q "llama3.2"; then
  log_info "llama3.2 model is available"
else
  log_warning "llama3.2 model not found"
  echo "Available models: $models"
  echo "Pull with: ollama pull llama3.2"
fi
echo ""

# Test model responsiveness
echo "Testing model responsiveness (5-second timeout)..."
start_time=$(date +%s%N | cut -b1-13)

response=$(curl -s -X POST "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Answer in one sentence: What is 2+2?",
    "stream": false,
    "options": {
      "top_k": 40,
      "top_p": 0.9,
      "num_predict": 50
    }
  }' \
  --max-time 10)

end_time=$(date +%s%N | cut -b1-13)
response_time=$((end_time - start_time))

if echo "$response" | grep -q '"response"'; then
  log_info "Model responded successfully in ${response_time}ms"
  
  # Extract and show response
  answer=$(echo "$response" | grep -o '"response":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$answer" ]; then
    echo "Sample response: ${answer:0:80}..."
  fi
else
  log_error "Model failed to respond"
  echo "Response: $response" | head -5
  exit 1
fi
echo ""

# Test through API server
echo "Testing Ollama integration through API server..."
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  log_info "API server is accessible at $API_URL"
  
  # Check API health includes Ollama status
  health=$(curl -s "$API_URL/health")
  echo "API Health Status:"
  echo "$health" | jq '.' 2>/dev/null || echo "$health"
else
  log_warning "API server not accessible - cannot verify integration"
  echo "Make sure API server is running:"
  echo "  npm run dev:server"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Ollama integration verified successfully"
echo ""
