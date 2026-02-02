export async function streamFromGitHub(
  path: string,
  githubToken: string,
): Promise<Response> {
  const githubUrl = `https://github.com${path}`;

  const response = await fetch(githubUrl, {
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${githubToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from GitHub: ${response.status}`);
  }

  return response;
}
