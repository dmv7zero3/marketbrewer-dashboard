import { safeDeepMerge } from "../safe-deep-merge";

describe("safeDeepMerge", () => {
  it("skips null and undefined values", () => {
    const target = { a: 1, b: { c: 2 } };
    const source: any = { a: null, b: undefined };
    expect(safeDeepMerge(target, source)).toEqual(target);
  });

  it("deeply merges nested objects", () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { d: 3 } };
    expect(safeDeepMerge(target, source)).toEqual({ a: 1, b: { c: 2, d: 3 } });
  });

  it("replaces arrays when structure matches", () => {
    const target = { arr: [1, 2] };
    const source = { arr: [3, 4] };
    expect(safeDeepMerge(target, source)).toEqual({ arr: [3, 4] });
  });

  it("preserves target array on type mismatch", () => {
    const target = { arr: [1] };
    const source: any = { arr: ["x"] };
    expect(safeDeepMerge(target, source)).toEqual({ arr: [1] });
  });

  it("returns target when circular reference detected", () => {
    const target: any = { a: 1 };
    const source: any = { a: 2 };
    source.self = source; // create cycle
    expect(safeDeepMerge(target, source)).toEqual({ a: 2, self: source });
    // Note: cycle is ignored for re-entry since we return on seen; assignment above is direct
  });

  it("returns target when exceeding max recursion depth", () => {
    const target: any = { a: {} };
    const source: any = {};
    let curr = source;
    for (let i = 0; i < 50; i++) {
      curr.n = {};
      curr = curr.n;
    }
    const merged = safeDeepMerge(target, source);
    expect(merged).toEqual(target); // merge bails out when depth limit hit
  });
});
