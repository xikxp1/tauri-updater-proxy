import type { Env } from "../types";

export function getEnv(): Env {
  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
  const githubToken = process.env.GITHUB_TOKEN ?? "";
  const upstreamUrl = process.env.UPSTREAM_URL ?? "";
  const authUsername = process.env.AUTH_USERNAME ?? "";
  const authPassword = process.env.AUTH_PASSWORD ?? "";

  return {
    PORT: port,
    GITHUB_TOKEN: githubToken,
    UPSTREAM_URL: upstreamUrl,
    AUTH_USERNAME: authUsername,
    AUTH_PASSWORD: authPassword,
  };
}
