import { describe, expect, it } from "bun:test";
import { rewriteManifestUrls } from "../src/services/manifest";
import type { UpdateManifest } from "../src/types";

describe("rewriteManifestUrls", () => {
  it("should rewrite platform URLs to proxy download endpoint", () => {
    const manifest: UpdateManifest = {
      version: "0.1.9",
      notes: "Release notes",
      pub_date: "2025-11-18T14:09:51.808Z",
      platforms: {
        "darwin-x86_64": {
          signature: "base64-signature",
          url: "https://github.com/owner/repo/releases/download/v0.1.9/app.tar.gz",
        },
        "darwin-aarch64": {
          signature: "base64-signature-2",
          url: "https://github.com/owner/repo/releases/download/v0.1.9/app-arm.tar.gz",
        },
      },
    };

    const result = rewriteManifestUrls(manifest, "https://proxy.example.com");

    expect(result.version).toBe("0.1.9");
    expect(result.notes).toBe("Release notes");
    expect(result.pub_date).toBe("2025-11-18T14:09:51.808Z");
    expect(result.platforms["darwin-x86_64"]?.signature).toBe("base64-signature");
    expect(result.platforms["darwin-x86_64"]?.url).toBe(
      "https://proxy.example.com/download/owner/repo/releases/download/v0.1.9/app.tar.gz"
    );
    expect(result.platforms["darwin-aarch64"]?.url).toBe(
      "https://proxy.example.com/download/owner/repo/releases/download/v0.1.9/app-arm.tar.gz"
    );
  });

  it("should preserve all platform entries", () => {
    const manifest: UpdateManifest = {
      version: "1.0.0",
      notes: "",
      pub_date: "2025-01-01T00:00:00.000Z",
      platforms: {
        "darwin-x86_64": {
          signature: "sig1",
          url: "https://github.com/o/r/releases/download/v1/a.tar.gz",
        },
        "linux-x86_64": {
          signature: "sig2",
          url: "https://github.com/o/r/releases/download/v1/b.tar.gz",
        },
        "windows-x86_64": {
          signature: "sig3",
          url: "https://github.com/o/r/releases/download/v1/c.zip",
        },
      },
    };

    const result = rewriteManifestUrls(manifest, "http://localhost:3000");

    expect(Object.keys(result.platforms)).toEqual([
      "darwin-x86_64",
      "linux-x86_64",
      "windows-x86_64",
    ]);
  });
});
