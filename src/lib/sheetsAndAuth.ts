import { ModuleBranch, TASKS_54 } from '@/src/data/tasks54';
import {
  GitHubBranchInfo,
  GitHubConfig,
  GitHubPullRequest,
  getFileContent,
} from '@/src/lib/githubClient';

export interface StudentRecord {
  email: string;
  regNo: string;
  name: string;
  department: string;
  rollNo: number;
  exerciseTitle: string;
  moduleBranch: ModuleBranch;
  branchName: string;
  filePath: string;
}

export interface RubricBreakdown {
  repoAndGitignore: number; // max 5
  conventionalCommits: number; // max 10
  branchingAndConflicts: number; // max 10
  prsAndCodeReview: number; // max 10
  ciPipeline: number; // max 5
  workingPageAndViva: number; // max 10
}

export interface SubmissionRecord {
  id: string;
  timestamp: string;
  officialEmail: string;
  regNo: string;
  studentName: string;
  department: string;
  exerciseTitle: string;
  branchName: string;
  filePath: string;
  repoUrl: string;
  status: 'Submitted' | 'Evaluated' | 'Needs Revision';
  sourceCode: string;
  rubric: RubricBreakdown;
  totalMarks: number;
  facultyRemarks: string;
}

export interface FacultyAuthConfig {
  username: string;
  passwordHash: string;
  officialEmail: string;
}

export interface LabSettings {
  repoUrl: string;
  appsScriptUrl: string;
  programRepos?: Record<string, string>;
  prefixBranchWithProgram?: boolean;
}

const FACULTY_AUTH_KEY = 'pt_mca_faculty_auth_v1';
const LAB_SETTINGS_KEY = 'pt_mca_lab_settings_v1';
const STUDENTS_ROSTER_KEY = 'pt_mca_students_roster_v1';
const SUBMISSIONS_KEY = 'pt_mca_submissions_v1';

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getFacultyAuth(): Promise<FacultyAuthConfig> {
  try {
    const raw = localStorage.getItem(FACULTY_AUTH_KEY);
    if (raw) {
      return JSON.parse(raw) as FacultyAuthConfig;
    }
  } catch {
    // ignore
  }
  const defaultHash = await sha256Hex('Admin@123');
  const initial: FacultyAuthConfig = {
    username: 'faculty',
    passwordHash: defaultHash,
    officialEmail: 'faculty@college.edu',
  };
  localStorage.setItem(FACULTY_AUTH_KEY, JSON.stringify(initial));
  return initial;
}

export async function updateFacultyPassword(newPassword: string, officialEmail?: string): Promise<void> {
  const current = await getFacultyAuth();
  const nextHash = await sha256Hex(newPassword);
  const updated: FacultyAuthConfig = {
    ...current,
    passwordHash: nextHash,
    officialEmail: officialEmail?.trim() || current.officialEmail,
  };
  localStorage.setItem(FACULTY_AUTH_KEY, JSON.stringify(updated));
}

export async function updateFacultyEmail(officialEmail: string): Promise<void> {
  const current = await getFacultyAuth();
  localStorage.setItem(
    FACULTY_AUTH_KEY,
    JSON.stringify({ ...current, officialEmail: officialEmail.trim() })
  );
}

export function loadLabSettings(): LabSettings {
  try {
    const raw = localStorage.getItem(LAB_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as LabSettings;
  } catch {
    // ignore
  }
  return {
    repoUrl: 'https://github.com/faculty/PatientTracker-MCA',
    appsScriptUrl: '',
  };
}

export function saveLabSettings(settings: LabSettings): void {
  localStorage.setItem(LAB_SETTINGS_KEY, JSON.stringify(settings));
}

export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  const clean = url.trim().replace(/\.git$/, '');
  const match = clean.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  const shortMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }
  return null;
}

export function toProgramSlug(program: string): string {
  const cleaned = program
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (cleaned || 'mca').slice(0, 28).replace(/-+$/, '');
}

