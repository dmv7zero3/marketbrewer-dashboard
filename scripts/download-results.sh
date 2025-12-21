#!/bin/bash
# MarketBrewer EC2 Results Download Script
# Downloads the completed database from EC2

set -e

EC2_USER="ubuntu"
EC2_HOST="${1:-}"
KEY_FILE="${2:-~/.ssh/marketbrewer-gpu.pem}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="/home/ubuntu/marketbrewer"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d-%H%M%S)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ -z "$EC2_HOST" ]; then
    echo "Usage: $0 <ec2-public-ip-or-dns> [key-file]"
    exit 1
fi

SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SSH_CMD="ssh $SSH_OPTS $EC2_USER@$EC2_HOST"
SCP_CMD="scp $SSH_OPTS"

print_status "Checking job status on EC2..."
$SSH_CMD "$REMOTE_DIR/check-progress.sh" || true

print_status "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

print_status "Backing up current local database..."
cp "$PROJECT_DIR/packages/server/data/seo-platform.db" "$BACKUP_DIR/seo-platform-local-backup.db"

print_status "Downloading completed database from EC2..."
$SCP_CMD "$EC2_USER@$EC2_HOST:$REMOTE_DIR/packages/server/data/seo-platform.db" \
    "$BACKUP_DIR/seo-platform-ec2.db"

print_status "Downloading worker log..."
$SCP_CMD "$EC2_USER@$EC2_HOST:/home/ubuntu/worker.log" \
    "$BACKUP_DIR/worker.log" 2>/dev/null || print_warning "Worker log not found"

print_status "Downloading server log..."
$SCP_CMD "$EC2_USER@$EC2_HOST:/home/ubuntu/server.log" \
    "$BACKUP_DIR/server.log" 2>/dev/null || print_warning "Server log not found"

print_status "Verifying downloaded database..."
COMPLETED=$(sqlite3 "$BACKUP_DIR/seo-platform-ec2.db" "SELECT COUNT(*) FROM job_pages WHERE status='completed'")
FAILED=$(sqlite3 "$BACKUP_DIR/seo-platform-ec2.db" "SELECT COUNT(*) FROM job_pages WHERE status='failed'")
QUEUED=$(sqlite3 "$BACKUP_DIR/seo-platform-ec2.db" "SELECT COUNT(*) FROM job_pages WHERE status='queued'")

echo ""
echo "=========================================="
echo "  Download Complete"
echo "=========================================="
echo ""
echo "Database stats:"
echo "  Completed: $COMPLETED pages"
echo "  Failed: $FAILED pages"
echo "  Queued: $QUEUED pages"
echo ""
echo "Files saved to: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
echo ""

if [ "$QUEUED" -eq 0 ] && [ "$FAILED" -eq 0 ]; then
    print_status "All pages completed successfully!"
    echo ""
    read -p "Replace local database with EC2 database? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$BACKUP_DIR/seo-platform-ec2.db" "$PROJECT_DIR/packages/server/data/seo-platform.db"
        print_status "Local database updated!"
    fi
else
    print_warning "Job not fully complete. Review logs before replacing local database."
fi

echo ""
print_status "Don't forget to terminate the EC2 instance to avoid charges!"
echo "  aws ec2 terminate-instances --instance-ids <instance-id>"
