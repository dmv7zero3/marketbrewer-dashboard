import { deepEqual } from "../deep-equal";

describe("deepEqual", () => {
  it("returns true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
  });

  it("handles null and undefined", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("compares arrays by order and value", () => {
    expect(deepEqual([1, 2], [1, 2])).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
  });

  it("compares objects deeply", () => {
    const a = { x: 1, y: { z: 3 } };
    const b = { x: 1, y: { z: 3 } };
    expect(deepEqual(a, b)).toBe(true);
    const c = { x: 1, y: { z: 4 } };
    expect(deepEqual(a, c)).toBe(false);
  });

  it("returns false for circular references", () => {
    const a: any = { x: 1 };
    a.self = a;
    const b: any = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(false);
  });

  it("returns false when exceeding max recursion depth", () => {
    // Construct a deeply nested object beyond depth limit (20)
    const makeDeep = (depth: number): any => {
      const obj: any = {};
      let curr = obj;
      for (let i = 0; i < depth; i++) {
        curr.next = {};
        curr = curr.next;
      }
      return obj;
    };
    const a = makeDeep(50);
    const b = makeDeep(50);
    expect(deepEqual(a, b)).toBe(false);
  });
});
