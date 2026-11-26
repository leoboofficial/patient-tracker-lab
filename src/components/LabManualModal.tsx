import React from 'react';
import { BookOpen, Download, X } from 'lucide-react';

interface Props {
  open: boolean;
  role: 'faculty' | 'student';
  onClose: () => void;
}

const FACULTY_SECTIONS = [
  {
    heading: 'Part 1: GitHub Repository & Faculty PAT Setup',
    steps: [
      {
        title: 'Step 01 — Create Central Lab Repository on GitHub',
        items: [
          'Sign in to your Faculty GitHub account at https://github.com.',
          'Create an empty repository (e.g., PatientTracker-MCA) with "Add a README file" checked so the main branch exists, or create it from Connect GitHub Repo → Create New Faculty Repo.',
        ],
      },
      {
        title: 'Step 02 — Generate Faculty Classic PAT',
        items: [
          'Go to GitHub.com → Profile picture → Settings → Developer settings → Personal access tokens → Tokens (classic).',
          'Click Generate new token (classic), set a Note (e.g., PatientTracker Faculty Admin) and Expiration.',
          'Check the top-level "repo" scope and copy the generated token (ghp_...).',
        ],
      },
      {
        title: 'Step 03 — Invite Students as Collaborators',
        items: [
          'Open your lab repository on GitHub → Settings → Collaborators → Add people.',
          'Add each student’s GitHub username or email and remind them to accept the invitation before pushing.',
        ],
      },
    ],
  },
  {
    heading: 'Part 2: Faculty Execution Flow (#/faculty)',
    steps: [
      {
        title: 'Step 01 — Open Faculty Portal & Sign In',
        items: [
          'Open <App-URL>/#/faculty and sign in (default: faculty / Admin@123).',
          'Forgot Password: Click Forgot Password?, enter your Official Faculty Email, click Send OTP, verify the 6-digit OTP, and save a new password.',
        ],
      },
      {
        title: 'Step 02 — Update Password & Official Email',
        items: [
          'Click Change Password in the top bar to set a new password and update your Official Email for OTP resets.',
        ],
      },
      {
        title: 'Step 03 — Configure Repository Link & Google Sheet Web App (Tab 1)',
        items: [
          'Under 1. Repo & Sheet Setup, enter your Student Lab GitHub Repository URL and optional Google Apps Script Web App URL.',
          'Click Save Lab Settings, then click Copy Student Portal URL to share #/student with students.',
        ],
      },
      {
        title: 'Step 04 — Connect PAT & Initialize Starter Repo + Branches',
        items: [
          'Click Connect GitHub Repo, enter repository owner/name and your Faculty PAT (ghp_...), and connect.',
          'Click Initialize Starter Repo & 3 Branches to push starter files and create module-login, module-doctor, and module-patient.',
        ],
      },
      {
        title: 'Step 05 — Register Students & Create Mapped Branches (Tab 2)',
        items: [
          'Under 2. Students & Exercise Mapping, add students (Email, RegNo, Name, Dept, Exercise 01–54) or use Bulk Paste CSV.',
          'Return to Tab 1 and click Create Mapped Student Branches so each student has a dedicated branch.',
        ],
      },
      {
        title: 'Step 06 — Evaluate Submissions on 50-Mark Rubric (Tab 3)',
        items: [
          'Under 3. Submissions & Rubric, click Evaluate to inspect a student’s Source Code and Live Rendered Output.',
          'Score all 6 rubric criteria (50 marks total), add Faculty Remarks, set Status to Evaluated (Unlock Student PDF), and save.',
        ],
      },
      {
        title: 'Step 07 — Approve PRs & Merge Modules into Main (Tab 4)',
        items: [
          'Review and merge student Pull Requests into module-login, module-doctor, and module-patient, then click Merge 3 Module Branches → main.',
        ],
      },
    ],
  },
];

