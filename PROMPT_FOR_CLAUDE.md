# Task: Implement Prompts Management Component

## Context

You have access to the GitHub repository `dmv7zero3/marketbrewer-seo-platform`. I need you to implement a fully functional Prompts Management component following the established patterns in the codebase.

**Recent Changes (Just Pushed):**

- Commit `55b7669`: Service Areas and SEO Keywords now have tabbed interfaces
- Pattern: 3 tabs (Manage, Bulk Add, Instructions)
- Both use consistent UX: tab navigation, inline forms, bulk operations with CSV parsing

## Current State

**File:** `packages/dashboard/src/components/dashboard/PromptsManagement.tsx`

- Currently just a stub with 23 lines
- Only shows title and business selector

**Database Schema:** `prompt_templates` table

```typescript
export interface PromptTemplate {
  id: string;
  business_id: string;
  page_type: "service-location" | "keyword-location";
  version: number;
  template: string;
  required_variables: string | null; // JSON array
  optional_variables: string | null; // JSON array
  word_count_target: number;
  is_active: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}
```

## Requirements

Implement PromptsManagement.tsx with **3 tabs**:

### Tab 1: Templates (Manage)

- **List view** of all prompt templates for selected business
- Display: Page type badge, version, active status indicator, word count target
- **Inline editing** when clicking a template:
  - Large textarea for template content (20+ rows, monospace font)
  - Page type dropdown (service-location | keyword-location)
  - Version number input
  - Word count target input
  - Required variables (comma-separated input → JSON array)
  - Optional variables (comma-separated input → JSON array)
  - Active toggle checkbox
  - Save/Cancel buttons
- **Add new template** button at top
- **Delete button** per template

### Tab 2: Variables (Reference)

Show available template variables in organized sections:

**Required Variables (All Templates):**

- `{{business_name}}` - Business profile
- `{{city}}` - Service area
- `{{state}}` - Service area
- `{{phone}}` - Business profile

**Optional Variables (Enhance Quality):**

- `{{years_experience}}` - Questionnaire
- `{{differentiators}}` - Questionnaire
- `{{target_audience}}` - Questionnaire
- `{{cta_text}}` - Content preferences
- `{{industry}}` - Business profile
- `{{primary_service}}` - Services
- `{{primary_keyword}}` - Keyword
- `{{search_intent}}` - Keyword
- `{{tone}}` - Content preferences

Display in a clean table or card layout with variable name, description, and source.

### Tab 3: Instructions

Documentation for writing effective prompts:

**Sections:**

1. **Output Format Requirements**

   - All prompts must return JSON: `{ "title": "...", "metaDescription": "...", "body": "..." }`
   - Title: ≤70 characters
   - Meta description: ≤160 characters
   - Body: 350-450 words

2. **Template Syntax**

   - Use double curly braces: `{{variable_name}}`
   - Variables are replaced at generation time
   - Don't invent facts not provided

3. **Best Practices**

   - Mention location 2-3 times naturally
   - Include phone number once in body
   - Clear call-to-action
   - Service-location pages focus on service + location
   - Keyword-location pages optimize for search intent

4. **Page Types**
   - **service-location**: Business service in a city (e.g., "HVAC repair in Sterling, VA")
   - **keyword-location**: Keyword-focused page (e.g., "best fried chicken in Arlington")

## Technical Requirements

### API Functions Needed

Create `packages/dashboard/src/api/prompts.ts`:

```typescript
import type { PromptTemplate } from "@marketbrewer/shared";

// List all prompt templates for a business
export async function listPromptTemplates(
  businessId: string
): Promise<{ prompt_templates: PromptTemplate[] }>;

// Get single template
export async function getPromptTemplate(
  businessId: string,
  templateId: string
): Promise<{ prompt_template: PromptTemplate }>;

// Create new template
export async function createPromptTemplate(
  businessId: string,
  data: {
    page_type: "service-location" | "keyword-location";
    version: number;
    template: string;
    required_variables?: string[];
    optional_variables?: string[];
    word_count_target: number;
    is_active?: boolean;
  }
): Promise<{ prompt_template: PromptTemplate }>;

// Update existing template
export async function updatePromptTemplate(
  businessId: string,
  templateId: string,
  data: Partial<{
    page_type: "service-location" | "keyword-location";
    version: number;
    template: string;
    required_variables: string[];
    optional_variables: string[];
    word_count_target: number;
    is_active: boolean;
  }>
): Promise<{ prompt_template: PromptTemplate }>;

// Delete template
export async function deletePromptTemplate(
  businessId: string,
  templateId: string
): Promise<void>;
```

### Server Routes Needed

Create `packages/server/src/routes/prompts.ts` following the patterns in:

- `packages/server/src/routes/keywords.ts`
- `packages/server/src/routes/service-areas.ts`

**Endpoints:**

- `GET /businesses/:id/prompts` - List templates
- `GET /businesses/:id/prompts/:promptId` - Get single template
- `POST /businesses/:id/prompts` - Create template
- `PUT /businesses/:id/prompts/:promptId` - Update template
- `DELETE /businesses/:id/prompts/:promptId` - Delete template

**Notes:**

- Convert arrays to JSON strings for storage: `JSON.stringify(required_variables)`
- Parse back to arrays: `JSON.parse(row.required_variables || "[]")`
- Use `generateId()` from `@marketbrewer/shared`
- Use parameterized queries to prevent SQL injection
- Return 404 if business or template not found

### Register Routes

Add to `packages/server/src/server.ts`:

```typescript
import promptsRouter from "./routes/prompts";
app.use("/businesses", promptsRouter);
```

## Patterns to Follow

**Study these files:**

1. `packages/dashboard/src/components/dashboard/ServiceAreas.tsx` - Tab pattern, bulk operations
2. `packages/dashboard/src/components/dashboard/KeywordsManagement.tsx` - Form handling, list view
3. `packages/dashboard/src/api/keywords.ts` - API client pattern
4. `packages/server/src/routes/keywords.ts` - Server route pattern

**Key conventions:**

- State management: `useState` for component state
- Loading states: Show "Loading..." while fetching
- Error handling: Display errors with red text, use toast notifications
- Validation: Client-side validation before API calls
- IDs: `deletingIds` and `updatingIds` sets to track in-flight operations
- Styling: Tailwind classes matching existing components
- Toasts: Use `addToast()` from `useToast()` context

## Deliverable Format

Provide complete, production-ready code files in this format:

```
FILE: packages/dashboard/src/api/prompts.ts
---
[FULL FILE CONTENT]
---

FILE: packages/server/src/routes/prompts.ts
---
[FULL FILE CONTENT]
---

FILE: packages/dashboard/src/components/dashboard/PromptsManagement.tsx
---
[FULL FILE CONTENT]
---

FILE: packages/server/src/server.ts
CHANGES:
[SHOW ONLY THE LINES TO ADD/MODIFY]
---
```

## Important Notes

1. **Follow existing patterns exactly** - Don't introduce new patterns or libraries
2. **Use TypeScript strict mode** - No `any` types, explicit return types
3. **Match the styling** - Use same Tailwind classes as ServiceAreas/Keywords
4. **Error handling** - Try/catch blocks with user-friendly messages
5. **No stub code** - Everything must be fully functional
6. **Database schema** - prompt_templates table already exists, don't create migration

## Questions?

If you need clarification on any part, ask before implementing. I need this to work perfectly on first try.

---

**Ready to start? Please acknowledge you understand the requirements and have reviewed the referenced files in the repo.**
