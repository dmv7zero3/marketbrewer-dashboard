# Keywords API Testing & Verification

**Date:** December 18, 2025  
**Status:** ✅ All tests passing

---

## Summary

Comprehensive testing suite for the Keywords API has been established to ensure the API remains stable and functional as the codebase evolves. The priority field has been completely removed from keywords, simplifying the data model and improving the user experience.

---

## Test Coverage

### 1. Smoke Tests (`scripts/test-keywords-api.sh`)

Quick verification tests that can be run without Jest overhead. Perfect for CI/CD pipelines and local development verification.

**Tests:**

- ✅ Server health check endpoint
- ✅ Create test business
- ✅ List keywords (empty)
- ✅ Create keyword without priority field
- ✅ List keywords (populated)
- ✅ Update keyword search intent
- ✅ Delete keyword
- ✅ Error handling - reject keyword without text
- ✅ Error handling - handle invalid business ID
- ✅ Cleanup - delete test business

**Run the tests:**

```bash
npm run test:keywords-api
# or
NODE_ENV=development bash scripts/test-keywords-api.sh
```

**Expected output:**

```
🧪 Keywords API Smoke Tests
================================
1. Server Health
Testing health check endpoint... ✓ (200)

2. Setup: Create Test Business
✓ Created business: [id]

3. Keywords API Operations
Testing list keywords (empty)... ✓ (200)
✓ Create keyword (no priority field)
Testing list keywords (populated)... ✓ (200)
Testing update keyword search intent... ✓ (200)
Testing delete keyword... ✓ (204)

4. Error Handling
Testing reject keyword without text... ✓ (400)
Testing handle invalid business ID gracefully... ✓ (200)

5. Cleanup
✓ Deleted test business

================================
Results:
  Passed: 10
  Failed: 0
================================
✓ All tests passed!
```

### 2. Integration Tests (`packages/server/src/routes/__tests__/keywords.integration.test.ts`)

Comprehensive Jest-based integration tests covering:

- Full CRUD operations
- Data validation
- Error handling
- List ordering
- Data integrity

⚠️ **Status:** These tests require a running server and are designed for manual verification. For automated CI/CD, use smoke tests instead.

**To run integration tests manually:**

```bash
# Terminal 1: Start server in development mode
NODE_ENV=development npm run dev:server

# Terminal 2: Run the tests
npm run test:server -- routes/__tests__/keywords.integration.test.ts
```

---

## Priority Field Removal

All references to the `priority` field have been completely removed from the keywords system:

### Database Changes

- **Migration 007:** `remove_keyword_priority.sql`
  - Removed `priority INTEGER DEFAULT 5` column from keywords table
  - Preserved all other columns and data

### API Changes

- **GET /api/businesses/:id/keywords**

  - Removed: `ORDER BY priority DESC`
  - Now: `ORDER BY created_at DESC`

- **POST /api/businesses/:id/keywords**

  - Removed: Priority parameter from request body
  - Removed: Priority from database INSERT

- **PUT /api/businesses/:id/keywords/:keywordId**
  - Removed: Priority parameter from request body
  - Removed: Priority update logic

### Dashboard Changes

- **KeywordsManagement.tsx**
  - Removed: `handleUpdatePriority()` function
  - Removed: Priority input field and display
  - Removed: Priority from failed keywords retry logic
  - Updated: Bulk add format from `keyword[, intent][, priority]` to `keyword[, intent]`
  - Updated: Instructions to reflect new format

### Current Keywords Table Schema

```sql
PRAGMA table_info(keywords);

0|id|TEXT|0||1
1|business_id|TEXT|1||0
2|slug|TEXT|1||0
3|keyword|TEXT|1||0
4|search_intent|TEXT|0||0
5|created_at|TEXT|0|CURRENT_TIMESTAMP|0
```

---

## Server Setup for Testing

### Required Environment Variables

```bash
# For development testing
export NODE_ENV=development
export API_TOKEN=local-dev-token
export CORS_DASHBOARD_URL=http://localhost:3002
```

