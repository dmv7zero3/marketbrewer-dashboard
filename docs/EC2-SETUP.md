# EC2 Deployment Guide for MarketBrewer SEO Platform v1.0.0

**Status:** ✅ Production Ready  
**Last Updated:** December 17, 2025  
**Version:** 1.0.0-stable

---

## 30-Minute Quick Start

### Prerequisites

- AWS account with EC2 access
- Local: marketbrewer-seo-platform repo cloned
- Ability to generate/manage SSH keys

### Step 1: Launch Instance (2 minutes)

```bash
# AWS Console or CLI: Create EC2 instance
# - AMI: Ubuntu 22.04 LTS
# - Instance Type: t3.medium (2 vCPU, 4GB RAM)
# - Storage: 50GB gp3
# - Security Group: Open ports 22 (SSH), 3001 (API), 11434 (Ollama internal)
# - Key Pair: Create & save locally as marketbrewer-key.pem
```

**From AWS CLI:**

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name marketbrewer-key \
  --region us-east-1 \
  --security-groups marketbrewer-sg
```

### Step 2: Configure Server (10 minutes)

```bash
# SSH into instance
ssh -i ~/.ssh/marketbrewer-key.pem ubuntu@<PUBLIC_IP>

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull model (takes ~10 minutes)
ollama pull llama3.2
```

### Step 3: Deploy Application (5 minutes)

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/dmv7zero3/marketbrewer-seo-platform.git
sudo chown -R ubuntu:ubuntu marketbrewer-seo-platform

# Install dependencies
cd marketbrewer-seo-platform
npm install

# Configure environment
cp .env.example .env
nano .env  # Update key values:
# NODE_ENV=production
# DATABASE_PATH=/var/lib/marketbrewer/seo-platform.db

# Build for production
npm run build:all

# Create data directory
sudo mkdir -p /var/lib/marketbrewer/backups
sudo chown -R ubuntu:ubuntu /var/lib/marketbrewer

# Start services via systemd
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable seo-api seo-worker
sudo systemctl start seo-api seo-worker
```

### Step 4: Verify (3 minutes)

```bash
# Check services
systemctl status seo-api seo-worker

# Test API
curl http://localhost:3001/health | jq '.'

# Check Ollama
curl http://localhost:11434/api/tags | jq '.models'

# View logs
sudo journalctl -u seo-api -f
```

---

## Detailed Configuration

### Environment Variables

**Critical (must configure):**

- `NODE_ENV=production`
- `DATABASE_PATH=/var/lib/marketbrewer/seo-platform.db`
- `CORS_ORIGINS=http://yourdomain.com` (dashboard domain)

**Optional (sensible defaults):**

- `SERVER_PORT=3001`
- `SERVER_HOST=0.0.0.0`
- `LOG_LEVEL=warn`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=llama3.2`

Full template: `.env.example`

### Directory Structure (EC2)

```
/var/www/
  └── marketbrewer-seo-platform/    (application code)
      ├── packages/
      ├── systemd/
      └── .env                      (config - KEEP SECRET)

/var/lib/marketbrewer/
  ├── seo-platform.db               (SQLite database)
  └── backups/                      (daily backups)
      └── seo-platform.db.*.backup
```

### Systemd Services

**API Server (`seo-api.service`):**

- Starts Node.js API server on port 3001
- Automatically restarts on failure
- Logs to systemd journal

**Worker (`seo-worker.service`):**

- Depends on: API server, Ollama
- Polls for jobs every 5 seconds
- Processes up to 2 jobs concurrently

**Commands:**

```bash
sudo systemctl start seo-api         # Start
sudo systemctl stop seo-api          # Stop
sudo systemctl restart seo-api       # Restart
sudo systemctl status seo-api        # Status
sudo journalctl -u seo-api -f        # Follow logs
sudo systemctl enable seo-api        # Auto-start on boot
```

---

## Post-Deployment Checklist

- [ ] Instance launched and accessible via SSH
- [ ] Node.js 18 installed (`node --version`)
- [ ] Ollama running (`curl http://localhost:11434/api/tags`)
- [ ] llama3.2 model available (`ollama list`)
- [ ] Application cloned to `/var/www/marketbrewer-seo-platform`
- [ ] Dependencies installed (`npm list 2>/dev/null | head`)
- [ ] Environment configured (`.env` file exists)
- [ ] Built for production (`npm run build:all` succeeded)
- [ ] Data directory created (`/var/lib/marketbrewer/`)
- [ ] Systemd services installed and enabled
- [ ] API responding at http://IP:3001/health
- [ ] Worker processing jobs (`sudo journalctl -u seo-worker`)
- [ ] Daily backups scheduled (cron job)
- [ ] Monitoring/alerting configured

---

## Monitoring & Operations

### Logs

```bash
# Follow API server logs (real-time)
sudo journalctl -u seo-api -f

# Follow worker logs
sudo journalctl -u seo-worker -f

# Last 50 lines
sudo journalctl -u seo-api -n 50 --no-pager

# Errors only
sudo journalctl -u seo-api --priority=err
```

### Health Checks

```bash
# API server
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","uptime":"123.456s","version":"1.0.0"}

# Ollama
curl http://localhost:11434/api/tags

# Database
ls -lh /var/lib/marketbrewer/seo-platform.db

# Disk usage
df -h /var/lib/marketbrewer
```

### Restarts

```bash
# Restart API only
sudo systemctl restart seo-api

# Restart both services
sudo systemctl restart seo-api seo-worker

# Emergency restart (kill -9)
sudo systemctl kill -9 seo-api
sudo systemctl restart seo-api
```

### Backups

