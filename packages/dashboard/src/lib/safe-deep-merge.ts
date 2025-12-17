/**
 * Safely deep merge server responses with expected data structures.
 * Handles null/undefined values, validates array types, and prevents corruption.
 */

import { BULK_LIMITS } from "./constants";

export function safeDeepMerge<T extends Record<string, unknown>>(
  target: T,
  source: unknown
): T {
  const seen = new WeakSet<object>();

  const merge = (
    tgt: Record<string, unknown>,
    src: unknown,
    depth: number
  ): Record<string, unknown> => {
    if (!src || typeof src !== "object") return tgt;
    if (depth <= 0) return tgt;

    const srcObj = src as Record<string, unknown>;
    const out: Record<string, unknown> = { ...tgt };

    const srcAsObj = src as object;
    if (seen.has(srcAsObj)) return tgt; // prevent cycles
    seen.add(srcAsObj);

    for (const [key, value] of Object.entries(srcObj)) {
      if (value === null || value === undefined) continue;
      const targetValue = out[key];

      if (
        typeof targetValue === "object" &&
        targetValue !== null &&
        !Array.isArray(targetValue) &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        out[key] = merge(
          targetValue as Record<string, unknown>,
          value as Record<string, unknown>,
          depth - 1
        );
      } else if (Array.isArray(value)) {
        // Validate array structure before assigning
        if (Array.isArray(targetValue)) {
          try {
            if (value.length > 0) {
              const firstElement = value[0];
              const targetFirstElement = (targetValue as unknown[])[0];
              if (
                firstElement &&
                targetFirstElement &&
                typeof firstElement !== typeof targetFirstElement
              ) {
                continue; // Skip malformed array
              }
            }
            out[key] = value;
          } catch {
            out[key] = targetValue; // On error, keep target array
          }
        } else {
          out[key] = value;
        }
      } else {
        out[key] = value; // primitives
      }
    }

    return out;
  };

  if (typeof target !== "object" || target === null) return target;
  return merge(
    target as Record<string, unknown>,
    source,
    BULK_LIMITS.MAX_RECURSION_DEPTH
  ) as T;
}
