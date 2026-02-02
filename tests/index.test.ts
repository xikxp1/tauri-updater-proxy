import { describe, expect, it } from "bun:test";

describe("Health endpoint", () => {
  it("should return ok status", async () => {
    const app = (await import("../src/index")).default;
    const res = await app.fetch(new Request("http://localhost/health"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: "ok" });
  });
});
