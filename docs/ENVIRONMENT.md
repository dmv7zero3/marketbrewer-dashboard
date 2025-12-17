# Environment Variables

Single reference documentation for all environment variables across the MarketBrewer SEO Platform.

---

## Quick Reference

| Variable        | Required | Component | Default                  | Description                         |
| --------------- | -------- | --------- | ------------------------ | ----------------------------------- |
| `API_TOKEN`     | ✅       | Server    | -                        | Bearer token for API authentication |
| `DATABASE_PATH` | ❌       | Server    | `./data/seo-platform.db` | SQLite database file path           |
| `PORT`          | ❌       | Server    | `3001`                   | HTTP server port                    |
| `OLLAMA_URL`    | ✅       | Worker    | -                        | Ollama API endpoint                 |
| `OLLAMA_MODEL`  | ✅       | Worker    | -                        | Model name (e.g., `llama2`)         |
| `API_URL`       | ✅       | Worker    | -                        | Server API endpoint                 |
| `WORKER_TOKEN`  | ✅       | Worker    | -                        | Worker authentication token         |
| `CONCURRENCY`   | ❌       | Worker    | `1`                      | Parallel job processing limit       |

---

## Server Environment Variables

The API server requires these environment variables:

### `API_TOKEN` (Required)

**Component:** Server  
**Type:** String  
**Default:** None  
**Example:** `dev-token-12345`

Bearer token for API authentication. Used by:

- Dashboard for API requests
- Worker for job updates
- External clients

**Security Notes:**

- Generate strong random tokens for production
- Rotate regularly (quarterly recommended)
- Never commit to version control

---

### `DATABASE_PATH` (Optional)

**Component:** Server  
**Type:** String  
**Default:** `./data/seo-platform.db`  
**Example:** `/var/lib/seo-platform/production.db`

Path to SQLite database file. Relative paths resolve from server working directory.

**Production Recommendations:**

- Use absolute path
- Place on persistent storage
- Ensure directory exists and is writable
- Configure regular backups

---

### `PORT` (Optional)

**Component:** Server  
**Type:** Number  
**Default:** `3001`  
**Example:** `8080`

HTTP server listening port.

**Deployment Notes:**

- EC2: Use `3001` (documented in deployment guides)
- Docker: Map to host port as needed
- Load balancer: Configure health check on `/health`

---

## Worker Environment Variables

The content generation worker requires these environment variables:

### `OLLAMA_URL` (Required)

**Component:** Worker  
**Type:** URL  
**Default:** None  
**Example:** `http://localhost:11434`

Ollama API endpoint URL. Must be accessible from worker.

**Deployment Scenarios:**

- **Local dev:** `http://localhost:11434`
- **EC2 co-located:** `http://localhost:11434`
- **EC2 separate instance:** `http://<ollama-private-ip>:11434`
- **Docker:** `http://ollama:11434` (service name)

**Troubleshooting:**

- Verify Ollama is running: `curl $OLLAMA_URL/api/tags`
- Check network connectivity
- Ensure firewall allows port 11434

---

### `OLLAMA_MODEL` (Required)

**Component:** Worker  
**Type:** String  
**Default:** None  
**Example:** `llama2`

Ollama model name for content generation.

**Supported Models:**

- `llama2` - General purpose, good balance
- `mistral` - Fast, lower memory
- `mixtral` - Higher quality, slower

**Setup:**

```bash
# Pull model before starting worker
ollama pull llama2
```

---

### `API_URL` (Required)

**Component:** Worker  
**Type:** URL  
**Default:** None  
**Example:** `http://localhost:3001`

Server API endpoint for job claiming and updates.

**Deployment Scenarios:**

- **Local dev:** `http://localhost:3001`
- **EC2 co-located:** `http://localhost:3001`
- **EC2 separate instance:** `http://<server-private-ip>:3001`
- **Docker:** `http://server:3001` (service name)

---

### `WORKER_TOKEN` (Required)

**Component:** Worker  
**Type:** String  
**Default:** None  
**Example:** `dev-token-12345`

Authentication token for worker API requests. **Must match** server's `API_TOKEN`.

**Security Notes:**

- Use same value as `API_TOKEN`
- Keep in sync when rotating tokens
- Never commit to version control

---

### `CONCURRENCY` (Optional)

**Component:** Worker  
**Type:** Number  
**Default:** `1`  
**Example:** `3`

Number of jobs to process in parallel.

**Performance Tuning:**

- **CPU-bound:** Set to number of CPU cores
- **GPU-bound:** Set to 1 (Ollama handles parallelism)
- **Memory-bound:** Monitor RAM usage, reduce if needed

**Recommendations by Instance:**

- **t3.medium (2 vCPU):** `1-2`
- **g4dn.xlarge (4 vCPU + GPU):** `1` (GPU bottleneck)
- **c5.2xlarge (8 vCPU):** `4-6`

---

## Dashboard Environment Variables

The React dashboard is built statically with environment variables embedded at build time.

### Build-Time Variables

Dashboard requires no runtime environment variables. API URL is configured in the code:

```typescript
// packages/dashboard/src/api/client.ts
const API_URL = "http://localhost:3001"; // Dev default
```

**Production Build:**
Update `API_URL` in code before building:

```bash
# Edit packages/dashboard/src/api/client.ts
# Change API_URL to production server URL
npm run build --workspace=@marketbrewer/dashboard
```

---

## Testing Environment Variables

Test suites use environment variables for configuration:

### `NODE_ENV=test`

Automatically set by Jest. Some modules may behave differently in test mode.

### Test Database

