/**
 * Safely deep merge server responses with expected data structures.
 * Handles null/undefined values and prevents type mismatches.
 */

export function safeDeepMerge<T>(target: T, source: unknown): T {
  if (!source || typeof source !== "object") {
    return target;
  }

  // If target is not an object, return it unchanged
  if (typeof target !== "object" || target === null) {
    return target;
  }

  const result = { ...target } as T;
  const sourceObj = source as Record<string, unknown>;
  const resultObj = result as Record<string, unknown>;
  const targetObj = target as Record<string, unknown>;

  for (const [key, value] of Object.entries(sourceObj)) {
    if (value === null || value === undefined) {
      // Skip null/undefined from server
      continue;
    }

    const targetValue = targetObj[key];

    // If both are objects (not arrays), recursively merge
    if (
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue) &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      resultObj[key] = safeDeepMerge(
        targetValue as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else if (Array.isArray(value)) {
      // For arrays, just use the server value if it's valid
      resultObj[key] = value;
    } else {
      // For primitives, use server value
      resultObj[key] = value;
    }
  }

  return result;
}
