import React, { useMemo } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { SubmissionRecord } from '@/src/lib/sheetsAndAuth';
import { buildSandboxedPreviewHtml } from '@/src/lib/sandboxPreview';

interface Props {
  submission: SubmissionRecord;
  repoFiles: Record<string, string>;
  onClose: () => void;
}

export const SubmissionPdfReport: React.FC<Props> = ({
  submission,
  repoFiles,
  onClose,
}) => {
  const previewHtml = useMemo(() => {
    const folder = submission.filePath.split('/')[0];
    const role: 'Admin' | 'Clerk' | 'Doctor' | 'Patient' =
      folder === 'doctor' ? 'Doctor' : folder === 'patient' ? 'Patient' : 'Admin';
    return buildSandboxedPreviewHtml(
      submission.filePath,
      submission.sourceCode,
      repoFiles,
      role
    );
  }, [submission, repoFiles]);

  const rubricRows = [
    { label: '1. Git Repository Initialization & .gitignore', max: 5, score: submission.rubric.repoAndGitignore },
    { label: '2. Meaningful Conventional Commits (feat/fix/style)', max: 10, score: submission.rubric.conventionalCommits },
    { label: '3. Module Branching & Conflict Resolution', max: 10, score: submission.rubric.branchingAndConflicts },
    { label: '4. Pull Request & Peer Code Review', max: 10, score: submission.rubric.prsAndCodeReview },
    { label: '5. GitHub Actions CI/CD Validation', max: 5, score: submission.rubric.ciPipeline },
    { label: '6. Working HTML5/CSS3/JS Output & Viva', max: 10, score: submission.rubric.workingPageAndViva },
  ];

  return (
    <div className="mx-auto max-w-[980px] px-6 py-6">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Lab Workspace
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save as PDF
        </button>
      </div>

      <article className="space-y-6 rounded-xl border border-slate-200 bg-white p-8">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-800">
            MCA Practical Lab Record · PatientTracker HTML5 / CSS3 / JS
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {submission.exerciseTitle}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Submitted on {new Date(submission.timestamp).toLocaleString()} · Status:{' '}
            <strong className="text-slate-900">{submission.status}</strong>
          </p>
        </div>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">Student &amp; Repository Details</h2>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Student Name:</span>{' '}
              <strong className="text-slate-900">{submission.studentName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Reg No:</span>{' '}
              <strong className="font-mono text-slate-900">{submission.regNo}</strong>
            </div>
            <div>
              <span className="text-slate-500">Official Email:</span>{' '}
              <strong className="text-slate-900">{submission.officialEmail}</strong>
            </div>
            <div>
              <span className="text-slate-500">Department:</span>{' '}
              <strong className="text-slate-900">{submission.department}</strong>
            </div>
            <div>
              <span className="text-slate-500">Assigned Branch:</span>{' '}
              <strong className="font-mono text-teal-800">{submission.branchName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Assigned File:</span>{' '}
              <strong className="font-mono text-slate-900">{submission.filePath}</strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Repository URL:</span>{' '}
              <strong className="font-mono text-slate-900">{submission.repoUrl}</strong>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">
            Faculty Evaluation Rubric (Total: {submission.totalMarks} / 50)
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="px-4 py-2.5">Rubric Criterion</th>
                  <th className="px-4 py-2.5 text-right">Max Marks</th>
                  <th className="px-4 py-2.5 text-right">Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubricRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2 text-slate-800">{row.label}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                      {row.max}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold tabular-nums text-slate-900">
                      {row.score}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-2.5 text-slate-900">Total Marks Awarded</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">50</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-teal-800">
                    {submission.totalMarks} / 50
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {submission.facultyRemarks && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <strong className="text-slate-900">Faculty Remarks:</strong> {submission.facultyRemarks}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">
            Submitted Source Code ({submission.filePath})
          </h2>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
            <code>{submission.sourceCode}</code>
          </pre>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-bold text-slate-900">
            Rendered Program Output
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <iframe
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-forms"
              title="Submitted Program Output"
              className="h-[420px] w-full border-0 bg-slate-50"
            />
          </div>
        </section>
      </article>
    </div>
  );
};