Server tests create a temporary SQLite database in memory:

```typescript
const db = new Database(":memory:");
```

No `DATABASE_PATH` needed for tests.

---

## Example Configurations

### Local Development

```bash
# Server (.env in packages/server/)
API_TOKEN=dev-token-12345
DATABASE_PATH=./data/seo-platform.db
PORT=3001

# Worker (.env in packages/worker/)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
API_URL=http://localhost:3001
WORKER_TOKEN=dev-token-12345
CONCURRENCY=1
```

### EC2 Co-Located (Server + Worker + Ollama on same instance)

```bash
# Server
API_TOKEN=prod-secure-token-xyz789
DATABASE_PATH=/var/lib/seo-platform/production.db
PORT=3001

# Worker
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
API_URL=http://localhost:3001
WORKER_TOKEN=prod-secure-token-xyz789
CONCURRENCY=2
```

### EC2 Distributed (Separate instances)

```bash
# Server (10.0.1.10)
API_TOKEN=prod-secure-token-xyz789
DATABASE_PATH=/var/lib/seo-platform/production.db
PORT=3001

# Worker (10.0.1.20)
OLLAMA_URL=http://10.0.1.30:11434  # Ollama instance private IP
OLLAMA_MODEL=llama2
API_URL=http://10.0.1.10:3001      # Server private IP
WORKER_TOKEN=prod-secure-token-xyz789
CONCURRENCY=3
```

### Docker Compose

```bash
# Server
API_TOKEN=docker-token-abc123
DATABASE_PATH=/data/seo-platform.db  # Mounted volume
PORT=3001

# Worker
OLLAMA_URL=http://ollama:11434       # Docker service name
OLLAMA_MODEL=llama2
API_URL=http://server:3001           # Docker service name
WORKER_TOKEN=docker-token-abc123
CONCURRENCY=2
```

---

## Security Best Practices

### Token Management

1. **Generate strong tokens:**

   ```bash
   # Use cryptographically secure random generator
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Never commit tokens:**

   - Add `.env` to `.gitignore`
   - Use AWS Secrets Manager for production
   - Document required variables without values

3. **Rotate regularly:**
   - Schedule quarterly rotation
   - Update all services simultaneously
   - Test before deploying

### Environment Files

```bash
# .gitignore (already configured)
.env
.env.local
.env.*.local
```

### Production Deployment

**AWS Systems Manager Parameter Store:**

```bash
# Store secrets
aws ssm put-parameter \
  --name /seo-platform/api-token \
  --value "prod-secure-token" \
  --type SecureString

# Retrieve in systemd service
Environment="API_TOKEN=$(aws ssm get-parameter --name /seo-platform/api-token --query Parameter.Value --output text)"
```

**Environment file template:**

```bash
# /etc/seo-platform/server.env
API_TOKEN=__REPLACE_WITH_SECURE_TOKEN__
DATABASE_PATH=/var/lib/seo-platform/production.db
PORT=3001
```

---

## Troubleshooting

### "Missing API_TOKEN"

**Error:** Server fails to start with "API_TOKEN environment variable is required"

**Solution:**

```bash
# Check if variable is set
echo $API_TOKEN

# Set for current session
export API_TOKEN=your-token

# Permanent: Add to ~/.bashrc or systemd Environment
```

### "Failed to connect to Ollama"

**Error:** Worker can't reach Ollama API

**Diagnosis:**

```bash
# Test connectivity
curl $OLLAMA_URL/api/tags

# Check Ollama is running
systemctl status ollama  # Linux
ps aux | grep ollama     # macOS

# Verify model is pulled
ollama list
```

**Solution:**

- Start Ollama: `ollama serve`
- Pull model: `ollama pull llama2`
- Check firewall: `sudo ufw allow 11434`

### "Unauthorized" from Worker

**Error:** Worker gets 401 responses from server

**Diagnosis:**

```bash
# Verify tokens match
echo "Server: $API_TOKEN"
echo "Worker: $WORKER_TOKEN"

# Test auth manually
curl -H "Authorization: Bearer $WORKER_TOKEN" \
  http://localhost:3001/api/jobs/claim
```

**Solution:**

- Ensure `WORKER_TOKEN === API_TOKEN`
- Restart both services after changing tokens

### Database Permission Errors

**Error:** "SQLITE_CANTOPEN: unable to open database file"

**Solution:**

```bash
# Check directory exists
mkdir -p $(dirname $DATABASE_PATH)

# Fix permissions
chmod 755 $(dirname $DATABASE_PATH)
chmod 644 $DATABASE_PATH  # If file exists

# Verify ownership
ls -la $DATABASE_PATH
```

---

## Migration Guide

### From Manual Config to Environment Variables

If you've been hardcoding values, migrate to environment variables:

**Before:**

```typescript
// packages/server/src/index.ts
const API_TOKEN = "hardcoded-token"; // ❌ Insecure
```

**After:**

```typescript
// packages/server/src/index.ts
const API_TOKEN = process.env.API_TOKEN; // ✅ Secure

if (!API_TOKEN) {
  throw new Error("API_TOKEN environment variable is required");
}
```

### Adding New Environment Variables

1. **Update this document** with variable specification
2. **Add to example configs** in all deployment scenarios
3. **Update `.env.example`** in relevant package
4. **Validate in code** with descriptive error messages
5. **Document in deployment guides** (DEPLOYMENT.md)

---

## See Also

- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Architecture Overview](architecture/OVERVIEW.md) - System architecture
- [API Endpoints](api/ENDPOINTS.md) - REST API documentation
