# LLM Handoff Prompt: Fix Dashboard Business Dropdown

## Context

This is a handoff for the **MarketBrewer SEO Platform** project. Previous work completed:

- ✅ Locations management fully implemented with CRUD operations
- ✅ Edit/create/delete/bulk import modals working
- ✅ 10/10 smoke tests passing for locations API
- ✅ Fixed validation bug for saving without changes
- ✅ Comprehensive test coverage (37 integration tests + 20 manual tests)

**Current Issue:** Dashboard is not displaying businesses in the dropdown, preventing users from managing locations.

## Problem Statement

User reports: **"i dont see any business available"** when trying to use the locations management page.

**Symptoms observed:**

1. Dashboard shows "No business selected" message
2. Business dropdown is empty
3. Console shows multiple errors:
   - `ERR_FAILED 429 (Too Many Requests)` - Rate limiting errors
   - CORS policy errors blocking requests from `http://localhost:3002` to `http://localhost:3001`
   - `Access to XMLHttpRequest at 'http://localhost:3001/api/businesses' from origin 'http://localhost:3002' has been blocked by CORS policy`

**Screenshot Analysis:**

- Shows dashboard with empty business selector
- Browser DevTools console shows ~15 messages
- 6 errors (red)
- 2 warnings (yellow)
- Multiple CORS-related errors

## Environment

**Server:** http://localhost:3001 (Node.js + Express + SQLite)
**Dashboard:** http://localhost:3002 (React 18 + Webpack 5)
**Repository:** https://github.com/dmv7zero3/marketbrewer-seo-platform
**Latest Commit:** `9bdae67` - "feat(locations): implement edit/save bug fix and add comprehensive testing"

## Technical Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Webpack 5
- **Backend:** Express, TypeScript, better-sqlite3
- **Database:** SQLite (`data/seo-platform.db`)
- **Monorepo:** Lerna/npm workspaces
  - `packages/dashboard` - React frontend
  - `packages/server` - Express API
  - `packages/shared` - Shared types
  - `packages/worker` - Ollama worker (not relevant here)

## Files to Investigate

### Priority 1: CORS Configuration

- [ ] [packages/server/src/middleware/cors.ts](packages/server/src/middleware/cors.ts) - CORS middleware
- [ ] [packages/server/src/index.ts](packages/server/src/index.ts) - Server setup with CORS
- [ ] [docs/api/CORS.md](docs/api/CORS.md) - CORS documentation

### Priority 2: API Client

- [ ] [packages/dashboard/src/api/client.ts](packages/dashboard/src/api/client.ts) - Axios config
- [ ] [packages/dashboard/src/api/businesses.ts](packages/dashboard/src/api/businesses.ts) - Business API calls
- [ ] [packages/dashboard/webpack.config.js](packages/dashboard/webpack.config.js) - Dev server proxy config

### Priority 3: Business Context

- [ ] [packages/dashboard/src/contexts/BusinessContext.tsx](packages/dashboard/src/contexts/BusinessContext.tsx) - Business state management
- [ ] [packages/dashboard/src/components/dashboard/BusinessSelector.tsx](packages/dashboard/src/components/dashboard/BusinessSelector.tsx) - Dropdown component

### Priority 4: Server Environment

- [ ] Check if server is running with `NODE_ENV=development`
- [ ] Verify server listening on correct port (3001)
- [ ] Check for rate limiting middleware that's too aggressive

## Debugging Steps

### 1. Verify Server is Running Correctly

```bash
# Check if server process is running
lsof -i:3001

# Test server health
curl http://localhost:3001/health

# Test businesses endpoint with proper auth
curl -H "Authorization: Bearer local-dev-token" http://localhost:3001/api/businesses | jq .
```

### 2. Check Database

```bash
# Verify businesses exist in database
cd /Users/george/MatrizInc/MarketBrewer/Clients/marketbrewer-seo-platform
sqlite3 data/seo-platform.db "SELECT id, name FROM businesses;"

# Should see: nash-and-smashed | Nash & Smashed
```

### 3. Test CORS Headers

