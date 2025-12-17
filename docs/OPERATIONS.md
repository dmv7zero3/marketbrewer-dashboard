# MarketBrewer SEO Platform — Operations Runbook

**Version:** 1.0.0  
**Last Updated:** December 16, 2024  
**Owner:** Jorge Giraldez, MarketBrewer LLC  
**Contact:** j@marketbrewer.com | 703-463-6323

---

## Quick Start

### Daily Operations

```bash
# Check system health
npm run health:check

# View API logs
tail -f /var/log/seo-api.log

# View worker logs
tail -f /var/log/seo-worker.log

# Check database
sqlite3 /var/lib/marketbrewer/database.db "SELECT COUNT(*) as pages FROM pages;"

# Monitor CloudWatch dashboard
# AWS Console → CloudWatch → Dashboards → MarketBrewerOverview
```

### Emergency Contacts

- **Primary:** Jorge Giraldez (703-463-6323)
- **Email:** j@marketbrewer.com
- **Escalation:** AWS Support (for infrastructure issues)

---

## System Architecture

### Components

1. **API Server** (Express.js)

   - Port: 3001
   - Process: systemd `seo-api.service`
   - Database: SQLite at `/var/lib/marketbrewer/database.db`
   - Logs: `/var/log/seo-api.log`

2. **Worker** (Node.js + Ollama)

   - Process: systemd `seo-worker.service`
   - LLM: Ollama + llama3.2 model
   - Logs: `/var/log/seo-worker.log`
   - Queue: In-database queue (simple JSON storage)

3. **Dashboard** (React)

   - Port: 3002
   - Process: Served by Nginx reverse proxy
   - Build: Static files at `/var/www/marketbrewer-dashboard/`

4. **Ollama Service**
   - Port: 11434 (local only)
   - Model: llama3.2:latest (4GB cache)
   - Memory: 8GB total (shared with Node processes)

### Infrastructure

- **Instance:** AWS EC2 t3.large (2 vCPU, 8GB RAM)
- **Storage:** 50GB EBS volume (gp3)
- **Network:** Elastic IP (static public address)
- **Region:** us-east-1
- **Security Groups:** SSH (22), API (3001), Dashboard (3002)

---

## Monitoring & Alerting

### Key Metrics

| Metric                  | Target    | Alert Threshold  | Check            |
| ----------------------- | --------- | ---------------- | ---------------- |
| CPU Utilization         | <50% avg  | >80% for 10 min  | CloudWatch       |
| Memory Utilization      | <60% avg  | >85% for 10 min  | CloudWatch Agent |
| Disk Space              | <70% used | >90% full        | CloudWatch Agent |
| API Response Time (p95) | <500ms    | >1000ms          | E2E tests        |
| API Error Rate          | <1%       | >5 errors/5 min  | Log metrics      |
| Worker Queue Depth      | <5 jobs   | >50 jobs pending | DB query         |
| Content Generation Time | 15-30s    | >60s             | Worker logs      |
| Monthly Costs           | $22.50    | >$30 estimated   | AWS Billing      |

### Alert Channels

All alerts go to SNS topic → Email to j@marketbrewer.com

### Dashboard Access

- **CloudWatch Dashboard:** AWS Console → CloudWatch → Dashboards → MarketBrewerOverview
- **Logs:** AWS Console → CloudWatch → Log Groups → `/marketbrewer/*`
- **Billing:** AWS Console → Billing → Bills → Current Month

---

## Common Operational Tasks

### 1. Check System Health

```bash
# SSH to instance
ssh -i ~/.aws/marketbrewer.pem ec2-user@<INSTANCE_IP>

# Check all services running
systemctl status seo-api seo-worker

# Verify processes
ps aux | grep "node\|ollama"

# Check disk space
df -h /var/lib/marketbrewer

# Check memory usage
free -h

# Network connectivity
curl http://localhost:3001/health
curl http://localhost:3002/

# Ollama model loaded
curl http://localhost:11434/api/tags
```

