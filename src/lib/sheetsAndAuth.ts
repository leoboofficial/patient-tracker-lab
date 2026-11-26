import { ModuleBranch, TASKS_54 } from '@/src/data/tasks54';

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
        return {
          email: data.student.Email || cleanEmail,
          regNo: data.student.RegNo || cleanReg,
          name: data.student.Name || mapped?.name || 'Student',
          department: data.student.Department || mapped?.department || 'MCA',
          rollNo: mapped?.rollNo || fallbackTask.rollNo,
          exerciseTitle: mapped?.exerciseTitle || `Ex ${fallbackTask.rollLabel}: ${fallbackTask.summary}`,
          moduleBranch: mapped?.moduleBranch || fallbackTask.moduleBranch,
          branchName: mapped?.branchName || fallbackTask.branchName,
          filePath: mapped?.filePath || fallbackTask.filePath,
        };
      }
    } catch {
      // Fall back to local roster if network call fails
    }
  }

  return (
    localRoster.find(
      (s) =>
        s.email.toLowerCase() === cleanEmail &&
        s.regNo.toUpperCase() === cleanReg
    ) || null
  );
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

    mapped.push({
      email,
      regNo,
      name: String(row.Name || prev?.name || `Student ${idx + 1}`).trim(),
      department: String(row.Department || prev?.department || 'MCA').trim(),
      rollNo: task.rollNo,
      exerciseTitle: `Ex ${task.rollLabel}: ${task.summary}`,
      moduleBranch: task.moduleBranch,
      branchName: task.branchName,
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

      const existingIdx = merged.findIndex(
        (s) =>
          s.officialEmail.toLowerCase() === email &&
          s.regNo.toUpperCase() === regNo &&
          s.exerciseTitle === String(row.ExerciseTitle || '')
      );
      if (existingIdx !== -1) continue;

      const studentMatch = roster.find(
        (s) => s.email.toLowerCase() === email || s.regNo.toUpperCase() === regNo
      );

      merged.push({
        id: `sheet_${regNo}_${Date.parse(String(row.Timestamp || '')) || merged.length}`,
        timestamp: String(row.Timestamp || new Date().toISOString()),
        officialEmail: email,
        regNo,
        studentName: String(row.StudentName || studentMatch?.name || 'Student'),
        department: studentMatch?.department || 'MCA',
        exerciseTitle: String(row.ExerciseTitle || studentMatch?.exerciseTitle || ''),
        branchName: studentMatch?.branchName || 'main',
        filePath: studentMatch?.filePath || 'login/index.html',
        repoUrl,
        status:
          row.Status === 'Evaluated' || row.Status === 'Needs Revision'
            ? row.Status
            : 'Submitted',
        sourceCode: String(row.SourceCode || ''),
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

    saveSubmissions(merged);
    return merged;
  } catch {
    return localSubs;
  }
}

export async function recordSubmissionToSheetAndLocal(
  record: SubmissionRecord,
  appsScriptUrl: string
): Promise<{ syncedToSheet: boolean }> {
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

  if (!appsScriptUrl.trim()) {
    return { syncedToSheet: false };
  }

  try {
    await fetch(appsScriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveSubmission',
        Timestamp: record.timestamp,
        'Official Email': record.officialEmail,
        'Reg No': record.regNo,
        'Student Name': record.studentName,
        'Exercise Title': record.exerciseTitle,
        Status: record.status,
        'Source Code': record.sourceCode,
      }),
    });
    return { syncedToSheet: true };
  } catch {
    return { syncedToSheet: false };
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

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === "verifyStudent") {
    var sheet = ss.getSheetByName("students");
    var rows = sheet.getDataRange().getValues();
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
    var sheet = ss.getSheetByName("students");
    var rows = sheet.getDataRange().getValues();
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
    var subSheet = ss.getSheetByName("submission");
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
        SourceCode: String(subRows[j][6] || "")
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
    var sheet = ss.getSheetByName("submission");
    sheet.appendRow([
      data.Timestamp,
      data["Official Email"],
      data["Reg No"],
      data["Student Name"],
      data["Exercise Title"],
      data.Status,
      data["Source Code"]
    ]);
  } else if (data.action === "sendOtp") {
    MailApp.sendEmail(data.email, "PatientTracker Faculty Password Reset OTP", "Your OTP code is: " + data.otp);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
