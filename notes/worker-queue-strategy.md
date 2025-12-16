# Reference: Worker Queue & Locking Strategy

Defines how workers claim jobs, handle concurrency, and manage failures.

---

## Queue Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Worker 1   │     │  Worker 2   │     │  Worker 3   │
│  (Laptop)   │     │  (Laptop)   │     │  (EC2 GPU)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Local API     │
                  │   (SQLite)      │
                  └─────────────────┘
```

---

## Job Claiming Strategy

### Atomic Claim (SQLite 3.35+)

```sql
-- Single atomic operation: claim + return
UPDATE job_pages 
SET 
  status = 'processing',
  worker_id = :worker_id,
  claimed_at = CURRENT_TIMESTAMP,
  attempts = attempts + 1
WHERE id = (
  SELECT id FROM job_pages 
  WHERE job_id = :job_id 
    AND status = 'queued'
  ORDER BY created_at ASC
  LIMIT 1
)
RETURNING *;
```

This prevents race conditions - only one worker gets each page.

### Claim Flow

```
Worker                          API
  │                              │
  │─── GET /jobs/active ────────▶│
  │◀── [{jobId, status}] ────────│
  │                              │
  │─── POST /jobs/:id/claim ────▶│
  │    {workerId: "laptop-1"}    │
  │◀── {page} or 409 ────────────│
  │                              │
  │    [Generate content...]     │
  │                              │
  │─── PUT /jobs/:id/pages/:pid ▶│
  │    {content, status}         │
  │◀── {success} ────────────────│
```

---

## Concurrency Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Max concurrent per worker | 1 | Sequential processing |
| Poll interval | 5 seconds | Time between claim attempts |
| Claim timeout | 5 minutes | Max time before page auto-releases |
| Max attempts | 3 | Retries before permanent failure |

### Why Sequential?

- Ollama processes one request at a time efficiently
- Prevents memory issues on laptops
- Simpler error handling
- Easy to reason about

---

## Backpressure Handling

### When Queue is Empty

```typescript
async pollForWork(): Promise<void> {
  const page = await this.claimPage();
  
  if (!page) {
    // Exponential backoff when no work
    this.backoffMs = Math.min(this.backoffMs * 2, 30000);
    await sleep(this.backoffMs);
    return;
  }
  
  // Reset backoff on successful claim
  this.backoffMs = 1000;
  await this.processPage(page);
}
```

### When API is Slow

```typescript
const CLAIM_TIMEOUT = 10000; // 10 seconds

async claimPage(): Promise<Page | null> {
  try {
    const response = await axios.post(
      `${this.apiUrl}/jobs/${jobId}/claim`,
      { workerId: this.workerId },
      { timeout: CLAIM_TIMEOUT }
    );
    return response.data.page;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('Claim timeout, will retry...');
      return null;
    }
    throw error;
  }
}
```

---

## Stale Job Recovery

Pages stuck in "processing" status need recovery.

### Auto-Release (API Cron)

```sql
-- Run every 5 minutes
UPDATE job_pages
SET 
  status = 'queued',
  worker_id = NULL,
  claimed_at = NULL
WHERE 
  status = 'processing'
  AND claimed_at < datetime('now', '-5 minutes');
```

### Worker Heartbeat

```typescript
// Worker sends heartbeat every 60 seconds
async sendHeartbeat(): Promise<void> {
  await axios.post(`${this.apiUrl}/workers/heartbeat`, {
    workerId: this.workerId,
    currentPageId: this.currentPage?.id,
    timestamp: new Date().toISOString()
  });
}
```

---

## Retry Strategy

| Attempt | Wait Before Retry | Action |
|---------|-------------------|--------|
| 1 | Immediate | Retry same worker |
| 2 | 30 seconds | Retry any worker |
| 3 | 60 seconds | Retry any worker |
| 4+ | — | Mark as failed, require manual retry |

### Retry Logic

```typescript
async processPage(page: Page): Promise<void> {
  try {
    const content = await this.generateContent(page);
    await this.completePage(page.id, content);
  } catch (error) {
    if (page.attempts < MAX_ATTEMPTS) {
      // Release back to queue for retry
      await this.releasePage(page.id, error.message);
    } else {
      // Permanent failure
      await this.failPage(page.id, error.message);
    }
  }
}
```

---

## Worker Health Monitoring

### Health Endpoint

```typescript
// GET /workers/status
{
  "workers": [
    {
      "id": "macbook-pro-1",
      "status": "active",
      "lastHeartbeat": "2025-12-15T10:30:00Z",
      "currentPage": "page-123",
      "pagesCompleted": 45,
      "pagesFailed": 2
    },
    {
      "id": "laptop-2", 
      "status": "active",
      "lastHeartbeat": "2025-12-15T10:30:05Z",
      "currentPage": null,
      "pagesCompleted": 38,
      "pagesFailed": 1
    }
  ]
}
```

### Dashboard Display

```
┌─────────────────────────────────────────┐
│ Workers                                 │
├─────────────────────────────────────────┤
│ 🟢 macbook-pro-1  │ Processing page-123 │
│ 🟢 laptop-2       │ Idle (polling)      │
│ 🟡 ec2-gpu        │ Starting up...      │
└─────────────────────────────────────────┘
```

---

## Spot Interruption Handling (EC2)

```typescript
// Check for spot termination notice
async checkSpotTermination(): Promise<boolean> {
  try {
    const response = await axios.get(
      'http://169.254.169.254/latest/meta-data/spot/instance-action',
      { timeout: 1000 }
    );
    return response.status === 200;
  } catch {
    return false; // No termination notice
  }
}

// In worker loop
if (await this.checkSpotTermination()) {
  console.log('Spot termination notice received!');
  await this.releasePage(this.currentPage.id, 'Spot termination');
  process.exit(0);
}
```