### 2. View Logs

#### API Logs

```bash
# Last 50 lines
tail -50 /var/log/seo-api.log

# Follow live
tail -f /var/log/seo-api.log

# Filter errors
grep ERROR /var/log/seo-api.log | tail -20

# Search by timestamp
grep "2024-12-16" /var/log/seo-api.log | tail -50
```

#### Worker Logs

```bash
# Monitor worker processing
tail -f /var/log/seo-worker.log

# Check for job failures
grep "ERROR\|FAILED" /var/log/seo-worker.log

# Count processed jobs
grep "completed" /var/log/seo-worker.log | wc -l
```

#### System Logs

```bash
# View system events
tail -f /var/log/syslog

# Check service restart events
journalctl -u seo-api -u seo-worker --since "1 hour ago"
```

### 3. Restart Services

```bash
# Restart API only
sudo systemctl restart seo-api

# Restart worker only
sudo systemctl restart seo-worker

# Restart both
sudo systemctl restart seo-api seo-worker

# Wait for services to start
sleep 5
systemctl status seo-api seo-worker

# Verify connectivity
curl http://localhost:3001/health
```

### 4. Manage Database

```bash
# Connect to database
sqlite3 /var/lib/marketbrewer/database.db

# Useful queries
sqlite> SELECT COUNT(*) as total_pages FROM pages;
sqlite> SELECT COUNT(*) as pending_jobs FROM generation_jobs WHERE status='queued';
sqlite> SELECT service_area_id, COUNT(*) as pages FROM pages GROUP BY service_area_id;
sqlite> SELECT * FROM generation_jobs ORDER BY created_at DESC LIMIT 10;

# Export data (backup)
sqlite3 /var/lib/marketbrewer/database.db ".dump" > database-backup.sql

# Check database integrity
sqlite3 /var/lib/marketbrewer/database.db "PRAGMA integrity_check;"

# Vacuum to optimize
sqlite3 /var/lib/marketbrewer/database.db "VACUUM;"
```

### 5. Manage Ollama Model

```bash
# Check loaded models
curl -s http://localhost:11434/api/tags | jq .

# Verify model is ready
curl -s http://localhost:11434/api/generate -d '{"model":"llama3.2","prompt":"test","stream":false}' | jq .

# Pull new model version (if needed)
ollama pull llama3.2:latest

# Check model memory usage
free -h  # Total system memory
ps aux | grep ollama  # Process memory
```

### 6. Monitor Performance

```bash
# Real-time system metrics
watch -n 1 'free -h && echo "---" && df -h /var/lib/marketbrewer'

# Top processes
top -b -n 1 | head -20

# Network connections
netstat -antp | grep ESTABLISHED

# API request rate (from logs)
tail -100 /var/log/seo-api.log | grep "GET\|POST" | wc -l
```

---

## Troubleshooting

### Issue: API Not Responding

**Symptoms:** `curl http://localhost:3001/health` returns error

**Diagnosis:**

```bash
# Check service status
systemctl status seo-api

# Check logs for errors
journalctl -u seo-api -n 50

# Check if port is in use
netstat -antp | grep 3001

# Check process count
ps aux | grep "seo-api" | wc -l
```

**Solutions:**

```bash
# Restart service
sudo systemctl restart seo-api

# Check logs for application errors
tail -50 /var/log/seo-api.log

# If database locked
rm /var/lib/marketbrewer/database.db-wal
rm /var/lib/marketbrewer/database.db-shm
sudo systemctl restart seo-api
```

### Issue: Worker Not Processing Jobs

**Symptoms:** Jobs stuck in "queued" status

**Diagnosis:**

```bash
# Check worker status
systemctl status seo-worker

# Check if worker is running
ps aux | grep "seo-worker"

# Check worker logs
tail -50 /var/log/seo-worker.log

# Check database for stuck jobs
sqlite3 /var/lib/marketbrewer/database.db \
  "SELECT id, status, created_at FROM generation_jobs WHERE status='processing' AND created_at < datetime('now', '-1 hour');"
```

