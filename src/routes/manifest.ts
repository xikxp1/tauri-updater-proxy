import { Hono } from "hono";
import type { Env } from "../types";
import { fetchManifest, rewriteManifestUrls } from "../services/manifest";

export function createManifestRoute(env: Env) {
  const route = new Hono();

  route.get("/latest.json", async (c) => {
    const proxyBaseUrl = new URL(c.req.url).origin;

    const manifest = await fetchManifest(env.UPSTREAM_URL, env.GITHUB_TOKEN);
    const rewritten = rewriteManifestUrls(manifest, proxyBaseUrl);

    return c.json(rewritten);
  });

  return route;
}
