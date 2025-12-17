/**
 * Safely deep merge server responses with expected data structures.
 * Handles null/undefined values, validates array types, and prevents corruption.
 */

import { BULK_LIMITS } from "./constants";

export function safeDeepMerge<T extends object>(target: T, source: unknown): T {
  const seen = new WeakSet<object>();

  const merge = (tgt: any, src: any, depth: number): any => {
    if (!src || typeof src !== "object") return tgt;
    if (depth <= 0) return tgt;

    if (seen.has(src)) return tgt; // prevent cycles
    seen.add(src);

    const out: any = Array.isArray(tgt) ? [...tgt] : { ...tgt };
    const entries = Object.entries(src as Record<string, unknown>);
    for (const [key, value] of entries) {
      // Only merge keys that exist in target shape to prevent schema corruption
      if (!Object.prototype.hasOwnProperty.call(tgt, key)) continue;
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
          // Skip introducing new arrays not present in target
          continue;
        }
      } else if (typeof value !== "object") {
        out[key] = value; // primitives
      } else {
        // Skip introducing new nested objects not present in target
        continue;
      }
    }
    return out;
  };

  if (typeof target !== "object" || target === null) return target;
  return merge(target, source, BULK_LIMITS.MAX_RECURSION_DEPTH) as T;
}