export function resolveRepoForProgram(program: string, settings?: LabSettings): string {
  const s = settings || loadLabSettings();
  const cleanProg = program.trim().toLowerCase();
  if (cleanProg && s.programRepos) {
    for (const [key, val] of Object.entries(s.programRepos)) {
      if (key.trim().toLowerCase() === cleanProg && val?.trim()) {
        const parsed = parseGitHubRepoUrl(val);
        return parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : val.trim();
      }
    }
  }
  const parsedDefault = parseGitHubRepoUrl(s.repoUrl || '');
  return parsedDefault
    ? `https://github.com/${parsedDefault.owner}/${parsedDefault.repo}`
    : s.repoUrl || 'https://github.com/faculty/PatientTracker-MCA';
}

export function resolveStudentBranchName(
  baseBranch: string,
  program: string,
  settings?: LabSettings
): string {
  const s = settings || loadLabSettings();
  const cleanBase = baseBranch.includes('/')
    ? baseBranch.split('/').pop() || baseBranch
    : baseBranch;
  if (s.prefixBranchWithProgram && program.trim()) {
    return `${toProgramSlug(program)}/${cleanBase}`;
  }
  return cleanBase;
}

export function buildDefaultStudentRoster(): StudentRecord[] {
  const t1 = TASKS_54[0];
  const t2 = TASKS_54[20];
  const t3 = TASKS_54[36];
  return [
    {
      email: 'ananya.mca@college.edu',
      regNo: '24MCA001',
      name: 'Ananya Sharma',
      department: 'MCA',
      rollNo: t1.rollNo,
      exerciseTitle: `Ex ${t1.rollLabel}: ${t1.summary}`,
      moduleBranch: t1.moduleBranch,
      branchName: t1.branchName,
      filePath: t1.filePath,
    },
    {
      email: 'karthik.mca@college.edu',
      regNo: '24MCA021',
      name: 'Karthik Verma',
      department: 'MCA',
      rollNo: t2.rollNo,
      exerciseTitle: `Ex ${t2.rollLabel}: ${t2.summary}`,
      moduleBranch: t2.moduleBranch,
      branchName: t2.branchName,
      filePath: t2.filePath,
    },
    {
      email: 'priya.mca@college.edu',
      regNo: '24MCA037',
      name: 'Priya Nair',
      department: 'MCA',
      rollNo: t3.rollNo,
      exerciseTitle: `Ex ${t3.rollLabel}: ${t3.summary}`,
      moduleBranch: t3.moduleBranch,
      branchName: t3.branchName,
      filePath: t3.filePath,
    },
  ];
}

