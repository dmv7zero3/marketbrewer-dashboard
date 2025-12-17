# Database Migration & Backup Strategy

**Version:** 1.0.0-stable  
**Last Updated:** December 17, 2025  
**Status:** ✅ Ready for Production

---

## Overview

MarketBrewer v1.0.0 uses SQLite with automatic migrations on startup. This document covers:

- Migration verification
- Backup/restore procedures
- Disaster recovery
- Database performance tuning

---

## Database Structure

**Location (EC2):** `/var/lib/marketbrewer/seo-platform.db`  
**Type:** SQLite 3  
**Size (with 26 locations × 50 keywords):** ~50-100MB  
**Connections:** Single-file, supports concurrent read/write with WAL mode

---

## Migrations

All migrations are defined in `packages/server/src/migrations/` and run automatically on server startup.

### Current Schema (v1.0.0)

```sql
-- Businesses table
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  serviceAreas TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  version INTEGER DEFAULT 1
);

-- Questionnaire responses
CREATE TABLE questionnaires (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE,
  identity TEXT,
  location TEXT,
  services TEXT,
  audience TEXT,
  brand TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Job queue
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  page_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  output TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Generated pages
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  url_slug TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft',
  published_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (business_id) REFERENCES businesses(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

### Verification

```bash
# Check database structure
sqlite3 /var/lib/marketbrewer/seo-platform.db ".schema"

# Count records
sqlite3 /var/lib/marketbrewer/seo-platform.db "
  SELECT
    (SELECT COUNT(*) FROM businesses) as businesses,
    (SELECT COUNT(*) FROM questionnaires) as questionnaires,
    (SELECT COUNT(*) FROM jobs) as jobs,
    (SELECT COUNT(*) FROM pages) as pages;
"

# Check database integrity
sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"
```

---

## Backup Strategy

### Daily Automated Backups

Backups run automatically via cron (configured in deployment runbook).

```bash
# Manual backup command
cp /var/lib/marketbrewer/seo-platform.db \
   /var/lib/marketbrewer/backups/seo-platform.db.$(date +%Y%m%d_%H%M%S).backup
```

**Backup Location:** `/var/lib/marketbrewer/backups/`  
**Retention:** Last 7 days (auto-deleted)  
**Frequency:** Daily at 2:00 AM UTC  
**Size:** ~50-100MB per backup

### Manual Backup

```bash
# Create backup
sudo -u ubuntu cp /var/lib/marketbrewer/seo-platform.db \
  /var/lib/marketbrewer/backups/seo-platform.db.manual.$(date +%Y%m%d_%H%M%S).backup

# Verify backup
ls -lh /var/lib/marketbrewer/backups/
```

---

## Restore Procedures

### From Recent Backup (Recommended)

```bash
# 1. Stop services
sudo systemctl stop seo-api seo-worker

# 2. Locate backup
ls -lh /var/lib/marketbrewer/backups/

# 3. Restore
sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{timestamp}.backup \
        /var/lib/marketbrewer/seo-platform.db

# 4. Verify integrity
sudo sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"

# 5. Restart services
sudo systemctl start seo-api seo-worker

# 6. Verify
curl http://localhost:3001/health
```

### From Production Snapshot (AWS)

If using EBS snapshots:

```bash
# 1. Create volume from snapshot
aws ec2 create-volume \
  --snapshot-id snap-xxxxxxxxx \
  --availability-zone us-east-1a

# 2. Attach to instance
aws ec2 attach-volume \
  --volume-id vol-xxxxxxxxx \
  --instance-id i-xxxxxxxxx \
  --device /dev/sdf

# 3. Mount volume
sudo mkdir /mnt/snapshot
sudo mount /dev/xvdf1 /mnt/snapshot

# 4. Copy database
sudo cp /mnt/snapshot/seo-platform.db /var/lib/marketbrewer/seo-platform.db

# 5. Unmount and detach
sudo umount /mnt/snapshot
aws ec2 detach-volume --volume-id vol-xxxxxxxxx
```

---

## Disaster Recovery

### Complete Data Loss

1. **Restore from most recent backup:**

   ```bash
   sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{latest}.backup \
           /var/lib/marketbrewer/seo-platform.db
   ```

2. **If no backups exist, rebuild from seed:**

   ```bash
   # Rebuild from contract
   npm run seed:nash-smashed
   ```

3. **Verify restoration:**
   ```bash
   curl http://localhost:3001/businesses | jq '.businesses | length'
   ```

### Corrupted Database

SQLite provides built-in integrity checking:

```bash
# Check for corruption
sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"

