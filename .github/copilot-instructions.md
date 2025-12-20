# MarketBrewer SEO Platform — Copilot Instructions

**Project:** Local SEO content generation platform
**Owner:** Jorge Giraldez, MarketBrewer LLC
**Version:** 1.0 (Local-First)

---

## Quick Reference

| Component    | Location              | Tech                                         | Status      |
| ------------ | --------------------- | -------------------------------------------- | ----------- |
| Dashboard    | `packages/dashboard/` | React 18 + TypeScript + Tailwind + Webpack 5 | ✅ Working  |
| API Server   | `packages/server/`    | Express + TypeScript + SQLite                | ✅ Working  |
| Worker       | `packages/worker/`    | TypeScript + Ollama                          | ✅ Working  |
| Shared Types | `packages/shared/`    | TypeScript                                   | ✅ Complete |

---

## Documentation Index

All detailed documentation lives in `docs/`. Read the relevant file before starting work.

| Topic             | File                                |
| ----------------- | ----------------------------------- |
| Project overview  | `docs/README.md`                    |
| File structure    | `docs/STRUCTURE.md`                 |
| Code conventions  | `docs/CONVENTIONS.md`               |
| Architecture      | `docs/architecture/OVERVIEW.md`     |
| API endpoints     | `docs/api/ENDPOINTS.md`             |
| CORS policy       | `docs/api/CORS.md`                  |
| Database schema   | `docs/architecture/DATABASE.md`     |
| Worker queue      | `docs/architecture/WORKER-QUEUE.md` |
| Prompt templates  | `docs/reference/PROMPTS.md`         |
| Running questions | `docs/QUESTIONS.md`                 |

---

## Current Status (Dec 20, 2024)

**✅ Completed:**

- Phase 1: Foundation (server, worker, dashboard scaffolds)
- Phase 2: Ollama Integration Sprint
- Phase 3: Dashboard UI Components
- Phase 4: Prompt Template System
- P0 Fixes: Named parameters, atomic claim, health checks, AbortController
- Database: Seeded with 26 Nash & Smashed locations, 50+ keywords
- End-to-end: Tested with real Ollama (llama3.2:latest)

**📊 Test Data (Nash & Smashed):**

- 26 service areas (VA, MD, DC, SC, NY)
- 50+ keywords (bilingual EN/ES with shared slugs)
- 1,300+ potential pages (keywords × locations)

**📊 Test Data (Street Lawyer Magic):**

- 17 bilingual services (Criminal Defense, DUI, etc.)
- Multiple service areas

---

## Dashboard Components

| Component           | File                                         | Features                                              |
| ------------------- | -------------------------------------------- | ----------------------------------------------------- |
| Keywords Management | `KeywordsManagement.tsx`                     | Bilingual pairs (EN/ES), bulk add, shared slugs       |
| Services Management | `ServicesManagement.tsx`                     | Bilingual services, primary service flag              |
| Service Areas       | `ServiceAreas.tsx`                           | City/State/County, bulk add CSV                       |
| Prompts Management  | `PromptsManagement.tsx`                      | Template editor, preview, variable reference          |
| Business Profile    | `BusinessProfile.tsx`                        | Core business info, industry type                     |
| Locations           | `LocationsManagement.tsx`                    | Physical locations with GBP integration               |

### Shared UI Components

| Component      | Location                          | Usage                                   |
| -------------- | --------------------------------- | --------------------------------------- |
| EmptyState     | `components/ui/EmptyState.tsx`    | Consistent empty states with icons      |
| ConfirmDialog  | `components/ui/ConfirmDialog.tsx` | Delete confirmations, danger actions    |
| useConfirmDialog | `hooks/useConfirmDialog.ts`     | Hook for async confirmation flow        |

---

## Prompt Template System

### Data Flow

```
Dashboard → API → prompt_templates table → Worker claims page →
Server returns template → Worker substitutes {{variables}} → Ollama → Content
```

### Template Variables

Templates use `{{variable_name}}` syntax. Available variables:

**Required:**
- `business_name`, `city`, `state`, `phone`

**From Business Profile:**
- `industry`, `industry_type`, `email`, `website`, `gbp_url`
- `primary_city`, `primary_state`

**From Questionnaire:**
- `tagline`, `year_established`, `years_experience`, `owner_name`
- `target_audience`, `languages`, `voice_tone`, `tone`
- `cta_text`, `forbidden_terms`, `service_type`

**From Keywords/Services:**
- `keyword`, `primary_keyword`, `primary_service`, `services_list`
- `url_path`, `language`, `output_language`

### Page Types

- `location-keyword`: Keyword × Store Locations (where business has stores)
- `service-area`: Keyword × Service Areas (nearby cities served)

---

## API Patterns

### AbortController

All dashboard API calls support `AbortSignal` for race condition prevention:

```typescript
useEffect(() => {
  const controller = new AbortController();
  loadData({ signal: controller.signal });
  return () => controller.abort();
}, [dependency]);
```

### Claim Endpoint Response

`POST /api/jobs/:jobId/claim` returns enriched data:

```typescript
{
  page: JobPage,
  business: BusinessData | null,
  questionnaire: Record<string, unknown>,
  template: TemplateData | null
}
```

---

## Core Rules

1. **Read docs first** — Check `docs/` before implementing
2. **TypeScript strict** — No `any`, explicit return types
3. **Single source of truth** — One place for each config/behavior
4. **SQLite for V1** — No DynamoDB in V1
5. **Ollama only** — No cloud LLM fallback in V1
6. **Bilingual support** — EN/ES with shared slugs for keywords/services
7. **AbortController** — All useEffect data fetches must be cancellable

---

## File Naming

| Type             | Convention          | Example               |
| ---------------- | ------------------- | --------------------- |
| Utilities        | `kebab-case.ts`     | `api-client.ts`       |
| React components | `PascalCase.tsx`    | `BusinessProfile.tsx` |
| Types            | `kebab-case.ts`     | `business.ts`         |
| Docs             | `SCREAMING-CASE.md` | `CONVENTIONS.md`      |
| Sub-components   | `folder/index.ts`   | `prompts/index.ts`    |

---

## Component Patterns

### Tabs Structure
Most management components use this tab pattern:
- **Manage**: List/edit items
- **Bulk Add**: CSV paste for batch creation
- **Instructions**: User guidance
- **Settings** (optional): Language/display preferences

### EmptyState Icons
Use `EmptyStateIcons.{type}` for consistent empty states:
```typescript
import { EmptyState, EmptyStateIcons } from "../ui/EmptyState";

<EmptyState
  icon={EmptyStateIcons.keywords}  // or: locations, serviceAreas, services, prompts
  title="No items"
  description="Add your first item"
  action={{ label: "Add", onClick: handleAdd }}
/>
```

### ConfirmDialog
Use the hook for delete confirmations:
```typescript
const { confirm, dialogProps, setIsLoading } = useConfirmDialog();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Delete item?",
    message: "This cannot be undone.",
    variant: "danger"
  });
  if (confirmed) { /* delete */ }
};

return <><button onClick={handleDelete}>Delete</button><ConfirmDialog {...dialogProps} /></>;
```

---

## Before You Code

1. Check `docs/QUESTIONS.md` for open questions
2. Read the relevant `docs/` file for your task
3. Follow `docs/CONVENTIONS.md` for code style
4. Update docs if you change behavior
5. Run `npx tsc --noEmit -p packages/{package}/tsconfig.json` to verify types

---

## Contact

Jorge Giraldez
j@marketbrewer.com | 703-463-6323
