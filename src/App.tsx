/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { GitHubConfig } from '@/src/lib/githubClient';
import { StudentWorkbench } from '@/src/components/StudentWorkbench';
import { FacultyConsole } from '@/src/components/FacultyConsole';
import { GitHubConnectModal } from '@/src/components/GitHubConnectModal';

type AppRoute = 'student' | 'faculty';

interface ParsedHash {
  route: AppRoute;
  rollNo: number | null;
  owner: string;
  repo: string;
}

function parseHash(hash: string): ParsedHash {
  const withoutHash = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = withoutHash.split('?');
  const segments = (pathPart || '').split('/').filter(Boolean);
  const first = (segments[0] || '').toLowerCase();
  const route: AppRoute = first === 'faculty' ? 'faculty' : 'student';

  const params = new URLSearchParams(queryPart || '');
  const rollRaw = params.get('roll') || segments[1] || '';
  const rollParsed = parseInt(rollRaw, 10);
  const rollNo =
    !isNaN(rollParsed) && rollParsed >= 1 && rollParsed <= 54 ? rollParsed : null;

  return {
    route,
    rollNo,
    owner: params.get('owner') || '',
    repo: params.get('repo') || '',
  };
}

export default function App() {
  const [parsed, setParsed] = useState<ParsedHash>(() => {
    if (typeof window === 'undefined') {
      return { route: 'student', rollNo: null, owner: '', repo: '' };
    }
    if (!window.location.hash) {
      window.location.hash = '#/student';
    }
    return parseHash(window.location.hash);
  });

  const [githubConfig, setGithubConfig] = useState<GitHubConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    const init = parseHash(window.location.hash);
    if (init.owner && init.repo) {
      return { owner: init.owner, repo: init.repo, token: '' };
    }
    return null;
  });
  const [ghModalOpen, setGhModalOpen] = useState<boolean>(false);

  useEffect(() => {
    function handleHashChange() {
      const next = parseHash(window.location.hash);
      setParsed(next);
      if (next.owner && next.repo) {
        setGithubConfig((prev) =>
          prev && prev.owner === next.owner && prev.repo === next.repo
            ? prev
            : { owner: next.owner, repo: next.repo, token: prev?.token || '' }
        );
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {parsed.route === 'faculty'
            ? 'PatientTracker · Faculty Console'
            : 'PatientTracker · Student Lab'}
        </span>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setGhModalOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {githubConfig ? `${githubConfig.owner}/${githubConfig.repo}` : 'Connect GitHub'}
          </button>
        </div>
      </header>

      <main>
        {parsed.route === 'faculty' ? (
          <FacultyConsole
            githubConfig={githubConfig}
            onConnectGitHub={(cfg) => setGithubConfig(cfg)}
            onOpenGitHubModal={() => setGhModalOpen(true)}
          />
        ) : (
          <StudentWorkbench
            urlRollNo={parsed.rollNo}
            githubConfig={githubConfig}
            onConnectGitHub={(cfg) => setGithubConfig(cfg)}
            onOpenGitHubModal={() => setGhModalOpen(true)}
          />
        )}
      </main>

      <GitHubConnectModal
        open={ghModalOpen}
        onClose={() => setGhModalOpen(false)}
        config={githubConfig}
        onConnect={(cfg) => setGithubConfig(cfg)}
        onDisconnect={() => setGithubConfig(null)}
      />
    </div>
  );
}
