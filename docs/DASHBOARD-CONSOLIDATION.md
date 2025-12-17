# Dashboard Consolidation Plan (MVP)

This document records the final dashboard component selection and implementation steps. Reference code lives in `local_seo_app` and must not be edited or pushed.

## Constraints

- Do not modify or push `local_seo_app/` — reference only.
- SQLite via `packages/server` for V1; Ollama-only worker.
- TypeScript strict; use `packages/shared` for types.
- Centralize API calls in a single client (`ApiService`) targeting local endpoints.

## Final Component Set (Keep)

- Shell: DashboardLayout, Header, Sidebar
- Overview: Dashboard
- Data management: BusinessProfile, WebsiteManagement, PromptsManagement, KeywordsManagement, ServiceAreas
- Generation: URLGeneration, PageContentGeneration
- Optional: LocalSEOPhotos (phase-gated), Billing (stub)
- Remove from final: BusinessServices and all "copy" duplicates

## Implementation Targets

- UI: `packages/dashboard/src/components/dashboard/*`
- Types: `packages/shared/src/*`
- API: `packages/server/src/*` (endpoints for profile, websites, prompts, keywords, service areas, URL queue, progress)

## Key Alignments

- Replace hardcoded IDs with `selectedBusiness` across pages.
- Normalize data at the server boundary; UI consumes shared types (not DynamoDB shapes).
- Canonicalize keywords/service areas consistently with URL pattern (lowercase, hyphenation).

## Tasks

1. Confirm final component set [Done]
2. Scaffold components under `packages/dashboard` [Pending]
3. Implement unified `ApiService` to local server [Pending]
4. Align UI state/types to `packages/shared` [Pending]
5. Update routes and `Sidebar` to final set [Pending]
6. Hook generation flows to server/worker queue [Pending]
7. QA: navigation, data fetches, URL generation, content queue [Pending]

## Notes

- Reference components in `local_seo_app/src/components/dashboard` for UI patterns only.
- Avoid direct AWS endpoints in UI; rebinding happens in the server.
