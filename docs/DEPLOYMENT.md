# MarketBrewer SEO Platform — Deployment Runbook v1.0.0

**Last Updated:** December 17, 2025  
**Status:** Ready for Production  
**Target:** EC2 Ubuntu 22.04 LTS  
**Version:** v1.0.0-stable

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [EC2 Setup](#ec2-setup)
3. [Application Deployment](#application-deployment)
4. [Database Setup](#database-setup)
5. [Verification & Smoke Tests](#verification--smoke-tests)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedure](#rollback-procedure)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

- [ ] AWS account access confirmed
- [ ] EC2 key pair created and saved locally
- [ ] Security groups defined (SSH, HTTP, HTTPS)
- [ ] DNS/domain configured (if applicable)
- [ ] Backup strategy documented
- [ ] Monitoring/alerting configured
- [ ] v1.0.0 tag created in GitHub
- [ ] Release notes reviewed
- [ ] Staging environment tested

**Estimated Duration:** 30-45 minutes

---

## Quick Commands

These are the safest, copy-paste commands to validate, release, and deploy.

### Local verification

```bash
# Types, tests, and production build
npm run typecheck
npm run test:ci
npm run build:prod

# Optional: lint locally (may require ESLint install)
# npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
# npm run lint
```

### Release (tag already created)

```bash
# Push tag (already pushed by automation)
git push origin v1.0.0-pre

# Draft GitHub Release using the tag
# Paste notes from docs/RELEASES/v1.0.0-pre.md
open "https://github.com/dmv7zero3/marketbrewer-seo-platform/releases/new?tag=v1.0.0-pre&target=main"
```

### CloudFormation (validate first)

```bash
# Validate template structure (no changes applied)
aws cloudformation validate-template \
  --template-body file://infrastructure/cloudformation.yaml

# Deploy stack (non-destructive on first run)
aws cloudformation deploy \
  --template-file infrastructure/cloudformation.yaml \
  --stack-name marketbrewer \
  --parameter-overrides \
    EnvironmentName=production \
    InstanceType=t3.large \
    KeyPairName=marketbrewer \
    EnableAutoStop=true
```

### Post-deploy checks

```bash
# Health
curl http://<EC2-IP>:3001/health | jq '.'

# SNS alert confirmation (check email)
# CloudWatch dashboard: MarketBrewerOverview
open "https://console.aws.amazon.com/cloudwatch/home#dashboards:"
```

---

## EC2 Setup

### 1. Launch EC2 Instance

```bash
# AWS CLI command (replace with your values)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name marketbrewer-key \
  --security-groups marketbrewer-sg \
  --region us-east-1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=marketbrewer-seo-prod},{Key=Environment,Value=production}]'
```

**Instance Specs:**

- **AMI:** Ubuntu 22.04 LTS (ami-0c55b159cbfafe1f0)
- **Instance Type:** t3.medium (2 vCPU, 4GB RAM)
  - Upgradeable to t3.large (2 vCPU, 8GB RAM) if needed
- **Storage:** 50GB EBS (gp3)
  - Upgrade to 100GB if storing multiple Ollama models
- **Network:** Public subnet with Elastic IP
- **Key Pair:** marketbrewer-key (save .pem file securely)

### 2. Configure Security Group

**Inbound Rules:**

| Port  | Protocol | Source         | Purpose                            |
| ----- | -------- | -------------- | ---------------------------------- |
| 22    | TCP      | Your IP        | SSH admin access                   |
| 80    | TCP      | 0.0.0.0/0      | HTTP (optional, redirect to HTTPS) |
| 443   | TCP      | 0.0.0.0/0      | HTTPS (if using SSL)               |
| 3001  | TCP      | Your IP only   | API server (not public)            |
| 11434 | TCP      | localhost only | Ollama (internal only)             |

**Outbound Rules:**

- All traffic allowed (for package downloads)

### 3. Connect to Instance

```bash
# SSH into instance
ssh -i ~/marketbrewer-key.pem ubuntu@<public-ip>

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install required tools
sudo apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  supervisor \
  htop \
  jq
```

### 4. Install Node.js

```bash
# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x
```

### 5. Install Ollama

```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull llama3.2 model (takes ~10 minutes on first pull)
ollama pull llama3.2

# Verify Ollama is running
curl http://localhost:11434/api/tags | jq '.models[] | .name'
```

**⚠️ Important:** Ensure Ollama is running before starting the worker.

---

## Application Deployment

### 1. Clone Repository

```bash
# Clone repo
cd /var/www
sudo git clone https://github.com/dmv7zero3/marketbrewer-seo-platform.git
sudo chown -R ubuntu:ubuntu /var/www/marketbrewer-seo-platform

cd /var/www/marketbrewer-seo-platform
```

### 2. Install Dependencies

```bash
npm install

# Verify installs completed
npm list 2>/dev/null | head -20
```

### 3. Configure Environment

```bash
# Copy .env template
cp .env.example .env

# Edit for production
nano .env
```

**Key Changes for EC2:**

```bash
NODE_ENV=production
SERVER_HOST=0.0.0.0
SERVER_PORT=3001
DATABASE_PATH=/var/lib/marketbrewer/seo-platform.db
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
LOG_LEVEL=warn
ENABLE_REQUEST_LOGGING=true
```

### 4. Create Data Directory

```bash
# Create persistent data directory
sudo mkdir -p /var/lib/marketbrewer/backups
sudo chown ubuntu:ubuntu /var/lib/marketbrewer
sudo chown ubuntu:ubuntu /var/lib/marketbrewer/backups

# Initialize empty database (migrations run automatically)
touch /var/lib/marketbrewer/seo-platform.db
```

### 5. Seed Database (Optional)

```bash
# For production with test data
npm run seed:nash-smashed

# For production without test data, skip this step
```

### 6. Build for Production

```bash
npm run build:all

# Verify build completed
ls -la packages/server/dist/
ls -la packages/dashboard/dist/
```

---

## Database Setup

### 1. Initialize Database

```bash
# Run migrations automatically on first server start
npm run server

# Let it run for 5 seconds to initialize, then Ctrl+C
# Check database exists:
ls -la /var/lib/marketbrewer/seo-platform.db
```

### 2. Backup Strategy

```bash
# Create backup directory
mkdir -p /var/lib/marketbrewer/backups

# Create backup script
cat > /usr/local/bin/backup-marketbrewer.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/lib/marketbrewer/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /var/lib/marketbrewer/seo-platform.db $BACKUP_DIR/seo-platform.db.$TIMESTAMP.backup
echo "Backup created: seo-platform.db.$TIMESTAMP.backup"
# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-marketbrewer.sh

# Schedule daily backups (cron)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-marketbrewer.sh") | crontab -
```

---

## Systemd Service Files

### 1. API Server Service

```bash
# Already exists in repo: systemd/seo-api.service
sudo cp /var/www/marketbrewer-seo-platform/systemd/seo-api.service /etc/systemd/system/

# Edit if needed
sudo nano /etc/systemd/system/seo-api.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable seo-api
sudo systemctl start seo-api

# Verify
sudo systemctl status seo-api
```

### 2. Worker Service

```bash
# Already exists in repo: systemd/seo-worker.service
sudo cp /var/www/marketbrewer-seo-platform/systemd/seo-worker.service /etc/systemd/system/

# Edit if needed
sudo nano /etc/systemd/system/seo-worker.service

# Enable and start (start after API server)
sudo systemctl daemon-reload
sudo systemctl enable seo-worker
sudo systemctl start seo-worker

# Verify
sudo systemctl status seo-worker
```

### 3. Check Service Logs

```bash
# API server logs
sudo journalctl -u seo-api -f

# Worker logs
sudo journalctl -u seo-worker -f

# System logs
tail -f /var/log/syslog | grep marketbrewer
```

---

## Verification & Smoke Tests

### 1. Verify Services are Running

```bash
# Check API server
curl http://localhost:3001/health | jq '.'

# Check worker
sudo systemctl is-active seo-worker

# Check Ollama
curl http://localhost:11434/api/tags | jq '.models[] | .name'
```

**Expected Output:**

```json
{
  "status": "healthy",
  "uptime": "5.2s",
  "version": "1.0.0"
}
```

### 2. Test Business CRUD

```bash
# Create business
curl -X POST http://localhost:3001/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Business",
    "industry": "Restaurant",
    "website": "https://test.com",
    "phone": "(555) 123-4567",
    "email": "contact@test.com"
  }' | jq '.'

# List businesses
curl http://localhost:3001/businesses | jq '.businesses[0]'

# Get specific business
curl http://localhost:3001/businesses/{business_id} | jq '.business'
```

### 3. Test Dashboard Access

```bash
# Build dashboard for production
npm run build:dashboard

# Serve dashboard (production build)
# Dashboard should be served via:
# - Nginx (recommended)
# - Apache
# - Node.js static server

# Test from local machine (replace <public-ip>):
# Open browser: http://<public-ip>:3000
# (Requires reverse proxy setup)
```

### 4. Load Test

```bash
# Install Apache Bench
sudo apt-get install -y apache2-utils

# Test API endpoint with 10 concurrent users, 100 requests each
ab -n 100 -c 10 http://localhost:3001/health

# Expected: 100% success rate, < 100ms avg response time
```

### 5. Test Ollama Integration

```bash
# Create a job to test LLM generation
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "{business_id}",
    "page_type": "location-keyword"  // Store cities × keywords
  }' | jq '.job'

# Check job status (should move from pending → processing → completed)
curl http://localhost:3001/jobs/{business_id}/{job_id} | jq '.job.status'
```

---

## Monitoring & Maintenance

### 1. System Monitoring

```bash
# Monitor in real-time
htop

# Check disk space
df -h

# Check API server memory
ps aux | grep node
```

### 2. Log Rotation

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/marketbrewer << 'EOF'
/var/log/marketbrewer/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 ubuntu ubuntu
  sharedscripts
}
EOF

sudo logrotate /etc/logrotate.d/marketbrewer
```

### 3. Health Checks

```bash
# Create health check script
cat > /usr/local/bin/check-marketbrewer.sh << 'EOF'
#!/bin/bash
API_HEALTH=$(curl -s http://localhost:3001/health | jq '.status')
OLLAMA_STATUS=$(curl -s http://localhost:11434/api/tags | jq '.models | length')

if [ "$API_HEALTH" != '"healthy"' ]; then
  echo "ERROR: API server unhealthy"
  systemctl restart seo-api
fi

if [ "$OLLAMA_STATUS" -eq 0 ]; then
  echo "ERROR: Ollama has no models"
  systemctl restart ollama
fi

echo "Health check passed: API=$API_HEALTH, Ollama models=$OLLAMA_STATUS"
EOF

chmod +x /usr/local/bin/check-marketbrewer.sh

# Schedule health checks (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-marketbrewer.sh") | crontab -
```

---

## Rollback Procedure

### If Something Goes Wrong

```bash
# 1. Stop services
sudo systemctl stop seo-api seo-worker

# 2. Check git status
cd /var/www/marketbrewer-seo-platform
git log --oneline -5

# 3. Revert to known good state
git checkout v1.0.0

# 4. Reinstall dependencies
npm install

# 5. Rebuild
npm run build:all

# 6. Restart services
sudo systemctl start seo-api
sudo systemctl start seo-worker

# 7. Verify
curl http://localhost:3001/health
```

### Database Rollback

```bash
# If database is corrupted, restore from backup
cp /var/lib/marketbrewer/backups/seo-platform.db.{timestamp}.backup \
   /var/lib/marketbrewer/seo-platform.db

# Restart API server
sudo systemctl restart seo-api
```

---

## Troubleshooting

### Common Issues

| Issue                         | Cause                  | Solution                          |
| ----------------------------- | ---------------------- | --------------------------------- |
| **API won't start**           | Port 3001 in use       | `lsof -i :3001` then kill process |
| **Worker can't reach Ollama** | Ollama not running     | `sudo systemctl restart ollama`   |
| **Database locked**           | Concurrent writes      | Restart API server and worker     |
| **High memory usage**         | Ollama model too large | Switch to smaller model           |
| **Slow LLM generation**       | Insufficient RAM       | Upgrade EC2 to t3.large           |

### View Detailed Logs

```bash
# API server errors
sudo journalctl -u seo-api -n 50 --no-pager

# Worker errors
sudo journalctl -u seo-worker -n 50 --no-pager

# System errors
sudo journalctl -xe | grep -i marketbrewer

# Application logs (if configured)
tail -f /var/log/marketbrewer/api.log
tail -f /var/log/marketbrewer/worker.log
```

### Emergency Restart

```bash
# Nuclear option: restart everything
sudo systemctl restart seo-api seo-worker ollama

# Wait for services to stabilize
sleep 10

# Check status
systemctl status seo-api seo-worker ollama
```

---

## Estimated Deployment Time

| Step                   | Duration    |
| ---------------------- | ----------- |
| EC2 setup + Node.js    | 5 min       |
| Ollama install + model | 15 min      |
| App deployment         | 3 min       |
| Database setup         | 2 min       |
| Smoke tests            | 5 min       |
| **Total**              | **~30 min** |

---

## Post-Deployment

- [ ] Verify API responding at http://instance-ip:3001/health
- [ ] Verify dashboard loads (if reverse proxy configured)
- [ ] Test add business workflow
- [ ] Test job creation (LLM generation)
- [ ] Check logs for errors
- [ ] Confirm daily backups running
- [ ] Document actual instance IP and credentials
- [ ] Set up monitoring/alerts

---

## Support & Rollback

**If deployment fails:**

1. Halt and investigate in staging
2. Create GitHub issue with logs
3. Rollback to v0.9.x (if needed)
4. Do not force-deploy until root cause identified

**Next steps after v1.0.0:**

- Monitor production for 24 hours
- Collect performance metrics
- Plan Phase 2 features
- Schedule post-mortem if any issues

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2025  
**Deployment Status:** ✅ Ready
