import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("integration smoke", () => {
  it("docker compose config is valid", () => {
    expect(() => execSync("docker compose -f infra/docker-compose.yml config", { stdio: "pipe" })).not.toThrow();
  });
});
