import { describe, it, expect } from "vitest";
import { compareRows } from "../src/compare.js";

describe("resultset comparison", () => {
  it("supports multiset mode", () => {
    expect(compareRows([[1, "a"], [2, "b"]], [[2, "b"], [1, "a"]], "multiset")).toBe(true);
  });

  it("supports ordered mode", () => {
    expect(compareRows([[1], [2]], [[2], [1]], "ordered")).toBe(false);
  });
});
