/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { GitHubConfig } from '@/src/lib/githubClient';
import { loadLabSettings, saveLabSettings } from '@/src/lib/sheetsAndAuth';
import { StudentWorkbench } from '@/src/components/StudentWorkbench';
import { FacultyConsole } from '@/src/components/FacultyConsole';
import { GitHubConnectModal } from '@/src/components/GitHubConnectModal';

type AppRoute = 'student' | 'faculty';

interface ParsedHash {
  route: AppRoute;
  rollNo: number | null;
  owner: string;
  repo: string;
  sheet: string;
  repoUrl: string;
  pmap: Record<string, string> | null;
  pprefix: boolean | null;
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

  let pmap: Record<string, string> | null = null;
  const rawPmap = params.get('pmap');
  if (rawPmap) {
    try {
      const parsedMap = JSON.parse(rawPmap);
      if (parsedMap && typeof parsedMap === 'object' && !Array.isArray(parsedMap)) {
        pmap = parsedMap as Record<string, string>;
      }
    } catch {
      // ignore invalid pmap query param
    }
  }
  const rawPprefix = params.get('pprefix');
  const pprefix = rawPprefix === '1' ? true : rawPprefix === '0' ? false : null;

  return {
    route,
    rollNo,
    owner: params.get('owner') || '',
    repo: params.get('repo') || '',
    sheet: params.get('sheet') || '',
    repoUrl: params.get('repoUrl') || '',
    pmap,
    pprefix,
  };
}

function syncSettingsFromHash(parsed: ParsedHash): void {
  if (typeof window === 'undefined') return;
  const existing = loadLabSettings();
  const nextRepoUrl =
    parsed.owner && parsed.repo
      ? `https://github.com/${parsed.owner}/${parsed.repo}`
      : parsed.repoUrl || existing.repoUrl;
  const nextSheet = parsed.sheet || existing.appsScriptUrl;
  const nextPmap = parsed.pmap || existing.programRepos;
  const nextPprefix =
    parsed.pprefix !== null ? parsed.pprefix : existing.prefixBranchWithProgram;
  if (
    nextRepoUrl !== existing.repoUrl ||
    nextSheet !== existing.appsScriptUrl ||
    parsed.pmap !== null ||
    parsed.pprefix !== null
  ) {
    saveLabSettings({
      repoUrl: nextRepoUrl,
      appsScriptUrl: nextSheet,
      programRepos: nextPmap,
      prefixBranchWithProgram: nextPprefix,
    });
  }
}

export default function App() {
  const [parsed, setParsed] = useState<ParsedHash>(() => {
    if (typeof window === 'undefined') {
      return {
        route: 'student',
        rollNo: null,
        owner: '',
        repo: '',
        sheet: '',
        repoUrl: '',
        pmap: null,
        pprefix: null,
      };
    }
    if (!window.location.hash) {
      window.location.hash = '#/student';
    }
    const init = parseHash(window.location.hash);
    syncSettingsFromHash(init);
    return init;
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
  const [facultyLoggedIn, setFacultyLoggedIn] = useState<boolean>(false);
  const [studentLoggedIn, setStudentLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    function handleHashChange() {
      const next = parseHash(window.location.hash);
      syncSettingsFromHash(next);
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

  const showGitHubButton =
    parsed.route === 'faculty' ? facultyLoggedIn : studentLoggedIn;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          {parsed.route === 'faculty'
            ? 'PatientTracker · Faculty Console'
            : 'PatientTracker · Student Lab'}
        </span>

        {showGitHubButton && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setGhModalOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {githubConfig ? `${githubConfig.owner}/${githubConfig.repo}` : 'Connect GitHub'}
            </button>
          </div>
        )}
      </header>

      <main>
        {parsed.route === 'faculty' ? (
          <FacultyConsole
            githubConfig={githubConfig}
            onConnectGitHub={(cfg) => setGithubConfig(cfg)}
            onOpenGitHubModal={() => setGhModalOpen(true)}
            onAuthChange={setFacultyLoggedIn}
          />
        ) : (
          <StudentWorkbench
            urlRollNo={parsed.rollNo}
            githubConfig={githubConfig}
            onConnectGitHub={(cfg) => setGithubConfig(cfg)}
            onOpenGitHubModal={() => setGhModalOpen(true)}
            onAuthChange={setStudentLoggedIn}
          />
        )}
      </main>

      <GitHubConnectModal
        open={ghModalOpen}
        onClose={() => setGhModalOpen(false)}
        config={githubConfig}
        readOnlyRepo={parsed.route === 'student'}
        onConnect={(cfg) => {
          setGithubConfig(cfg);
          if (parsed.route === 'faculty') {
            const existing = loadLabSettings();
            saveLabSettings({
              ...existing,
              repoUrl: `https://github.com/${cfg.owner}/${cfg.repo}`,
            });
          }
        }}
        onDisconnect={() => setGithubConfig(null)}
      />
    </div>
  );
}
