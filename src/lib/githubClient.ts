/**
 * src/lib/githubClient.ts
 * Direct browser-to-GitHub REST API client.
 * Token is kept strictly in React state (never persisted to disk/localStorage/sessionStorage).
 */

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface GitHubBranchInfo {
  name: string;
  sha: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string };
  html_url: string;
  created_at: string;
  mergeable_state?: string;
}

export interface GitHubCommitItem {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
}

const SLUG_RE = /^[a-zA-Z0-9_.-]+$/;

export function validateRepoSlug(owner: string, repo: string): void {
  if (!SLUG_RE.test(owner) || !SLUG_RE.test(repo)) {
    throw new Error('Invalid GitHub owner or repository name.');
  }
}

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function sanitizeToken(token: string): string {
  return token.replace(/[^\x21-\x7E]/g, '').trim();
}

async function ghFetch<T>(
  cfg: GitHubConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  validateRepoSlug(cfg.owner, cfg.repo);
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const cleanToken = sanitizeToken(cfg.token || '');
  if (cleanToken) {
    headers.Authorization = `Bearer ${cleanToken}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  const url = `https://api.github.com${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    if (method === 'GET') {
      try {
        await new Promise((r) => setTimeout(r, 350));
        res = await fetch(url, { ...options, headers });
      } catch {
        throw new Error(
          'Network error reaching GitHub API (Failed to fetch). Check your internet connection or firewall, and ensure your PAT contains no stray characters.'
        );
      }
    } else {
      throw new Error(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'Network error reaching GitHub API (Failed to fetch). Check your internet connection and retry.'
      );
    }
  }

  if (!res.ok) {
    let errMsg = `GitHub API error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) errMsg = data.message;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

export async function verifyRepoAccess(cfg: GitHubConfig): Promise<{
  fullName: string;
  defaultBranch: string;
  canPush: boolean;
  htmlUrl: string;
}> {
  const data = await ghFetch<{
    full_name: string;
    default_branch: string;
    permissions?: { push?: boolean };
    html_url: string;
  }>(cfg, `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`);

  return {
    fullName: data.full_name,
    defaultBranch: data.default_branch || 'main',
    canPush: Boolean(data.permissions?.push),
    htmlUrl: data.html_url,
  };
}

export async function createGitHubRepo(token: string, repoName: string, isPrivate: boolean): Promise<{
  owner: string;
  repo: string;
  htmlUrl: string;
}> {
  if (!SLUG_RE.test(repoName)) {
    throw new Error('Invalid repository name. Use letters, numbers, hyphens, or underscores.');
  }
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      private: isPrivate,
      auto_init: true,
      description: 'PatientTracker-MCA: HTML5, CSS3, JavaScript & JSON Lab Repository',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Failed to create repository (${res.status})`);
  }
  return {
    owner: data.owner.login,
    repo: data.name,
    htmlUrl: data.html_url,
  };
}

function isEmptyOrMissingRepoError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('repository is empty') ||
    msg.includes('git repository is empty')
  );
}

export async function listBranches(cfg: GitHubConfig): Promise<GitHubBranchInfo[]> {
  try {
    const data = await ghFetch<Array<{ name: string; commit: { sha: string } }>>(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/branches?per_page=100`
    );
    return data.map((b) => ({ name: b.name, sha: b.commit.sha }));
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('repository is empty')) {
      return [];
    }
    throw err;
  }
}

export async function ensureRepoInitialized(cfg: GitHubConfig): Promise<string> {
  let branches = await listBranches(cfg);
  if (branches.length > 0) {
    return (
      branches.find((b) => b.name === 'main')?.name ||
      branches.find((b) => b.name === 'master')?.name ||
      branches[0].name
    );
  }

  // GitHub rejects PUT /contents/{path} with a `branch` field or git/commits on a 0-commit repo.
  // Omitting `branch` on the very first README.md PUT creates the initial commit on the default branch.
  await ghFetch<{ commit: { sha: string } }>(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/README.md`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'chore: initialize repository',
        content: toBase64Utf8(
          '# PatientTracker-MCA\n\nHTML5, CSS3, JavaScript & JSON Lab Repository.\n'
        ),
      }),
    }
  );

  for (let attempt = 0; attempt < 4; attempt++) {
    branches = await listBranches(cfg);
    if (branches.length > 0) break;
    await new Promise((r) => setTimeout(r, 350));
  }

  return (
    branches.find((b) => b.name === 'main')?.name ||
    branches.find((b) => b.name === 'master')?.name ||
    branches[0]?.name ||
    'main'
  );
}