**Solutions:**

```bash
# Restart worker
sudo systemctl restart seo-worker

# Manually reset stuck jobs
sqlite3 /var/lib/marketbrewer/database.db \
  "UPDATE generation_jobs SET status='queued' WHERE status='processing' AND created_at < datetime('now', '-1 hour');"

# Check Ollama is responsive
curl -s http://localhost:11434/api/tags | jq .

# Restart Ollama if needed
sudo systemctl restart ollama  # or manual restart
```

### Issue: High Memory Usage

**Symptoms:** `free -h` shows <500MB available

**Diagnosis:**

```bash
# Check memory usage by process
ps aux --sort=-%mem | head -10

# Check for memory leaks
watch -n 5 'ps aux --sort=-%mem | head -5'

# Check if Ollama model is loaded
curl -s http://localhost:11434/api/tags | jq '.models[].size'
```

**Solutions:**

```bash
# Restart consuming service
sudo systemctl restart seo-api
sudo systemctl restart seo-worker

# If still high, reboot instance
# (ensure auto-stop is configured first)
sudo reboot

# Check logs for memory issues
grep -i "memory\|oom\|heap" /var/log/seo-*.log
```

### Issue: Disk Space Low

**Symptoms:** `df -h` shows >90% usage

**Diagnosis:**

```bash
# Find large files
du -sh /* | sort -h | tail -10

# Check database size
ls -lh /var/lib/marketbrewer/database.db*

# Check logs size
du -sh /var/log/seo-*.log

# Find old logs
find /var/log -name "*.log*" -mtime +30
```

**Solutions:**

```bash
# Compress old logs
gzip /var/log/seo-api.log.1
gzip /var/log/seo-worker.log.1

# Delete logs older than 30 days
find /var/log -name "seo-*.log.*" -mtime +30 -delete

# Vacuum database (optimize)
sqlite3 /var/lib/marketbrewer/database.db "VACUUM;"

# Check CloudWatch logs can be deleted after 30 days (default retention)
```

### Issue: High CPU Usage

**Symptoms:** `top` shows >80% CPU utilization

**Diagnosis:**

```bash
# Which process is consuming CPU
top -b -n 1 | head -20

# Check if Ollama is running inference
curl -s http://localhost:11434/api/ps | jq .

# Check worker queue
sqlite3 /var/lib/marketbrewer/database.db \
  "SELECT COUNT(*) FROM generation_jobs WHERE status='processing';"
```

**Solutions:**

```bash
# This is normal during content generation (expected for 15-30 seconds)
# Check if it's sustained >90% for >5 minutes

# If sustained, may indicate infinite loop
sudo systemctl restart seo-worker

# Monitor for patterns
watch -n 1 'top -b -n 1 | grep -E "seo-api|ollama|seo-worker"'
```

---

## Maintenance Tasks

### Weekly

- [ ] Review CloudWatch metrics for trends
- [ ] Check error logs for new issues
- [ ] Verify all services are running
- [ ] Check disk usage (if >80%, clean up logs)
- [ ] Review AWS billing estimate

### Monthly

- [ ] Export database backup
- [ ] Review performance baseline vs actual
- [ ] Update dependencies (npm audit)
- [ ] Review and optimize slow queries
- [ ] Check CloudWatch alarms are functioning
- [ ] Test disaster recovery procedure

### Quarterly

- [ ] Major version upgrades (Node.js, npm)
- [ ] Security patches (OS, Docker images)
- [ ] Update documentation/runbooks
- [ ] Review architecture for scaling needs
- [ ] Audit costs and optimize

---

## Scaling & Performance Tuning

### Current Capacity (t3.large)

- **Pages/Month:** 1,300 (50 keywords × 26 service areas)
- **Concurrent Processing:** 1 job at a time (sequential)
- **Content Generation Time:** 15-30 seconds per page
- **Pages/Hour:** ~4 (assuming 25s avg per page)
- **Cost/Page:** $0.017 (monthly cost / 1,300 pages)