export function loadStudentRoster(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(STUDENTS_ROSTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudentRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  const defaults = buildDefaultStudentRoster();
  localStorage.setItem(STUDENTS_ROSTER_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveStudentRoster(roster: StudentRecord[]): void {
  localStorage.setItem(STUDENTS_ROSTER_KEY, JSON.stringify(roster));
}

export function loadSubmissions(): SubmissionRecord[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    if (raw) return JSON.parse(raw) as SubmissionRecord[];
  } catch {
    // ignore
  }
  return [];
}

export function saveSubmissions(list: SubmissionRecord[]): void {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
}

export async function verifyStudentWithSheetOrLocal(
  email: string,
  regNo: string,
  appsScriptUrl: string
): Promise<StudentRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanReg = regNo.trim().toUpperCase();
  const localRoster = loadStudentRoster();

  if (appsScriptUrl.trim()) {
    try {
      const url = `${appsScriptUrl.trim()}?action=verifyStudent&email=${encodeURIComponent(cleanEmail)}&regNo=${encodeURIComponent(cleanReg)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          found?: boolean;
          student?: {
            Email?: string;
            RegNo?: string;
            Name?: string;
            Department?: string;
            RollNo?: number;
          };
        };
        if (!data.found || !data.student) {
          return null;
        }
        // Merge with faculty's mapped exercise/branch if present in local roster
        const mapped = localRoster.find(
          (s) =>
            s.email.toLowerCase() === cleanEmail ||
            s.regNo.toUpperCase() === cleanReg
        );
        const sheetRoll = Number(data.student.RollNo);
        const fallbackTask =
          (!isNaN(sheetRoll) && sheetRoll >= 1
            ? TASKS_54[(sheetRoll - 1) % TASKS_54.length]
            : undefined) || TASKS_54[0];
        const resolvedDepartment =
          data.student.Department || mapped?.department || 'MCA';
        const settings = loadLabSettings();
        const baseBranch = mapped?.branchName || fallbackTask.branchName;
        return {
          email: data.student.Email || cleanEmail,
          regNo: data.student.RegNo || cleanReg,
          name: data.student.Name || mapped?.name || 'Student',
          department: resolvedDepartment,
          rollNo: mapped?.rollNo || fallbackTask.rollNo,
          exerciseTitle: mapped?.exerciseTitle || `Ex ${fallbackTask.rollLabel}: ${fallbackTask.summary}`,
          moduleBranch: mapped?.moduleBranch || fallbackTask.moduleBranch,
          branchName: resolveStudentBranchName(baseBranch, resolvedDepartment, settings),
          filePath: mapped?.filePath || fallbackTask.filePath,
        };
      }
    } catch {
      // Fall back to local roster if network call fails
    }
  }

  const localMatch =
    localRoster.find(
      (s) =>
        s.email.toLowerCase() === cleanEmail &&
        s.regNo.toUpperCase() === cleanReg
    ) || null;
  if (!localMatch) return null;
  const settings = loadLabSettings();
  return {
    ...localMatch,
    branchName: resolveStudentBranchName(localMatch.branchName, localMatch.department, settings),
  };
}

export interface SheetRosterSyncResult {
  synced: boolean;
  count: number;
  roster: StudentRecord[];
  needsScriptUpdate?: boolean;
  message: string;
}

export async function syncRosterFromGoogleSheet(
  appsScriptUrl: string
): Promise<SheetRosterSyncResult> {
  const cleanUrl = appsScriptUrl.trim();
  if (!cleanUrl) {
    return {
      synced: false,
      count: 0,
      roster: loadStudentRoster(),
      message: 'Enter a Google Apps Script Web App URL to sync students.',
    };
  }

  const sep = cleanUrl.includes('?') ? '&' : '?';
  const res = await fetch(`${cleanUrl}${sep}action=listStudents`);
  if (!res.ok) {
    throw new Error(`Google Sheet request failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    ok?: boolean;
    students?: Array<{
      rowIndex?: number;
      Email?: string;
      RegNo?: string;
      Name?: string;
      Department?: string;
      RollNo?: number;
    }>;
  };

  if (!Array.isArray(data.students)) {
    return {
      synced: false,
      count: 0,
      roster: loadStudentRoster(),
      needsScriptUpdate: true,
      message:
        'Connected to Google Apps Script, but it does not yet include the listStudents endpoint. Update your Apps Script from the code below, deploy a New Version, and click Sync from Google Sheet.',
    };
  }

  const existingRoster = loadStudentRoster();
  const mapped: StudentRecord[] = [];

  const settings = loadLabSettings();
  data.students.forEach((row, idx) => {
    const email = String(row.Email || '').trim().toLowerCase();
    const regNo = String(row.RegNo || '').trim().toUpperCase();
    if (!email && !regNo) return;

    const prev = existingRoster.find(
      (s) =>
        (email && s.email.toLowerCase() === email) ||
        (regNo && s.regNo.toUpperCase() === regNo)
    );

    const parsedRoll = Number(row.RollNo || row.rowIndex || idx + 1);
    const targetRoll = prev?.rollNo || (!isNaN(parsedRoll) && parsedRoll >= 1 ? parsedRoll : idx + 1);
    const task = TASKS_54[(targetRoll - 1) % TASKS_54.length] || TASKS_54[idx % TASKS_54.length];
    const department = String(row.Department || prev?.department || 'MCA').trim();

    mapped.push({
      email,
      regNo,
      name: String(row.Name || prev?.name || `Student ${idx + 1}`).trim(),
      department,
      rollNo: task.rollNo,
      exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
      moduleBranch: task.moduleBranch,
      branchName: resolveStudentBranchName(task.branchName, department, settings),
      filePath: task.filePath,
    });
  });

  if (mapped.length === 0) {
    return {
      synced: false,
      count: 0,
      roster: existingRoster,
      message: 'The students tab in your Google Sheet appears empty.',
    };
  }

  saveStudentRoster(mapped);
  return {
    synced: true,
    count: mapped.length,
    roster: mapped,
    message: `Synced ${mapped.length} student(s) from Google Sheet and mapped them to lab exercises.`,
  };
}

export async function syncSubmissionsFromGoogleSheet(
  appsScriptUrl: string
): Promise<SubmissionRecord[]> {
  const cleanUrl = appsScriptUrl.trim();
  const localSubs = loadSubmissions();
  if (!cleanUrl) return localSubs;

  try {
    const sep = cleanUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${cleanUrl}${sep}action=listSubmissions`);
    if (!res.ok) return localSubs;
    const data = (await res.json()) as {
      submissions?: Array<{
        Timestamp?: string;
        OfficialEmail?: string;
        RegNo?: string;
        StudentName?: string;
        ExerciseTitle?: string;
        Status?: string;
        SourceCode?: string;
        TotalMarks?: number | string;
        FacultyRemarks?: string;
        Branch?: string;
        FilePath?: string;
      }>;
    };
    if (!Array.isArray(data.submissions)) return localSubs;

    const roster = loadStudentRoster();
    const repoUrl = loadLabSettings().repoUrl;
    const merged = [...localSubs];

    for (const row of data.submissions) {
      const email = String(row.OfficialEmail || '').trim().toLowerCase();
      const regNo = String(row.RegNo || '').trim().toUpperCase();
      if (!email && !regNo) continue;

      const rowExTitle = String(row.ExerciseTitle || '');
      const rowFilePath = String(row.FilePath || '');
      const rowStatus: SubmissionRecord['status'] =
        row.Status === 'Evaluated' || row.Status === 'Needs Revision'
          ? row.Status
          : 'Submitted';
      const parsedMarks = Number(row.TotalMarks);
      const hasMarks = !isNaN(parsedMarks) && row.TotalMarks !== '' && row.TotalMarks !== undefined;
      const rowRemarks = String(row.FacultyRemarks || '');
      const rowSource = String(row.SourceCode || '');

      const studentMatch = roster.find(
        (s) =>
          (email && s.email.toLowerCase() === email) ||
          (regNo && s.regNo.toUpperCase() === regNo)
      );

      const existingIdx = merged.findIndex(
        (s) =>
          (regNo && s.regNo.toUpperCase() === regNo &&
            ((rowFilePath && s.filePath === rowFilePath) ||
              (rowExTitle && s.exerciseTitle === rowExTitle))) ||
          (s.officialEmail.toLowerCase() === email &&
            s.regNo.toUpperCase() === regNo &&
            s.exerciseTitle === rowExTitle)
      );

      if (existingIdx !== -1) {
        const cur = merged[existingIdx];
        const nextStatus =
          rowStatus === 'Evaluated' || rowStatus === 'Needs Revision'
            ? rowStatus
            : cur.status;
        merged[existingIdx] = {
          ...cur,
          timestamp:
            cur.status === 'Submitted' && row.Timestamp
              ? String(row.Timestamp)
              : cur.timestamp,
          sourceCode:
            cur.status === 'Submitted' && rowSource ? rowSource : cur.sourceCode || rowSource,
          status: nextStatus,
          totalMarks: hasMarks && nextStatus !== 'Submitted' ? parsedMarks : cur.totalMarks,
          facultyRemarks: rowRemarks || cur.facultyRemarks,
        };
        continue;
      }

      merged.push({
        id: `sheet_${regNo}_${Date.parse(String(row.Timestamp || '')) || merged.length}`,
        timestamp: String(row.Timestamp || new Date().toISOString()),
        officialEmail: email,
        regNo,
        studentName: String(row.StudentName || studentMatch?.name || 'Student'),
        department: studentMatch?.department || 'MCA',
        exerciseTitle: rowExTitle || studentMatch?.exerciseTitle || '',
        branchName: String(row.Branch || studentMatch?.branchName || 'main'),
        filePath: rowFilePath || studentMatch?.filePath || 'login/index.html',
        repoUrl,
        status: rowStatus,
        sourceCode: rowSource,
        rubric: {
          repoAndGitignore: 0,
          conventionalCommits: 0,
          branchingAndConflicts: 0,
          prsAndCodeReview: 0,
          ciPipeline: 0,
          workingPageAndViva: 0,
        },
        totalMarks: hasMarks ? parsedMarks : 0,
        facultyRemarks: rowRemarks,
      });
    }

    saveSubmissions(merged);
    return merged;
  } catch {
    return localSubs;
  }
}

export async function syncSubmissionsFromGitHub(
  cfg: GitHubConfig,
  roster: StudentRecord[],
  branches: GitHubBranchInfo[],
  prs: GitHubPullRequest[]
): Promise<{ submissions: SubmissionRecord[]; syncedCount: number }> {
  const localSubs = loadSubmissions();
  if (!cfg.owner || !cfg.repo) {
    return { submissions: localSubs, syncedCount: 0 };
  }

  const branchSet = new Set(branches.map((b) => b.name));
  const prByBranch = new Map<string, GitHubPullRequest>();
  for (const pr of prs) {
    if (!prByBranch.has(pr.head.ref)) {
      prByBranch.set(pr.head.ref, pr);
    }
  }

  interface CandidateTarget {
    branchName: string;
    filePath: string;
    exerciseTitle: string;
    starterCode: string;
    student?: StudentRecord;
  }

  const candidateMap = new Map<string, CandidateTarget>();

  for (const stu of roster) {
    if (branchSet.has(stu.branchName) || prByBranch.has(stu.branchName)) {
      const task =
        TASKS_54.find((t) => t.branchName === stu.branchName || t.filePath === stu.filePath) ||
        TASKS_54[0];
      candidateMap.set(stu.branchName, {
        branchName: stu.branchName,
        filePath: stu.filePath,
        exerciseTitle: stu.exerciseTitle,
        starterCode: task.starterCode,
        student: stu,
      });
    }
  }

  for (const task of TASKS_54) {
    if (
      !candidateMap.has(task.branchName) &&
      (branchSet.has(task.branchName) || prByBranch.has(task.branchName))
    ) {
      candidateMap.set(task.branchName, {
        branchName: task.branchName,
        filePath: task.filePath,
        exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
        starterCode: task.starterCode,
      });
    }
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) {
    return { submissions: localSubs, syncedCount: 0 };
  }

  const merged = [...localSubs];
  let syncedCount = 0;
  const repoUrl = `https://github.com/${cfg.owner}/${cfg.repo}`;

  const BATCH_SIZE = 6;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          const remote = await getFileContent(cfg, item.filePath, item.branchName);
          return { item, remote };
        } catch {
          return { item, remote: null };
        }
      })
    );

    for (const { item, remote } of results) {
      if (!remote) continue;
      const pr = prByBranch.get(item.branchName);
      const changedFromStarter = remote.content.trim() !== item.starterCode.trim();
      if (!changedFromStarter && !pr) continue;

      syncedCount++;
      const stu = item.student;
      const regNo = stu?.regNo || pr?.user?.login?.toUpperCase() || item.branchName.toUpperCase();
      const email = stu?.email || '';
      const studentName = stu?.name || pr?.user?.login || item.branchName;

      const existingIdx = merged.findIndex(
        (s) =>
          (stu &&
            s.regNo.toUpperCase() === stu.regNo.toUpperCase() &&
            s.filePath === item.filePath) ||
          s.branchName === item.branchName
      );

      if (existingIdx !== -1) {
        const cur = merged[existingIdx];
        merged[existingIdx] = {
          ...cur,
          officialEmail: cur.officialEmail || email,
          regNo: stu?.regNo || cur.regNo,
          studentName: stu?.name || cur.studentName,
          department: stu?.department || cur.department,
          exerciseTitle: stu?.exerciseTitle || cur.exerciseTitle || item.exerciseTitle,
          repoUrl,
          sourceCode:
            cur.status === 'Submitted' || !cur.sourceCode ? remote.content : cur.sourceCode,
        };
      } else {
        merged.unshift({
          id: `gh_${item.branchName}_${Date.now()}_${syncedCount}`,
          timestamp: pr?.created_at || new Date().toISOString(),
          officialEmail: email,
          regNo,
          studentName,
          department: stu?.department || 'MCA',
          exerciseTitle: item.exerciseTitle,
          branchName: item.branchName,
          filePath: item.filePath,
          repoUrl,
          status: 'Submitted',
          sourceCode: remote.content,
          rubric: {
            repoAndGitignore: 0,
            conventionalCommits: 0,
            branchingAndConflicts: 0,
            prsAndCodeReview: 0,
            ciPipeline: 0,
            workingPageAndViva: 0,
          },
          totalMarks: 0,
          facultyRemarks: '',
        });
      }
    }
  }

  if (syncedCount > 0) {
    saveSubmissions(merged);
  }
  return { submissions: merged, syncedCount };
}

