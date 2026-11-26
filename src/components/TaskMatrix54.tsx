import React, { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Edit3,
  UploadCloud,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react';
import { ModuleBranch } from '@/src/data/tasks54';
import {
  StudentAssignment,
  buildDefaultAssignments,
  saveAssignments,
} from '@/src/lib/localLabStore';
import { GitHubConfig } from '@/src/lib/githubClient';

interface Props {
  assignments: StudentAssignment[];
  onChangeAssignments: (next: StudentAssignment[]) => void;
  githubConfig: GitHubConfig | null;
  onPublishToRepo: () => Promise<void>;
  publishing: boolean;
}

export const TaskMatrix54: React.FC<Props> = ({
  assignments,
  onChangeAssignments,
  githubConfig,
  onPublishToRepo,
  publishing,
}) => {
  const [moduleFilter, setModuleFilter] = useState<'all' | ModuleBranch>('all');
  const [query, setQuery] = useState('');
  const [editingRoll, setEditingRoll] = useState<number | null>(null);
  const [draft, setDraft] = useState<StudentAssignment | null>(null);
  const [copiedRoll, setCopiedRoll] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => {
      const matchMod = moduleFilter === 'all' || a.moduleBranch === moduleFilter;
      const matchQuery =
        !q ||
        a.rollLabel.includes(q) ||
        a.studentName.toLowerCase().includes(q) ||
        a.githubUsername.toLowerCase().includes(q) ||
        a.branchName.toLowerCase().includes(q) ||
        a.filePath.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q);
      return matchMod && matchQuery;
    });
  }, [assignments, moduleFilter, query]);

  function startEdit(a: StudentAssignment) {
    setEditingRoll(a.rollNo);
    setDraft({ ...a });
  }

  function saveEdit() {
    if (!draft) return;
    const updated = assignments.map((item) =>
      item.rollNo === draft.rollNo ? draft : item
    );
    saveAssignments(updated);
    onChangeAssignments(updated);
    setEditingRoll(null);
    setDraft(null);
  }

  function toggleLock(rollNo: number) {
    const updated = assignments.map((item) =>
      item.rollNo === rollNo ? { ...item, locked: !item.locked } : item
    );
    saveAssignments(updated);
    onChangeAssignments(updated);
  }

  function handleResetDefaults() {
    const defaults = buildDefaultAssignments();
    saveAssignments(defaults);
    onChangeAssignments(defaults);
    setEditingRoll(null);
    setDraft(null);
  }

  function buildStudentUrl(rollNo: number): string {
    const base = `${window.location.origin}${window.location.pathname}#/student?roll=${rollNo}`;
    if (githubConfig) {
      return `${base}&owner=${encodeURIComponent(githubConfig.owner)}&repo=${encodeURIComponent(githubConfig.repo)}`;
    }
    return base;
  }

  function copyStudentLink(rollNo: number) {
    const url = buildStudentUrl(rollNo);
    navigator.clipboard?.writeText(url);
    setCopiedRoll(rollNo);
    setTimeout(() => setCopiedRoll(null), 1800);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Student Assignments &amp; Access Control (54 Slots)
          </h2>
          <p className="text-xs text-slate-600">
            Assign each student their module, branch, and file. Students opening their{' '}
            <span className="font-mono">#/student</span> route can only edit and push to their assigned branch and file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset 54 Defaults
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={onPublishToRepo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {publishing ? 'Publishing...' : 'Publish lab-assignments.json to Repo'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'all', label: 'All 54 Students' },
              { id: 'module-login', label: 'module-login (01–18)' },
              { id: 'module-doctor', label: 'module-doctor (19–36)' },
              { id: 'module-patient', label: 'module-patient (37–54)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModuleFilter(tab.id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                moduleFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by roll, student name, branch, or file..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          />
        </div>
      </div>

      {editingRoll !== null && draft && (
        <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Edit Assignment — Roll {draft.rollLabel}
            </h3>
            <button
              type="button"
              onClick={() => { setEditingRoll(null); setDraft(null); }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Student Name</label>
              <input
                type="text"
                value={draft.studentName}
                onChange={(e) => setDraft({ ...draft, studentName: e.target.value })}
                placeholder="e.g., Priya Nair"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">GitHub Username</label>
              <input
                type="text"
                value={draft.githubUsername}
                onChange={(e) => setDraft({ ...draft, githubUsername: e.target.value })}
                placeholder="e.g., priya-mca"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Module Branch</label>
              <select
                value={draft.moduleBranch}
                onChange={(e) => setDraft({ ...draft, moduleBranch: e.target.value as ModuleBranch })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
              >
                <option value="module-login">module-login</option>
                <option value="module-doctor">module-doctor</option>
                <option value="module-patient">module-patient</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Assigned Branch</label>
              <input
                type="text"
                value={draft.branchName}
                onChange={(e) => setDraft({ ...draft, branchName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Assigned File</label>
              <input
                type="text"
                value={draft.filePath}
                onChange={(e) => setDraft({ ...draft, filePath: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Save Student Assignment
            </button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <th className="px-3 py-3 whitespace-nowrap">Roll</th>
              <th className="px-3 py-3 whitespace-nowrap">Assigned Student</th>
              <th className="px-3 py-3 whitespace-nowrap">Module Base</th>
              <th className="px-3 py-3 whitespace-nowrap">Assigned Branch</th>
              <th className="px-3 py-3 whitespace-nowrap">Assigned File</th>
              <th className="px-3 py-3">Task Spec</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <tr key={a.rollNo} className="hover:bg-slate-50/70">
                <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {a.rollLabel}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-900">
                    {a.studentName || <span className="text-slate-400">Unassigned</span>}
                  </div>
                  {a.githubUsername && (
                    <div className="font-mono text-[11px] text-slate-500">@{a.githubUsername}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                  {a.moduleBranch}
                </td>
                <td className="px-3 py-2.5 font-mono font-medium text-teal-800 whitespace-nowrap">
                  {a.branchName}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-900 whitespace-nowrap">
                  {a.filePath}
                </td>
                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={a.summary}>
                  {a.summary}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      title="Edit student assignment"
                    >
                      <Edit3 className="h-3 w-3" />
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => copyStudentLink(a.rollNo)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      title="Copy direct student portal URL"
                    >
                      {copiedRoll === a.rollNo ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-700" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Link
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLock(a.rollNo)}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${
                        a.locked
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      title={a.locked ? 'Unlock submissions' : 'Lock submissions'}
                    >
                      {a.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {a.locked ? 'Locked' : 'Open'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
