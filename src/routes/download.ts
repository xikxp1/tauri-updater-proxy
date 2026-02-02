import { Hono } from "hono";
import type { Env } from "../types";
import { streamFromGitHub } from "../services/download";

export function createDownloadRoute(env: Env) {
  const route = new Hono();

  route.get("/*", async (c) => {
    const path = c.req.path.replace("/download", "");

    const response = await streamFromGitHub(path, env.GITHUB_TOKEN);

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Length": response.headers.get("Content-Length") ?? "",
      },
    });
  });

  return route;
}
