import type { UpdateManifest } from "../types";

interface GitHubAsset {
  name: string;
  url: string;
  browser_download_url: string;
}

interface GitHubRelease {
  assets: GitHubAsset[];
}

/**
 * Extract owner and repo from GitHub URL.
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/releases/latest/download
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  return { owner: match[1], repo: match[2] };
}

export async function fetchManifest(
  upstreamUrl: string,
  githubToken: string,
): Promise<UpdateManifest> {
  const { owner, repo } = parseGitHubUrl(upstreamUrl);

  // Step 1: Get latest release info via GitHub API
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const releaseResponse = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!releaseResponse.ok) {
    throw new Error(`Failed to fetch release info: ${releaseResponse.status}`);
  }

  const release = (await releaseResponse.json()) as GitHubRelease;

  // Step 2: Find the latest.json asset
  const manifestAsset = release.assets.find((a) => a.name === "latest.json");
  if (!manifestAsset) {
    throw new Error("No latest.json asset found in release");
  }

  // Step 3: Download the asset using API URL (works for private repos)
  const assetResponse = await fetch(manifestAsset.url, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${githubToken}`,
    },
    redirect: "manual",
  });

  // GitHub redirects to a signed URL for asset downloads
  if (assetResponse.status === 302) {
    const redirectUrl = assetResponse.headers.get("Location");
    if (!redirectUrl) {
      throw new Error("Redirect without Location header");
    }
    const redirectResponse = await fetch(redirectUrl);
    if (!redirectResponse.ok) {
      throw new Error(
        `Failed to fetch manifest from redirect: ${redirectResponse.status}`,
      );
    }
    return redirectResponse.json() as Promise<UpdateManifest>;
  }

  if (!assetResponse.ok) {
    throw new Error(`Failed to fetch manifest asset: ${assetResponse.status}`);
  }

  return assetResponse.json() as Promise<UpdateManifest>;
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