# Output options:
# - "ok" = no corruption
# - List of issues = corruption detected

# If corrupted, restore from backup
sudo systemctl stop seo-api seo-worker
sudo cp /var/lib/marketbrewer/backups/seo-platform.db.{timestamp}.backup \
        /var/lib/marketbrewer/seo-platform.db
sudo systemctl start seo-api seo-worker
```

### Partial Data Recovery

If only specific records are corrupted:

```bash
# Export good data
sqlite3 /var/lib/marketbrewer/seo-platform.db \
  "SELECT * FROM businesses WHERE id != 'corrupted_id'" > /tmp/export.sql

# Verify export
wc -l /tmp/export.sql

# Restore from backup and manually apply good data
```

---

## Performance Tuning

### SQLite Configuration (`.env` settings)

```bash
# Write-Ahead Logging (WAL mode) - enables concurrent access
# Enabled by default in v1.0.0

# Connection pooling - limit concurrent connections
DATABASE_MAX_CONNECTIONS=5

# Query timeout (milliseconds)
DATABASE_QUERY_TIMEOUT=30000

# Busy timeout (allows retries during lock contention)
DATABASE_BUSY_TIMEOUT=5000
```

### Index Optimization

Current indexes (auto-created):

```sql
CREATE INDEX idx_jobs_business_id ON jobs(business_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_questionnaires_business_id ON questionnaires(business_id);
CREATE INDEX idx_pages_business_id ON pages(business_id);
```

### Database Maintenance

```bash
# VACUUM - optimize database file size
sqlite3 /var/lib/marketbrewer/seo-platform.db "VACUUM;"

# ANALYZE - update query optimizer statistics
sqlite3 /var/lib/marketbrewer/seo-platform.db "ANALYZE;"

# Check WAL status
sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA journal_mode;"
# Should return: "wal"
```

---

## Monitoring

### Database Size

```bash
# Current size
du -h /var/lib/marketbrewer/seo-platform.db

# Watch growth
watch -n 60 'du -h /var/lib/marketbrewer/seo-platform.db'
```

### Performance Metrics

```bash
# Connection count
lsof -i :3001 | grep -c node

# Slow queries (if logging enabled)
tail -f /var/log/marketbrewer/slow-queries.log

# Disk I/O
iostat -x 1 10
```

### Alerting

Configure alerts for:

- Database file size > 500MB
- Integrity check failures
- Query response time > 1000ms
- Backup failures (last backup > 24 hours old)

---

## Pre-Deployment Checklist

- [ ] Database path configured: `/var/lib/marketbrewer/seo-platform.db`
- [ ] Backup directory writable: `/var/lib/marketbrewer/backups`
- [ ] SQLite 3 installed on EC2
- [ ] Migrations reviewed and approved
- [ ] Backup script configured and tested
- [ ] Cron job for daily backups scheduled
- [ ] Recovery procedures documented
- [ ] Team trained on backup/restore procedures

---

## Post-Deployment Verification

```bash
# 1. Verify database created and initialized
ls -la /var/lib/marketbrewer/seo-platform.db

# 2. Check schema
sqlite3 /var/lib/marketbrewer/seo-platform.db ".tables"

# 3. Verify no corruption
sqlite3 /var/lib/marketbrewer/seo-platform.db "PRAGMA integrity_check;"

# 4. Test API can read data
curl http://localhost:3001/businesses | jq '.meta'

# 5. Verify backup script is running
ls -lah /var/lib/marketbrewer/backups/

# 6. Monitor for 24 hours
tail -f /var/log/syslog | grep -i seo
```

---

## Support

**Database Issues:** Check `docs/architecture/DATABASE.md` for schema details

**Backup Failures:** Check systemd journal: `sudo journalctl -u cron`

**Corruption:** See "Disaster Recovery" section above

**Performance:** See "Performance Tuning" section above

---

**Status:** ✅ Ready for Production  
**Reviewed:** December 17, 2025  
**Next Review:** January 17, 2026
