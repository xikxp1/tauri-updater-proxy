import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import type { UpdateManifest } from "../src/types";

const TEST_ENV = {
  PORT: 3000,
  GITHUB_TOKEN: "test-github-token",
  UPSTREAM_URL: "https://github.com/owner/repo/releases/latest/download",
  AUTH_USERNAME: "testuser",
  AUTH_PASSWORD: "testpass",
};

const mockManifest: UpdateManifest = {
  version: "1.0.0",
  notes: "Test release notes",
  pub_date: "2025-01-15T10:00:00.000Z",
  platforms: {
    "darwin-x86_64": {
      signature: "darwin-x64-sig",
      url: "https://github.com/owner/repo/releases/download/v1.0.0/app-darwin-x64.tar.gz",
    },
    "darwin-aarch64": {
      signature: "darwin-arm-sig",
      url: "https://github.com/owner/repo/releases/download/v1.0.0/app-darwin-arm64.tar.gz",
    },
    "linux-x86_64": {
      signature: "linux-sig",
      url: "https://github.com/owner/repo/releases/download/v1.0.0/app-linux.tar.gz",
    },
    "windows-x86_64": {
      signature: "windows-sig",
      url: "https://github.com/owner/repo/releases/download/v1.0.0/app-windows.zip",
    },
  },
};

function createAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function createTestApp() {
  // Reset modules to pick up fresh env
  delete require.cache[require.resolve("../src/index")];
  delete require.cache[require.resolve("../src/utils/env")];

  // Set test environment variables
  process.env.PORT = String(TEST_ENV.PORT);
  process.env.GITHUB_TOKEN = TEST_ENV.GITHUB_TOKEN;
  process.env.UPSTREAM_URL = TEST_ENV.UPSTREAM_URL;
  process.env.AUTH_USERNAME = TEST_ENV.AUTH_USERNAME;
  process.env.AUTH_PASSWORD = TEST_ENV.AUTH_PASSWORD;

  return require("../src/index").default;
}

