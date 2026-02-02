export async function streamFromGitHub(
  path: string,
  githubToken: string,
): Promise<Response> {
  const githubUrl = `https://github.com${path}`;

  // GitHub redirects to a signed URL; handle redirect manually to preserve auth
  const response = await fetch(githubUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${githubToken}`,
    },
    redirect: "manual",
  });

  if (response.status === 302) {
    const redirectUrl = response.headers.get("Location");
    if (!redirectUrl) {
      throw new Error("Redirect without Location header");
    }
    // Signed URL doesn't need auth
    const redirectResponse = await fetch(redirectUrl);
    if (!redirectResponse.ok) {
      throw new Error(`Failed to fetch from GitHub redirect: ${redirectResponse.status}`);
    }
    return redirectResponse;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch from GitHub: ${response.status}`);
  }

  return response;
}
