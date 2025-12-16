# Reference: Metrics & Logging Guidelines

Structured logging and metrics for monitoring the SEO platform.

---

## Logging Strategy

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | Failures requiring attention | Ollama connection failed |
| WARN | Potential issues | Page retry attempt 2/3 |
| INFO | Normal operations | Page completed successfully |
| DEBUG | Detailed troubleshooting | Prompt variables injected |

### Structured Log Format

```json
{
  "timestamp": "2025-12-15T10:30:00.000Z",
  "level": "INFO",
  "service": "worker",
  "workerId": "macbook-pro-1",
  "event": "page_completed",
  "jobId": "job-123",
  "pageId": "page-456",
  "duration": 35000,
  "wordCount": 425,
  "tokensUsed": 650
}
```

### Log Examples

```typescript
// Worker logs
logger.info('page_claimed', { jobId, pageId, workerId });
logger.info('generation_started', { pageId, model: 'dolphin3' });
logger.info('page_completed', { pageId, duration, wordCount });
logger.error('generation_failed', { pageId, error: err.message });

// API logs
logger.info('job_created', { jobId, businessId, totalPages });
logger.info('page_claimed', { jobId, pageId, workerId });
logger.warn('claim_conflict', { jobId, pageId, workerId });
```

---

## Key Metrics

### Job Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `jobs_created_total` | Counter | Total jobs created |
| `jobs_completed_total` | Counter | Total jobs completed |
| `jobs_failed_total` | Counter | Total jobs failed |
| `job_duration_seconds` | Histogram | Time to complete job |
| `job_pages_total` | Gauge | Pages per job |

### Page Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pages_generated_total` | Counter | Total pages generated |
| `pages_failed_total` | Counter | Total pages failed |
| `page_generation_seconds` | Histogram | Time per page |
| `page_word_count` | Histogram | Words per page |
| `page_retry_count` | Counter | Retry attempts |

### Worker Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `worker_active` | Gauge | Currently active workers |
| `worker_pages_completed` | Counter | Pages per worker |
| `worker_uptime_seconds` | Gauge | Worker uptime |
| `ollama_request_seconds` | Histogram | Ollama API latency |

---

## Dashboard Metrics Display

```
┌─────────────────────────────────────────────────────┐
│ Generation Stats (Last 24 Hours)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Pages Generated    Avg Time/Page    Success Rate  │
│  ┌─────────────┐   ┌─────────────┐   ┌───────────┐ │
│  │    1,247    │   │   32.5 sec  │   │   98.2%   │ │
│  └─────────────┘   └─────────────┘   └───────────┘ │
│                                                     │
│  Generation Rate (pages/hour)                       │
│  ████████████████████░░░░░ 112 p/hr                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation

### Simple Logger (V1)

```typescript
// packages/shared/src/utils/logger.ts
import fs from 'fs';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  [key: string]: unknown;
}

class Logger {
  constructor(
    private service: string,
    private logFile?: string
  ) {}

  private log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      event,
      ...data
    };

    const line = JSON.stringify(entry);
    console.log(line);

    if (this.logFile) {
      fs.appendFileSync(this.logFile, line + '\n');
    }
  }

  debug(event: string, data?: Record<string, unknown>) { this.log('DEBUG', event, data); }
  info(event: string, data?: Record<string, unknown>) { this.log('INFO', event, data); }
  warn(event: string, data?: Record<string, unknown>) { this.log('WARN', event, data); }
  error(event: string, data?: Record<string, unknown>) { this.log('ERROR', event, data); }
}

export const createLogger = (service: string, logFile?: string) => 
  new Logger(service, logFile);
```

### Usage

```typescript
// In worker
const logger = createLogger('worker', './logs/worker.log');

logger.info('worker_started', { workerId, apiUrl });
logger.info('page_claimed', { jobId, pageId });
logger.info('page_completed', { pageId, duration: Date.now() - startTime });
logger.error('generation_failed', { pageId, error: err.message });
```

---

## Log Aggregation (V1)

### Simple Approach

```bash
# Tail all worker logs
tail -f logs/*.log | jq '.'

# Filter errors
cat logs/worker.log | jq 'select(.level == "ERROR")'

# Count pages per worker
cat logs/worker.log | jq 'select(.event == "page_completed")' | \
  jq -s 'group_by(.workerId) | map({worker: .[0].workerId, count: length})'

# Average generation time
cat logs/worker.log | jq 'select(.event == "page_completed") | .duration' | \
  awk '{sum+=$1; count++} END {print sum/count/1000 " seconds"}'
```

### Daily Summary Script

```bash
#!/bin/bash
# scripts/daily-summary.sh

LOG_FILE="logs/worker.log"
DATE=$(date +%Y-%m-%d)

echo "=== Daily Summary: $DATE ==="

echo "Pages completed:"
grep "$DATE" $LOG_FILE | grep "page_completed" | wc -l

echo "Pages failed:"
grep "$DATE" $LOG_FILE | grep "generation_failed" | wc -l

echo "Average duration:"
grep "$DATE" $LOG_FILE | grep "page_completed" | \
  jq '.duration' | awk '{sum+=$1; n++} END {print sum/n/1000 "s"}'
```

---

## Alerts (Future)

When to alert:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error rate | > 5% in 10 min | Slack notification |
| No progress | 0 pages in 15 min | Check workers |
| Worker down | No heartbeat 5 min | Restart worker |
| Disk space | < 10% free | Clean old outputs |
