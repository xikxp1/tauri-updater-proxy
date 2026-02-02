import { Hono } from "hono";
import type { Env } from "../types";
import { fetchManifest, rewriteManifestUrls } from "../services/manifest";

export function createManifestRoute(env: Env) {
  const route = new Hono();

  route.get("/latest.json", async (c) => {
    const url = new URL(c.req.url);
    const proto = c.req.header("X-Forwarded-Proto") ?? url.protocol.replace(":", "");
    const proxyBaseUrl = `${proto}://${url.host}`;

    const manifest = await fetchManifest(env.UPSTREAM_URL, env.GITHUB_TOKEN);
    const rewritten = rewriteManifestUrls(manifest, proxyBaseUrl);

    return c.json(rewritten);
  });

  return route;
}
