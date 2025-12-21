#!/bin/bash
# MarketBrewer EC2 Deployment Script
# Deploys the project to an EC2 instance and starts the generation job

set -e

# Configuration
EC2_USER="ubuntu"
EC2_HOST="${1:-}"
KEY_FILE="${2:-~/.ssh/marketbrewer-gpu.pem}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="/home/ubuntu/marketbrewer"
JOB_ID="cda5ebdd-8f12-43b9-89c2-54dc2d61f99a"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ -z "$EC2_HOST" ]; then
    echo "Usage: $0 <ec2-public-ip-or-dns> [key-file]"
    echo "Example: $0 ec2-xx-xx-xx-xx.compute-1.amazonaws.com ~/.ssh/marketbrewer-gpu.pem"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    print_error "Key file not found: $KEY_FILE"
    exit 1
fi

chmod 400 "$KEY_FILE"

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH_CMD="ssh $SSH_OPTS $EC2_USER@$EC2_HOST"
SCP_CMD="scp $SSH_OPTS"

print_status "Waiting for instance to be ready..."
until $SSH_CMD "test -f /home/ubuntu/.bootstrap-complete" 2>/dev/null; do
    echo "  Waiting for bootstrap to complete..."
    sleep 10
done
print_status "Instance bootstrap complete!"

print_status "Checking GPU availability..."
$SSH_CMD "nvidia-smi" || print_warning "GPU check failed - may still be initializing"

print_status "Checking Ollama status..."
$SSH_CMD "curl -s http://localhost:11434/api/tags | head -c 200"

print_status "Creating remote directories..."
$SSH_CMD "mkdir -p $REMOTE_DIR/{packages,scripts}"

print_status "Syncing project files..."

# Sync shared package
rsync -avz --progress -e "ssh $SSH_OPTS" \
    "$PROJECT_DIR/packages/shared/" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/shared/"

# Sync server package (excluding node_modules)
rsync -avz --progress -e "ssh $SSH_OPTS" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    "$PROJECT_DIR/packages/server/" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/server/"

# Sync worker package (excluding node_modules)
rsync -avz --progress -e "ssh $SSH_OPTS" \
    --exclude 'node_modules' \
    --exclude 'dist' \
    "$PROJECT_DIR/packages/worker/" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/worker/"

# Sync root config files
$SCP_CMD "$PROJECT_DIR/package.json" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
$SCP_CMD "$PROJECT_DIR/package-lock.json" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/" 2>/dev/null || true
$SCP_CMD "$PROJECT_DIR/tsconfig.json" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

print_status "Copying SQLite database..."
$SCP_CMD "$PROJECT_DIR/packages/server/data/seo-platform.db" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/server/data/"

# Also copy WAL files if they exist
$SCP_CMD "$PROJECT_DIR/packages/server/data/seo-platform.db-wal" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/server/data/" 2>/dev/null || true
$SCP_CMD "$PROJECT_DIR/packages/server/data/seo-platform.db-shm" \
    "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/server/data/" 2>/dev/null || true

print_status "Installing dependencies on EC2..."
$SSH_CMD "cd $REMOTE_DIR && npm install --legacy-peer-deps"

print_status "Creating environment file..."
$SSH_CMD "cat > $REMOTE_DIR/.env << 'EOF'
API_TOKEN=local-dev-token
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
NODE_ENV=production
EOF"

print_status "Creating start script..."
$SSH_CMD "cat > $REMOTE_DIR/start-generation.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/marketbrewer

# Source environment
export API_TOKEN=local-dev-token
export OLLAMA_URL=http://localhost:11434
export OLLAMA_MODEL=llama3.2:latest
export JOB_ID=$JOB_ID
export WORKER_ID=ec2-gpu-worker

# Start server in background
echo 'Starting server...'
cd packages/server
nohup npx ts-node src/index.ts > /home/ubuntu/server.log 2>&1 &
SERVER_PID=\$!
echo \"Server PID: \$SERVER_PID\"

# Wait for server to be ready
sleep 5
until curl -s http://localhost:3001/api/health > /dev/null 2>&1; do
    echo 'Waiting for server...'
    sleep 2
done
echo 'Server is ready!'

# Check job status
echo 'Job status:'
curl -s -H \"Authorization: Bearer local-dev-token\" \
    http://localhost:3001/api/businesses/street-lawyer-magic/jobs | python3 -m json.tool

# Start worker
echo 'Starting worker...'
cd /home/ubuntu/marketbrewer/packages/worker
JOB_ID=$JOB_ID API_TOKEN=local-dev-token npx ts-node src/index.ts 2>&1 | tee /home/ubuntu/worker.log
EOF"

$SSH_CMD "chmod +x $REMOTE_DIR/start-generation.sh"

print_status "Creating monitoring script..."
$SSH_CMD "cat > $REMOTE_DIR/check-progress.sh << 'EOF'
#!/bin/bash
curl -s -H \"Authorization: Bearer local-dev-token\" \
    http://localhost:3001/api/businesses/street-lawyer-magic/jobs | python3 -c \"
import json,sys
d=json.load(sys.stdin)
jobs=d.get('jobs',[])
if jobs:
    j=jobs[0]
    total=j.get('total_pages',0)
    done=j.get('completed_pages',0)
    failed=j.get('failed_pages',0)
    pct=done/total*100 if total else 0
    print(f'Progress: {done}/{total} ({pct:.1f}%)')
    print(f'Failed: {failed}')
    print(f'Remaining: {total-done-failed}')
\"
EOF"
$SSH_CMD "chmod +x $REMOTE_DIR/check-progress.sh"

print_status "Deployment complete!"
echo ""
echo "=========================================="
echo "  MarketBrewer EC2 Deployment Ready"
echo "=========================================="
echo ""
echo "To start generation:"
echo "  ssh $SSH_OPTS $EC2_USER@$EC2_HOST"
echo "  cd /home/ubuntu/marketbrewer"
echo "  ./start-generation.sh"
echo ""
echo "To monitor progress:"
echo "  ssh $SSH_OPTS $EC2_USER@$EC2_HOST '/home/ubuntu/marketbrewer/check-progress.sh'"
echo ""
echo "To watch GPU usage:"
echo "  ssh $SSH_OPTS $EC2_USER@$EC2_HOST 'watch -n 5 nvidia-smi'"
echo ""
echo "To tail worker logs:"
echo "  ssh $SSH_OPTS $EC2_USER@$EC2_HOST 'tail -f /home/ubuntu/worker.log'"
echo ""
