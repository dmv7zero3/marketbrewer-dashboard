/**
 * Deep equality check - more efficient than JSON.stringify for comparing complex objects
 * Handles arrays, objects, and primitives correctly
 */

import { BULK_LIMITS } from "./constants";

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  const seen1 = new WeakSet<object>();
  const seen2 = new WeakSet<object>();

  const eq = (a: unknown, b: unknown, depth: number): boolean => {
    if (a === b) return true;

    if (depth <= 0) return false;

    if (typeof a !== typeof b) return false;

    if (a === null || b === null) return a === b;
    if (a === undefined || b === undefined) return a === b;

    if (typeof a !== "object") return a === b;

    const ao = a as object;
    const bo = b as object;

    // Circular reference protection
    if (seen1.has(ao) || seen2.has(bo)) return false;
    seen1.add(ao);
    seen2.add(bo);

    const isArrA = Array.isArray(a);
    const isArrB = Array.isArray(b);
    if (isArrA !== isArrB) return false;

    if (isArrA && isArrB) {
      const arrA = a as unknown[];
      const arrB = b as unknown[];
      if (arrA.length !== arrB.length) return false;
      for (let i = 0; i < arrA.length; i++) {
        if (!eq(arrA[i], arrB[i], depth - 1)) return false;
      }
      return true;
    }

    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!eq(objA[key], objB[key], depth - 1)) return false;
    }
    return true;
  };

  return eq(obj1, obj2, BULK_LIMITS.MAX_RECURSION_DEPTH);
}
