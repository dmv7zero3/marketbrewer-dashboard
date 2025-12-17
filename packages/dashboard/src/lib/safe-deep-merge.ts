/**
 * Safely deep merge server responses with expected data structures.
 * Handles null/undefined values, validates array types, and prevents corruption.
 */

import { BULK_LIMITS } from "./constants";

const exceedsDepth = (
  value: unknown,
  limit: number,
  currentDepth = 0,
  seen = new WeakSet<object>()
): boolean => {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value as object)) return false;
  seen.add(value as object);

  if (currentDepth >= limit) return true;

  for (const child of Object.values(value as Record<string, unknown>)) {
    if (exceedsDepth(child, limit, currentDepth + 1, seen)) return true;
  }
  return false;
};

export function safeDeepMerge<T extends object>(target: T, source: unknown): T {
  if (typeof target !== "object" || target === null) return target;
  if (exceedsDepth(source, BULK_LIMITS.MAX_RECURSION_DEPTH)) return target;

  const seen = new WeakSet<object>();

  const merge = (tgt: any, src: any, depth: number): any => {
    if (!src || typeof src !== "object") return tgt;
    if (depth <= 0) return tgt;

    if (seen.has(src)) return tgt; // prevent cycles
    seen.add(src);

    const out: any = Array.isArray(tgt) ? [...tgt] : { ...tgt };
    const entries = Object.entries(src as Record<string, unknown>);

    for (const [key, value] of entries) {
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
        out[key] = merge(targetValue, value, depth - 1);
      } else if (Array.isArray(value)) {
        // Validate array structure before assigning
        if (Array.isArray(targetValue)) {
          try {
            if (value.length > 0) {
              const firstElement = value[0];
              const targetFirstElement = (targetValue as unknown[])[0];
              if (
                firstElement != null &&
                targetFirstElement != null &&
                typeof firstElement !== typeof targetFirstElement
              ) {
                continue; // Skip malformed array
              }
            }
            out[key] = value;
          } catch {
            out[key] = targetValue; // On any error, keep target array
          }
        } else {
          out[key] = value; // introduce array when target is not array
        }
      } else if (typeof value !== "object") {
        out[key] = value; // primitives
      } else {
        out[key] = value; // allow new nested objects (respecting depth and cycle guard)
      }
    }
    return out;
  };

  return merge(target, source, BULK_LIMITS.MAX_RECURSION_DEPTH) as T;
}
