import type { UpdateManifest } from "../types";

export async function fetchManifest(
  upstreamUrl: string,
  githubToken: string,
): Promise<UpdateManifest> {
  const manifestUrl = `${upstreamUrl}/latest.json`;

  const response = await fetch(manifestUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status}`);
  }

  return response.json() as Promise<UpdateManifest>;
}

export function rewriteManifestUrls(
  manifest: UpdateManifest,
  proxyBaseUrl: string,
): UpdateManifest {
  const rewritten: UpdateManifest = {
    ...manifest,
    platforms: {},
  };

  for (const [platform, info] of Object.entries(manifest.platforms)) {
    const originalUrl = new URL(info.url);
    const downloadPath = originalUrl.pathname;

    rewritten.platforms[platform] = {
      ...info,
      url: `${proxyBaseUrl}/download${downloadPath}`,
    };
  }

  return rewritten;
}
