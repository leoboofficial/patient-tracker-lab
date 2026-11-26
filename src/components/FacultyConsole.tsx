import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileSpreadsheet,
  FolderGit2,
  GitBranch,
  GitMerge,
  KeyRound,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  ALL_SOLUTION_FILES,
  ModuleBranch,
  REPO_STARTER_FILES,
  TASKS_54,
} from '@/src/data/tasks54';
import {
  GitHubBranchInfo,
  GitHubConfig,
  GitHubPullRequest,
  createBranchFrom,
  createPullRequest,
  listBranches,
  listPullRequests,
  mergePullRequest,
  putFileContent,
} from '@/src/lib/githubClient';
import {
  LocalLabRepoState,
  LocalPullRequest,
  initializeLocalLabRepo,
  loadAllReferenceFiles,
  loadAssignments,
  loadLocalLabState,
  resetLocalLabRepo,
  saveLocalLabState,
  serializeAssignmentsForRepo,
} from '@/src/lib/localLabStore';
import { buildSandboxedPreviewHtml } from '@/src/lib/sandboxPreview';
import {
  APPS_SCRIPT_TEMPLATE,
  RubricBreakdown,
  StudentRecord,
  SubmissionRecord,
  getFacultyAuth,
  loadLabSettings,
  loadStudentRoster,
  loadSubmissions,
  parseGitHubRepoUrl,
  recordSubmissionToSheetAndLocal,
  saveLabSettings,
  saveStudentRoster,
  saveSubmissions,
  sendFacultyOtp,
  sha256Hex,
  updateFacultyPassword,
} from '@/src/lib/sheetsAndAuth';

interface Props {
  githubConfig: GitHubConfig | null;
  onConnectGitHub: (cfg: GitHubConfig) => void;
  onOpenGitHubModal: () => void;
  onAuthChange?: (authenticated: boolean) => void;
}

type FacultyTab = 'setup' | 'students' | 'submissions' | 'prs';