### Scaling Options (Future)

1. **Auto-scaling to t3.xlarge** (Phase 2)

   - 4 vCPU, 16GB RAM
   - Cost: ~$40/month (8h/day)
   - Benefit: 2x concurrent job processing (2 jobs in parallel)
   - Pages/Hour: 8 (2x capacity)

2. **Multiple instances with load balancing** (Phase 3)

   - 2-3 t3.large instances
   - Distributed job queue (SQS)
   - Shared database (RDS or Aurora)
   - Cost: $50-75/month (3 instances × $22.50)
   - Capacity: 100+ pages/day

3. **SPOT instances** (Phase 4)
   - Use SPOT for non-critical worker jobs
   - Cost savings: 70% cheaper than On-Demand
   - Risk: May be interrupted (for batch jobs only)

### Tuning Tips

```bash
# Optimize database queries
# 1. Add indexes for frequently queried columns
sqlite3 /var/lib/marketbrewer/database.db \
  "CREATE INDEX idx_service_area_id ON pages(service_area_id);"

sqlite3 /var/lib/marketbrewer/database.db \
  "CREATE INDEX idx_job_status ON generation_jobs(status);"

# 2. Monitor query performance
sqlite3 /var/lib/marketbrewer/database.db "EXPLAIN QUERY PLAN SELECT * FROM pages WHERE service_area_id = 'va';"

# Optimize Node.js
# 1. Enable clustering for multi-core usage
# 2. Increase max memory: NODE_OPTIONS="--max-old-space-size=6144"
# 3. Profile hot paths with --prof flag

# Optimize Ollama
# 1. Keep model loaded in memory (batch requests)
# 2. Use stream=false for faster single requests
# 3. Consider larger model (mistral) if quality issues
```

---

## Disaster Recovery

### Backup Strategy

```bash
# Daily automated backup (via cron)
0 2 * * * sqlite3 /var/lib/marketbrewer/database.db ".dump" | gzip > /backup/database-$(date +\%Y-\%m-\%d).sql.gz

# Verify backup
gunzip -t /backup/database-2024-12-16.sql.gz
```

### Restore Procedure

```bash
# 1. Stop API and worker
sudo systemctl stop seo-api seo-worker

# 2. Backup current database
cp /var/lib/marketbrewer/database.db /var/lib/marketbrewer/database.db.bak

# 3. Restore from backup
gunzip < /backup/database-2024-12-16.sql.gz | sqlite3 /var/lib/marketbrewer/database.db

# 4. Verify integrity
sqlite3 /var/lib/marketbrewer/database.db "PRAGMA integrity_check;"

# 5. Restart services
sudo systemctl start seo-api seo-worker

# 6. Verify connectivity
curl http://localhost:3001/health
```

### RTO/RPO Targets

| Scenario            | RTO     | RPO    | Action                           |
| ------------------- | ------- | ------ | -------------------------------- |
| Service crash       | 5 min   | 0 min  | systemctl restart                |
| Database corruption | 30 min  | 1 day  | Restore from daily backup        |
| Instance failure    | 1 hour  | 1 hour | Redeploy from CloudFormation     |
| Region outage       | 4 hours | 1 day  | Manual failover to backup region |

---

## Cost Optimization

### Current Costs (Monthly)

- EC2 t3.large: $20.00 (8h/day usage)
- Storage (EBS gp3): $2.50 (50GB)
- Data transfer: ~$0.50 (minimal)
- **Total: ~$22.50**

### Cost Reduction Strategies

