# Code Conventions

Single source of truth for code style across all packages.

---

## TypeScript

### Compiler Settings

All packages use strict mode:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### Explicit Types

Always specify return types on functions:

```typescript
// ✅ Good
function getBusinessById(id: string): Promise<Business | null> {
  // ...
}

// ❌ Bad
function getBusinessById(id: string) {
  // ...
}
```

### Interface vs Type

Use `interface` for object shapes, `type` for unions/aliases:

```typescript
// Object shape → interface
interface Business {
  id: string;
  name: string;
}

// Union → type
type Status = 'pending' | 'processing' | 'completed' | 'failed';
```

---

## Naming

| Category | Convention | Example |
|----------|------------|---------|
| Files (utilities) | `kebab-case.ts` | `api-client.ts` |
| Files (React) | `PascalCase.tsx` | `BusinessProfile.tsx` |
| Variables | `camelCase` | `businessId` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES` |
| Types/Interfaces | `PascalCase` | `Business`, `JobStatus` |
| React components | `PascalCase` | `BusinessProfile` |
| Database tables | `snake_case` | `job_pages` |
| API routes | `kebab-case` | `/service-areas` |

---

## React Components

### File Template

```typescript
import React from 'react';

interface BusinessProfileProps {
  /** The business ID to display */
  businessId: string;
  /** Called when profile is updated */
  onUpdate?: () => void;
}

export const BusinessProfile: React.FC<BusinessProfileProps> = ({
  businessId,
  onUpdate,
}) => {
  return (
    <div>
      {/* Implementation */}
    </div>
  );
};
```

### Component Rules

1. One component per file
2. Export named, not default
3. Props interface above component
4. JSDoc comments for props

---

## Express Routes

### Route Handler Template

```typescript
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const CreateBusinessSchema = z.object({
  name: z.string().min(1),
  industry: z.string().min(1),
});

router.post('/', async (req, res) => {
  try {
    const data = CreateBusinessSchema.parse(req.body);
    const business = await db.createBusiness(data);
    res.status(201).json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      });
    } else {
      throw error; // Let error handler catch it
    }
  }
});

export default router;
```

---

## Error Handling

### API Error Format

All API errors use this shape:

```typescript
interface ApiError {
  error: string;   // Human-readable message
  code: string;    // Machine-readable code
  details?: unknown;
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource conflict (e.g., job already claimed) |
| `INSUFFICIENT_DATA` | 422 | Questionnaire incomplete |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Imports

### Order

1. Node built-ins
2. External packages
3. Internal packages (`@marketbrewer/*`)
4. Relative imports

```typescript
import path from 'path';

import express from 'express';
import { z } from 'zod';

import { Business } from '@marketbrewer/shared';

import { db } from '../db/connection';
import { logger } from '../utils/logger';
```

---

## Comments

### When to Comment

- **Do:** Explain *why*, not *what*
- **Do:** JSDoc for public APIs
- **Don't:** Comment obvious code
- **Don't:** Leave commented-out code

```typescript
// ✅ Good - explains why
// Use atomic UPDATE...RETURNING to prevent race conditions
const page = await db.claimPage(jobId, workerId);

// ❌ Bad - explains what (obvious)
// Get the page from the database
const page = await db.getPage(pageId);
```

---

## Testing

### File Naming

Test files live next to source files:

```
src/
├── services/
│   ├── business.ts
│   └── business.test.ts
```

### Test Structure

```typescript
describe('BusinessService', () => {
  describe('create', () => {
    it('creates a business with valid data', async () => {
      // ...
    });

    it('throws on missing required fields', async () => {
      // ...
    });
  });
});
```
