import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode2,
  FileText,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Lock,
  LogOut,
  Play,
  RotateCcw,
  TableProperties,
} from 'lucide-react';
import { TASKS_54 } from '@/src/data/tasks54';
import {
  GitConflictError,
  GitHubConfig,
  createBranchFrom,
  createPullRequest,
  getFileContent,
  listBranches,
  putFileContent,
} from '@/src/lib/githubClient';
import {
  LocalLabRepoState,
  initializeLocalLabRepo,
  isConventionalCommit,
  loadAllReferenceFiles,
  loadAssignments,
  loadLocalLabState,
  saveLocalLabState,
} from '@/src/lib/localLabStore';
import { buildSandboxedPreviewHtml } from '@/src/lib/sandboxPreview';
import {
  StudentRecord,
  SubmissionRecord,
  loadLabSettings,
  loadSubmissions,
  parseGitHubRepoUrl,
  recordSubmissionToSheetAndLocal,
  verifyStudentWithSheetOrLocal,
} from '@/src/lib/sheetsAndAuth';
import { ConflictPayload, ConflictResolverModal } from '@/src/components/ConflictResolverModal';
import { SubmissionPdfReport } from '@/src/components/SubmissionPdfReport';
import { LabManualModal } from '@/src/components/LabManualModal';
import { FormFieldGuidePanel } from '@/src/components/FormFieldGuidePanel';

interface Props {
  urlRollNo: number | null;
  githubConfig: GitHubConfig | null;
  onConnectGitHub: (cfg: GitHubConfig) => void;
  onOpenGitHubModal: () => void;
  onAuthChange?: (loggedIn: boolean) => void;
}

type EditorTab = 'assigned' | 'storage-ref';