```bash
# 1. Use auto-stop (implemented)
# Saves: $40/month on non-business hours

# 2. Schedule predictable usage
# - Content generation: 2-4 PM (afternoon batch)
# - Stop instance: 6 PM - 8 AM weekdays
# - Weekend: Always off
# Savings: ~$15/month

# 3. Optimize instance type
# Current: t3.large ($20/mo)
# Alternative: t3.medium ($10/mo) - 50% slower
# Tradeoff: Generation time 30-60s vs 15-30s

# 4. Reserved instances (Phase 2)
# 1-year commitment: 30-40% discount
# Savings: ~$8-10/month

# Monitor costs
aws ce get-cost-and-usage \
  --time-period Start=2024-12-01,End=2024-12-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Contact & Escalation

### Internal Team

| Role   | Name           | Email              | Phone        |
| ------ | -------------- | ------------------ | ------------ |
| Owner  | Jorge Giraldez | j@marketbrewer.com | 703-463-6323 |
| Backup | [Name]         | [email]            | [phone]      |

### External Support

- **AWS Support:** https://console.aws.amazon.com/support/
- **Ollama Issues:** https://github.com/ollama/ollama/issues
- **Node.js:** https://nodejs.org/en/docs/

---

## Quick Reference: Common Commands

```bash
# Health & Status
npm run health:check                    # API health
systemctl status seo-api seo-worker     # Service status
df -h /var/lib/marketbrewer             # Disk space
free -h                                 # Memory usage
top -b -n 1 | head -10                  # Top processes

# Logs
tail -50 /var/log/seo-api.log           # API logs
tail -50 /var/log/seo-worker.log        # Worker logs
journalctl -u seo-api -n 50             # Service journal

# Services
sudo systemctl restart seo-api          # Restart API
sudo systemctl restart seo-worker       # Restart worker
sudo systemctl restart seo-api seo-worker  # Restart both

# Database
sqlite3 /var/lib/marketbrewer/database.db  # Connect
PRAGMA integrity_check;                 # Verify integrity
VACUUM;                                 # Optimize
.backup database-backup.db              # Backup

# Ollama
curl -s http://localhost:11434/api/tags | jq .    # Check models
ollama pull llama3.2:latest             # Update model
```

---

**Last Review:** December 16, 2024  
**Next Review:** January 16, 2025

---

## Shared EBS Volume Usage (Multi-Project)

You can use the same EBS volume for multiple projects on the same EC2 instance. Follow these guardrails to avoid resource contention and ensure isolation:

- Purpose separation: Use one SQLite file per project; never share the same database file across apps.
- Directory layout: Keep per-project data in separate folders on the same volume.

```bash
# Example layout (same EBS volume)
sudo mkdir -p /var/lib/marketbrewer /var/lib/other-app
sudo chown ubuntu:ubuntu /var/lib/marketbrewer /var/lib/other-app
chmod 750 /var/lib/marketbrewer /var/lib/other-app

# Project database files (each app uses its own)
# /var/lib/marketbrewer/database.db
# /var/lib/other-app/app.db
```

- Isolation & permissions: Use UNIX ownership and 750 permissions so projects cannot read each other’s data.
- Capacity guardrail: Keep ≤80% disk usage (≥20GB free on 50GB volume) to avoid starving any project.
- Monitoring: Add a CloudWatch alarm for disk usage >80% and enable the check-disk-usage systemd timer below.
- Single-attach note: EBS volumes attach to one instance at a time; for cross-instance sharing, consider EFS (not required for v1.0).
- Do not multi-process a single SQLite file across apps; separate files per project keeps locking simple and safe.

### Quick Checks

```bash
# Check disk usage
df -h /var/lib/marketbrewer
# Optional: check another project directory
df -h /var/lib/other-app

# Run capacity check script (80% threshold default)
/opt/marketbrewer/scripts/check-disk-usage.sh 80 /var/lib/marketbrewer /var/lib/other-app || echo "WARNING: Disk usage over threshold"
```

## Enable Hourly Disk Capacity Checks (systemd)

Enable a lightweight systemd timer to log warnings if disk usage exceeds your threshold:

```bash
sudo cp /opt/marketbrewer/systemd/check-disk-usage.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now check-disk-usage.timer

# Verify
systemctl list-timers | grep check-disk-usage
journalctl -u check-disk-usage.service -n 20
```