describe("Integration Tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("GET /health", () => {
    it("should return ok status without authentication", async () => {
      const app = createTestApp();
      const res = await app.fetch(new Request("http://localhost/health"));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
    });
  });

  describe("GET /latest.json", () => {
    it("should return 401 without authentication", async () => {
      const app = createTestApp();
      const res = await app.fetch(new Request("http://localhost/latest.json"));

      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid credentials", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: createAuthHeader("wrong", "credentials"),
          },
        }),
      );

      expect(res.status).toBe(401);
    });

    it("should fetch and rewrite manifest with valid auth", async () => {
      globalThis.fetch = mock(async (url: string, options?: RequestInit) => {
        if (url.includes("latest.json")) {
          // Verify GitHub token is passed
          expect(options?.headers).toBeDefined();
          const headers = options?.headers as Record<string, string>;
          expect(headers.Authorization).toBe(`Bearer ${TEST_ENV.GITHUB_TOKEN}`);

          return new Response(JSON.stringify(mockManifest), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: createAuthHeader(
              TEST_ENV.AUTH_USERNAME,
              TEST_ENV.AUTH_PASSWORD,
            ),
          },
        }),
      );

      expect(res.status).toBe(200);

      const manifest = (await res.json()) as UpdateManifest;
      expect(manifest.version).toBe("1.0.0");
      expect(manifest.notes).toBe("Test release notes");
      expect(manifest.pub_date).toBe("2025-01-15T10:00:00.000Z");

      // Verify URLs are rewritten
      expect(manifest.platforms["darwin-x86_64"]?.url).toBe(
        "http://localhost/download/owner/repo/releases/download/v1.0.0/app-darwin-x64.tar.gz",
      );
      expect(manifest.platforms["darwin-aarch64"]?.url).toBe(
        "http://localhost/download/owner/repo/releases/download/v1.0.0/app-darwin-arm64.tar.gz",
      );
      expect(manifest.platforms["linux-x86_64"]?.url).toBe(
        "http://localhost/download/owner/repo/releases/download/v1.0.0/app-linux.tar.gz",
      );
      expect(manifest.platforms["windows-x86_64"]?.url).toBe(
        "http://localhost/download/owner/repo/releases/download/v1.0.0/app-windows.zip",
      );

      // Verify signatures are preserved
      expect(manifest.platforms["darwin-x86_64"]?.signature).toBe(
        "darwin-x64-sig",
      );
    });

    it("should return 500 when upstream fails", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("Internal Server Error", { status: 500 });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: createAuthHeader(
              TEST_ENV.AUTH_USERNAME,
              TEST_ENV.AUTH_PASSWORD,
            ),
          },
        }),
      );

      expect(res.status).toBe(500);
    });
  });

  describe("GET /download/*", () => {
    it("should return 401 without authentication", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request(
          "http://localhost/download/owner/repo/releases/download/v1.0.0/app.tar.gz",
        ),
      );

      expect(res.status).toBe(401);
    });

    it("should stream binary from GitHub with valid auth", async () => {
      const binaryContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic bytes

      globalThis.fetch = mock(async (url: string, options?: RequestInit) => {
        // Verify correct GitHub URL reconstruction
        expect(url).toBe(
          "https://github.com/owner/repo/releases/download/v1.0.0/app.tar.gz",
        );

        // Verify GitHub token is passed
        const headers = options?.headers as Record<string, string>;
        expect(headers.Authorization).toBe(`Bearer ${TEST_ENV.GITHUB_TOKEN}`);

        return new Response(binaryContent, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": String(binaryContent.length),
          },
        });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request(
          "http://localhost/download/owner/repo/releases/download/v1.0.0/app.tar.gz",
          {
            headers: {
              Authorization: createAuthHeader(
                TEST_ENV.AUTH_USERNAME,
                TEST_ENV.AUTH_PASSWORD,
              ),
            },
          },
        ),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
      expect(res.headers.get("Content-Length")).toBe(
        String(binaryContent.length),
      );

      const body = await res.arrayBuffer();
      expect(new Uint8Array(body)).toEqual(binaryContent);
    });

    it("should handle different content types", async () => {
      const tarGzContent = new Uint8Array([0x1f, 0x8b, 0x08]); // gzip magic bytes

      globalThis.fetch = mock(async () => {
        return new Response(tarGzContent, {
          status: 200,
          headers: {
            "Content-Type": "application/gzip",
            "Content-Length": String(tarGzContent.length),
          },
        });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request(
          "http://localhost/download/owner/repo/releases/download/v1.0.0/app.tar.gz",
          {
            headers: {
              Authorization: createAuthHeader(
                TEST_ENV.AUTH_USERNAME,
                TEST_ENV.AUTH_PASSWORD,
              ),
            },
          },
        ),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/gzip");
    });

    it("should return 500 when GitHub download fails", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("Not Found", { status: 404 });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request(
          "http://localhost/download/owner/repo/releases/download/v1.0.0/nonexistent.tar.gz",
          {
            headers: {
              Authorization: createAuthHeader(
                TEST_ENV.AUTH_USERNAME,
                TEST_ENV.AUTH_PASSWORD,
              ),
            },
          },
        ),
      );

      expect(res.status).toBe(500);
    });
  });

  describe("Authentication", () => {
    it("should accept valid Basic auth credentials", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(mockManifest), { status: 200 });
      }) as unknown as typeof fetch;

      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: createAuthHeader(
              TEST_ENV.AUTH_USERNAME,
              TEST_ENV.AUTH_PASSWORD,
            ),
          },
        }),
      );

      expect(res.status).toBe(200);
    });

    it("should reject empty credentials", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: createAuthHeader("", ""),
          },
        }),
      );

      expect(res.status).toBe(401);
    });

    it("should reject malformed auth header", async () => {
      const app = createTestApp();
      const res = await app.fetch(
        new Request("http://localhost/latest.json", {
          headers: {
            Authorization: "Invalid format",
          },
        }),
      );

      expect(res.status).toBe(401);
    });
  });
});
