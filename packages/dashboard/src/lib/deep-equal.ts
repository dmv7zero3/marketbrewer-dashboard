/**
 * Deep equality check - more efficient than JSON.stringify for comparing complex objects
 * Handles arrays, objects, and primitives correctly
 */

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  // Same reference
  if (obj1 === obj2) return true;

  // Type check
  if (typeof obj1 !== typeof obj2) return false;

  // Null/undefined checks
  if (obj1 === null || obj2 === null) return obj1 === obj2;
  if (obj1 === undefined || obj2 === undefined) return obj1 === obj2;

  // For non-objects, use strict equality
  if (typeof obj1 !== "object") return obj1 === obj2;

  // Array check
  const isArr1 = Array.isArray(obj1);
  const isArr2 = Array.isArray(obj2);
  if (isArr1 !== isArr2) return false;

  if (isArr1 && isArr2) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((val, idx) => deepEqual(val, obj2[idx]));
  }

  // Object check
  const keys1 = Object.keys(obj1 as Record<string, unknown>);
  const keys2 = Object.keys(obj2 as Record<string, unknown>);
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (
      !deepEqual(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}
