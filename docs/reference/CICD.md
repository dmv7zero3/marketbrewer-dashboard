# CI/CD

GitHub Actions workflows and deployment scripts.

---

## Overview

V1 is local-first, so CI focuses on build verification.

```
Commit → GitHub Actions → Build & Test
                              ↓
                         Pull to Local
```

---

## Workflows

### CI (Every Push)

Location: `.github/workflows/ci.yml`

```yaml
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
      
      - name: Build packages
        run: npm run build
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Run tests
        run: npm test
```

### Release (On Tag)

Location: `.github/workflows/release.yml`

```yaml
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
      
      - name: Build
        run: |
          npm ci
          npm run build
      
      - name: Create archive
        run: |
          tar -czf release-${{ github.ref_name }}.tar.gz \
            packages/*/dist \
            package.json
      
      - name: Upload release
        uses: softprops/action-gh-release@v1
        with:
          files: release-${{ github.ref_name }}.tar.gz
```

---

## Local Deployment

Location: `scripts/deploy-local.sh`

```bash
#!/bin/bash
set -e

echo "=== MarketBrewer SEO Platform - Deploy ==="

git pull origin main
npm ci
npm run build

# Restart if using pm2
if command -v pm2 &> /dev/null; then
  pm2 restart seo-api || pm2 start packages/server/dist/index.js --name seo-api
  pm2 restart seo-worker || pm2 start packages/worker/dist/index.js --name seo-worker
else
  echo "Start manually:"
  echo "  npm run dev:server"
  echo "  npm run dev:worker"
fi

echo "=== Deploy complete ==="
```

---

## Version Tagging

```bash
# Create release
git tag -a v1.0.0 -m "V1 Release"
git push origin v1.0.0

# Semantic versioning
# v1.0.0 - Initial release
# v1.1.0 - New features
# v1.0.1 - Bug fixes
```

---

## Pre-commit Hooks

```bash
# Install husky
npm install -D husky
npx husky init

# .husky/pre-commit
npm run lint
npm run typecheck
```

---

## Environment Files

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

## Database Migrations

```bash
#!/bin/bash
# scripts/migrate.sh

MIGRATIONS_DIR="packages/server/migrations"
DB_PATH="${DATABASE_PATH:-./data/seo-platform.db}"

for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  echo "Running: $migration"
  sqlite3 $DB_PATH < $migration
done
```

---

## Deploy Checklist

- [ ] All tests passing
- [ ] TypeScript compiles
- [ ] Environment variables set
- [ ] Database backup taken
- [ ] Workers stopped (for migrations)
- [ ] Prompt templates reviewed
