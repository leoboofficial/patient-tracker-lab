import { ALL_SOLUTION_FILES, ModuleBranch, StudentTask, TASKS_54 } from '@/src/data/tasks54';

export interface StudentAssignment {
  rollNo: number;
  rollLabel: string;
  studentName: string;
  githubUsername: string;
  moduleBranch: ModuleBranch;
  branchName: string;
  filePath: string;
  summary: string;
  jsonStore: string;
  jsonKeys: string[];
  validationHint: string;
  starterCode: string;
  accessPin: string;
  locked: boolean;
}

export interface LocalCommit {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
}

export interface LocalPullRequest {
  number: number;
  title: string;
  headBranch: string;
  baseBranch: string;
  author: string;
  rollNo: number | null;
  status: 'open' | 'merged';
  ciPassed: boolean;
  hasConflict: boolean;
  commits: LocalCommit[];
  reviews: Array<{ author: string; comment: string; approved: boolean; timestamp: string }>;
  createdAt: string;
}

export interface LocalLabRepoState {
  repoName: string;
  initialized: boolean;
  branches: Record<string, Record<string, string>>;
  branchParents: Record<string, string>;
  commitsByBranch: Record<string, LocalCommit[]>;
  pullRequests: LocalPullRequest[];
  vivaScores: Record<number, number>;
}

const STORAGE_KEY = 'pt_mca_lab_repo_v1';
const ASSIGNMENTS_KEY = 'pt_mca_lab_assignments_v1';

export function buildDefaultAssignments(): StudentAssignment[] {
  return TASKS_54.map((t: StudentTask) => ({
    rollNo: t.rollNo,
    rollLabel: t.rollLabel,
    studentName: '',
    githubUsername: '',
    moduleBranch: t.moduleBranch,
    branchName: t.branchName,
    filePath: t.filePath,
    summary: t.summary,
    jsonStore: t.jsonStore,
    jsonKeys: t.jsonKeys,
    validationHint: t.validationHint,
    starterCode: t.starterCode,
    accessPin: '',
    locked: false,
  }));
}

export function loadAssignments(): StudentAssignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudentAssignment[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return buildDefaultAssignments();
}

export function saveAssignments(assignments: StudentAssignment[]): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function serializeAssignmentsForRepo(assignments: StudentAssignment[]): string {
  const compact = assignments.map((a) => ({
    rollNo: a.rollNo,
    rollLabel: a.rollLabel,
    studentName: a.studentName,
    githubUsername: a.githubUsername,
    moduleBranch: a.moduleBranch,
    branchName: a.branchName,
    filePath: a.filePath,
    summary: a.summary,
    jsonStore: a.jsonStore,
    jsonKeys: a.jsonKeys,
    validationHint: a.validationHint,
    accessPin: a.accessPin,
    locked: a.locked,
  }));
  return JSON.stringify(compact, null, 2) + '\n';
}

export async function fetchReferenceFile(path: string): Promise<string> {
  const res = await fetch(`./patient-tracker/${path}`);
  if (!res.ok) {
    throw new Error(`Unable to read ./patient-tracker/${path}`);
  }
  return res.text();
}

export async function loadAllReferenceFiles(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    ALL_SOLUTION_FILES.map(async (p) => {
      try {
        const text = await fetchReferenceFile(p);
        return [p, text] as const;
      } catch {
        return [p, ''] as const;
      }
    })
  );
  return Object.fromEntries(entries.filter(([, text]) => text.length > 0));
}

export function loadLocalLabState(): LocalLabRepoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as LocalLabRepoState;
    }
  } catch {
    // fallback
  }
  return {
    repoName: 'PatientTracker-MCA',
    initialized: false,
    branches: {},
    branchParents: {},
    commitsByBranch: {},
    pullRequests: [],
    vivaScores: {},
  };
}

export function saveLocalLabState(state: LocalLabRepoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function initializeLocalLabRepo(
  assignments?: StudentAssignment[]
): Promise<LocalLabRepoState> {
  const refFiles = await loadAllReferenceFiles();
  const activeAssignments = assignments || loadAssignments();

  const starterTree: Record<string, string> = {};
  const starterPaths = [
    'README.md',
    '.gitignore',
    'CONTRIBUTORS.txt',
    '.github/workflows/ci.yml',
    'index.html',
    'shared/storage.js',
    'login/login.css',
    'doctor/doctor.css',
    'patient/patient.css',
  ];

  for (const p of starterPaths) {
    if (refFiles[p]) {
      starterTree[p] = refFiles[p];
    }
  }

  for (const a of activeAssignments) {
    if (!starterTree[a.filePath]) {
      starterTree[a.filePath] = a.starterCode;
    }
  }

  starterTree['lab-assignments.json'] = serializeAssignmentsForRepo(activeAssignments);

  const now = new Date().toISOString();
  const initCommit: LocalCommit = {
    id: 'c100001',
    message: 'chore: initialize PatientTracker-MCA starter repository',
    author: 'Faculty Instructor',
    timestamp: now,
    filesChanged: Object.keys(starterTree),
  };

  const state: LocalLabRepoState = {
    repoName: 'PatientTracker-MCA',
    initialized: true,
    branches: {
      main: { ...starterTree },
      'module-login': { ...starterTree },
      'module-doctor': { ...starterTree },
      'module-patient': { ...starterTree },
    },
    branchParents: {
      main: 'root',
      'module-login': 'main',
      'module-doctor': 'main',
      'module-patient': 'main',
    },
    commitsByBranch: {
      main: [initCommit],
      'module-login': [initCommit],
      'module-doctor': [initCommit],
      'module-patient': [initCommit],
    },
    pullRequests: [],
    vivaScores: {},
  };

  saveLocalLabState(state);
  return state;
}

export function resetLocalLabRepo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isConventionalCommit(msg: string): boolean {
  return /^(feat|fix|style):\s+.+/i.test(msg.trim());
}
