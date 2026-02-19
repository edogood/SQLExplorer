import { describe, it, expect } from "vitest";
import { compareRows } from "../src/compare.js";

describe("autograder core", () => {
  it("returns true when expected and actual align", () => {
    const expected = [["alice", 100], ["bob", 80]];
    const actual = [["bob", 80], ["alice", 100]];
    expect(compareRows(actual, expected, "multiset")).toBe(true);
  });
});
