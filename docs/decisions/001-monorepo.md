# ADR 001: Monorepo Structure

**Status:** Accepted  
**Date:** 2025-12-16  
**Decided by:** Jorge Giraldez

---

## Context

The project has multiple components:
- Dashboard (React frontend)
- API Server (Express backend)
- Worker (Job processor)
- Shared types/utilities

Need to decide: flat structure vs monorepo with `packages/`.

---

## Decision

Use **monorepo with `packages/`** and npm workspaces.

```
marketbrewer-seo-platform/
├── packages/
│   ├── dashboard/
│   ├── server/
│   ├── worker/
│   └── shared/
└── package.json  # workspaces root
```

---

## Rationale

### Why Monorepo

1. **Clear separation** — Each package is self-contained
2. **npm workspaces** — Works cleanly with `"workspaces": ["packages/*"]`
3. **Standard pattern** — Familiar to most developers
4. **Shared code** — Easy to import `@marketbrewer/shared`
5. **Independent configs** — Each package has own tsconfig, deps

### Why Not Flat

Flat structure (`src/`, `server/`, `worker/` at root) creates confusion:
- Unclear which folders are npm packages
- `src/` typically means "source code" not "a package"
- Harder to run workspace commands

---

## Consequences

### Positive

- Clear mental model for developers
- Easy to add new packages
- Standard tooling works out of the box

### Negative

- One extra folder level (`packages/dashboard/src/` vs `src/`)
- Slightly longer import paths

---

## Alternatives Considered

1. **Flat structure** — Rejected (confusing package boundaries)
2. **Separate repos** — Rejected (harder to share code)
3. **Nx/Turborepo** — Overkill for V1 scope
