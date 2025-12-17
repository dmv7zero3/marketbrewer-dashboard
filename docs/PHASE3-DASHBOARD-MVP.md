# Phase 3 — Dashboard MVP

Status: Planning • Date: 2025-12-17

This phase consolidates the dashboard UI, rebinding data flows to the local API server and shared types while removing AWS/DynamoDB-specific coupling present in reference components.

## Objectives

- Deliver a cohesive dashboard MVP aligned to V1 rules (SQLite, Ollama-only).
- Centralize API access via `ApiService` to `packages/server` endpoints.
- Standardize UI to `packages/shared` types (no DynamoDB shapes in the UI).
- Enable URL generation and page content queuing end-to-end.

## Scope

- Shell & Navigation: DashboardLayout, Header, Sidebar
- Overview: Dashboard
- Data Management: BusinessProfile, WebsiteManagement, PromptsManagement, KeywordsManagement, ServiceAreas
- Generation: URLGeneration, PageContentGeneration
- Optional (phase-gated): LocalSEOPhotos, Billing

See component selection and constraints in: `docs/DASHBOARD-CONSOLIDATION.md`.

## Non-Goals (for this phase)

- External storage/upload features beyond MVP (e.g., GBP photos if deferred).
- Billing integrations or payments logic beyond the stub.
- Direct AWS endpoint usage from the UI.

## Deliverables

- Implemented components under `packages/dashboard` using unified `ApiService`.
- Routes and Sidebar updated to the final set.
- Worker queue integration for content generation via local server.
- Basic progress/metrics surfaced in `Dashboard` (completed/total, statuses).

## Milestones

1. Component scaffolding & routing
2. API client & endpoint rebindings
3. URL generation + persistence
4. Content generation queue integration
5. QA pass: navigation and data flows

## Risks & Mitigations

- Endpoint mismatch: Document and align server routes; add 404/500 UI handling.
- Data normalization gaps: Normalize at server boundary; validate inputs on bulk ops.
- Timeline creep from optional features: Phase-gate LocalSEOPhotos/Billing.

## Next Actions

- Confirm inclusion of optional components (LocalSEOPhotos, Billing).
- Proceed with implementation plan in `docs/DASHBOARD-IMPLEMENTATION-PLAN.md`.