### Starting the Server

```bash
# Development mode (allows requests without origin header)
NODE_ENV=development npm run dev:server

# The server will output:
# 🚀 Server running at http://0.0.0.0:3001
#    Health check: http://0.0.0.0:3001/health
#    API base: http://0.0.0.0:3001/api
```

### CORS Configuration

The CORS middleware automatically detects the environment:

- **Development:** Allows requests without origin header (curl, tests)
- **Production:** Requires valid origin header

For testing with curl, the server must be running with `NODE_ENV=development`.

---

## Test Scenarios

### Creating Keywords (Without Priority)

```bash
curl -X POST http://localhost:3001/api/businesses/{business_id}/keywords \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-token" \
  -d '{
    "keyword": "Best Nashville Hot Chicken",
    "search_intent": "commercial"
  }'

# Response (no priority field):
{
  "keyword": {
    "id": "...",
    "business_id": "...",
    "slug": "best-nashville-hot-chicken",
    "keyword": "Best Nashville Hot Chicken",
    "search_intent": "commercial",
    "created_at": "2025-12-18T16:59:20.197Z"
  }
}
```

### Listing Keywords

```bash
curl -X GET http://localhost:3001/api/businesses/{business_id}/keywords \
  -H "Authorization: Bearer local-dev-token"

# Response: Ordered by created_at DESC (newest first)
{
  "keywords": [
    {
      "id": "...",
      "business_id": "...",
      "slug": "...",
      "keyword": "...",
      "search_intent": "...",
      "created_at": "2025-12-18T17:00:00.000Z"
    },
    ...
  ]
}
```

### Updating Keywords

```bash
curl -X PUT http://localhost:3001/api/businesses/{business_id}/keywords/{keyword_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-dev-token" \
  -d '{
    "keyword": "Updated Keyword Text",
    "search_intent": "transactional"
  }'

# Note: Priority parameter is now ignored if provided
```

---

## Continuous Verification

### Before Committing

```bash
# Run smoke tests
npm run test:keywords-api

# Ensure dashboard builds
npm run build:dashboard

# Check for TypeScript errors
npm run typecheck
```

### CI/CD Integration

The smoke test script is designed for CI/CD pipelines:

- Minimal dependencies (just bash and curl)
- Self-contained test data creation/cleanup
- Clear pass/fail status
- Returns exit code 0 on success, 1 on failure

```bash
#!/bin/bash
# In your CI/CD pipeline:
NODE_ENV=development npm run dev:server &
sleep 5
npm run test:keywords-api
RESULT=$?
kill %1
exit $RESULT
```

---

## Known Limitations & Future Work

### Current Limitations

1. Integration tests require Jest setup and can be slower
2. Smoke tests clean up test data but leave no audit trail
3. Cannot run tests concurrently (single database)

### Future Enhancements

1. Add performance benchmarks for bulk operations
2. Implement database transaction rollback for test cleanup
3. Add load testing for high-volume keyword operations
4. Create test fixtures for common business scenarios

---

## Troubleshooting

### Tests Fail with "Connection Refused"

```
Error: Server did not respond
```

**Solution:** Ensure server is running

```bash
NODE_ENV=development npm run dev:server &
```

### Tests Fail with "Origin Required in Production"

```
CORS blocked: No origin header in production
```

**Solution:** Set NODE_ENV to development

```bash
NODE_ENV=development npm run dev:server
```

### Database Locked Error

```
SqliteError: database is locked
```

**Solution:** Close other connections to the database

```bash
pkill -f "ts-node src/index.ts"
npm run dev:server
```

### Foreign Key Constraint Failed

```
SqliteError: FOREIGN KEY constraint failed
```

**Solution:** Ensure all test data is deleted properly. The test script handles this automatically.

---

## References

- [Keywords API Endpoints](../api/ENDPOINTS.md#keywords)
- [Database Schema](../architecture/DATABASE.md)
- [CORS Configuration](../api/CORS.md)
- [API Authentication](../api/AUTH.md)
