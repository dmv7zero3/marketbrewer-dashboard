# Server Connection Troubleshooting Guide

**Issue:** Dashboard shows "Network Error" or "ERR_CONNECTION_REFUSED"

---

## Quick Fix

The server is not running. Start it:

```bash
NODE_ENV=development npm run dev:server
```

Then refresh your dashboard at http://localhost:3002

---

## Diagnostic Steps

### 1. Test Connection

```bash
npm run test:connection
```

This will check:

- ✓ Server reachability
- ✓ Health endpoint
- ✓ API authentication
- ✓ CORS headers
- ✓ Business data availability

### 2. Check Server Status

```bash
# Is server running?
lsof -ti:3001

# Test health endpoint
curl http://localhost:3001/health
```

### 3. View Server Logs

If started in background:

```bash
tail -f server.log
```

---

## Common Issues

### Issue: Port Already in Use

```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill $(lsof -ti:3001)

# Restart server
NODE_ENV=development npm run dev:server
```

### Issue: CORS Errors

Make sure server is started with `NODE_ENV=development`:

```bash
NODE_ENV=development npm run dev:server
```

### Issue: 401 Unauthorized

Check API token matches:

- Server uses: `API_TOKEN` (default: local-dev-token)
- Dashboard uses: `REACT_APP_API_TOKEN` (default: local-dev-token)

Start both with matching tokens:

```bash
# Terminal 1: Server
API_TOKEN=local-dev-token NODE_ENV=development npm run dev:server

# Terminal 2: Dashboard
REACT_APP_API_TOKEN=local-dev-token npm run dev:dashboard
```

---

## Enhanced Debugging

The dashboard API client now includes detailed logging:

### Browser Console Output

**Successful Request:**

```
[API Request] GET http://localhost:3001/api/businesses
[API Request] Headers: {Authorization: 'Bearer local-dev-token', ...}
[API Response] 200 /api/businesses
```

**Server Not Running:**

```
[API Error] Server not reachable at http://localhost:3001
→ Is the server running? Start it with: npm run dev:server
```

**CORS Error:**

```
[API Error] Network Error
```

---

## Development Workflow

### Standard Startup

```bash
# Start both server and dashboard
npm start
```

### Separate Terminals (Recommended)

```bash
# Terminal 1: Server
NODE_ENV=development npm run dev:server

# Terminal 2: Dashboard
npm run dev:dashboard

# Terminal 3: Worker (optional)
npm run dev:worker
```

### Background Server

```bash
# Start server in background
NODE_ENV=development npm run dev:server > server.log 2>&1 &

# View logs
tail -f server.log

# Stop server
kill $(lsof -ti:3001)
```

---

## Verification Checklist

Before troubleshooting, verify:

- [ ] Server running on port 3001
- [ ] Dashboard running on port 3002
- [ ] `NODE_ENV=development` set for server
- [ ] API tokens match between server and dashboard
- [ ] No firewall blocking localhost connections
- [ ] Browser console shows detailed API logs

---

## Test Commands

```bash
# Quick connection test
npm run test:connection

# Full API test suite
npm run test:keywords-api

# Health check
npm run health:check

# Smoke tests
npm run smoke:local
```

---

## Server URLs

- Health: http://localhost:3001/health
- API Base: http://localhost:3001/api
- Dashboard: http://localhost:3002

---

## Getting Help

If connection issues persist:

1. Run connection test: `npm run test:connection`
2. Check server logs: `tail -f server.log`
3. Verify ports: `lsof -ti:3001` and `lsof -ti:3002`
4. Review browser console for detailed error messages
5. Check [docs/OPERATIONS.md](./OPERATIONS.md) for deployment info
