# ADR 003: Ollama Only for V1

**Status:** Accepted  
**Date:** 2025-12-16  
**Decided by:** Jorge Giraldez

---

## Context

Need LLM for content generation. Options:
- Local: Ollama (llama3.2, dolphin3)
- Cloud: Claude (Haiku/Sonnet), OpenAI (GPT-4o-mini)

---

## Decision

Use **Ollama only** for V1. No cloud LLM fallback.

---

## Rationale

### Why Ollama Only

1. **$0 cost** — No API charges
2. **Privacy** — All data stays local
3. **No rate limits** — Generate as fast as hardware allows
4. **Simpler architecture** — No fallback logic
5. **Good enough quality** — llama3.2 sufficient for SEO pages

### Why Not Cloud Fallback (V1)

1. Adds complexity (retry logic, API keys, error handling)
2. Costs money
3. Not needed if Ollama works reliably
4. Can add later without changing architecture

### Speed Estimates

| Setup | Pages/Hour |
|-------|------------|
| 1 laptop (Ollama) | 30-40 |
| 2 laptops (Ollama) | 60-80 |
| + EC2 GPU (Ollama) | 200+ |

For 3,750 pages: ~50-60 hours with 2 laptops (2-3 days).

---

## Consequences

### Positive

- Zero LLM costs in V1
- Complete data privacy
- No external dependencies
- Faster iteration (no API debugging)

### Negative

- Slower than cloud (1-2 min vs 5-10 sec per page)
- Quality may be lower than Claude Sonnet
- Requires powerful laptop (M1+ or good Intel)

### Mitigations

- Run overnight for large batches
- Add EC2 GPU worker for time-sensitive jobs
- Design provider interface for future cloud addition

---

## Provider Interface

Keep clean interface for future:

```typescript
interface LLMProvider {
  generate(prompt: string, options: GenerateOptions): Promise<string>;
}

// V1: Only Ollama
const provider = new OllamaProvider();

// Future: Add fallback
const provider = new FallbackProvider([
  new OllamaProvider(),
  new ClaudeProvider(),
]);
```

---

## Phase 2 Trigger

Add cloud fallback when:
- Quality issues with Ollama
- Need faster generation (< 24 hour batches)
- Ollama availability issues

---

## Alternatives Considered

1. **Claude Haiku from start** — Rejected ($3-5 per 1000 pages)
2. **Hybrid from start** — Rejected (complexity)
3. **OpenAI only** — Rejected (cost, less control)
