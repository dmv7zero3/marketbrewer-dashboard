# Reference: CI/CD Plan

Simple CI/CD setup using GitHub Actions for V1.

---

## Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Commit    │────▶│   GitHub    │────▶│   Deploy    │
│   to main   │     │   Actions   │     │   (Local)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

V1 is local-first, so CI focuses on **build verification** and **testing**.

---

## Workflows

### 1. Build & Test (On Every Push)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build shared package
        run: npm run build --workspace=packages/shared
      
      - name: Build server
        run: npm run build --workspace=packages/server
      
      - name: Build worker
        run: npm run build --workspace=packages/worker
      
      - name: Build dashboard
        run: npm run build --workspace=packages/dashboard
      
      - name: Run tests
        run: npm test

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript check
        run: npx tsc --noEmit
```

### 2. Release Build (On Tag)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install and build
        run: |
          npm ci
          npm run build
      
      - name: Create release archive
        run: |
          tar -czf release-${{ github.ref_name }}.tar.gz \
            packages/*/dist \
            packages/*/package.json \
            package.json
      
      - name: Upload release
        uses: softprops/action-gh-release@v1
        with:
          files: release-${{ github.ref_name }}.tar.gz
```

---

## Local Deployment Script

Since V1 runs locally, use a simple deploy script:

```bash
#!/bin/bash
# scripts/deploy-local.sh

set -e

echo "=== MarketBrewer SEO Platform - Local Deploy ==="

# Pull latest
git pull origin main

# Install dependencies
npm ci

# Build all packages
npm run build

# Restart services (if using pm2)
if command -v pm2 &> /dev/null; then
  pm2 restart seo-api || pm2 start packages/server/dist/index.js --name seo-api
  pm2 restart seo-worker || pm2 start packages/worker/dist/index.js --name seo-worker
else
  echo "Start manually:"
  echo "  cd packages/server && npm start"
  echo "  cd packages/worker && npm start"
fi

echo "=== Deploy complete ==="
```

---

## Pre-commit Hooks

```bash
# Install husky
npm install -D husky
npx husky init

# .husky/pre-commit
#!/bin/sh
npm run lint
npm run typecheck
```

---

## Version Tagging

```bash
# Create release tag
git tag -a v1.0.0 -m "V1 Release - Local-first SEO platform"
git push origin v1.0.0

# Semantic versioning
# v1.0.0 - Initial release
# v1.1.0 - New features (e.g., EC2 worker support)
# v1.0.1 - Bug fixes
```

---

## Environment Management

### Development

```bash
# .env.development
API_PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```

### Production

```bash
# .env.production
API_PORT=3001
NODE_ENV=production
LOG_LEVEL=info
```

---

## Database Migrations (Future)

```bash
# scripts/migrate.sh
#!/bin/bash

MIGRATIONS_DIR="packages/server/migrations"
DB_PATH="${DATABASE_PATH:-./data/seo-platform.db}"

for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  echo "Running: $migration"
  sqlite3 $DB_PATH < $migration
done
```

---

## Prompt Template Deployment

```bash
# scripts/deploy-prompts.sh
#!/bin/bash

# Copy prompt templates to database or config
PROMPTS_DIR="config/prompts"
API_URL="${API_URL:-http://localhost:3001}"

for template in $(ls $PROMPTS_DIR/*.json); do
  echo "Deploying: $template"
  curl -X POST "$API_URL/api/prompts" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d @$template
done
```

---

## Rollback Procedure

```bash
# Rollback to previous version
git checkout v1.0.0
npm ci
npm run build

# Restart services
pm2 restart all

# Or manual
pkill -f "node.*server"
pkill -f "node.*worker"
npm start
```

---

## Checklist Before Deploy

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Environment variables set
- [ ] Database backup taken (if data exists)
- [ ] Workers stopped before migration
- [ ] Prompt templates reviewed
