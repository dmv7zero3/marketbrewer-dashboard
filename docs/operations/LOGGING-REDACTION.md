# Logging & Redaction Guidelines

Guidance to avoid leaking PII or secrets in logs.

## Do not log
- API tokens, OAuth tokens, Claude API keys
- Full request bodies that may include PII
- Payment or billing data

## Safe to log
- Request IDs, job IDs, page IDs
- Status codes and timings
- Aggregated counts (e.g., pages generated)

## Implementation notes
- Prefer structured logs with explicit allow‑lists of fields
- If logging request data, redact fields like:
  - `authorization`
  - `token`
  - `email` (if not needed)
  - `phone`

## Review cadence
- Review logs quarterly for sensitive data leakage
- Add tests if new logging paths are introduced
