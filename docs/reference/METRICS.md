# Metrics & Logging

Structured logging and metrics for monitoring.

---

## Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | Failures requiring attention | Ollama connection failed |
| WARN | Potential issues | Page retry attempt 2/3 |
| INFO | Normal operations | Page completed |
| DEBUG | Detailed troubleshooting | Prompt variables injected |

---

## Log Format

Structured JSON logs:

```json
{
  "timestamp": "2025-12-16T10:30:00.000Z",
  "level": "INFO",
  "service": "worker",
  "workerId": "macbook-pro-1",
  "event": "page_completed",
  "jobId": "job-123",
  "pageId": "page-456",
  "duration": 35000,
  "wordCount": 425
}
```

---

## Log Events

### Worker Events

| Event | Level | Data |
|-------|-------|------|
| `worker_started` | INFO | workerId, apiUrl |
| `page_claimed` | INFO | jobId, pageId |
| `generation_started` | INFO | pageId, model |
| `page_completed` | INFO | pageId, duration, wordCount |
| `generation_failed` | ERROR | pageId, error |
| `worker_stopped` | INFO | workerId, reason |

### API Events

| Event | Level | Data |
|-------|-------|------|
| `job_created` | INFO | jobId, businessId, totalPages |
| `page_claimed` | INFO | jobId, pageId, workerId |
| `claim_conflict` | WARN | jobId, pageId, workerId |
| `job_completed` | INFO | jobId, duration |

---

## Logger Implementation

Location: `packages/shared/src/utils/logger.ts`

```typescript
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
    private minLevel: LogLevel = 'INFO'
  ) {}

  private log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      event,
      ...data
    };
    console.log(JSON.stringify(entry));
  }

  debug(event: string, data?: Record<string, unknown>) { this.log('DEBUG', event, data); }
  info(event: string, data?: Record<string, unknown>) { this.log('INFO', event, data); }
  warn(event: string, data?: Record<string, unknown>) { this.log('WARN', event, data); }
  error(event: string, data?: Record<string, unknown>) { this.log('ERROR', event, data); }
}

export const createLogger = (service: string) => new Logger(service);
```

---

## Usage

```typescript
import { createLogger } from '@marketbrewer/shared';

const logger = createLogger('worker');

logger.info('worker_started', { workerId: 'macbook-pro-1', apiUrl });
logger.info('page_claimed', { jobId, pageId });
logger.info('page_completed', { pageId, duration: Date.now() - startTime });
logger.error('generation_failed', { pageId, error: err.message });
```

---

## Key Metrics

### Job Metrics

| Metric | Type | Description |
|--------|------|-------------|
| jobs_created | Counter | Total jobs created |
| jobs_completed | Counter | Total jobs completed |
| job_duration_seconds | Histogram | Time to complete job |

### Page Metrics

| Metric | Type | Description |
|--------|------|-------------|
| pages_generated | Counter | Total pages generated |
| pages_failed | Counter | Total pages failed |
| page_generation_seconds | Histogram | Time per page |
| page_word_count | Histogram | Words per page |

### Worker Metrics

| Metric | Type | Description |
|--------|------|-------------|
| workers_active | Gauge | Currently active workers |
| ollama_request_seconds | Histogram | Ollama API latency |

---

## Log Analysis

### Filter Errors

```bash
cat logs/worker.log | jq 'select(.level == "ERROR")'
```

### Count Pages per Worker

```bash
cat logs/worker.log | \
  jq 'select(.event == "page_completed")' | \
  jq -s 'group_by(.workerId) | map({worker: .[0].workerId, count: length})'
```

### Average Generation Time

```bash
cat logs/worker.log | \
  jq 'select(.event == "page_completed") | .duration' | \
  awk '{sum+=$1; n++} END {print sum/n/1000 " seconds"}'
```

---

## Dashboard Display

```
┌─────────────────────────────────────────────────────┐
│ Generation Stats (Last 24 Hours)                    │
├─────────────────────────────────────────────────────┤
│  Pages Generated    Avg Time/Page    Success Rate  │
│  ┌─────────────┐   ┌─────────────┐   ┌───────────┐ │
│  │    1,247    │   │   32.5 sec  │   │   98.2%   │ │
│  └─────────────┘   └─────────────┘   └───────────┘ │
└─────────────────────────────────────────────────────┘
```
