import React from 'react';
import { AlertTriangle, Check, GitMerge, X } from 'lucide-react';

export interface ConflictPayload {
  filePath: string;
  branchName: string;
  localContent: string;
  remoteContent: string;
  remoteSha: string;
}

interface Props {
  conflict: ConflictPayload | null;
  busy: boolean;
  onResolve: (choice: 'local' | 'remote' | 'merge') => void;
  onCancel: () => void;
}

export const ConflictResolverModal: React.FC<Props> = ({
  conflict,
  busy,
  onResolve,
  onCancel,
}) => {
  if (!conflict) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflictModalTitle"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 id="conflictModalTitle" className="text-base font-bold text-slate-900">
                Branch Conflict Detected — Choose Which File Version to Push
              </h2>
              <p className="text-xs text-slate-600">
                <span className="font-mono font-semibold text-slate-900">{conflict.filePath}</span> on{' '}
                <span className="font-mono font-semibold text-teal-800">{conflict.branchName}</span> changed on GitHub since you cloned.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close conflict resolver"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-teal-200 bg-teal-50/30">
            <div className="border-b border-teal-200 px-3.5 py-2 text-xs font-bold text-teal-900">
              Your Edited Version (Local Sandbox)
            </div>
            <pre className="max-h-[340px] flex-1 overflow-auto bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-slate-100">
              <code>{conflict.localContent}</code>
            </pre>
          </div>

          <div className="flex flex-col rounded-lg border border-amber-200 bg-amber-50/30">
            <div className="border-b border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-900">
              Remote Branch Version ({conflict.branchName})
            </div>
            <pre className="max-h-[340px] flex-1 overflow-auto bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-slate-200">
              <code>{conflict.remoteContent}</code>
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('remote')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              Keep Remote Version
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('merge')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-60"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merge Both Lines
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('local')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {busy ? 'Pushing...' : 'Use My Version & Push'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