export async function createBranchFrom(
  cfg: GitHubConfig,
  newBranch: string,
  baseBranch: string
): Promise<GitHubBranchInfo> {
  let branches = await listBranches(cfg);
  const existing = branches.find((b) => b.name === newBranch);
  if (existing) return existing;

  // If the repository has 0 commits yet, initialize the default branch first
  if (branches.length === 0) {
    await ensureRepoInitialized(cfg);
    branches = await listBranches(cfg);
  }

  const base =
    branches.find((b) => b.name === baseBranch) ||
    branches.find((b) => b.name === 'main') ||
    branches.find((b) => b.name === 'master') ||
    branches[0];

  if (!base) {
    throw new Error(`Base branch "${baseBranch}" does not exist yet.`);
  }

  if (newBranch === base.name) {
    return base;
  }

  await ghFetch(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/git/refs`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: base.sha,
      }),
    }
  );
  return { name: newBranch, sha: base.sha };
}

export async function getFileContent(
  cfg: GitHubConfig,
  path: string,
  branch: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const data = await ghFetch<{ content?: string; sha: string }>(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePathSegments(path)}?ref=${encodeURIComponent(branch)}`
    );
    return {
      content: data.content ? fromBase64Utf8(data.content) : '',
      sha: data.sha,
    };
  } catch (err) {
    if (isEmptyOrMissingRepoError(err)) {
      return null;
    }
    throw err;
  }
}

export class GitConflictError extends Error {
  filePath: string;
  remoteContent: string;
  remoteSha: string;

  constructor(filePath: string, remoteContent: string, remoteSha: string, message?: string) {
    super(message || `Conflict detected on ${filePath}: the remote branch has newer changes.`);
    this.name = 'GitConflictError';
    this.filePath = filePath;
    this.remoteContent = remoteContent;
    this.remoteSha = remoteSha;
  }
}

export async function putFileContent(
  cfg: GitHubConfig,
  path: string,
  content: string,
  message: string,
  branch: string,
  options?: { expectedSha?: string; forceRemoteSha?: string }
): Promise<{ commitSha: string; fileSha: string }> {
  const existing = await getFileContent(cfg, path, branch);

  if (
    options?.expectedSha &&
    existing?.sha &&
    existing.sha !== options.expectedSha &&
    !options.forceRemoteSha
  ) {
    throw new GitConflictError(path, existing.content, existing.sha);
  }

  const body: Record<string, string> = {
    message,
    content: toBase64Utf8(content),
    branch,
  };
  const shaToUse = options?.forceRemoteSha || existing?.sha;
  if (shaToUse) {
    body.sha = shaToUse;
  }

  try {
    const res = await ghFetch<{ commit: { sha: string }; content?: { sha?: string } }>(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePathSegments(path)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    return {
      commitSha: res.commit.sha,
      fileSha: res.content?.sha || shaToUse || '',
    };
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (
        msg.includes('repository is empty') ||
        (msg.includes('branch') && msg.includes('not found'))
      ) {
        const defaultBranch = await ensureRepoInitialized(cfg);
        if (branch && branch !== defaultBranch) {
          await createBranchFrom(cfg, branch, defaultBranch);
        }
        const refreshed = await getFileContent(cfg, path, branch);
        const retryBody: Record<string, string> = {
          message,
          content: toBase64Utf8(content),
          branch,
        };
        if (refreshed?.sha) {
          retryBody.sha = refreshed.sha;
        }
        const retryRes = await ghFetch<{ commit: { sha: string }; content?: { sha?: string } }>(
          cfg,
          `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodePathSegments(path)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(retryBody),
          }
        );
        return {
          commitSha: retryRes.commit.sha,
          fileSha: retryRes.content?.sha || refreshed?.sha || '',
        };
      }
      if (msg.includes('409') || msg.includes('does not match')) {
        const latest = await getFileContent(cfg, path, branch);
        if (latest) {
          throw new GitConflictError(path, latest.content, latest.sha, err.message);
        }
      }
    }
    throw err;
  }
}

export async function listPullRequests(cfg: GitHubConfig): Promise<GitHubPullRequest[]> {
  try {
    return await ghFetch<GitHubPullRequest[]>(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/pulls?state=all&per_page=100`
    );
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes('repository is empty')) {
      return [];
    }
    throw err;
  }
}

export async function createPullRequest(
  cfg: GitHubConfig,
  title: string,
  headBranch: string,
  baseBranch: string,
  bodyText: string
): Promise<GitHubPullRequest> {
  return ghFetch<GitHubPullRequest>(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/pulls`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        head: headBranch,
        base: baseBranch,
        body: bodyText,
      }),
    }
  );
}

export async function listPrCommits(cfg: GitHubConfig, prNumber: number): Promise<GitHubCommitItem[]> {
  return ghFetch<GitHubCommitItem[]>(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/pulls/${prNumber}/commits`
  );
}

export async function postPrComment(cfg: GitHubConfig, prNumber: number, bodyText: string): Promise<void> {
  await ghFetch(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: bodyText }),
    }
  );
}

export async function mergePullRequest(cfg: GitHubConfig, prNumber: number, commitTitle: string): Promise<void> {
  await ghFetch(
    cfg,
    `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/pulls/${prNumber}/merge`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commit_title: commitTitle,
        merge_method: 'merge',
      }),
    }
  );
}

export async function listCheckRuns(cfg: GitHubConfig, refSha: string): Promise<GitHubWorkflowRun[]> {
  try {
    const data = await ghFetch<{
      check_runs?: Array<{
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        html_url: string;
      }>;
    }>(
      cfg,
      `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/commits/${encodeURIComponent(refSha)}/check-runs`
    );
    return data.check_runs || [];
  } catch {
    return [];
  }
}