export async function recordSubmissionToSheetAndLocal(
  record: SubmissionRecord,
  appsScriptUrl: string
): Promise<{ syncedToSheet: boolean; reason?: 'no_url' | 'network_error' }> {
  const existing = loadSubmissions();
  const idx = existing.findIndex(
    (s) =>
      s.officialEmail.toLowerCase() === record.officialEmail.toLowerCase() &&
      s.regNo.toUpperCase() === record.regNo.toUpperCase() &&
      s.filePath === record.filePath
  );
  if (idx !== -1) {
    existing[idx] = record;
  } else {
    existing.unshift(record);
  }
  saveSubmissions(existing);

  const cleanUrl = appsScriptUrl.trim();
  if (!cleanUrl) {
    return { syncedToSheet: false, reason: 'no_url' };
  }

  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveSubmission',
        Timestamp: record.timestamp,
        'Official Email': record.officialEmail,
        'Reg No': record.regNo,
        'Student Name': record.studentName,
        'Exercise Title': record.exerciseTitle,
        Branch: record.branchName,
        'File Path': record.filePath,
        Status: record.status,
        'Source Code': record.sourceCode,
        'Total Marks': record.totalMarks,
        'Faculty Remarks': record.facultyRemarks,
      }),
    });
    return { syncedToSheet: true };
  } catch {
    return { syncedToSheet: false, reason: 'network_error' };
  }
}

