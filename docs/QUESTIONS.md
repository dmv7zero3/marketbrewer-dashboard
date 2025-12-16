# Running Questions

Track open questions and decisions throughout development.

---

## Open

| ID | Date | Question | Context | Assigned |
|----|------|----------|---------|----------|
| Q-004 | 2025-12-16 | Should workers retry failed Ollama calls automatically? | Worker resilience | — |
| Q-005 | 2025-12-16 | What's the minimum questionnaire completeness for generation? | Currently 40% | Jorge |
| Q-006 | 2025-12-16 | Spanish content for Street Lawyer - same model or different? | Multi-language | — |

---

## Resolved

| ID | Date | Question | Resolution | Decided By |
|----|------|----------|------------|------------|
| Q-001 | 2025-12-16 | Flat structure vs monorepo? | Monorepo with `packages/` | Jorge |
| Q-002 | 2025-12-16 | SQLite vs DynamoDB for V1? | SQLite (local-first) | Jorge |
| Q-003 | 2025-12-16 | Cloud LLM fallback in V1? | No, Ollama only | Jorge |

---

## How to Use

### Adding a Question

1. Add to **Open** table with next ID
2. Include date, question, context
3. Assign if there's a clear owner

### Resolving a Question

1. Move from **Open** to **Resolved**
2. Add resolution and who decided
3. Update relevant docs if needed

### Question Categories

- **Architecture** — System design decisions
- **Implementation** — How to build something
- **Business** — Client requirements, priorities
- **Scope** — What's in/out of V1
