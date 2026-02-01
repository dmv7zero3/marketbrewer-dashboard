# Metrics & Logging

Structured logging and metrics for monitoring.

---

## Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| ERROR | Failures requiring attention | Claude API request failed |
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
| `worker_batch_received` | INFO | records |
| `page_processing_started` | INFO | jobId, pageId, businessId |
| `page_processing_completed` | INFO | jobId, pageId, durationMs, inputTokens |
| `page_processing_failed` | ERROR | jobId, pageId, error |
| `page_skipped` | WARN | jobId, pageId |

### API Events

| Event | Level | Data |
|-------|-------|------|
| `request_received` | INFO | method, path, requestId |
| `bad_request` | WARN | error |
| `unauthorized` | WARN | error |
| `not_found` | WARN | error |

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
| claude_request_seconds | Histogram | Claude API latency |

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