const STUDENT_SECTIONS = [
  {
    heading: 'Part 1: Student GitHub PAT Setup (Before First Push)',
    steps: [
      {
        title: 'Step 01 — Accept Faculty Collaborator Invitation',
        items: [
          'Sign in to your student GitHub account at https://github.com.',
          'Check your email or the GitHub Bell icon (top-right) and accept the collaborator invitation for the faculty repository.',
        ],
      },
      {
        title: 'Step 02 — Generate Fine-Grained Personal Access Token',
        items: [
          'Go to GitHub.com → Profile picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
          'Under Repository access, select Only select repositories and choose your faculty’s lab repository.',
          'Under Repository permissions, set Contents = Read and write and Pull requests = Read and write, then generate and copy the token (github_pat_...).',
        ],
      },
    ],
  },
  {
    heading: 'Part 2: Student Execution Flow (#/student)',
    steps: [
      {
        title: 'Step 01 — Sign In to Student Lab Portal',
        items: [
          'Enter your Official Email (e.g., 26SP216XXXX@student.hindustanuiv.ac.in) and Registration Number (no PIN required).',
          'If your account is not listed in the Google Sheet students tab or faculty roster, contact your faculty.',
        ],
      },
      {
        title: 'Step 02 — Clone Faculty Repository',
        items: [
          'Verify the Faculty GitHub Repository Link, paste your Fine-Grained PAT (kept in browser memory only), and click Clone Repository & Open Editor.',
        ],
      },
      {
        title: 'Step 03 — Code & Test in Live Output Sandbox',
        items: [
          'Edit your assigned HTML/CSS/JS file, use shared/storage.js as reference, add your RegNo in CONTRIBUTORS.txt, and click Run to test the live preview.',
        ],
      },
      {
        title: 'Step 04 — Commit, Push & Resolve Branch Conflicts',
        items: [
          'Pick feat:, fix:, or style:, enter a short commit message, and click Push to your assigned branch.',
          'If a remote conflict is detected, use the side-by-side Conflict Resolver to choose Use My Version & Push, Keep Remote Version, or Merge Both Lines.',
        ],
      },
      {
        title: 'Step 05 — Open Pull Request',
        items: [
          'Click Open PR → your module branch (module-login, module-doctor, or module-patient) for faculty review.',
        ],
      },
      {
        title: 'Step 06 — Generate Evaluated PDF Report',
        items: [
          'Once your faculty marks your submission Evaluated, click Generate PDF Report (XX/50) → Print / Save as PDF.',
        ],
      },
    ],
  },
];

const RUBRIC_ROWS = [
  ['1. Git Repo Initialization & .gitignore', '5'],
  ['2. Conventional Commits (feat:, fix:, style:)', '10'],
  ['3. Module Branching & Conflict Resolution', '10'],
  ['4. Pull Request & Peer Code Review', '10'],
  ['5. GitHub Actions CI/CD Validation', '5'],
  ['6. Working HTML5/CSS3/JS Output & Viva', '10'],
];

export const LabManualModal: React.FC<Props> = ({ open, role, onClose }) => {
  if (!open) return null;

  const isFaculty = role === 'faculty';
  const sections = isFaculty ? FACULTY_SECTIONS : STUDENT_SECTIONS;
  const pdfHref = isFaculty
    ? './manuals/Faculty_Lab_Manual.pdf'
    : './manuals/Student_Lab_Manual.pdf';
  const pdfName = isFaculty
    ? 'PatientTracker_Faculty_Manual.pdf'
    : 'PatientTracker_Student_Manual.pdf';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manualModalTitle"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-teal-700" />
            <div>
              <h2 id="manualModalTitle" className="text-base font-bold text-slate-900">
                {isFaculty ? 'Faculty Lab Manual' : 'Student Lab Manual'}
              </h2>
              <p className="text-xs text-slate-500">
                GitHub PAT Setup, Step-by-Step Execution Flow &amp; 50-Mark Rubric
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfHref}
              download={pdfName}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close manual"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-xs text-slate-700">
          {sections.map((sec) => (
            <section key={sec.heading} className="space-y-3">
              <h3 className="rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-900">
                {sec.heading}
              </h3>
              <div className="space-y-3">
                {sec.steps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-lg border border-slate-200 bg-white p-3.5"
                  >
                    <div className="font-bold text-slate-900">{step.title}</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600">
                      {step.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="space-y-2.5">
            <h3 className="rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-900">
              50-Mark Practical Rubric Reference
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="px-4 py-2">Criterion</th>
                    <th className="px-4 py-2 text-right">Max Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RUBRIC_ROWS.map(([label, max]) => (
                    <tr key={label}>
                      <td className="px-4 py-2 text-slate-800">{label}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-teal-800">
                        {max}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