export const StudentWorkbench: React.FC<Props> = ({
  urlRollNo,
  githubConfig,
  onConnectGitHub,
  onOpenGitHubModal,
  onAuthChange,
}) => {
  const resolveFacultyRepoUrl = (cfg: GitHubConfig | null): string => {
    if (cfg?.owner && cfg?.repo) {
      return `https://github.com/${cfg.owner}/${cfg.repo}`;
    }
    const latest = loadLabSettings();
    return latest.repoUrl || 'https://github.com/faculty/PatientTracker-MCA';
  };

  // Step 1: Student Login state (Official Email + Reg No — no PIN)
  const [emailInput, setEmailInput] = useState('');
  const [regNoInput, setRegNoInput] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [student, setStudent] = useState<StudentRecord | null>(null);

  // Step 2: Clone Repository state
  const [repoUrlInput, setRepoUrlInput] = useState(() => resolveFacultyRepoUrl(githubConfig));
  const [studentTokenInput, setStudentTokenInput] = useState(githubConfig?.token || '');
  const [cloned, setCloned] = useState(false);
  const [cloneBusy, setCloneBusy] = useState(false);

  // Cloned SHAs for real conflict detection
  const [clonedFileSha, setClonedFileSha] = useState<string>('');
  const [clonedContribSha, setClonedContribSha] = useState<string>('');

  // Step 3: Workspace Editor & Live Preview
  const [activeTab, setActiveTab] = useState<EditorTab>('assigned');
  const [assignedCode, setAssignedCode] = useState('');
  const [contributorsText, setContributorsText] = useState('# Patient Tracker Student Contributors\n');
  const [storageRefCode, setStorageRefCode] = useState('');
  const [repoFiles, setRepoFiles] = useState<Record<string, string>>({});

  const [branchReady, setBranchReady] = useState(false);
  const [commitType, setCommitType] = useState<'feat' | 'fix' | 'style'>('feat');
  const [commitSummary, setCommitSummary] = useState('');

  const [previewRole, setPreviewRole] = useState<'Admin' | 'Clerk' | 'Doctor' | 'Patient'>('Doctor');
  const [previewKey, setPreviewKey] = useState(0);

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );
  const [localState, setLocalState] = useState<LocalLabRepoState>(() => loadLocalLabState());

  // Conflict resolver modal
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const [conflictTarget, setConflictTarget] = useState<'assigned' | 'contributors'>('assigned');

  // Step 4: Submission status & PDF Report
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(() => loadSubmissions());
  const [showPdfReport, setShowPdfReport] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [showFieldGuide, setShowFieldGuide] = useState(true);
  const [rollEntryInput, setRollEntryInput] = useState('');
  const [sandboxTested, setSandboxTested] = useState(false);

  const taskMeta = useMemo(() => {
    if (!student) return null;
    return (
      TASKS_54.find((t) => t.filePath === student.filePath || t.rollNo === student.rollNo) || null
    );
  }, [student]);

  const currentSubmission = useMemo(() => {
    if (!student) return null;
    return (
      submissions.find(
        (s) =>
          s.officialEmail.toLowerCase() === student.email.toLowerCase() &&
          s.regNo.toUpperCase() === student.regNo.toUpperCase() &&
          s.filePath === student.filePath
      ) || null
    );
  }, [submissions, student]);

  // Sync student auth state to parent header
  useEffect(() => {
    onAuthChange?.(Boolean(student));
  }, [student, onAuthChange]);

  // Keep faculty repository link synced from URL params, connected repo, or faculty-saved settings
  useEffect(() => {
    setRepoUrlInput(resolveFacultyRepoUrl(githubConfig));
    if (githubConfig?.token && !studentTokenInput) {
      setStudentTokenInput(githubConfig.token);
    }
  }, [githubConfig]);

  // If urlRollNo was provided on link, pre-fill helper banner (still requires Email + RegNo login)
  const linkedTaskHint = useMemo(() => {
    if (urlRollNo === null) return null;
    return TASKS_54.find((t) => t.rollNo === urlRollNo) || null;
  }, [urlRollNo]);

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const latestSettings = loadLabSettings();
      const verified = await verifyStudentWithSheetOrLocal(
        emailInput,
        regNoInput,
        latestSettings.appsScriptUrl
      );
      if (!verified) {
        setLoginError('Account not found. Please contact your faculty.');
        return;
      }
      setStudent(verified);
      setRepoUrlInput(resolveFacultyRepoUrl(githubConfig));
      setCloned(false);
      setRollEntryInput('');
      setSandboxTested(false);
      setBanner(null);

      const folder = verified.filePath.split('/')[0];
      if (folder === 'patient') setPreviewRole('Patient');
      else if (folder === 'doctor') setPreviewRole('Doctor');
      else if (verified.rollNo >= 12) setPreviewRole('Clerk');
      else setPreviewRole('Admin');

      const fileName = verified.filePath.split('/')[1] || verified.filePath;
      setCommitSummary(`implement ${fileName}`);
      setSubmissions(loadSubmissions());
    } catch {
      setLoginError('Unable to verify student account. Please contact your faculty.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleCloneRepository(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    setBanner(null);
    setCloneBusy(true);

    try {
      const refFiles = await loadAllReferenceFiles();
      setStorageRefCode(refFiles['shared/storage.js'] || '');
      const fallbackStarter =
        taskMeta?.starterCode ||
        loadAssignments().find((a) => a.filePath === student.filePath)?.starterCode ||
        '';

      const parsed = parseGitHubRepoUrl(repoUrlInput);
      const token = studentTokenInput.trim() || githubConfig?.token || '';

      if (parsed && token) {
        const activeCfg: GitHubConfig = {
          owner: parsed.owner,
          repo: parsed.repo,
          token,
        };
        onConnectGitHub(activeCfg);

        const branches = await listBranches(activeCfg);
        const hasPersonal = branches.some((b) => b.name === student.branchName);
        const sourceBranch = hasPersonal
          ? student.branchName
          : branches.some((b) => b.name === student.moduleBranch)
            ? student.moduleBranch
            : 'main';

        const [remoteAssigned, remoteContrib] = await Promise.all([
          getFileContent(activeCfg, student.filePath, sourceBranch),
          getFileContent(activeCfg, 'CONTRIBUTORS.txt', sourceBranch),
        ]);

        setRepoFiles(refFiles);
        setAssignedCode(remoteAssigned?.content ?? fallbackStarter);
        setClonedFileSha(remoteAssigned?.sha || '');
        setContributorsText(
          remoteContrib?.content ?? '# Patient Tracker Student Contributors\n'
        );
        setClonedContribSha(remoteContrib?.sha || '');
        setBranchReady(hasPersonal);
        setSandboxTested(false);
        setActiveTab('assigned');
        setCloned(true);
        setBanner({
          type: 'success',
          text: `Cloned ${parsed.owner}/${parsed.repo} (${sourceBranch}) into your sandbox for ${student.filePath}.`,
        });
      } else {
        let state = loadLocalLabState();
        if (!state.initialized) {
          state = await initializeLocalLabRepo(loadAssignments());
        }
        setLocalState(state);

        const hasPersonal = Boolean(state.branches[student.branchName]);
        const sourceBranch = hasPersonal
          ? student.branchName
          : state.branches[student.moduleBranch]
            ? student.moduleBranch
            : 'main';
        const branchTree = state.branches[sourceBranch] || state.branches.main || refFiles;

        setRepoFiles({ ...refFiles, ...branchTree });
        setAssignedCode(branchTree[student.filePath] ?? fallbackStarter);
        setContributorsText(
          branchTree['CONTRIBUTORS.txt'] ?? '# Patient Tracker Student Contributors\n'
        );
        setClonedFileSha(branchTree[student.filePath] || '');
        setClonedContribSha(branchTree['CONTRIBUTORS.txt'] || '');
        setBranchReady(hasPersonal);
        setSandboxTested(false);
        setActiveTab('assigned');
        setCloned(true);
        setBanner({
          type: 'info',
          text: `Cloned repository in Local Lab mode (${sourceBranch}). Connect a GitHub token anytime to push to github.com.`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to clone repository.',
      });
    } finally {
      setCloneBusy(false);
    }
  }

  const previewHtml = useMemo(() => {
    if (!student) return '';
    return buildSandboxedPreviewHtml(student.filePath, assignedCode, repoFiles, previewRole);
  }, [student, assignedCode, repoFiles, previewRole, previewKey]);

  function appendContributorLine(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!student) return;
    const entered = rollEntryInput.trim();
    if (!entered) {
      setBanner({
        type: 'error',
        text: 'Please enter your Roll Number or RegNo before adding to CONTRIBUTORS.txt.',
      });
      return;
    }
    const line =
      entered.toUpperCase() === student.regNo.toUpperCase()
        ? `${student.regNo} | ${student.name} | ${student.filePath}`
        : `Roll ${entered} | ${student.regNo} | ${student.name} | ${student.filePath}`;
    if (!contributorsText.toLowerCase().includes(student.regNo.toLowerCase())) {
      setContributorsText((prev) => `${prev.trimEnd()}\n${line}\n`);
    }
    setBanner({
      type: 'success',
      text: `Added your Roll No (${entered}) and RegNo (${student.regNo}) to CONTRIBUTORS.txt.`,
    });
  }

  function runLocalSandboxTest() {
    setPreviewKey((k) => k + 1);
    setSandboxTested(true);
    setBanner({
      type: 'success',
      text: 'Local Sandbox output refreshed and verified. You can now push your changes to GitHub.',
    });
  }

  async function saveSubmissionRecord(sourceCodeSnapshot: string) {
    if (!student) return;
    const prev = currentSubmission;
    const record: SubmissionRecord = {
      id: prev?.id || `sub_${Date.now()}`,
      timestamp: new Date().toISOString(),
      officialEmail: student.email,
      regNo: student.regNo,
      studentName: student.name,
      department: student.department,
      exerciseTitle: student.exerciseTitle,
      branchName: student.branchName,
      filePath: student.filePath,
      repoUrl: repoUrlInput.trim(),
      status: prev?.status === 'Evaluated' ? 'Evaluated' : 'Submitted',
      sourceCode: sourceCodeSnapshot,
      rubric: prev?.rubric || {
        repoAndGitignore: 0,
        conventionalCommits: 0,
        branchingAndConflicts: 0,
        prsAndCodeReview: 0,
        ciPipeline: 0,
        workingPageAndViva: 0,
      },
      totalMarks: prev?.totalMarks || 0,
      facultyRemarks: prev?.facultyRemarks || '',
    };
    await recordSubmissionToSheetAndLocal(record, loadLabSettings().appsScriptUrl);
    setSubmissions(loadSubmissions());
  }

  async function executePush(options?: {
    overrideTarget?: 'assigned' | 'contributors';
    overrideContent?: string;
    forceRemoteSha?: string;
  }) {
    if (!student) return;
    if (!options?.overrideTarget) {
      if (!contributorsText.toLowerCase().includes(student.regNo.toLowerCase())) {
        setBanner({
          type: 'error',
          text: 'Step 2 required: Add your Roll Number to CONTRIBUTORS.txt before pushing to GitHub.',
        });
        return;
      }
      if (!sandboxTested) {
        setBanner({
          type: 'error',
          text: 'Step 3 required: Click "Run & Verify in Local Sandbox" to test your output before pushing.',
        });
        return;
      }
    }
    const fullMsg = `${commitType}: ${commitSummary.trim()}`;
    if (!isConventionalCommit(fullMsg)) {
      setBanner({
        type: 'error',
        text: 'Commit message must start with feat:, fix:, or style: followed by a short description.',
      });
      return;
    }

    const activeFileContent =
      options?.overrideTarget === 'assigned' && options.overrideContent !== undefined
        ? options.overrideContent
        : assignedCode;
    const activeContribContent =
      options?.overrideTarget === 'contributors' && options.overrideContent !== undefined
        ? options.overrideContent
        : contributorsText;

    setBusy(true);
    setBanner(null);

    try {
      const parsed = parseGitHubRepoUrl(repoUrlInput);
      const token = studentTokenInput.trim() || githubConfig?.token || '';

      if (parsed && token) {
        const cfg: GitHubConfig = { owner: parsed.owner, repo: parsed.repo, token };
        await createBranchFrom(cfg, student.branchName, student.moduleBranch);
        setBranchReady(true);

        if (!options?.overrideTarget || options.overrideTarget === 'assigned') {
          try {
            const res = await putFileContent(
              cfg,
              student.filePath,
              activeFileContent,
              fullMsg,
              student.branchName,
              {
                expectedSha: clonedFileSha || undefined,
                forceRemoteSha:
                  options?.overrideTarget === 'assigned' ? options.forceRemoteSha : undefined,
              }
            );
            setClonedFileSha(res.fileSha);
          } catch (err) {
            if (err instanceof GitConflictError) {
              setConflictTarget('assigned');
              setConflict({
                filePath: student.filePath,
                branchName: student.branchName,
                localContent: activeFileContent,
                remoteContent: err.remoteContent,
                remoteSha: err.remoteSha,
              });
              setBusy(false);
              return;
            }
            throw err;
          }
        }

        if (!options?.overrideTarget || options.overrideTarget === 'contributors') {
          try {
            const res = await putFileContent(
              cfg,
              'CONTRIBUTORS.txt',
              activeContribContent,
              `${fullMsg} (update CONTRIBUTORS.txt)`,
              student.branchName,
              {
                expectedSha: clonedContribSha || undefined,
                forceRemoteSha:
                  options?.overrideTarget === 'contributors' ? options.forceRemoteSha : undefined,
              }
            );
            setClonedContribSha(res.fileSha);
          } catch (err) {
            if (err instanceof GitConflictError) {
              setConflictTarget('contributors');
              setConflict({
                filePath: 'CONTRIBUTORS.txt',
                branchName: student.branchName,
                localContent: activeContribContent,
                remoteContent: err.remoteContent,
                remoteSha: err.remoteSha,
              });
              setBusy(false);
              return;
            }
            throw err;
          }
        }

        await saveSubmissionRecord(activeFileContent);
        setBanner({
          type: 'success',
          text: `Pushed ${student.filePath} to GitHub branch "${student.branchName}" and recorded your submission.`,
        });
      } else {
        const state = loadLocalLabState();
        if (!state.branches[student.branchName]) {
          state.branches[student.branchName] = {
            ...(state.branches[student.moduleBranch] || state.branches.main || {}),
          };
          state.branchParents[student.branchName] = student.moduleBranch;
        }

        // Detect simulated remote conflict if branch file changed externally since clone
        const remoteAssigned = state.branches[student.branchName][student.filePath] || '';
        if (
          !options?.forceRemoteSha &&
          clonedFileSha &&
          remoteAssigned &&
          remoteAssigned !== clonedFileSha &&
          remoteAssigned !== activeFileContent
        ) {
          setConflictTarget('assigned');
          setConflict({
            filePath: student.filePath,
            branchName: student.branchName,
            localContent: activeFileContent,
            remoteContent: remoteAssigned,
            remoteSha: 'local-resolved',
          });
          setBusy(false);
          return;
        }

        state.branches[student.branchName][student.filePath] = activeFileContent;
        state.branches[student.branchName]['CONTRIBUTORS.txt'] = activeContribContent;

        const commitObj = {
          id: 'c' + Math.random().toString(16).slice(2, 8),
          message: fullMsg,
          author: `${student.name} (${student.regNo})`,
          timestamp: new Date().toISOString(),
          filesChanged: [student.filePath, 'CONTRIBUTORS.txt'],
        };
        state.commitsByBranch[student.branchName] = [
          ...(state.commitsByBranch[student.branchName] || []),
          commitObj,
        ];
        saveLocalLabState(state);
        setLocalState({ ...state });
        setClonedFileSha(activeFileContent);
        setClonedContribSha(activeContribContent);
        setBranchReady(true);

        await saveSubmissionRecord(activeFileContent);
        setBanner({
          type: 'success',
          text: `Committed & pushed ${student.filePath} to "${student.branchName}" (${commitObj.id}) and saved your submission.`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Push failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleResolveConflict(choice: 'local' | 'remote' | 'merge') {
    if (!conflict) return;
    if (choice === 'remote') {
      if (conflictTarget === 'assigned') {
        setAssignedCode(conflict.remoteContent);
        setClonedFileSha(conflict.remoteSha);
      } else {
        setContributorsText(conflict.remoteContent);
        setClonedContribSha(conflict.remoteSha);
      }
      setConflict(null);
      setBanner({
        type: 'info',
        text: `Updated your editor with the remote version of ${conflict.filePath}.`,
      });
      return;
    }

    let nextContent = conflict.localContent;
    if (choice === 'merge') {
      const remoteLines = conflict.remoteContent.split('\n');
      const localLines = conflict.localContent.split('\n');
      const seen = new Set<string>();
      const combined: string[] = [];
      for (const line of [...remoteLines, ...localLines]) {
        const key = line.trimEnd();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(line);
        }
      }
      nextContent = combined.join('\n');
      if (conflictTarget === 'assigned') setAssignedCode(nextContent);
      else setContributorsText(nextContent);
    }

    const sha = conflict.remoteSha;
    const target = conflictTarget;
    setConflict(null);
    await executePush({
      overrideTarget: target,
      overrideContent: nextContent,
      forceRemoteSha: sha,
    });
  }

  async function handleOpenPullRequest() {
    if (!student) return;
    setBusy(true);
    setBanner(null);
    try {
      const parsed = parseGitHubRepoUrl(repoUrlInput);
      const token = studentTokenInput.trim() || githubConfig?.token || '';
      const prTitle = `${student.regNo}: ${student.exerciseTitle}`;

      if (parsed && token) {
        const cfg: GitHubConfig = { owner: parsed.owner, repo: parsed.repo, token };
        const pr = await createPullRequest(
          cfg,
          prTitle,
          student.branchName,
          student.moduleBranch,
          `Submitted by ${student.name} (${student.regNo}) for \`${student.filePath}\`.`
        );
        setBanner({
          type: 'success',
          text: `Pull Request #${pr.number} opened: ${student.branchName} -> ${student.moduleBranch}.`,
        });
      } else {
        const state = loadLocalLabState();
        const existing = state.pullRequests.find(
          (p) => p.headBranch === student.branchName && p.status === 'open'
        );
        if (existing) {
          setBanner({
            type: 'info',
            text: `Pull Request #${existing.number} is already open for ${student.branchName}.`,
          });
          setBusy(false);
          return;
        }
        const nextNum = state.pullRequests.reduce((m, p) => Math.max(m, p.number), 0) + 1;
        state.pullRequests.push({
          number: nextNum,
          title: prTitle,
          headBranch: student.branchName,
          baseBranch: student.moduleBranch,
          author: `${student.name} (${student.regNo})`,
          rollNo: student.rollNo,
          status: 'open',
          ciPassed: true,
          hasConflict: false,
          commits: state.commitsByBranch[student.branchName] || [],
          reviews: [],
          createdAt: new Date().toISOString(),
        });
        saveLocalLabState(state);
        setLocalState({ ...state });
        setBanner({
          type: 'success',
          text: `Pull Request #${nextNum} opened targeting "${student.moduleBranch}".`,
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to open Pull Request.',
      });
    } finally {
      setBusy(false);
    }
  }

  function blockClipboardAction(e: React.SyntheticEvent, label: string) {
    e.preventDefault();
    setBanner({
      type: 'error',
      text: `${label} is disabled in the student code editor. Type your code manually.`,
    });
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'v' || key === 'c' || key === 'x')) {
      e.preventDefault();
      setBanner({
        type: 'error',
        text: 'Copy, cut, and paste shortcuts are disabled in the student code editor.',
      });
    } else if (e.shiftKey && key === 'insert') {
      e.preventDefault();
      setBanner({
        type: 'error',
        text: 'Pasting is disabled in the student code editor.',
      });
    }
  }

  function handleEditorBeforeInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const native = e.nativeEvent as InputEvent;
    if (
      native?.inputType === 'insertFromPaste' ||
      native?.inputType === 'insertFromDrop' ||
      native?.inputType === 'deleteByCut'
    ) {
      e.preventDefault();
      setBanner({
        type: 'error',
        text: 'Copy, cut, and paste are disabled in the student code editor.',
      });
    }
  }

  // STEP 1: Student Login (Official Email + Reg No)
  if (!student) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center justify-center px-6 py-10">
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">Student Lab Login</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your Official Email and Registration Number to access your mapped exercise.
          </p>

          {linkedTaskHint && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              Assigned File Link: <strong className="font-mono text-slate-900">{linkedTaskHint.filePath}</strong>
            </div>
          )}

          {loginError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleStudentLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="stuEmail">
                Official Email
              </label>
              <input
                id="stuEmail"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="26SP216XXXX@student.hindustanuiv.ac.in"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="stuRegNo">
                Registration Number (RegNo)
              </label>
              <input
                id="stuRegNo"
                type="text"
                required
                value={regNoInput}
                onChange={(e) => setRegNoInput(e.target.value)}
                placeholder="e.g., 26SP216XXXX, 26SP217XXXX, 26SP218XXXX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-teal-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loginBusy ? 'Verifying...' : 'Sign In'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // STEP 2: Clone Faculty Repository
  if (!cloned) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl items-center justify-center px-6 py-8">
        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Clone Lab Repository</h1>
              <p className="mt-1 text-sm text-slate-600">
                Welcome, <strong className="text-slate-900">{student.name}</strong> ({student.regNo} · {student.department}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Manual (PDF)
              </button>
              <button
                type="button"
                onClick={() => setStudent(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-500">Assigned Exercise:</span>{' '}
              <strong className="text-slate-900">{student.exerciseTitle}</strong>
            </div>
            <div>
              <span className="text-slate-500">Mapped Branch:</span>{' '}
              <strong className="font-mono text-teal-800">{student.branchName}</strong> (from{' '}
              <span className="font-mono">{student.moduleBranch}</span>)
            </div>
            <div>
              <span className="text-slate-500">Assigned File:</span>{' '}
              <strong className="font-mono text-slate-900">{student.filePath}</strong>
            </div>
          </div>

          {banner && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{banner.text}</span>
            </div>
          )}

          <form onSubmit={handleCloneRepository} className="mt-5 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="cloneRepoUrl">
                  Faculty GitHub Repository Link
                </label>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Read-Only
                </span>
              </div>
              <input
                id="cloneRepoUrl"
                type="text"
                required
                readOnly
                aria-readonly="true"
                value={repoUrlInput}
                placeholder="https://github.com/faculty/PatientTracker-MCA"
                className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Automatically populated from your faculty&apos;s repository settings (read-only). Only your GitHub PAT is required below.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="cloneToken">
                GitHub Personal Access Token (Optional for Local Sandbox)
              </label>
              <input
                id="cloneToken"
                type="password"
                value={studentTokenInput}
                onChange={(e) => setStudentTokenInput(e.target.value)}
                placeholder="ghp_... (kept in browser memory only)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-teal-700 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Leave empty to practice in the Local Lab Sandbox, or paste your GitHub PAT to push directly to GitHub.
              </p>
            </div>

            <button
              type="submit"
              disabled={cloneBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <FolderGit2 className="h-4 w-4" />
              {cloneBusy ? 'Cloning Assigned Branch...' : 'Clone Repository & Open Editor'}
            </button>
          </form>
        </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <FormFieldGuidePanel
              rollNo={student.rollNo}
              exerciseTitle={`Ex ${String(student.rollNo).padStart(2, '0')} · ${student.filePath}`}
            />
          </section>
        </div>

        <LabManualModal
          open={manualOpen}
          role="student"
          onClose={() => setManualOpen(false)}
        />
      </div>
    );
  }

  // STEP 4: Printable PDF Report View (when opened)
  if (showPdfReport && currentSubmission) {
    return (
      <SubmissionPdfReport
        submission={currentSubmission}
        repoFiles={repoFiles}
        onClose={() => setShowPdfReport(false)}
      />
    );
  }

  const hasContribEntry = contributorsText
    .toLowerCase()
    .includes(student.regNo.toLowerCase());

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-5">
      {/* Student Assignment & Submission Status Header */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            <div className="text-sm font-bold text-slate-900">
              {student.name} · <span className="font-mono">{student.regNo}</span> ({student.department})
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span>
                Exercise: <strong className="text-slate-900">{student.exerciseTitle}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Branch: <strong className="font-mono text-teal-800">{student.branchName}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                File: <strong className="font-mono text-slate-900">{student.filePath}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Manual (PDF)
            </button>
            {currentSubmission?.status === 'Evaluated' && (
              <button
                type="button"
                onClick={() => setShowPdfReport(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <FileText className="h-3.5 w-3.5" />
                Generate PDF Report ({currentSubmission.totalMarks}/50)
              </button>
            )}

            {currentSubmission && currentSubmission.status !== 'Evaluated' && (
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                Status: {currentSubmission.status}
              </span>
            )}

            {!githubConfig && (
              <button
                type="button"
                onClick={onOpenGitHubModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-teal-700 hover:text-teal-800"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Connect GitHub
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCloned(false);
                setStudent(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {taskMeta && (
          <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-slate-900">Instructions:</strong> {taskMeta.summary} —{' '}
                <span className="text-slate-500">{taskMeta.validationHint}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-slate-500">
                  Store: {taskMeta.jsonStore} ({taskMeta.jsonKeys.join(', ')})
                </span>
                <button
                  type="button"
                  onClick={() => setShowFieldGuide((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  <span>{showFieldGuide ? 'Hide Field Spec' : 'Form Elements & Field Guide'}</span>
                  {showFieldGuide ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            {showFieldGuide && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <FormFieldGuidePanel rollNo={student.rollNo} compact />
              </div>
            )}
          </div>
        )}

        {currentSubmission?.status === 'Needs Revision' && currentSubmission.facultyRemarks && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-900">
            <strong>Faculty Feedback:</strong> {currentSubmission.facultyRemarks}
          </div>
        )}
      </section>

      {banner && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : banner.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dual Pane: Assigned File Code Sandbox + Live Output Preview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('assigned')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold ${
                  activeTab === 'assigned'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                Step 1: {student.filePath}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('storage-ref')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-semibold ${
                  activeTab === 'storage-ref'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                shared/storage.js (Read-Only)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                {activeTab === 'assigned' ? 'Copy/Paste Disabled' : 'Locked Reference File'}
              </span>
              {activeTab === 'assigned' && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignedCode(taskMeta?.starterCode || '');
                    setSandboxTested(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Starter
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1">
            {activeTab === 'assigned' && (
              <textarea
                value={assignedCode}
                onChange={(e) => {
                  setAssignedCode(e.target.value);
                  setSandboxTested(false);
                }}
                onCopy={(e) => blockClipboardAction(e, 'Copying')}
                onCut={(e) => blockClipboardAction(e, 'Cutting')}
                onPaste={(e) => blockClipboardAction(e, 'Pasting')}
                onDrop={(e) => blockClipboardAction(e, 'Drag & drop')}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={handleEditorKeyDown}
                onBeforeInput={handleEditorBeforeInput}
                spellCheck={false}
                aria-label="Assigned file code editor"
                className="h-[380px] w-full resize-none border-0 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 focus:outline-none"
              />
            )}
            {activeTab === 'storage-ref' && (
              <div className="flex h-[380px] flex-col bg-slate-950">
                <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2 text-[11px] font-medium text-amber-300">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Read-Only Reference — shared/storage.js is locked by faculty and cannot be edited or pushed by students.
                  </span>
                </div>
                <pre
                  onCopy={(e) => blockClipboardAction(e, 'Copying')}
                  onCut={(e) => blockClipboardAction(e, 'Cutting')}
                  onContextMenu={(e) => e.preventDefault()}
                  className="flex-1 select-none overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300"
                >
                  <code>{storageRefCode}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Sequential Steps 2, 3, and 4 */}
          <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4">
            {/* Step 2: Add Roll Number to CONTRIBUTORS.txt */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">
                  Step 2: Add Your Roll Number to <span className="font-mono">CONTRIBUTORS.txt</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    hasContribEntry
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {hasContribEntry ? 'Added to CONTRIBUTORS.txt' : 'Pending'}
                </span>
              </div>

              {!hasContribEntry ? (
                <form onSubmit={appendContributorLine} className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    id="contribRollInput"
                    type="text"
                    value={rollEntryInput}
                    onChange={(e) => setRollEntryInput(e.target.value)}
                    placeholder={`Enter Roll No / RegNo (e.g., ${String(student.rollNo).padStart(2, '0')} or ${student.regNo})`}
                    className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs focus:border-teal-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Add Roll No to CONTRIBUTORS.txt
                  </button>
                </form>
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-600">
                  Your entry (<span className="font-mono font-semibold text-slate-800">{student.regNo}</span>) is locked into <span className="font-mono">CONTRIBUTORS.txt</span> and will be included with your push.
                </p>
              )}

              <pre className="mt-2.5 max-h-24 overflow-auto rounded border border-slate-200 bg-slate-950 p-2.5 font-mono text-[11px] text-slate-300">
                <code>{contributorsText}</code>
              </pre>
            </div>

            {/* Step 3: Verify Output in Local Sandbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Step 3: Test &amp; Verify Output in Local Sandbox
                </div>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Run your code in the Live Output panel on the right and confirm it works before pushing to GitHub.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sandboxTested && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Output Verified
                  </span>
                )}
                <button
                  type="button"
                  onClick={runLocalSandboxTest}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                >
                  <Play className="h-3.5 w-3.5" />
                  {sandboxTested ? 'Re-run Local Sandbox' : 'Run & Verify in Local Sandbox'}
                </button>
              </div>
            </div>

            {/* Step 4: Commit & Push to GitHub */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-900">
                  Step 4: Commit &amp; Push to GitHub (<span className="font-mono text-teal-800">{student.branchName}</span>)
                </span>
                <span className="text-[11px] text-slate-500">
                  Branch status:{' '}
                  <strong className={branchReady ? 'text-emerald-700' : 'text-slate-800'}>
                    {branchReady ? 'Ready' : 'Created on first push'}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <select
                    value={commitType}
                    onChange={(e) => setCommitType(e.target.value as 'feat' | 'fix' | 'style')}
                    aria-label="Conventional commit prefix"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs font-semibold text-slate-900"
                  >
                    <option value="feat">feat:</option>
                    <option value="fix">fix:</option>
                    <option value="style">style:</option>
                  </select>
                </div>
                <div className="sm:col-span-9">
                  <input
                    type="text"
                    value={commitSummary}
                    onChange={(e) => setCommitSummary(e.target.value)}
                    placeholder="describe your change..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              {(!hasContribEntry || !sandboxTested) && (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Complete {!hasContribEntry ? 'Step 2 (Add Roll No to CONTRIBUTORS.txt)' : ''}
                  {!hasContribEntry && !sandboxTested ? ' and ' : ''}
                  {!sandboxTested ? 'Step 3 (Run & Verify in Local Sandbox)' : ''} to unlock Push.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={busy || !hasContribEntry || !sandboxTested}
                  onClick={() => executePush()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GitCommitHorizontal className="h-3.5 w-3.5" />
                  {busy ? 'Pushing...' : `Push to ${student.branchName}`}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handleOpenPullRequest}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  Open PR → {student.moduleBranch}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
            <div className="text-xs font-semibold text-slate-800">
              Live Output (Local Sandbox) · <span className="font-mono text-slate-500">{student.filePath}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={previewRole}
                onChange={(e) =>
                  setPreviewRole(e.target.value as 'Admin' | 'Clerk' | 'Doctor' | 'Patient')
                }
                aria-label="Preview session role"
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
              >
                <option value="Admin">Role: Admin</option>
                <option value="Clerk">Role: Clerk</option>
                <option value="Doctor">Role: Doctor</option>
                <option value="Patient">Role: Patient</option>
              </select>
              <button
                type="button"
                onClick={runLocalSandboxTest}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Play className="h-3 w-3" />
                Run
              </button>
            </div>
          </div>

          <iframe
            key={previewKey}
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-forms"
            title="Live HTML CSS JS Student Preview"
            className="h-[680px] w-full flex-1 rounded-b-xl border-0 bg-slate-50"
          />
        </div>
      </div>

      <ConflictResolverModal
        conflict={conflict}
        busy={busy}
        onResolve={handleResolveConflict}
        onCancel={() => setConflict(null)}
      />

      <LabManualModal
        open={manualOpen}
        role="student"
        onClose={() => setManualOpen(false)}
      />
    </div>
  );
};
