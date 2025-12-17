# Dashboard Implementation Plan

Status: Planning • Date: 2025-12-17

This plan outlines tasks to implement the Dashboard MVP under `packages/dashboard`, aligned to local APIs and shared types.

## Workstreams

- UI Scaffolding
- API Client & Rebinding
- Shared Types Alignment
- Routing & Sidebar
- Generation Workflows
- QA & Validation

## Tasks

### 1) UI Scaffolding (packages/dashboard)

- Create `src/components/dashboard` and scaffold:
  - DashboardLayout, Header, Sidebar
  - Dashboard (overview)
  - BusinessProfile, WebsiteManagement, PromptsManagement
  - KeywordsManagement, ServiceAreas
  - URLGeneration, PageContentGeneration
- Ensure strict TS, no `any`, consistent naming per `docs/CONVENTIONS.md`.

### 2) API Client & Rebinding

- Implement `ApiService` in `packages/dashboard/src/api/api-client.ts`:
  - Endpoints: business list, profile CRUD, websites, prompts, keywords, service areas, URLs, progress, queue submission.
- Remove direct AWS URLs; use local server base (config-driven).
- Handle errors with consistent toasts and retry semantics where needed.

### 3) Shared Types Alignment

- Import interfaces from `packages/shared/src` (e.g., `BusinessProfile`, `Website`, `Prompt`).
- Map server responses to shared types; avoid DynamoDB-shaped UI code.
- Canonicalize keywords/service areas: lowercase, hyphenation.

### 4) Routing & Sidebar

- Configure routes in dashboard app to match final component set.
- Update `Sidebar` menu to the final set; persist `selectedBusiness`.

### 5) Generation Workflows

- `URLGeneration`: generate using `selectedBusiness` keywords/service areas; save URLs via server.
- `PageContentGeneration`: submit selected URLs + active prompt to server queue; show progress/status.
- Progress polling: surface completion % and per-URL status.

### 6) QA & Validation

- Navigation: verify all pages load under selected business.
- Data flows: profile load/update, website set-active, prompts edit/save.
- Bulk ops: keywords/service areas add/remove/clear with server-side validation.
- Generation: URL save, queue submit, progress polling.

## Dependencies

- `packages/server`: endpoints for profile, websites, prompts, keywords, service areas, URL queue, progress.
- `packages/shared`: type definitions and strict TypeScript settings.

## Configuration

- Single source of truth for API base URL in a config module.
- Feature flags: optional pages (LocalSEOPhotos, Billing) gated via config.

## Testing Plan

- Component-level tests for `ApiService` stubs and reducers.
- Integration tests for URL generation logic and prompt updates.
- Manual QA on progress polling and error handling.

## Rollout

- Implement incrementally by workstream.
- Keep `docs/DASHBOARD-CONSOLIDATION.md` and `docs/PHASE3-DASHBOARD-MVP.md` updated if scope changes.