export const FacultyConsole: React.FC<Props> = ({
  githubConfig,
  onConnectGitHub,
  onOpenGitHubModal,
  onAuthChange,
}) => {
  // Authentication State
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');
  const [loginUsername, setLoginUsername] = useState('faculty');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Forgot Password + Email OTP
  const [forgotEmail, setForgotEmail] = useState('faculty@college.edu');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [demoOtpNotice, setDemoOtpNotice] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Change Password Modal
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [facultyEmailInput, setFacultyEmailInput] = useState('faculty@college.edu');
  const [changePassMsg, setChangePassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lab Configuration
  const [repoUrlInput, setRepoUrlInput] = useState(() => loadLabSettings().repoUrl);
  const [appsScriptInput, setAppsScriptInput] = useState(() => loadLabSettings().appsScriptUrl);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Roster & Mapping State
  const [roster, setRoster] = useState<StudentRecord[]>(() => loadStudentRoster());
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentRegNo, setNewStudentRegNo] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDept, setNewStudentDept] = useState('MCA');
  const [newStudentRollNo, setNewStudentRollNo] = useState<number>(1);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Submissions & Rubric Evaluation
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(() => loadSubmissions());
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [evalRubric, setEvalRubric] = useState<RubricBreakdown>({
    repoAndGitignore: 5,
    conventionalCommits: 10,
    branchingAndConflicts: 10,
    prsAndCodeReview: 10,
    ciPipeline: 5,
    workingPageAndViva: 10,
  });
  const [evalStatus, setEvalStatus] = useState<'Evaluated' | 'Needs Revision'>('Evaluated');
  const [evalRemarks, setEvalRemarks] = useState('');
  const [refFilesCache, setRefFilesCache] = useState<Record<string, string>>({});

  // GitHub / Local Lab State
  const [localState, setLocalState] = useState<LocalLabRepoState>(() => loadLocalLabState());
  const [ghBranches, setGhBranches] = useState<GitHubBranchInfo[]>([]);
  const [ghPrs, setGhPrs] = useState<GitHubPullRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<FacultyTab>('setup');

  useEffect(() => {
    getFacultyAuth().then((cfg) => {
      setFacultyEmailInput(cfg.officialEmail);
      setForgotEmail(cfg.officialEmail);
    });
    loadAllReferenceFiles().then(setRefFilesCache).catch(() => {});
  }, []);

  async function refreshRepoData() {
    setSubmissions(loadSubmissions());
    if (githubConfig) {
      try {
        const [branches, prs] = await Promise.all([
          listBranches(githubConfig),
          listPullRequests(githubConfig),
        ]);
        setGhBranches(branches);
        setGhPrs(prs);
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to refresh GitHub repository.',
        });
      }
    } else {
      let state = loadLocalLabState();
      if (!state.initialized) {
        state = await initializeLocalLabRepo(loadAssignments());
      }
      setLocalState(state);
    }
  }

  useEffect(() => {
    onAuthChange?.(authenticated);
    if (authenticated) {
      refreshRepoData();
    }
  }, [authenticated, githubConfig, onAuthChange]);

  async function handleFacultyLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    const auth = await getFacultyAuth();
    const enteredHash = await sha256Hex(loginPassword);
    if (
      loginUsername.trim().toLowerCase() !== auth.username.toLowerCase() ||
      enteredHash !== auth.passwordHash
    ) {
      setAuthError('Invalid faculty username or password.');
      return;
    }
    setAuthenticated(true);
    setLoginPassword('');
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setDemoOtpNotice('');
    setAuthBusy(true);
    try {
      const auth = await getFacultyAuth();
      if (forgotEmail.trim().toLowerCase() !== auth.officialEmail.toLowerCase()) {
        setAuthError(
          `Official email does not match the registered faculty email (${auth.officialEmail}).`
        );
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(code);
      const result = await sendFacultyOtp(
        forgotEmail.trim(),
        code,
        loadLabSettings().appsScriptUrl
      );
      setOtpSent(true);
      if (result.sentViaEmail) {
        setAuthSuccess(`OTP sent to ${forgotEmail.trim()}. Enter the OTP and your new password.`);
      } else {
        setAuthSuccess('OTP generated. Configure an Apps Script Web App URL to send real emails.');
        setDemoOtpNotice(`Offline OTP (no Apps Script email relay configured): ${code}`);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyOtpAndReset(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    if (otpInput.trim() !== generatedOtp) {
      setAuthError('Incorrect OTP code.');
      return;
    }
    if (resetNewPass.length < 6) {
      setAuthError('New password must be at least 6 characters.');
      return;
    }
    await updateFacultyPassword(resetNewPass, forgotEmail.trim());
    setOtpSent(false);
    setGeneratedOtp('');
    setDemoOtpNotice('');
    setOtpInput('');
    setResetNewPass('');
    setAuthMode('login');
    setAuthSuccess('Password updated successfully. Sign in with your new password.');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePassMsg(null);
    const auth = await getFacultyAuth();
    const curHash = await sha256Hex(currentPassInput);
    if (curHash !== auth.passwordHash) {
      setChangePassMsg({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }
    if (newPassInput.length < 6) {
      setChangePassMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    await updateFacultyPassword(newPassInput, facultyEmailInput);
    setCurrentPassInput('');
    setNewPassInput('');
    setChangePassMsg({
      type: 'success',
      text: 'Faculty password & official email updated successfully.',
    });
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    saveLabSettings({
      repoUrl: repoUrlInput.trim(),
      appsScriptUrl: appsScriptInput.trim(),
    });
    const parsed = parseGitHubRepoUrl(repoUrlInput);
    if (parsed && (!githubConfig || githubConfig.owner !== parsed.owner || githubConfig.repo !== parsed.repo)) {
      onConnectGitHub({
        owner: parsed.owner,
        repo: parsed.repo,
        token: githubConfig?.token || '',
      });
    }
    setStatusMsg({
      type: 'success',
      text: 'Saved Repository Link and Google Apps Script configuration.',
    });
  }

  function getStudentPortalUrl(): string {
    const base = `${window.location.origin}${window.location.pathname}#/student`;
    const parsed = parseGitHubRepoUrl(repoUrlInput);
    if (parsed) {
      return `${base}?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}`;
    }
    return base;
  }

  async function handleInitializeStarterRepo() {
    setBusy(true);
    setStatusMsg(null);
    try {
      const refFiles = await loadAllReferenceFiles();

      if (githubConfig && githubConfig.token) {
        setProgressText('Pushing starter files to main...');
        for (let i = 0; i < REPO_STARTER_FILES.length; i++) {
          const p = REPO_STARTER_FILES[i];
          if (refFiles[p]) {
            setProgressText(`Committing ${p} (${i + 1}/${REPO_STARTER_FILES.length})...`);
            await putFileContent(
              githubConfig,
              p,
              refFiles[p],
              `chore: add starter file ${p}`,
              'main'
            );
          }
        }

        const modBranches: ModuleBranch[] = ['module-login', 'module-doctor', 'module-patient'];
        for (const mb of modBranches) {
          setProgressText(`Creating branch ${mb} from main...`);
          await createBranchFrom(githubConfig, mb, 'main');
        }

        await refreshRepoData();
        setStatusMsg({
          type: 'success',
          text: 'Initialized starter files and 3 module branches (module-login, module-doctor, module-patient) on GitHub.',
        });
      } else {
        const state = await initializeLocalLabRepo(loadAssignments());
        setLocalState(state);
        setStatusMsg({
          type: 'success',
          text: 'Initialized Local Lab Repository with starter folders, .gitignore, CI workflow, and 3 module branches.',
        });
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Initialization failed.',
      });
    } finally {
      setBusy(false);
      setProgressText('');
    }
  }

  async function handlePrecreateMappedBranches() {
    setBusy(true);
    setStatusMsg(null);
    try {
      if (githubConfig && githubConfig.token) {
        const existing = await listBranches(githubConfig);
        const existingNames = new Set(existing.map((b) => b.name));
        for (let i = 0; i < roster.length; i++) {
          const s = roster[i];
          if (!existingNames.has(s.branchName)) {
            setProgressText(`Creating ${s.branchName} (${i + 1}/${roster.length})...`);
            await createBranchFrom(githubConfig, s.branchName, s.moduleBranch);
          }
        }
        await refreshRepoData();
        setStatusMsg({
          type: 'success',
          text: `Created GitHub branches for all ${roster.length} mapped students.`,
        });
      } else {
        const state = loadLocalLabState();
        if (!state.initialized) {
          await initializeLocalLabRepo(loadAssignments());
        }
        const refreshed = loadLocalLabState();
        for (const s of roster) {
          if (!refreshed.branches[s.branchName]) {
            refreshed.branches[s.branchName] = {
              ...(refreshed.branches[s.moduleBranch] || refreshed.branches.main || {}),
            };
            refreshed.branchParents[s.branchName] = s.moduleBranch;
            refreshed.commitsByBranch[s.branchName] = [
              ...(refreshed.commitsByBranch[s.moduleBranch] || []),
            ];
          }
        }
        saveLocalLabState(refreshed);
        setLocalState({ ...refreshed });
        setStatusMsg({
          type: 'success',
          text: `Pre-created branches for all ${roster.length} mapped students in Local Lab mode.`,
        });
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create student branches.',
      });
    } finally {
      setBusy(false);
      setProgressText('');
    }
  }

  async function handleDownloadZip(mode: 'starter' | 'solution') {
    setBusy(true);
    try {
      const refFiles = await loadAllReferenceFiles();
      const zip = new JSZip();
      const root = zip.folder('PatientTracker-MCA')!;
      const assignments = loadAssignments();

      if (mode === 'starter') {
        for (const p of REPO_STARTER_FILES) {
          if (refFiles[p]) root.file(p, refFiles[p]);
        }
        root.file('lab-assignments.json', serializeAssignmentsForRepo(assignments));
        for (const a of assignments) {
          if (!REPO_STARTER_FILES.includes(a.filePath)) {
            root.file(a.filePath, a.starterCode);
          }
        }
      } else {
        for (const p of ALL_SOLUTION_FILES) {
          if (refFiles[p]) root.file(p, refFiles[p]);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        mode === 'starter'
          ? 'PatientTracker-MCA-Starter.zip'
          : 'PatientTracker-MCA-Complete.zip';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    const task = TASKS_54.find((t) => t.rollNo === newStudentRollNo) || TASKS_54[0];
    const cleanEmail = newStudentEmail.trim().toLowerCase();
    const cleanReg = newStudentRegNo.trim().toUpperCase();
    if (!cleanEmail || !cleanReg || !newStudentName.trim()) return;

    const newRec: StudentRecord = {
      email: cleanEmail,
      regNo: cleanReg,
      name: newStudentName.trim(),
      department: newStudentDept.trim() || 'MCA',
      rollNo: task.rollNo,
      exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
      moduleBranch: task.moduleBranch,
      branchName: task.branchName,
      filePath: task.filePath,
    };

    const filtered = roster.filter(
      (s) => s.email.toLowerCase() !== cleanEmail && s.regNo.toUpperCase() !== cleanReg
    );
    const updated = [...filtered, newRec];
    setRoster(updated);
    saveStudentRoster(updated);

    setNewStudentEmail('');
    setNewStudentRegNo('');
    setNewStudentName('');
    setNewStudentRollNo((prev) => (prev < 54 ? prev + 1 : 1));
    setStatusMsg({
      type: 'success',
      text: `Mapped ${newRec.name} (${newRec.regNo}) to ${newRec.filePath} (${newRec.branchName}).`,
    });
  }

  function handleBulkImportCsv() {
    const lines = bulkCsvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const imported: StudentRecord[] = [];
    let taskCursor = roster.length;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('email')) continue;
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length < 3) continue;
      const [email, regNo, name, dept] = parts;
      const task = TASKS_54[taskCursor % TASKS_54.length];
      taskCursor++;
      imported.push({
        email: email.toLowerCase(),
        regNo: regNo.toUpperCase(),
        name,
        department: dept || 'MCA',
        rollNo: task.rollNo,
        exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
        moduleBranch: task.moduleBranch,
        branchName: task.branchName,
        filePath: task.filePath,
      });
    }

    if (imported.length === 0) {
      setStatusMsg({
        type: 'error',
        text: 'No valid rows found. Use format: Email, RegNo, Name, Department',
      });
      return;
    }

    const merged = [...roster];
    for (const item of imported) {
      const idx = merged.findIndex(
        (s) => s.regNo.toUpperCase() === item.regNo || s.email.toLowerCase() === item.email
      );
      if (idx >= 0) merged[idx] = item;
      else merged.push(item);
    }
    setRoster(merged);
    saveStudentRoster(merged);
    setBulkCsvText('');
    setShowBulkImport(false);
    setStatusMsg({
      type: 'success',
      text: `Imported and mapped ${imported.length} student(s) to sequential lab exercises.`,
    });
  }

  function updateStudentMapping(regNo: string, rollNo: number) {
    const task = TASKS_54.find((t) => t.rollNo === rollNo);
    if (!task) return;
    const updated = roster.map((s) =>
      s.regNo === regNo
        ? {
            ...s,
            rollNo: task.rollNo,
            exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
            moduleBranch: task.moduleBranch,
            branchName: task.branchName,
            filePath: task.filePath,
          }
        : s
    );
    setRoster(updated);
    saveStudentRoster(updated);
  }

  function removeStudent(regNo: string) {
    const updated = roster.filter((s) => s.regNo !== regNo);
    setRoster(updated);
    saveStudentRoster(updated);
  }

  const selectedSubmission = useMemo(
    () => submissions.find((s) => s.id === selectedSubId) || null,
    [submissions, selectedSubId]
  );

  function openEvaluator(sub: SubmissionRecord) {
    setSelectedSubId(sub.id);
    setEvalRubric({ ...sub.rubric });
    setEvalStatus(sub.status === 'Needs Revision' ? 'Needs Revision' : 'Evaluated');
    setEvalRemarks(sub.facultyRemarks || '');
  }

  async function handleSaveEvaluation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubmission) return;
    const total =
      evalRubric.repoAndGitignore +
      evalRubric.conventionalCommits +
      evalRubric.branchingAndConflicts +
      evalRubric.prsAndCodeReview +
      evalRubric.ciPipeline +
      evalRubric.workingPageAndViva;

    const updatedRecord: SubmissionRecord = {
      ...selectedSubmission,
      rubric: { ...evalRubric },
      totalMarks: total,
      status: evalStatus,
      facultyRemarks: evalRemarks.trim(),
    };

    const nextList = submissions.map((s) =>
      s.id === updatedRecord.id ? updatedRecord : s
    );
    setSubmissions(nextList);
    saveSubmissions(nextList);
    await recordSubmissionToSheetAndLocal(updatedRecord, appsScriptInput);
    setSelectedSubId(null);
    setStatusMsg({
      type: 'success',
      text: `Evaluated ${updatedRecord.studentName} (${updatedRecord.regNo}): ${total} / 50 (${updatedRecord.status}). Student can now generate their PDF report.`,
    });
  }

  function exportEvaluationsCsv() {
    const header = [
      'Timestamp',
      'Official Email',
      'Reg No',
      'Student Name',
      'Department',
      'Exercise Title',
      'Branch',
      'File',
      'Status',
      'Repo (5)',
      'Commits (10)',
      'Branch/Conflict (10)',
      'PR/Review (10)',
      'CI (5)',
      'Output & Viva (10)',
      'Total (50)',
      'Remarks',
    ];
    const rows = submissions.map((s) =>
      [
        s.timestamp,
        s.officialEmail,
        s.regNo,
        `"${s.studentName.replace(/"/g, '""')}"`,
        s.department,
        `"${s.exerciseTitle.replace(/"/g, '""')}"`,
        s.branchName,
        s.filePath,
        s.status,
        s.rubric.repoAndGitignore,
        s.rubric.conventionalCommits,
        s.rubric.branchingAndConflicts,
        s.rubric.prsAndCodeReview,
        s.rubric.ciPipeline,
        s.rubric.workingPageAndViva,
        s.totalMarks,
        `"${(s.facultyRemarks || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PatientTracker-MCA-Submissions-Grades.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleResolveAndMergeLocalPr(pr: LocalPullRequest) {
    const state = loadLocalLabState();
    const headTree = state.branches[pr.headBranch];
    const baseTree = state.branches[pr.baseBranch];
    if (!headTree || !baseTree) return;

    const baseLines = (baseTree['CONTRIBUTORS.txt'] || '# Patient Tracker Student Contributors').split('\n');
    const headLines = (headTree['CONTRIBUTORS.txt'] || '').split('\n');
    const mergedSet = new Set<string>(baseLines.map((l) => l.trimEnd()));
    for (const hl of headLines) {
      if (hl.trim()) mergedSet.add(hl.trimEnd());
    }

    state.branches[pr.baseBranch] = {
      ...baseTree,
      ...headTree,
      'CONTRIBUTORS.txt': Array.from(mergedSet).join('\n') + '\n',
    };
    const targetPr = state.pullRequests.find((p) => p.number === pr.number);
    if (targetPr) {
      targetPr.status = 'merged';
      targetPr.hasConflict = false;
    }
    saveLocalLabState(state);
    setLocalState({ ...state });
    setStatusMsg({
      type: 'success',
      text: `Merged PR #${pr.number} (${pr.headBranch}) into ${pr.baseBranch}.`,
    });
  }

  async function handleMergeGitHubPr(pr: GitHubPullRequest) {
    if (!githubConfig) return;
    setBusy(true);
    try {
      await mergePullRequest(githubConfig, pr.number, `Merge PR #${pr.number}: ${pr.title}`);
      await refreshRepoData();
      setStatusMsg({
        type: 'success',
        text: `Merged GitHub PR #${pr.number} into ${pr.base.ref}.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Merge failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleMergeModulesIntoMain() {
    setBusy(true);
    setStatusMsg(null);
    const modBranches: ModuleBranch[] = ['module-login', 'module-doctor', 'module-patient'];
    try {
      if (githubConfig && githubConfig.token) {
        for (const mb of modBranches) {
          setProgressText(`Opening & merging ${mb} -> main...`);
          const pr = await createPullRequest(
            githubConfig,
            `Integrate ${mb} into main`,
            mb,
            'main',
            `Final faculty integration PR for ${mb}.`
          );
          await mergePullRequest(githubConfig, pr.number, `Integrate ${mb} into main`);
        }
        await refreshRepoData();
        setStatusMsg({
          type: 'success',
          text: 'Merged module-login, module-doctor, and module-patient into main on GitHub.',
        });
      } else {
        const state = loadLocalLabState();
        let mergedMain = { ...(state.branches.main || {}) };
        for (const mb of modBranches) {
          mergedMain = { ...mergedMain, ...(state.branches[mb] || {}) };
        }
        state.branches.main = mergedMain;
        saveLocalLabState(state);
        setLocalState({ ...state });
        setStatusMsg({
          type: 'success',
          text: 'Merged all 3 module branches into main in Local Lab mode.',
        });
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Module integration failed.',
      });
    } finally {
      setBusy(false);
      setProgressText('');
    }
  }

  const evalPreviewHtml = useMemo(() => {
    if (!selectedSubmission) return '';
    const folder = selectedSubmission.filePath.split('/')[0];
    const role: 'Admin' | 'Clerk' | 'Doctor' | 'Patient' =
      folder === 'doctor' ? 'Doctor' : folder === 'patient' ? 'Patient' : 'Admin';
    return buildSandboxedPreviewHtml(
      selectedSubmission.filePath,
      selectedSubmission.sourceCode,
      refFilesCache,
      role
    );
  }, [selectedSubmission, refFilesCache]);

  // LOGIN GATE
  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center justify-center px-6 py-10">
        <section className="w-full rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">
            {authMode === 'login' ? 'Faculty Console Login' : 'Reset Faculty Password'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {authMode === 'login'
              ? 'Sign in with your faculty credentials (default: faculty / Admin@123).'
              : 'Verify your Official Email with a one-time code to set a new password.'}
          </p>

          {authError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {demoOtpNotice && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 font-mono text-xs text-amber-900">
              {demoOtpNotice}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleFacultyLogin} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="facUser">
                  Username
                </label>
                <input
                  id="facUser"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="facPass">
                  Password
                </label>
                <input
                  id="facPass"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Sign In to Faculty Console
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setAuthError('');
                    setAuthSuccess('');
                    setOtpSent(false);
                  }}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          ) : !otpSent ? (
            <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="forgotEmail">
                  Official Faculty Email
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {authBusy ? 'Sending OTP...' : 'Send OTP to Official Email'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtpAndReset} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="otpCode">
                  6-Digit OTP Code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="resetNewPass">
                  New Password
                </label>
                <input
                  id="resetNewPass"
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Verify OTP &amp; Save Password
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }

  const branchCount = githubConfig?.token
    ? ghBranches.length
    : Object.keys(localState.branches).length;
  const prCount = githubConfig?.token ? ghPrs.length : localState.pullRequests.length;
  const evaluatedCount = submissions.filter((s) => s.status === 'Evaluated').length;

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Faculty Lab Console
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure the GitHub repository, map students to exercises and branches, evaluate submissions on the 50-mark rubric, and merge module PRs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setChangePassOpen((v) => !v);
              setChangePassMsg(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Change Password
          </button>
          <button
            type="button"
            onClick={refreshRepoData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onOpenGitHubModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            {githubConfig ? `${githubConfig.owner}/${githubConfig.repo}` : 'Connect GitHub Repo'}
          </button>
          <button
            type="button"
            onClick={() => setAuthenticated(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Change Password Inline Drawer */}
      {changePassOpen && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Update Faculty Password &amp; Official Email
            </h2>
            <button
              type="button"
              onClick={() => setChangePassOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>
          {changePassMsg && (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                changePassMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {changePassMsg.text}
            </div>
          )}
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="password"
              required
              value={currentPassInput}
              onChange={(e) => setCurrentPassInput(e.target.value)}
              placeholder="Current password"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              type="password"
              required
              value={newPassInput}
              onChange={(e) => setNewPassInput(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              type="email"
              required
              value={facultyEmailInput}
              onChange={(e) => setFacultyEmailInput(e.target.value)}
              placeholder="Official email for OTP"
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Save Credentials
            </button>
          </form>
        </section>
      )}

      {/* Summary Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Mapped Students</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {roster.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Active Branches</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {branchCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Student Submissions</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {submissions.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Evaluated (PDF Ready)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-teal-700 tabular-nums">
            {evaluatedCount}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mb-5 flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-xs font-medium ${
            statusMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Faculty Section Tabs */}
      <div className="mb-5 flex w-fit flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === 'setup'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Repo &amp; Sheet Setup
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Students &amp; Exercise Mapping ({roster.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === 'submissions'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Submissions &amp; Rubric ({submissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prs')}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
            activeTab === 'prs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          4. PRs &amp; Module Merges ({prCount})
        </button>
      </div>

      {/* TAB 1: REPO & SHEET SETUP */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">
              Repository Link &amp; Google Sheet Relay
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Share your repository link with students so they can clone it directly from <span className="font-mono">#/student</span>. Optionally attach a Google Apps Script Web App URL to sync <span className="font-mono">students</span>, <span className="font-mono">submission</span>, and Password Reset OTP emails.
            </p>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="labRepoUrl">
                  GitHub Repository Link
                </label>
                <input
                  id="labRepoUrl"
                  type="text"
                  required
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  placeholder="https://github.com/faculty/PatientTracker-MCA"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="appsScriptUrl">
                  Google Apps Script Web App URL (Optional)
                </label>
                <input
                  id="appsScriptUrl"
                  type="url"
                  value={appsScriptInput}
                  onChange={(e) => setAppsScriptInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Save Lab Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(getStudentPortalUrl());
                    setCopiedPortal(true);
                    setTimeout(() => setCopiedPortal(false), 1800);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {copiedPortal ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPortal ? 'Copied Student Link' : 'Copy Student Portal URL'}
                </button>
              </div>
            </form>

            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-800">
                Optional: View Google Sheet Apps Script Code (students + submission + OTP)
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-slate-600">
                  Create a Google Sheet with two tabs: <span className="font-mono font-semibold">students</span> (Email, RegNo, Name, Department) and <span className="font-mono font-semibold">submission</span> (Timestamp, Official Email, Reg No, Student Name, Exercise Title, Status, Source Code), paste this into Extensions → Apps Script, and deploy as Web App.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(APPS_SCRIPT_TEMPLATE);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedScript ? 'Copied' : 'Copy Script'}
                  </button>
                </div>
                <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-2.5 font-mono text-[10px] text-slate-200">
                  <code>{APPS_SCRIPT_TEMPLATE}</code>
                </pre>
              </div>
            </details>
          </section>

          <section className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                Initialize Starter Repository &amp; Branches
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Creates starter folders (<span className="font-mono">login/</span>, <span className="font-mono">doctor/</span>, <span className="font-mono">patient/</span>, <span className="font-mono">shared/storage.js</span>), <span className="font-mono">.gitignore</span>, <span className="font-mono">CONTRIBUTORS.txt</span>, CI workflow, and the 3 module branches (<span className="font-mono">module-login</span>, <span className="font-mono">module-doctor</span>, <span className="font-mono">module-patient</span>).
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleInitializeStarterRepo}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" />
                  {busy && progressText ? progressText : 'Initialize Starter Repo & 3 Branches'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePrecreateMappedBranches}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Create Mapped Student Branches ({roster.length})
                </button>
              </div>

              {!githubConfig?.token && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      resetLocalLabRepo();
                      const fresh = await initializeLocalLabRepo(loadAssignments());
                      setLocalState(fresh);
                      setStatusMsg({ type: 'success', text: 'Local Lab Sandbox reset to starter state.' });
                    }}
                    className="text-xs font-semibold text-slate-500 underline hover:text-slate-900"
                  >
                    Reset Local Lab Sandbox
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">Export Repository ZIP</h2>
              <p className="mt-1 text-xs text-slate-600">
                Download the standalone HTML5, CSS3 &amp; JavaScript files to push manually or distribute offline.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDownloadZip('starter')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Starter Repo (.zip)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDownloadZip('solution')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Complete 54-File App (.zip)
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: STUDENTS & EXERCISE MAPPING */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Add Student &amp; Map Exercise / Branch
              </h2>
              <button
                type="button"
                onClick={() => setShowBulkImport((v) => !v)}
                className="text-xs font-semibold text-teal-800 underline"
              >
                {showBulkImport ? 'Hide Bulk CSV Import' : 'Bulk Paste CSV (Email, RegNo, Name, Department)'}
              </button>
            </div>

            {showBulkImport && (
              <div className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <textarea
                  rows={4}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={'ananya.mca@college.edu, 24MCA001, Ananya Sharma, MCA\nkarthik.mca@college.edu, 24MCA002, Karthik Verma, MCA'}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleBulkImportCsv}
                  className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Import &amp; Auto-Map Exercises
                </button>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <input
                type="email"
                required
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                placeholder="Official Email"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-3"
              />
              <input
                type="text"
                required
                value={newStudentRegNo}
                onChange={(e) => setNewStudentRegNo(e.target.value)}
                placeholder="RegNo (e.g. 24MCA004)"
                className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs uppercase sm:col-span-2"
              />
              <input
                type="text"
                required
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Student Name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-2"
              />
              <input
                type="text"
                value={newStudentDept}
                onChange={(e) => setNewStudentDept(e.target.value)}
                placeholder="Dept (MCA)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-1"
              />
              <select
                value={newStudentRollNo}
                onChange={(e) => setNewStudentRollNo(Number(e.target.value))}
                aria-label="Map exercise"
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs sm:col-span-3"
              >
                {TASKS_54.map((t) => (
                  <option key={t.rollNo} value={t.rollNo}>
                    Ex {t.rollLabel}: {t.filePath} ({t.moduleBranch})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 sm:col-span-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>
          </section>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-4 py-3">Reg No</th>
                  <th className="px-4 py-3">Student &amp; Official Email</th>
                  <th className="px-4 py-3">Dept</th>
                  <th className="px-4 py-3">Mapped Exercise &amp; File</th>
                  <th className="px-4 py-3">Assigned Branch</th>
                  <th className="px-4 py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((s) => (
                  <tr key={s.regNo} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{s.regNo}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-slate-500">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.department}</td>
                    <td className="px-4 py-3">
                      <select
                        value={s.rollNo}
                        onChange={(e) => updateStudentMapping(s.regNo, Number(e.target.value))}
                        aria-label={`Mapped exercise for ${s.name}`}
                        className="max-w-xs rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        {TASKS_54.map((t) => (
                          <option key={t.rollNo} value={t.rollNo}>
                            Ex {t.rollLabel}: {t.filePath} — {t.summary}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-teal-800">{s.branchName}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeStudent(s.regNo)}
                        aria-label={`Remove ${s.name}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSIONS & RUBRIC EVALUATION */}
      {activeTab === 'submissions' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Inspect student source code and live rendered output, score the 50-mark practical rubric, and mark as <strong className="text-slate-900">Evaluated</strong> so students can generate their PDF record.
            </p>
            <button
              type="button"
              onClick={exportEvaluationsCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Gradebook (.csv)
            </button>
          </div>

          {selectedSubmission && (
            <section className="rounded-xl border border-teal-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Evaluate: {selectedSubmission.studentName} ({selectedSubmission.regNo})
                  </h2>
                  <p className="text-xs text-slate-600">
                    {selectedSubmission.exerciseTitle} · <span className="font-mono">{selectedSubmission.filePath}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubId(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Close Evaluator
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="space-y-3 lg:col-span-7">
                  <div className="text-xs font-bold text-slate-800">Submitted Source Code</div>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
                    <code>{selectedSubmission.sourceCode}</code>
                  </pre>

                  <div className="text-xs font-bold text-slate-800">Live Rendered Output</div>
                  <iframe
                    srcDoc={evalPreviewHtml}
                    sandbox="allow-scripts allow-forms"
                    title="Faculty Submission Preview"
                    className="h-64 w-full rounded-lg border border-slate-200 bg-slate-50"
                  />
                </div>

                <form onSubmit={handleSaveEvaluation} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-5">
                  <div className="text-sm font-bold text-slate-900">50-Mark Practical Rubric</div>

                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'repoAndGitignore' as const, label: 'Repo Init & .gitignore', max: 5 },
                      { key: 'conventionalCommits' as const, label: 'Conventional Commits', max: 10 },
                      { key: 'branchingAndConflicts' as const, label: 'Branching & Conflicts', max: 10 },
                      { key: 'prsAndCodeReview' as const, label: 'PR & Code Review', max: 10 },
                      { key: 'ciPipeline' as const, label: 'CI/CD Pipeline', max: 5 },
                      { key: 'workingPageAndViva' as const, label: 'Working Output & Viva', max: 10 },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-2">
                        <label className="font-medium text-slate-700" htmlFor={`rub_${item.key}`}>
                          {item.label} (max {item.max})
                        </label>
                        <input
                          id={`rub_${item.key}`}
                          type="number"
                          min={0}
                          max={item.max}
                          value={evalRubric[item.key]}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(item.max, Number(e.target.value) || 0));
                            setEvalRubric((prev) => ({ ...prev, [item.key]: val }));
                          }}
                          className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono tabular-nums"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
                    <span>Total Score</span>
                    <span className="font-mono text-teal-800 tabular-nums">
                      {evalRubric.repoAndGitignore +
                        evalRubric.conventionalCommits +
                        evalRubric.branchingAndConflicts +
                        evalRubric.prsAndCodeReview +
                        evalRubric.ciPipeline +
                        evalRubric.workingPageAndViva}{' '}
                      / 50
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="evalStatus">
                      Evaluation Status
                    </label>
                    <select
                      id="evalStatus"
                      value={evalStatus}
                      onChange={(e) => setEvalStatus(e.target.value as 'Evaluated' | 'Needs Revision')}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="Evaluated">Evaluated (Unlock Student PDF)</option>
                      <option value="Needs Revision">Needs Revision</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="evalRemarks">
                      Faculty Remarks
                    </label>
                    <textarea
                      id="evalRemarks"
                      rows={3}
                      value={evalRemarks}
                      onChange={(e) => setEvalRemarks(e.target.value)}
                      placeholder="Write brief feedback or viva remarks..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Save Evaluation
                  </button>
                </form>
              </div>
            </section>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Reg No &amp; Student</th>
                  <th className="px-4 py-3">Official Email</th>
                  <th className="px-4 py-3">Exercise Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Marks</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No student submissions pushed yet.
                    </td>
                  </tr>
                )}
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(sub.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{sub.studentName}</div>
                      <div className="font-mono text-slate-500">{sub.regNo}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{sub.officialEmail}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{sub.exerciseTitle}</div>
                      <div className="font-mono text-[11px] text-slate-500">{sub.filePath}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          sub.status === 'Evaluated'
                            ? 'text-teal-700'
                            : sub.status === 'Needs Revision'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      {sub.status === 'Evaluated' ? `${sub.totalMarks} / 50` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEvaluator(sub)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        {sub.status === 'Evaluated' ? 'Edit Evaluation' : 'Evaluate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRS & MODULE MERGES */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Final Module Integration
              </h2>
              <p className="text-xs text-slate-600">
                After merging student Pull Requests into module branches, integrate module-login, module-doctor, and module-patient into main.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={handleMergeModulesIntoMain}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merge 3 Module Branches → main
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">PR</th>
                  <th className="px-4 py-3">Branch → Target</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!githubConfig?.token && localState.pullRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                      No student Pull Requests submitted yet.
                    </td>
                  </tr>
                )}
                {!githubConfig?.token &&
                  localState.pullRequests.map((pr) => (
                    <tr key={pr.number} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">#{pr.number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{pr.title}</div>
                        <div className="font-mono text-xs text-slate-500">
                          {pr.headBranch} → {pr.baseBranch}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{pr.author}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {pr.status === 'merged' ? (
                          <span className="text-teal-700">Merged</span>
                        ) : (
                          <span className="text-slate-700">Open</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {pr.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleResolveAndMergeLocalPr(pr)}
                            className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            Approve &amp; Merge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                {githubConfig?.token &&
                  ghPrs.map((pr) => (
                    <tr key={pr.number} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">#{pr.number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{pr.title}</div>
                        <div className="font-mono text-xs text-slate-500">
                          {pr.head.ref} → {pr.base.ref}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{pr.user.login}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {pr.merged_at ? (
                          <span className="text-teal-700">Merged</span>
                        ) : (
                          <span className="text-slate-700">{pr.state}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!pr.merged_at && pr.state === 'open' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleMergeGitHubPr(pr)}
                            className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
                          >
                            Merge PR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
