# DynamoDB Setup for Business Profiles

This document explains how to configure DynamoDB for persistent storage of business profile data.

---

## Overview

The MarketBrewer SEO Platform uses a hybrid storage strategy:

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Business Profiles | **DynamoDB** | Persistent, never lost, low cost |
| Questionnaires | **DynamoDB** | Critical configuration data |
| Keywords | **DynamoDB** | Master list, rarely changes |
| Service Areas | **DynamoDB** | Master list, rarely changes |
| Prompt Templates | **DynamoDB** | Versioned, need history |
| Generation Jobs | **SQLite** | High write volume, temporary |
| Job Pages | **SQLite** | Bulk writes, would be expensive |
| Workers | **SQLite** | Ephemeral status data |

---

## Cost Estimate

DynamoDB On-Demand pricing (us-east-1):

| Resource | Cost |
|----------|------|
| Storage | $0.25/GB/month |
| Writes | $1.25 per million |
| Reads | $0.25 per million |

**Estimated monthly cost for 10 businesses: < $1/month**

---

## Setup

### 1. AWS Credentials

Configure AWS credentials in your environment:

```bash
# Option A: Environment variables
export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
export AWS_REGION=us-east-1

# Option B: Add to packages/server/.env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
USE_DYNAMODB=true
```

### 2. Create Tables

Run the setup script to create DynamoDB tables:

```bash
npx ts-node scripts/dynamodb-setup.ts create-tables
```

This creates 5 tables with PAY_PER_REQUEST billing:
- `seo_businesses`
- `seo_questionnaires`
- `seo_keywords`
- `seo_service_areas`
- `seo_prompt_templates`

### 3. Migrate Existing Data

If you have existing data in SQLite, migrate it to DynamoDB:

```bash
# Migrate all businesses
npx ts-node scripts/dynamodb-setup.ts sync-to-dynamo

# Or migrate a specific business
npx ts-node scripts/dynamodb-setup.ts sync-to-dynamo <business-id>
```

### 4. Enable DynamoDB in Server

Add to `packages/server/.env`:

```env
USE_DYNAMODB=true
```

When the server starts, it will:
1. Connect to DynamoDB
2. Sync all business profiles to local SQLite
3. Use SQLite for fast reads during generation

---

## CLI Commands

```bash
# Create DynamoDB tables
npx ts-node scripts/dynamodb-setup.ts create-tables

# Check connection status
npx ts-node scripts/dynamodb-setup.ts status

# List businesses in DynamoDB
npx ts-node scripts/dynamodb-setup.ts list-businesses

# Sync SQLite → DynamoDB (backup/migrate)
npx ts-node scripts/dynamodb-setup.ts sync-to-dynamo [business-id]

# Sync DynamoDB → SQLite (restore)
npx ts-node scripts/dynamodb-setup.ts sync-from-dynamo [business-id]

# Export business data as JSON
npx ts-node scripts/dynamodb-setup.ts export <business-id>
```

---

## Table Schemas

### seo_businesses

| Attribute | Type | Key |
|-----------|------|-----|
| business_id | String | PK |
| name | String | |
| industry | String | |
| phone | String | |
| email | String | |
| website | String | |
| created_at | String | |
| updated_at | String | |
| _version | Number | Optimistic lock |
| _deleted | Boolean | Soft delete |

### seo_questionnaires

| Attribute | Type | Key |
|-----------|------|-----|
| business_id | String | PK |
| data | Map | JSON questionnaire |
| completeness_score | Number | |
| created_at | String | |
| updated_at | String | |
| _version | Number | Optimistic lock |

### seo_keywords

| Attribute | Type | Key |
|-----------|------|-----|
| business_id | String | PK |
| keyword_id | String | SK (slug#language) |
| slug | String | |
| keyword | String | |
| language | String | en or es |
| search_intent | String | |
| created_at | String | |
| _deleted | Boolean | Soft delete |

### seo_service_areas

| Attribute | Type | Key |
|-----------|------|-----|
| business_id | String | PK |
| area_id | String | SK (slug) |
| slug | String | |
| city | String | |
| state | String | |
| country | String | |
| county | String | |
| priority | Number | |
| created_at | String | |
| updated_at | String | |
| _deleted | Boolean | Soft delete |

### seo_prompt_templates

| Attribute | Type | Key |
|-----------|------|-----|
| business_id | String | PK |
| template_id | String | SK (page_type#version) |
| page_type | String | |
| version | Number | |
| template | String | |
| required_variables | List | |
| optional_variables | List | |
| word_count_target | Number | |
| is_active | Boolean | |
| created_at | String | |
| _deleted | Boolean | Soft delete |

---

## Delete Protection

All delete operations are protected:

### Soft Deletes
- Records are marked with `_deleted: true` instead of being removed
- Data remains in DynamoDB for recovery

### Backup on Delete
- Before any delete, a JSON backup is created in `packages/server/data/backups/`
- Backups are retained for 30 days

### Delete Confirmation Header
When using the API, destructive operations require:

```
X-Confirm-Delete: I-UNDERSTAND-THIS-IS-DESTRUCTIVE
```

### Rate Limiting
- Maximum 10 deletes per entity type per hour
- Prevents bulk accidental deletions

### Recovery

List available backups:
```bash
ls packages/server/data/backups/
```

Restore from backup (manual):
```typescript
import { restoreFromBackup } from './services/delete-protection';
restoreFromBackup(db, '/path/to/backup.json');
```

---

## Sync Behavior

### On Server Start
1. If `USE_DYNAMODB=true`, connect to DynamoDB
2. Sync all business profiles to SQLite
3. SQLite becomes a read cache

### On Write Operations
1. Write to DynamoDB first (source of truth)
2. Then update SQLite cache
3. If DynamoDB fails, operation fails (no partial updates)

### On Delete Operations
1. Create backup file
2. Soft delete in DynamoDB
3. Remove from SQLite cache

---

## Troubleshooting

### "DynamoDB not available"

Check:
1. AWS credentials are set correctly
2. Region matches table region
3. IAM user has DynamoDB permissions

Required IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchWriteItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/seo_*"
    }
  ]
}
```

### "Version mismatch" error

This means another process updated the record. Refresh and retry:
```typescript
const business = await getBusiness(id);
await updateBusiness(id, updates, business._version);
```

### Data not syncing

1. Check `USE_DYNAMODB=true` in .env
2. Restart the server to trigger sync
3. Check server logs for sync errors