```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: http://localhost:3002" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v \
  http://localhost:3001/api/businesses
```

### 4. Check Dashboard Console

- Open browser DevTools
- Look for API request logs (should see `[API Request] GET http://localhost:3001/api/businesses`)
- Check if requests are being made or failing silently
- Verify Authorization header is being sent

## Known Working Configuration

**Server CORS Settings (from docs/api/CORS.md):**

```typescript
// Development
const allowedOrigins = ["http://localhost:3002", "http://localhost:3000"];

// Must include credentials: true for cookie-based auth
```

**API Client Config:**

```typescript
// packages/dashboard/src/api/client.ts
const apiClient = axios.create({
  baseURL: process.env.API_URL || "http://localhost:3001",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer local-dev-token",
  },
});
```

## Rate Limiting Issue

The `429 Too Many Requests` errors suggest the server has aggressive rate limiting. Check:

1. [packages/server/src/middleware/rate-limit.ts](packages/server/src/middleware/rate-limit.ts) - Rate limit config
2. May need to disable or increase limits for development
3. OR wait 60 seconds for rate limit to reset

## Expected Behavior

Once fixed, the dashboard should:

1. Load businesses from `/api/businesses` endpoint
2. Show "Nash & Smashed" in the business dropdown
3. Allow selecting the business
4. Display locations management page with 32 locations

## Test Data Available

- **Business:** "nash-and-smashed" (ID: nash-and-smashed)
- **Locations:** 32 total (14 active, 18 upcoming)
- **States:** VA (14), MD (11), DC (5), SC (1), NY (2)

## Commands to Test After Fix

```bash
# Start server (if not running)
NODE_ENV=development npm run dev:server

# Start dashboard (in new terminal)
npm run dev:dashboard

# Open browser
open http://localhost:3002

# Run smoke tests to verify
npm run test:locations-api  # Should show 10/10 passing
```

## Previous Work Reference

All implementation details are in:

- [docs/LOCATIONS-IMPLEMENTATION.md](docs/LOCATIONS-IMPLEMENTATION.md) - Complete feature documentation
- [docs/LOCATIONS-TEST-SUMMARY.md](docs/LOCATIONS-TEST-SUMMARY.md) - Testing overview
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) - Code style guide

## What NOT to Change

❌ Don't modify location management components (they work correctly)
❌ Don't change API endpoint routes (they're tested and working)
❌ Don't alter database schema or migrations
❌ Don't modify authentication tokens in development mode

## Your Mission

**Primary Goal:** Fix the CORS/connection issues so the business dropdown loads data from the API.

**Success Criteria:**

1. Dashboard loads without CORS errors
2. Business dropdown shows "Nash & Smashed"
3. Can select business and see locations page
4. No rate limiting errors (or increase limits for dev)
5. All existing smoke tests still pass (10/10)

**Approach:**

1. Start by checking if server is running with correct NODE_ENV
2. Verify CORS configuration allows `localhost:3002`
3. Check rate limiting is not too aggressive for development
4. Test API endpoint manually with curl
5. Check dashboard API client configuration
6. Verify Authorization header is being sent
7. Test in browser and confirm business selector works

## Questions to Answer

1. Is the server running with `NODE_ENV=development`?
2. What are the current CORS allowed origins?
3. What is the rate limit configuration?
4. Are requests reaching the server or failing before?
5. Is the Authorization header being sent correctly?
6. Does the `/api/businesses` endpoint return data when tested with curl?

## Additional Context

- This is a **local-first development** setup
- API token for dev: `local-dev-token` (hardcoded, no OAuth yet)
- SQLite database is local: `data/seo-platform.db`
- Previous developer successfully got server/API working
- Issue is specifically with **dashboard → server** communication
- The location CRUD features work when business is selected
- This appears to be an environment/configuration issue, not a code logic bug

## Contact

- Owner: Jorge Giraldez (j@marketbrewer.com | 703-463-6323)
- Project: MarketBrewer SEO Platform (V1 - Local Development)
- All documentation in `docs/` folder

---

**Start here:** Check server logs, verify CORS config, test `/api/businesses` endpoint with curl.
