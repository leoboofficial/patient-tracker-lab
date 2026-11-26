import React from 'react';
import { FileCode2, TableProperties } from 'lucide-react';
import { ExerciseFormGuide, getFormGuidesForRoll } from '@/src/data/formFieldSpecs';

interface Props {
  rollNo: number;
  exerciseTitle?: string;
  compact?: boolean;
}

export const FormFieldGuidePanel: React.FC<Props> = ({
  rollNo,
  exerciseTitle,
  compact = false,
}) => {
  const guides: ExerciseFormGuide[] = getFormGuidesForRoll(rollNo);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TableProperties className="h-4 w-4 text-teal-700" />
          <h3 className="text-xs font-bold text-slate-900">
            Form Elements &amp; Field Specification (Mapped to Your Exercise)
          </h3>
        </div>
        {exerciseTitle && (
          <span className="rounded bg-teal-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-800">
            {exerciseTitle}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-600">
        Use these exact <span className="font-mono font-semibold text-slate-800">JSON Key / id</span> names and HTML controls with <span className="font-mono">getData()</span> / <span className="font-mono">saveData()</span> in <span className="font-mono">shared/storage.js</span> so your page integrates seamlessly with the rest of the team.
      </p>

      <div className={compact ? 'max-h-72 space-y-3 overflow-y-auto pr-1' : 'space-y-4'}>
        {guides.map((guide) => (
          <div
            key={guide.id}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <FileCode2 className="h-3.5 w-3.5 text-teal-700" />
                <span>{guide.sectionTitle}</span>
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                JSON Store: <strong className="text-teal-800">{guide.jsonStore}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                    <th className="px-3 py-2">Field Label</th>
                    <th className="px-3 py-2">JSON Key / id</th>
                    <th className="px-3 py-2">HTML Input Element</th>
                    <th className="px-3 py-2">Validation &amp; Behavior Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guide.fields.map((f, idx) => (
                    <tr key={`${guide.id}-${idx}`} className="align-top hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-semibold text-slate-900 whitespace-nowrap">
                        {f.fieldLabel}
                      </td>
                      <td className="px-3 py-2 font-mono text-teal-800">
                        <code className="rounded bg-teal-50 px-1.5 py-0.5">{f.jsonKeyOrId}</code>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {f.htmlElement}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {f.validationRule}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
