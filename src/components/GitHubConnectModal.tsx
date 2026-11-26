import React, { useEffect, useState } from 'react';
import { X, GitBranch, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  GitHubConfig,
  createGitHubRepo,
  verifyRepoAccess,
} from '@/src/lib/githubClient';
import { loadLabSettings, parseGitHubRepoUrl } from '@/src/lib/sheetsAndAuth';

interface Props {
  open: boolean;
  onClose: () => void;
  config: GitHubConfig | null;
  onConnect: (cfg: GitHubConfig, meta: { fullName: string; defaultBranch: string; htmlUrl: string }) => void;
  onDisconnect: () => void;
}

export const GitHubConnectModal: React.FC<Props> = ({
  open,
  onClose,
  config,
  onConnect,
  onDisconnect,
}) => {
  const [mode, setMode] = useState<'existing' | 'create'>('existing');
  const [repoUrl, setRepoUrl] = useState(() => {
    if (config?.owner && config?.repo) {
      return `https://github.com/${config.owner}/${config.repo}`;
    }
    return loadLabSettings().repoUrl || '';
  });
  const [newRepoName, setNewRepoName] = useState(config?.repo || 'PatientTracker-MCA');
  const [token, setToken] = useState(config?.token || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (config?.owner && config?.repo) {
      setRepoUrl(`https://github.com/${config.owner}/${config.repo}`);
      setNewRepoName(config.repo);
    } else {
      const savedUrl = loadLabSettings().repoUrl;
      if (savedUrl) {
        setRepoUrl(savedUrl);
      }
    }
    if (config?.token) {
      setToken(config.token);
    }
    setError('');
  }, [open, config]);

  if (!open) return null;

  const parsedExisting = parseGitHubRepoUrl(repoUrl);

  async function handleConnectExisting(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = parseGitHubRepoUrl(repoUrl);
    if (!parsed) {
      setError('Enter a valid GitHub Repository URL (e.g., https://github.com/username/repo or username/repo).');
      return;
    }
    setLoading(true);
    try {
      const cfg: GitHubConfig = {
        owner: parsed.owner,
        repo: parsed.repo,
        token: token.trim(),
      };
      const meta = await verifyRepoAccess(cfg);
      if (cfg.token && !meta.canPush) {
        setError('Connected, but this token lacks push permissions to this repository.');
        setLoading(false);
        return;
      }
      onConnect(cfg, meta);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to GitHub repository.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRepo(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('A GitHub Personal Access Token is required to create a new repository.');
      return;
    }
    setLoading(true);
    try {
      const created = await createGitHubRepo(token.trim(), newRepoName.trim(), isPrivate);
      const cfg: GitHubConfig = {
        owner: created.owner,
        repo: created.repo,
        token: token.trim(),
      };
      onConnect(cfg, {
        fullName: `${created.owner}/${created.repo}`,
        defaultBranch: 'main',
        htmlUrl: created.htmlUrl,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository on GitHub.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ghModalTitle"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GitBranch className="h-5 w-5 text-teal-700" />
            <h2 id="ghModalTitle" className="text-lg font-bold text-slate-900">
              GitHub Repository Connection
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Connect directly to a real GitHub repository so faculty can initialize module branches and students can push code to their assigned branches. Your token stays strictly in browser memory for this session.
        </p>

        <div className="mb-5 flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('existing'); setError(''); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'existing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Connect Existing Repo
          </button>
          <button
            type="button"
            onClick={() => { setMode('create'); setError(''); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create New Faculty Repo
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'existing' ? (
          <form onSubmit={handleConnectExisting} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ghRepoUrl">
                GitHub Repository URL
              </label>
              <input
                id="ghRepoUrl"
                type="text"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/PatientTracker-MCA"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-700 focus:outline-none"
              />
              {parsedExisting ? (
                <p className="mt-1 text-xs text-teal-800">
                  Detected Owner: <strong className="font-mono">{parsedExisting.owner}</strong> · Repository:{' '}
                  <strong className="font-mono">{parsedExisting.repo}</strong>
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Paste the full GitHub repository URL (or <span className="font-mono">owner/repo</span>) — username and repository name are extracted automatically.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ghToken">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                id="ghToken"
                type="password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_... or github_pat_... (repo / contents + pull_requests)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-700 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Requires Contents (Read &amp; Write) and Pull Requests (Read &amp; Write) permissions.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {config ? (
                <button
                  type="button"
                  onClick={() => { onDisconnect(); onClose(); }}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Switch to Local Sandbox
                </button>
              ) : (
                <span className="text-xs text-slate-500">No GitHub token? Local Sandbox works offline.</span>
              )}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? 'Connecting...' : 'Connect Repository'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateRepo} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="newRepoName">
                New Repository Name
              </label>
              <input
                id="newRepoName"
                type="text"
                required
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="PatientTracker-MCA"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="newRepoToken">
                Faculty GitHub PAT (with repo creation scope)
              </label>
              <input
                id="newRepoToken"
                type="password"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_... or github_pat_..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-700 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Create as Private Repository (Faculty invites 54 students as Collaborators)
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {loading ? 'Creating...' : 'Create & Connect Repo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
