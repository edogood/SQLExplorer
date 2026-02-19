import { describe, it, expect } from "vitest";
import { validateSql } from "../src/security.js";

describe("SQL validator", () => {
  it("blocks forbidden statements", () => {
    expect(validateSql("select pg_sleep(5)").ok).toBe(false);
    expect(validateSql("CREATE EXTENSION hstore").ok).toBe(false);
  });

  it("allows safe select", () => {
    expect(validateSql("SELECT * FROM orders LIMIT 10").ok).toBe(true);
  });
});