export async function sendFacultyOtp(
  officialEmail: string,
  otpCode: string,
  appsScriptUrl: string
): Promise<{ sentViaEmail: boolean }> {
  if (!appsScriptUrl.trim()) {
    return { sentViaEmail: false };
  }
  try {
    const res = await fetch(appsScriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendOtp',
        email: officialEmail,
        otp: otpCode,
      }),
    });
    return { sentViaEmail: res.ok };
  } catch {
    return { sentViaEmail: false };
  }
}

export const APPS_SCRIPT_TEMPLATE = `function getSheetCaseInsensitive_(ss, names) {
  for (var i = 0; i < names.length; i++) {
    var exact = ss.getSheetByName(names[i]);
    if (exact) return exact;
  }
  var all = ss.getSheets();
  var lower = names.map(function(n) { return n.toLowerCase(); });
  for (var j = 0; j < all.length; j++) {
    if (lower.indexOf(all[j].getName().toLowerCase()) !== -1) return all[j];
  }
  return null;
}

function getOrCreateSubmissionSheet_(ss) {
  var sheet = getSheetCaseInsensitive_(ss, ["submission", "submissions"]);
  if (!sheet) {
    sheet = ss.insertSheet("submission");
    sheet.appendRow([
      "Timestamp", "Official Email", "Reg No", "Student Name",
      "Exercise Title", "Status", "Source Code", "Total Marks",
      "Faculty Remarks", "Branch", "File Path"
    ]);
  }
  return sheet;
}

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === "verifyStudent") {
    var sheet = getSheetCaseInsensitive_(ss, ["students", "student"]);
    var rows = sheet ? sheet.getDataRange().getValues() : [];
    var email = (e.parameter.email || "").toLowerCase().trim();
    var regNo = (e.parameter.regNo || "").toUpperCase().trim();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === email &&
          String(rows[i][1]).toUpperCase().trim() === regNo) {
        return ContentService.createTextOutput(JSON.stringify({
          found: true,
          student: {
            Email: rows[i][0],
            RegNo: rows[i][1],
            Name: rows[i][2],
            Department: rows[i][3],
            RollNo: rows[i][4] ? Number(rows[i][4]) : i
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ found: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (action === "listStudents") {
    var sheet = getSheetCaseInsensitive_(ss, ["students", "student"]);
    var rows = sheet ? sheet.getDataRange().getValues() : [];
    var students = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][0] && !rows[i][1]) continue;
      students.push({
        rowIndex: i,
        Email: String(rows[i][0] || "").trim(),
        RegNo: String(rows[i][1] || "").trim(),
        Name: String(rows[i][2] || "").trim(),
        Department: String(rows[i][3] || "MCA").trim(),
        RollNo: rows[i][4] ? Number(rows[i][4]) : i
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, students: students }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (action === "listSubmissions") {
    var subSheet = getSheetCaseInsensitive_(ss, ["submission", "submissions"]);
    var subRows = subSheet ? subSheet.getDataRange().getValues() : [];
    var submissions = [];
    for (var j = 1; j < subRows.length; j++) {
      if (!subRows[j][1] && !subRows[j][2]) continue;
      submissions.push({
        Timestamp: String(subRows[j][0] || ""),
        OfficialEmail: String(subRows[j][1] || ""),
        RegNo: String(subRows[j][2] || ""),
        StudentName: String(subRows[j][3] || ""),
        ExerciseTitle: String(subRows[j][4] || ""),
        Status: String(subRows[j][5] || "Submitted"),
        SourceCode: String(subRows[j][6] || ""),
        TotalMarks: subRows[j][7] !== undefined && subRows[j][7] !== "" ? Number(subRows[j][7]) : "",
        FacultyRemarks: String(subRows[j][8] || ""),
        Branch: String(subRows[j][9] || ""),
        FilePath: String(subRows[j][10] || "")
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, submissions: submissions }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (data.action === "saveSubmission") {
    var sheet = getOrCreateSubmissionSheet_(ss);
    var rows = sheet.getDataRange().getValues();
    var targetEmail = String(data["Official Email"] || "").toLowerCase().trim();
    var targetReg = String(data["Reg No"] || "").toUpperCase().trim();
    var targetEx = String(data["Exercise Title"] || "").trim();
    var rowValues = [
      data.Timestamp || new Date().toISOString(),
      data["Official Email"] || "",
      data["Reg No"] || "",
      data["Student Name"] || "",
      data["Exercise Title"] || "",
      data.Status || "Submitted",
      data["Source Code"] || "",
      data["Total Marks"] !== undefined ? data["Total Marks"] : "",
      data["Faculty Remarks"] || "",
      data.Branch || "",
      data["File Path"] || ""
    ];
    var updatedRow = -1;
    for (var i = 1; i < rows.length; i++) {
      var rEmail = String(rows[i][1] || "").toLowerCase().trim();
      var rReg = String(rows[i][2] || "").toUpperCase().trim();
      var rEx = String(rows[i][4] || "").trim();
      if (rReg === targetReg && (rEmail === targetEmail || !rEmail || !targetEmail) && rEx === targetEx) {
        updatedRow = i + 1;
        break;
      }
    }
    if (updatedRow !== -1) {
      sheet.getRange(updatedRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  } else if (data.action === "sendOtp") {
    MailApp.sendEmail(data.email, "PatientTracker Faculty Password Reset OTP", "Your OTP code is: " + data.otp);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
