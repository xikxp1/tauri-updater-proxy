interface GitHubAsset {
  name: string;
  url: string;
}

interface GitHubRelease {
  assets: GitHubAsset[];
}

/**
 * Parse download path to extract owner, repo, tag, and filename.
 * Expected format: /owner/repo/releases/download/tag/filename
 */
function parseDownloadPath(path: string): {
  owner: string;
  repo: string;
  tag: string;
  filename: string;
} | null {
  const match = path.match(
    /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/,
  );
  if (!match || !match[1] || !match[2] || !match[3] || !match[4]) {
    return null;
  }
  return {
    owner: match[1],
    repo: match[2],
    tag: match[3],
    filename: match[4],
  };
}

export async function streamFromGitHub(
  path: string,
  githubToken: string,
): Promise<Response> {
  const parsed = parseDownloadPath(path);

  if (!parsed) {
    throw new Error(`Invalid download path: ${path}`);
  }

  const { owner, repo, tag, filename } = parsed;

  // Step 1: Get release by tag via GitHub API
  const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
  const releaseResponse = await fetch(releaseUrl, {
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

  // Step 2: Find the asset by filename
  const asset = release.assets.find((a) => a.name === filename);
  if (!asset) {
    throw new Error(`Asset not found: ${filename}`);
  }

  // Step 3: Download via asset API URL
  const assetResponse = await fetch(asset.url, {
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
        `Failed to fetch from GitHub redirect: ${redirectResponse.status}`,
      );
    }
    return redirectResponse;
  }

  if (!assetResponse.ok) {
    throw new Error(`Failed to fetch asset: ${assetResponse.status}`);
  }

  return assetResponse;
}
