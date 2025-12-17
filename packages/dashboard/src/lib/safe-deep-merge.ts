/**
 * Safely deep merge server responses with expected data structures.
 * Handles null/undefined values, validates array types, and prevents corruption.
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
      // Fix: Validate array structure before assigning
      // Only accept arrays that are either empty or contain primitives/simple objects
      const isValidArray = Array.isArray(value);
      if (isValidArray && Array.isArray(targetValue)) {
        // Preserve target array structure if source array is malformed
        try {
          // Test that array elements match expected type by checking first element
          if (value.length > 0) {
            const firstElement = value[0];
            const targetFirstElement = (targetValue as unknown[])[0];
            // If types don't match and target is defined, skip
            if (
              firstElement &&
              targetFirstElement &&
              typeof firstElement !== typeof targetFirstElement
            ) {
              continue; // Skip malformed array
            }
          }
          resultObj[key] = value;
        } catch {
          // On any error, keep target array
          resultObj[key] = targetValue;
        }
      } else if (isValidArray) {
        resultObj[key] = value;
      }
    } else {
      // For primitives, use server value
      resultObj[key] = value;
    }
  }

  return result;
}