```bash
# Manual backup
sudo -u ubuntu cp /var/lib/marketbrewer/seo-platform.db \
  /var/lib/marketbrewer/backups/seo-platform.db.$(date +%Y%m%d_%H%M%S).backup

# List backups
ls -lah /var/lib/marketbrewer/backups/

# Restore from backup
sudo systemctl stop seo-api seo-worker
sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{timestamp}.backup \
        /var/lib/marketbrewer/seo-platform.db
sudo systemctl start seo-api seo-worker
```

---

## Scaling

### Increase Resources

**If experiencing slow LLM generation:**

```bash
# Upgrade instance type (t3.medium → t3.large)
# 1. Stop instance
# 2. Change instance type in AWS Console
# 3. Start instance
# 4. Verify services still running
```

**If database is large (> 500MB):**

```bash
# Enable compression
# Increase backup storage
# Consider external database for Phase 2
```

### Load Balancing (Future)

For multiple instances, use:

- AWS Application Load Balancer (ALB) on port 80/443
- Point to multiple API server instances
- Shared database (RDS, not SQLite)
- Shared session store (Redis)

---

## Troubleshooting

| Symptom                   | Cause              | Fix                                         |
| ------------------------- | ------------------ | ------------------------------------------- |
| **API won't start**       | Port 3001 occupied | `lsof -i :3001` then kill process           |
| **Worker can't find API** | API not running    | `sudo systemctl restart seo-api`            |
| **Ollama timeout**        | Model not pulled   | `ollama pull llama3.2`                      |
| **Database locked**       | Concurrent access  | `sudo systemctl restart seo-api seo-worker` |
| **Slow LLM responses**    | Insufficient RAM   | Upgrade to t3.large                         |
| **Disk full**             | Database too large | Backup old records, clean up                |

### Emergency Recovery

```bash
# If services won't start
sudo systemctl stop seo-api seo-worker
sudo journalctl -u seo-api -n 100  # Check logs
npm run build:all                  # Rebuild
sudo systemctl start seo-api seo-worker

# If database corrupted
sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"
sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{latest}.backup \
        /var/lib/marketbrewer/seo-platform.db

# Full reset (WARNING: deletes all data)
sudo systemctl stop seo-api seo-worker
rm /var/lib/marketbrewer/seo-platform.db
npm run seed:nash-smashed          # Restore test data
sudo systemctl start seo-api seo-worker
```

---

## Security Best Practices

### SSH Access

```bash
# Restrict SSH key permissions
chmod 600 ~/.ssh/marketbrewer-key.pem

# Only allow your IP
# In AWS Security Group: SSH Source = YOUR_IP/32 (not 0.0.0.0/0)
```

### Application Security

```bash
# Change default tokens in .env
API_TOKEN=$(openssl rand -hex 32)  # Generate random token
REACT_APP_API_TOKEN=$API_TOKEN     # Use same token in dashboard

# Restrict API access to dashboard domain
CORS_ORIGINS=https://yourdomain.com
```

### Database Security

```bash
# Database is local (not exposed to network)
# Backup location is restricted to ubuntu user
# No credentials stored in database

# Regular backups (already automated)
ls -la /var/lib/marketbrewer/backups/
```

---

## Cost Optimization

### Instance Type

**t3.medium (recommended):**

- $0.0416/hour (~$30/month)
- Sufficient for 10-50 concurrent users
- Scales to t3.large if needed

**Cost Breakdown:**

- EC2: ~$30/month
- Storage (50GB): ~$5/month
- **Total: ~$35/month**

### Cost Controls

1. **Stop instance when not in use:**

   ```bash
   aws ec2 stop-instances --instance-ids i-xxxxxxxxx
   aws ec2 start-instances --instance-ids i-xxxxxxxxx
   ```

2. **Set up AWS billing alerts**

3. **Monitor data usage** (no data transfer between EC2 and Ollama)

---

## Backup & Restore

### Automated Daily Backups

Configured in `/etc/cron.d/marketbrewer-backup`:

```
0 2 * * * ubuntu /usr/local/bin/backup-marketbrewer.sh
```

Retains last 7 days of backups.

### Manual Backup

```bash
sudo -u ubuntu cp /var/lib/marketbrewer/seo-platform.db \
  /var/lib/marketbrewer/backups/seo-platform.db.manual.$(date +%Y%m%d).backup
```

### Restore from Backup

```bash
# Stop services
sudo systemctl stop seo-api seo-worker

# Restore
sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{DATE}.backup \
        /var/lib/marketbrewer/seo-platform.db

# Verify
sudo sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"

# Start
sudo systemctl start seo-api seo-worker
```

---

## Monitoring & Alerting (Optional)

### CloudWatch Integration

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure for MarketBrewer logs
# See AWS documentation for detailed setup
```

### Custom Alerts

Create CloudWatch alarms for:

- High CPU usage
- High disk usage (> 80%)
- API errors (HTTP 5xx)
- Backup failures
- Ollama model unavailable

---

## Support & Escalation

**For API Issues:**

- Check logs: `sudo journalctl -u seo-api -n 50`
- Review code: `packages/server/src/`
- Contact: Dev team

**For Database Issues:**

- See: `docs/DATABASE-MIGRATION.md`
- Verify schema: `sqlite3 .schema`
- Restore backup if corrupted

**For Ollama Issues:**

- Check model: `ollama list`
- Restart service: `sudo systemctl restart ollama`
- Pull model: `ollama pull llama3.2`

**For Operations Questions:**

- Review: `docs/DEPLOYMENT.md`
- Check runbook steps
- Contact: Ops team

---

## Next Steps

1. ✅ Create EC2 instance
2. ✅ Deploy application
3. ✅ Verify all systems
4. Monitor for 24 hours
5. Document any issues
6. Plan Phase 2 features

---

**EC2 Setup Guide v1.0**  
**Ready for Production**  
**December 17, 2025**
