import React, { useState } from 'react';
import { CheckSquare, Square, ClipboardCheck, Camera, FileCheck, Calendar, Send, Check } from 'lucide-react';
import type { VerificationChecklistItem } from '../../services/types';

interface VerificationChecklistProps {
  checklist: VerificationChecklistItem[];
  onScheduleInspection?: () => void;
}

export const VerificationChecklist: React.FC<VerificationChecklistProps> = ({
  checklist,
  onScheduleInspection,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const toggleStep = (stepNo: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepNo]: !prev[stepNo],
    }));
  };

  const handleMarkAllVerified = () => {
    const all: Record<number, boolean> = {};
    checklist.forEach((item) => {
      all[item.step_no] = true;
    });
    setCompletedSteps(all);
    setFeedbackMsg('All field checklist verification steps marked as verified.');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleRequestEvidence = (stepAction: string) => {
    setFeedbackMsg(`Formal evidence request dispatched to Implementing Agency for: "${stepAction}".`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleScheduleInspection = () => {
    if (onScheduleInspection) {
      onScheduleInspection();
    }
    setFeedbackMsg('Field inspection order initiated for Assistant Engineer (AE) site visit.');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  if (!checklist || checklist.length === 0) {
    return null;
  }

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPct = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Recommended Field Verification Checklist
            </h4>
            <p className="text-[11px] text-slate-500">
              Prescriptive verification protocol generated for active telemetry triggers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            {completedCount} / {checklist.length} verified ({progressPct}%)
          </span>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800 flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Checklist Steps */}
      <div className="space-y-3">
        {checklist.map((item) => {
          const isDone = !!completedSteps[item.step_no];
          return (
            <div
              key={item.step_no}
              className={`p-3.5 rounded-lg border transition-all ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleStep(item.step_no)}
                  className="mt-0.5 text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                  title={isDone ? 'Mark Pending' : 'Mark Verified'}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <span className={`font-bold text-xs ${isDone ? 'line-through text-emerald-800' : 'text-slate-900'}`}>
                      Step {item.step_no}: {item.action}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      Standard Protocol
                    </span>
                  </div>

                  <p className={`text-[11px] leading-relaxed mb-2.5 ${isDone ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {item.details}
                  </p>

                  {/* Required Evidence Tags */}
                  {item.evidence_required && item.evidence_required.length > 0 && (
                    <div className="mb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Specific Evidence Required:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.evidence_required.map((ev, eIdx) => (
                          <span
                            key={eIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs"
                          >
                            <FileCheck className="w-3 h-3 text-blue-600" />
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-step Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => toggleStep(item.step_no)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
                    >
                      {isDone ? 'Mark Unverified' : 'Mark Verified'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestEvidence(item.action)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3 text-blue-600" />
                      Request Evidence
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Global Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleMarkAllVerified}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Mark All Verified
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRequestEvidence('All Checklist Evidence Requirements')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            Request Evidence
          </button>
          <button
            type="button"
            onClick={handleScheduleInspection}
            className="px-3 py-1.5 bg-[#0d2b45] hover:bg-[#153e61] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
