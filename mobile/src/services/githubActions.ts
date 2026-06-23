const GITHUB_OWNER = 'nikhilseepana';
const GITHUB_REPO = 'PennyWhales';
export const WORKFLOW_REF = 'main';

export const REPO_FULL_NAME = `${GITHUB_OWNER}/${GITHUB_REPO}`;

type DispatchArgs = {
  workflowFile: string;
  token: string;
  ref?: string;
};

export async function dispatchWorkflow({
  workflowFile,
  token,
  ref = WORKFLOW_REF,
}: DispatchArgs): Promise<void> {
  const endpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

  console.log(`[GitHubActions] Dispatching ${workflowFile} on branch ${ref}`);
  console.log(`[GitHubActions] Endpoint: ${endpoint}`);
  console.log(`[GitHubActions] Token length: ${token.length} chars`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref }),
    });

    console.log(`[GitHubActions] Response status: ${response.status}`);
  } catch (fetchErr) {
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error(`[GitHubActions] Network error: ${errMsg}`);
    throw new Error(`Network error: ${errMsg}`);
  }

  if (response.status === 204) {
    console.log(`[GitHubActions] Workflow triggered successfully (204 No Content)`);
    return;
  }

  let details = '';
  let body: unknown;
  try {
    body = (await response.json()) as { message?: string };
    details = (body as { message?: string }).message ?? '';
    console.log(`[GitHubActions] Response body:`, body);
  } catch (parseErr) {
    const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.warn(`[GitHubActions] Could not parse response: ${errMsg}`);
  }

  const message = details
    ? `GitHub API ${response.status}: ${details}`
    : `GitHub API ${response.status}: failed to trigger workflow.`;

  console.error(`[GitHubActions] Error: ${message}`);
  throw new Error(message);
}
