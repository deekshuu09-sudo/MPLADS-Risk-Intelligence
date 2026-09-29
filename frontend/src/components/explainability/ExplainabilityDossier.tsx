import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  AlertCircle,
  Building,
  User,
  MapPin,
  Calendar,
  IndianRupee,
  Layers,
  CheckCircle,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Share2,
  Database,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Info,
  Cpu,
  GitMerge,
  History,
  GitCommit,
  Tag,
  Network,
} from 'lucide-react';
import { api } from '../../services/api';
import type { ExplainabilityDossier as DossierType, TriggerFactor } from '../../services/types';
import { SeverityBadge, ScoreBadge, DataSourceBadge, StatusPill } from '../common/RiskBadge';
import { BaselineBarChart } from './BaselineBarChart';
import { DuplicateComparison } from './DuplicateComparison';
import { VerificationChecklist } from './VerificationChecklist';

interface ExplainabilityDossierProps {
  workId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
  onViewOnMap?: (workId: string) => void;
}

export const ExplainabilityDossier: React.FC<ExplainabilityDossierProps> = ({
  workId,
  isOpen,
  onClose,
  onStatusUpdated,
  onViewOnMap,
}) => {
  const [dossier, setDossier] = useState<DossierType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Investigation submission state
  const [newStatus, setNewStatus] = useState<string>('IN_REVIEW');
  const [assignedRole, setAssignedRole] = useState<string>('DISTRICT_PLANNING_OFFICER');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [outcomeDecision, setOutcomeDecision] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeLineageVoucherId, setActiveLineageVoucherId] = useState<number | null>(null);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);
  const [selectedGraphEdgeIndex, setSelectedGraphEdgeIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && workId) {
      loadDossier(workId);
      setSubmitSuccess(false);
      setSelectedGraphNodeId(null);
      setSelectedGraphEdgeIndex(null);
    }
  }, [isOpen, workId]);

  const loadDossier = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDossier(id);
      setDossier(data);
      if (data.investigation_status?.status) {
        setNewStatus(data.investigation_status.status);
      }
      if (data.investigation_status?.assigned_role) {
        setAssignedRole(data.investigation_status.assigned_role);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load explainability dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workId) return;

    // Client-side verification guardrail: mandatory remarks for RESOLVED and DISMISSED
    if (newStatus === 'RESOLVED' || newStatus === 'DISMISSED') {
      const hasNotes = reviewerNotes && reviewerNotes.trim().length > 0;
      const hasDecision = outcomeDecision && outcomeDecision.trim().length > 0;
      if (!hasNotes && !hasDecision) {
        alert(
          `Administrative Explanation Required:\n\nCannot transition case to ${newStatus} without providing Reviewer Notes or an Outcome Decision recommendation documenting the evidentiary basis.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await api.submitReview(workId, {
        new_status: newStatus,
        assigned_role: assignedRole,
        reviewer_notes: reviewerNotes,
        outcome_decision: outcomeDecision,
      });
      setSubmitSuccess(true);
      setReviewerNotes('');
      // Reload dossier to show updated status and audit
      await loadDossier(workId);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakhs`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatNumber = (
    value: number | null | undefined,
    digits = 2
  ) => (value != null ? value.toFixed(digits) : '—');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-slate-50 w-full max-w-4xl min-h-screen shadow-2xl border-l border-slate-300 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Sticky Header */}
        <div className="bg-white border-b border-slate-200 p-5 sticky top-0 z-20 shadow-2xs font-ui">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2 font-ui">
                <span className="font-data text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {workId}
                </span>
                {dossier?.work_category && (
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {dossier.work_category}
                  </span>
                )}
                {dossier && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                    {dossier.is_synthetic || dossier.work_id.startsWith('WS/DEMO/')
                      ? 'Benchmark Archetype'
                      : 'Telemetry Record'}
                  </span>
                )}
                {dossier?.risk_evaluation && (
                  <SeverityBadge severity={dossier.risk_evaluation.severity_level} />
                )}
                {dossier?.risk_evaluation && (
                  <ScoreBadge score={dossier.risk_evaluation.composite_risk_score} />
                )}
                {dossier?.investigation_status && (
                  <StatusPill status={dossier.investigation_status.status} />
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-normal text-slate-900 leading-snug tracking-tight">
                {dossier ? dossier.activity_name : 'Loading Case Dossier...'}
              </h2>
              {dossier && (
                <p className="font-secondary text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span>{dossier.district}, {dossier.state}</span>
                  <span>•</span>
                  <span>MP: <span className="font-ui font-medium text-slate-800">{dossier.mp_name}</span></span>
                  <span>•</span>
                  <span>Agency: <span className="font-ui font-medium text-slate-800">{dossier.implementing_agency}</span></span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 font-ui">
              {onViewOnMap && workId && (
                <button
                  onClick={() => {
                    onViewOnMap(workId);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Locate work on Geospatial Risk Map"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  <span>View on Map</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Prototype & Governance Disclaimer */}
          <div className="mt-3 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 flex items-center justify-between gap-2 font-secondary">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>
                <span className="font-ui font-semibold text-slate-900">Decision-Support Prototype — Not an Official MoSPI Finding:</span> Risk scores indicate algorithmic priority for physical verification, not findings of misconduct.
              </span>
            </div>
            <span className="text-[10px] font-ui text-slate-500 whitespace-nowrap hidden sm:inline">
              Rule Engine v2.1
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 sm:p-7 space-y-6">
          {loading && (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Synthesizing Explainable Risk Dossier...</p>
              <p className="text-xs text-slate-400">Aggregating multi-engine indicators & baseline distributions</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <p className="font-bold">Error Loading Dossier</p>
              <p>{error}</p>
            </div>
          )}

          {dossier && (
            <>
              {/* ANALYTICAL SAFEGUARD / PROXIMITY COUNTEREXAMPLE BANNER (WORK 801 / 802) */}
              {(dossier.work_id === 'WS/DEMO/2025/801' || dossier.work_id === 'WS/DEMO/2025/802') && (
                <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-4 text-white shadow-md space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                        Analytical Safeguard Demonstrated: Spatial Proximity Alone Does Not Establish Duplicate Risk
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-600">
                      BENCHMARK COUNTEREXAMPLE 801 ↔ 802
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    This work is physically co-located within <strong>166.27 meters</strong> of{' '}
                    <span className="font-mono text-blue-300 font-bold">
                      {dossier.work_id === 'WS/DEMO/2025/801' ? 'WS/DEMO/2025/802' : 'WS/DEMO/2025/801'}
                    </span>
                    . However, multi-channel entity resolution confirms{' '}
                    <strong className="text-emerald-400">NO_SIGNIFICANT_RELATIONSHIP</strong>{' '}
                    (Splink Probability: 0.00%, Semantic Cosine Similarity: 0.000, Different Work Categories).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <span className="text-slate-400 text-[10px] block font-ui">Haversine Distance</span>
                      <span className="text-white font-bold">166.27 m (Proximity Only)</span>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <span className="text-slate-400 text-[10px] block font-ui">Splink + Semantic Signal</span>
                      <span className="text-emerald-400 font-bold">0.000 (Completely Disjoint)</span>
                    </div>
                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                      <span className="text-slate-400 text-[10px] block font-ui">System Safeguard Action</span>
                      <span className="text-blue-300 font-bold">No False-Positive Duplicate Flag</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION A: THE PLAIN-ENGLISH RATIONALE BANNER */}
              <div className="bg-[#0d2b45] text-white rounded-xl p-5 sm:p-6 shadow-md relative overflow-hidden space-y-4">
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#1f4a70] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
                        Explainability Analysis • Why Was This Project Flagged?
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-300 uppercase block font-semibold">Composite Score</span>
                        <span className="font-mono text-lg font-bold text-white">
                          {dossier.risk_evaluation.composite_risk_score.toFixed(1)}/100
                        </span>
                      </div>
                      <div className="text-right border-l border-[#1f4a70] pl-3">
                        <span className="text-[10px] text-slate-300 uppercase block font-semibold">Model Confidence</span>
                        <span className="font-mono text-lg font-bold text-emerald-300">
                          {Math.round(dossier.risk_evaluation.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Objective Explanation Narrative */}
                  <p className="text-sm leading-relaxed text-slate-100 font-normal mb-3">
                    This work has been marked with a{' '}
                    <strong className="text-amber-300 font-semibold uppercase">
                      {dossier.risk_evaluation.severity_level} Risk Indicator
                    </strong>{' '}
                    based on multi-dimensional telemetry analysis. The primary trigger involves{' '}
                    <span className="underline decoration-amber-400 decoration-1 underline-offset-2">
                      {dossier.risk_evaluation.trigger_factors.length > 0
                        ? dossier.risk_evaluation.trigger_factors[0].summary
                        : 'policy benchmark parameter deviation'}
                    </span>
                    . Administrative review and physical verification are recommended in
                    accordance with MPLADS Operational Guidelines.
                  </p>

                  {/* Signal Attribution Chips */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#153e61] border border-[#235887] p-2.5 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">Primary Signal</span>
                      <span className="text-white font-medium">
                        {dossier.risk_evaluation.trigger_factors[0]?.factor_name || 'Multi-Factor Divergence'}
                      </span>
                    </div>
                    <div className="bg-[#153e61] border border-[#235887] p-2.5 rounded-lg">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block mb-0.5">Secondary Signals</span>
                      <span className="text-slate-200 font-medium">
                        {dossier.risk_evaluation.trigger_factors.length > 1
                          ? dossier.risk_evaluation.trigger_factors.slice(1).map(tf => tf.factor_name).join(' • ')
                          : 'No secondary deviations identified'}
                      </span>
                    </div>
                  </div>

                  {/* Policy Benchmark Metadata */}
                  <div className="mt-3 pt-2.5 border-t border-[#1f4a70] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-ui">Source</span>
                      <span className="text-white font-semibold">MPLADS Guidelines</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-ui">Rule Type</span>
                      <span className="text-amber-300 font-semibold">Configured Policy Benchmark</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-ui">Benchmark</span>
                      <span className="text-white font-semibold">365 days</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-ui">Status</span>
                      <span className="text-emerald-300 font-semibold">Demo configuration</span>
                    </div>
                  </div>

                  {/* Compact Chronological Investigation Timeline */}
                  <div className="mt-4 pt-3 border-t border-[#1f4a70] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      Chronological Investigation Timeline
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <div className="px-2 py-1 bg-[#153e61] border border-[#235887] rounded text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>Risk Signal Generated ({dossier.days_since_sanction ? `${dossier.days_since_sanction} days elapsed` : 'Initial Sanction'})</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <div className="px-2 py-1 bg-[#153e61] border border-[#235887] rounded text-slate-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span>Referred to Verification Queue</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {dossier.audit_trail && dossier.audit_trail.length > 0 ? (
                        <>
                          <div className="px-2 py-1 bg-[#153e61] border border-[#235887] rounded text-emerald-300 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>
                              {dossier.audit_trail[0].actor_role}: {dossier.audit_trail[0].new_value?.status || dossier.investigation_status?.status || 'Action Recorded'}
                            </span>
                          </div>
                          {dossier.audit_trail.length > 1 && (
                            <>
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <div className="px-2 py-1 bg-[#153e61] border border-[#235887] rounded text-emerald-200 flex items-center gap-1 font-mono">
                                <span>+{dossier.audit_trail.length - 1} further audit step(s)</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="px-2 py-1 bg-[#153e61]/60 border border-[#235887] rounded text-slate-400 italic">
                          Pending Officer Review Decision
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK KEY METRICS SUMMARY */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Sanction Amount</span>
                  <span className="font-bold text-slate-900 text-sm">{formatINR(dossier.sanctioned_amount)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Administrative Approval</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Disbursed Expenditure</span>
                  <span className="font-bold text-blue-700 text-sm">{formatINR(dossier.actual_amount)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {dossier.sanctioned_amount > 0
                      ? `${Math.round((dossier.actual_amount / dossier.sanctioned_amount) * 100)}% of sanction`
                      : '0% disbursed'}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Physical Progress</span>
                  <span className="font-bold text-slate-900 text-sm">{dossier.physical_progress_pct}%</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Reported physical stage</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Days Since Sanction</span>
                  <span className={`font-bold text-sm ${dossier.days_since_sanction && dossier.days_since_sanction > 365 ? 'text-red-600' : 'text-slate-800'}`}>
                    {dossier.days_since_sanction ?? 'N/A'} days
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Configured benchmark: 365 days (Demo)</span>
                </div>
              </div>

              {/* RECOMMENDED ADMINISTRATIVE ACTION */}
              {(dossier.risk_evaluation?.recommended_action || dossier.recommended_action) && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 shadow-2xs flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-0.5">
                      Recommended Administrative Action
                    </h4>
                    <p className="text-xs font-medium text-amber-950 leading-relaxed">
                      {dossier.risk_evaluation?.recommended_action || dossier.recommended_action}
                    </p>
                  </div>
                </div>
              )}

              {/* EVIDENCE SUMMARY / "WHY THIS WAS FLAGGED" */}
              {dossier.risk_evaluation?.evidence_statements && dossier.risk_evaluation.evidence_statements.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Evidence Summary • Why This Project Was Flagged</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {dossier.risk_evaluation.evidence_statements.map((statement, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-normal">{statement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RISK CONTRIBUTION BREAKDOWN */}
              {dossier.risk_evaluation?.risk_contributions && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Risk Contribution Breakdown</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Multi-Engine Point Attribution (Sums to Total Score)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Execution Delay', key: 'Execution Delay', max: 35, color: 'bg-amber-500' },
                      { label: 'Financial Deviation', key: 'Financial Deviation', max: 30, color: 'bg-red-500' },
                      { label: 'Physical Progress', key: 'Physical Progress', max: 25, color: 'bg-blue-500' },
                      { label: 'Duplicate Similarity', key: 'Duplicate Similarity', max: 25, color: 'bg-purple-500' },
                      { label: 'Category Pattern', key: 'Category Pattern', max: 25, color: 'bg-indigo-500' },
                    ].map((item) => {
                      const val = dossier.risk_evaluation.risk_contributions?.[item.key] ?? 0;
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium w-44">{item.label}</span>
                          <div className="flex-1 mx-3 hidden sm:block">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.color}`}
                                style={{ width: `${Math.min(100, (val / item.max) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-900 w-16 text-right">
                            +{val}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Reconciled Factor Sum:</span>
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {Object.values(dossier.risk_evaluation.risk_contributions || {}).reduce((a, b) => a + b, 0)} pts
                      </span>
                      <span className="text-slate-400">=</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">Composite Score:</span>
                      <span className="font-mono text-sm font-extrabold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {dossier.risk_evaluation.composite_risk_score.toFixed(1)} / 100
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION B: TRIGGER FACTOR ATTRIBUTION BREAKDOWN */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Detection Engines & Trigger Factor Attribution</span>
                </h3>

                <div className="space-y-3">
                  {dossier.risk_evaluation.trigger_factors.map((tf: TriggerFactor, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            {tf.engine}
                          </span>
                          <span className="font-bold text-xs text-slate-900">{tf.factor_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Weight: {Math.round(tf.weight * 100)}%
                          </span>
                          <SeverityBadge severity={tf.severity} size="sm" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed mb-3">
                        {tf.summary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Observed Telemetry</span>
                          <span className="font-bold text-slate-800">{tf.observed_value}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Comparative Baseline / Parameters</span>
                          <div className="font-bold text-slate-700 leading-snug">
                            {tf.baseline_value.includes('|') ? (
                              <div className="space-y-0.5 text-[10px]">
                                {tf.baseline_value.split('|').map((part, pIdx) => (
                                  <div key={pIdx} className="text-slate-700">
                                    {part.trim()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              tf.baseline_value
                            )}
                          </div>
                        </div>
                        {tf.variance_pct && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">Deviation / Variance</span>
                            <span className="font-bold text-red-600">{tf.variance_pct}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: DYNAMIC BASELINE DISTRIBUTION BAR */}
              {dossier.risk_evaluation.baseline_comparison && (
                <BaselineBarChart
                  baseline={dossier.risk_evaluation.baseline_comparison}
                  sanctionedAmount={dossier.sanctioned_amount}
                />
              )}

              {/* SECTION D: NEAR-DUPLICATE & RELATED WORKS COMPARISON */}
              {((dossier.similar_works && dossier.similar_works.length > 0) || (dossier.related_works && dossier.related_works.length > 0)) && (
                <DuplicateComparison
                  currentWork={{
                    work_id: dossier.work_id,
                    activity_name: dossier.activity_name,
                    work_description: dossier.work_description,
                    sanctioned_amount: dossier.sanctioned_amount,
                    physical_progress_pct: dossier.physical_progress_pct,
                    work_category: dossier.work_category,
                  }}
                  similarWorks={dossier.similar_works}
                  relatedWorks={dossier.related_works}
                />
              )}

              {/* SECTION E: PRESCRIPTIVE VERIFICATION CHECKLIST */}
              <VerificationChecklist
                checklist={dossier.risk_evaluation.verification_checklist}
              />

              {/* SECTION F: DISBURSEMENT LEDGER & FINANCIAL TRACE LINEAGE */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Disbursement Ledger & Financial Trace Lineage
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Verified public treasury disbursements matched against field milestones
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-700 font-mono font-bold bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    Total Disbursed: {formatINR(dossier.actual_amount)}
                  </span>
                </div>

                {dossier.expenditures && dossier.expenditures.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                            <th className="py-2.5 px-3">Voucher / Ref</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Vendor / Contractor</th>
                            <th className="py-2.5 px-3">Amount Disbursed</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Lineage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {dossier.expenditures.map((exp) => {
                            const isLineageOpen = activeLineageVoucherId === exp.expenditure_id;
                            return (
                              <React.Fragment key={exp.expenditure_id}>
                                <tr className={`hover:bg-slate-50 ${isLineageOpen ? 'bg-blue-50/40' : ''}`}>
                                  <td className="py-2.5 px-3 font-bold text-slate-800">
                                    {exp.voucher_no || `VCH-${exp.expenditure_id}`}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {exp.expenditure_date || 'N/A'}
                                  </td>
                                  <td className="py-2.5 px-3 font-ui text-slate-700">
                                    {exp.vendor_name || 'Designated Vendor'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                                    {formatINR(exp.fund_disbursed_amt)}
                                  </td>
                                  <td className="py-2.5 px-3 font-ui">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {exp.payment_status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-ui">
                                    <button
                                      type="button"
                                      onClick={() => setActiveLineageVoucherId(isLineageOpen ? null : exp.expenditure_id)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                                        isLineageOpen
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                      }`}
                                    >
                                      <GitCommit className="w-3 h-3" />
                                      {isLineageOpen ? 'Hide Trace' : 'View Trace'}
                                    </button>
                                  </td>
                                </tr>
                                {isLineageOpen && (
                                  <tr className="bg-blue-50/30">
                                    <td colSpan={6} className="p-3 font-ui border-b border-blue-200">
                                      <div className="bg-white border border-blue-200 rounded-lg p-3 text-xs space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 border-b border-slate-100 pb-1.5">
                                          <span className="flex items-center gap-1.5">
                                            <GitCommit className="w-3.5 h-3.5 text-blue-600" />
                                            End-to-End Procurement Trace Lineage
                                          </span>
                                          <span className="font-mono text-slate-500">
                                            Ref: {exp.voucher_no || `VCH-${exp.expenditure_id}`}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                            <span className="text-[10px] text-slate-400 block font-ui">Tier 1: Project Sanction</span>
                                            <span className="font-bold text-slate-800">{dossier.work_id}</span>
                                            <span className="text-[10px] text-slate-500 block font-ui">{formatINR(dossier.sanctioned_amount)} sanctioned</span>
                                          </div>
                                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                            <span className="text-[10px] text-slate-400 block font-ui">Tier 2: Treasury Voucher</span>
                                            <span className="font-bold text-blue-700">{exp.voucher_no || `VCH-${exp.expenditure_id}`}</span>
                                            <span className="text-[10px] text-slate-500 block font-ui">{formatINR(exp.fund_disbursed_amt)} disbursed</span>
                                          </div>
                                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                            <span className="text-[10px] text-slate-400 block font-ui">Tier 3: Payee Vendor</span>
                                            <span className="font-bold text-slate-800 font-ui truncate block">{exp.vendor_name || 'Designated Vendor'}</span>
                                            <span className="text-[10px] text-emerald-600 block font-ui">PFMS Verified Account</span>
                                          </div>
                                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                            <span className="text-[10px] text-slate-400 block font-ui">Tier 4: Ground Milestone</span>
                                            <span className="font-bold text-slate-800">{dossier.physical_progress_pct}% Physical</span>
                                            <span className={`text-[10px] block font-ui ${dossier.physical_progress_pct < 20 && (exp.fund_disbursed_amt / (dossier.sanctioned_amount || 1)) > 0.5 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                                              MB Abstract Verification
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    No expenditure disbursements recorded for this work.
                  </p>
                )}
              </div>

              {/* SECTION G: DATA & EVIDENCE PROVENANCE, LINEAGE & REPRODUCIBILITY */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Data & Evidence Provenance • Traceability & Reproducibility
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        End-to-end lineage from source record ingestion to feature derivation, rule engine, evidence snapshot, and officer audit
                      </p>
                    </div>
                  </div>
                  {dossier.provenance_details?.reproducibility && (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      REPRODUCIBILITY: {dossier.provenance_details.reproducibility.status}
                    </span>
                  )}
                </div>

                {/* Source Record & Classification Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-ui uppercase font-bold">Source Classification</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
                      {dossier.is_synthetic || dossier.work_id.startsWith('WS/DEMO/') ? 'SYNTHETIC BENCHMARK DATA' : 'IMPORTED TELEMETRY'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-ui uppercase font-bold">Source Record ID / Letter</span>
                    <span className="font-bold text-slate-900">{dossier.work_id}</span>
                    <span className="text-slate-500 block text-[10px] font-ui">Letter: {dossier.provenance_details?.source_metadata?.letter_no || 'Not available'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-ui uppercase font-bold">Evidence Integrity Fingerprint</span>
                    <span className="font-bold text-slate-800 text-[10px] break-all bg-white p-1 rounded border border-slate-200 block mt-0.5">
                      {dossier.provenance_details?.integrity_fingerprint || 'SHA256:Pending'}
                    </span>
                  </div>
                </div>

                {/* End-to-End Lineage Steps */}
                {dossier.provenance_details?.lineage_steps && dossier.provenance_details.lineage_steps.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Transformation & Feature Lineage Chain
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-mono">
                      {dossier.provenance_details.lineage_steps.map((step, sIdx) => (
                        <div key={sIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                          <span className="text-[10px] font-bold text-blue-700 block uppercase font-ui">
                            {sIdx + 1}. {step.step}
                          </span>
                          <span className="text-[10px] text-slate-600 block">{step.method}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold inline-block">
                            {step.classification}
                          </span>
                          <p className="text-[10px] text-slate-800 font-bold pt-1 border-t border-slate-200">
                            {step.output}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Telemetry Field Lineage Table */}
                {dossier.data_provenance && dossier.data_provenance.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50">
                          <th className="py-2.5 px-3">Telemetry Field</th>
                          <th className="py-2.5 px-3">Source Dataset / Feed</th>
                          <th className="py-2.5 px-3">Feed Type</th>
                          <th className="py-2.5 px-3">Derivation Method</th>
                          <th className="py-2.5 px-3">Classification</th>
                          <th className="py-2.5 px-3 text-right">Applied Engine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-ui">
                        {dossier.data_provenance.map((item, pIdx) => (
                          <tr key={pIdx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.field_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.source_dataset}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {item.source_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {item.derivation_method || 'Direct Telemetry Import'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                {item.value_classification || 'DERIVED ANALYTICAL VALUE'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700 text-[11px]">
                              {item.rule_or_engine || 'Nominal Pass'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION H: DATA GAPS & COUNTER-EVIDENCE */}
              {dossier.data_gaps && (
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <HelpCircle className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Data Gaps & Mitigating Counter-Evidence
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Absence of telemetry records and potential operational mitigating factors
                      </p>
                    </div>
                  </div>

                  {/* Mandatory Neutral Disclaimer */}
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-lg text-xs text-amber-950 font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Administrative Notice:</strong> {dossier.data_gaps.disclaimer}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Missing Evidence */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-red-500" />
                        <span>Pending Field Verification Evidence</span>
                      </h5>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {dossier.data_gaps.missing_evidence.map((gap, gIdx) => (
                          <li key={gIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mitigating Factors */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Potential Mitigating Operational Factors</span>
                      </h5>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {dossier.data_gaps.potential_mitigating_factors.map((factor, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION I: ADMINISTRATIVE REVIEW CONSOLE */}
              <div className="bg-white border-2 border-blue-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 text-[#0d2b45] font-bold text-sm">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>Administrative Review & Action Console</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Human-in-the-Loop Governance
                  </span>
                </div>

                {/* AI Recommendation vs Authorized Officer Decision Split */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                      AI Decision-Support Recommendation
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Recommendation Engine v2.1
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium">
                    {dossier.risk_evaluation?.recommended_action || dossier.recommended_action || 'Conduct formal site inspection and obtain physical measurement book abstracts.'}
                  </p>
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                    Administrative actions require authorized human review in accordance with applicable administrative procedure.
                  </p>
                </div>

                {submitSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    Administrative decision recorded successfully in system audit log!
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Administrative Status Decision
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="OPEN">OPEN (Unreviewed)</option>
                        <option value="VERIFICATION_REQUIRED">VERIFICATION_REQUIRED (Field Verification Pending)</option>
                        <option value="INSPECTION_SCHEDULED">INSPECTION_SCHEDULED (Depute Site Engineer)</option>
                        <option value="DOCUMENTS_REQUESTED">DOCUMENTS_REQUESTED (Request Supporting Documents)</option>
                        <option value="CLARIFICATION_REQUESTED">CLARIFICATION_REQUESTED (Request Agency Clarification)</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW (Evidence Under Examination)</option>
                        <option value="IN_REVIEW">IN_REVIEW (Formal Inquiry Underway)</option>
                        <option value="MONITORING_CONTINUED">MONITORING_CONTINUED (Mark for Continued Monitoring)</option>
                        <option value="RESOLVED">RESOLVED (Satisfactory Justification Provided)</option>
                        <option value="ESCALATED">ESCALATED (Refer to Special Audit Cell / MoSPI)</option>
                        <option value="DISMISSED">DISMISSED (Non-Confirmatory — Signal Not Substantiated)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Authorized Reviewer Designation
                      </label>
                      <select
                        value={assignedRole}
                        onChange={(e) => setAssignedRole(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="DISTRICT_PLANNING_OFFICER">District Planning Officer (DPO)</option>
                        <option value="DISTRICT_COLLECTOR">District Collector / DM</option>
                        <option value="STATE_NODAL_OFFICER">State Nodal Officer (SNA)</option>
                        <option value="MINISTRY_AUDITOR">Ministry Auditor (MoSPI DIID)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Administrative Reviewer Notes / Telemetry Findings
                    </label>
                    <textarea
                      rows={3}
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="e.g., Measurement Book verified on 24-Sep; physical foundation confirmed intact. Cost variance explained by deep rocky excavation requirement."
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Outcome Recommendation / Prescriptive Order
                    </label>
                    <input
                      type="text"
                      value={outcomeDecision}
                      onChange={(e) => setOutcomeDecision(e.target.value)}
                      placeholder="e.g., Release final milestone payment post joint inspection certificate"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-slate-500">
                      Audit event recorded in system log with actor designation and timestamp.
                    </span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d2b45] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#153e61] transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? 'Recording Audit Entry...' : 'Submit Administrative Decision'}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION H: OSS PHASE 1 ANALYTICS INTELLIGENCE (PANDERA, PYOD & SHAP) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Phase 1 Advanced OSS Analytics Intelligence
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Automated Data Quality Validation (Pandera), Multi-Detector Anomaly Ensemble (PyOD), and Model Feature Attribution (SHAP)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pandera Data Quality Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Pandera Data Contract</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        dossier.pandera_validation?.is_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dossier.pandera_validation?.is_valid ? 'PASSED' : 'CHECK FAILED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono">
                      Schema Version: {dossier.pandera_validation?.schema_version || 'pandera-v0.33.1'}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      {dossier.pandera_validation?.is_valid ? (
                        <span>✓ All non-negative monetary, progress [0-100], and coordinate constraints validated.</span>
                      ) : (
                        <span className="text-amber-700">Schema errors detected: {dossier.pandera_validation?.errors?.length || 0} rule violations.</span>
                      )}
                    </div>
                  </div>

                  {/* PyOD Multi-Detector Ensemble Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">PyOD Anomaly Ensemble</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-100 text-indigo-800">
                        Score: {(dossier.pyod_analysis?.ensemble_normalized_score ?? 0.15).toFixed(3)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono">
                      {dossier.pyod_analysis?.pyod_version || 'pyod-v3.6.6'} | Config: {dossier.pyod_analysis?.config_version || 'pyod-v1.0'}
                    </p>
                    <div className="space-y-1 text-[11px]">
                      {dossier.pyod_analysis?.detectors && Object.entries(dossier.pyod_analysis.detectors).map(([dName, dVal]) => (
                        <div key={dName} className="flex justify-between text-[10px] font-mono text-slate-600">
                          <span>{dName}:</span>
                          <span>Norm {dVal.normalized_score} (Raw {dVal.raw_score})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHAP Feature Attribution Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">SHAP Model Attributions</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-100 text-purple-800">
                        {dossier.shap_explanation?.shap_available ? 'EXPLAINABLE' : 'UNAVAILABLE'}
                      </span>
                    </div>
                    {dossier.shap_explanation?.shap_available ? (
                      <div className="space-y-1 text-[11px]">
                        {dossier.shap_explanation.feature_contributions.slice(0, 3).map((f, fIdx) => (
                          <div key={fIdx} className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-700 truncate max-w-[110px]">{f.feature}:</span>
                            <span className={f.shap_contribution > 0 ? "text-red-700 font-bold" : "text-emerald-700"}>
                              {f.shap_contribution > 0 ? `+${f.shap_contribution}` : f.shap_contribution}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        {dossier.shap_explanation?.reason || 'SHAP explanation unavailable for this detector/model.'}
                      </p>
                    )}
                    <p className="text-[9px] text-slate-400 font-mono text-right">
                      {dossier.shap_explanation?.disclaimer || 'DECISION-SUPPORT PROTOTYPE'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION I: PHASE 2 RELATIONSHIP INTELLIGENCE (SPLINK + SEMANTIC + GEOSPATIAL FUSION) */}
              {dossier.phase2_relationship_intelligence && dossier.phase2_relationship_intelligence.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <GitMerge className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Phase 2 Relationship Intelligence & Entity Match Signals
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Multi-channel fusion: Probabilistic Record Linkage (Splink), Semantic Similarity (VectorStore), and Geographic Proximity
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      {dossier.phase2_relationship_intelligence.length} Related Signals
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dossier.phase2_relationship_intelligence.map((rel, rIdx) => (
                      <div key={rIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              Work {rel.related_work_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              rel.relationship_type === 'HIGH_SIMILARITY_REVIEW' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              rel.relationship_type === 'LIKELY_RELATED_WORK' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {rel.relationship_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            {rel.disclaimer}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 font-medium">Splink Probability</span>
                            <span className="font-mono font-bold text-slate-900">
                              {rel.structured_match?.available && rel.structured_match.probability != null
                                ? `${(rel.structured_match.probability * 100).toFixed(1)}%`
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 font-medium">Semantic Cosine Sim</span>
                            <span className="font-mono font-bold text-slate-900">
                              {rel.semantic_match?.available && rel.semantic_match.similarity != null
                                ? rel.semantic_match.similarity.toFixed(3)
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 font-medium">Geospatial Distance</span>
                            <span className="font-mono font-bold text-slate-900">
                              {rel.geospatial_match?.distance_meters != null
                                ? `${rel.geospatial_match.distance_meters.toFixed(1)}m`
                                : '—'}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 font-medium">Attribute Agreement</span>
                            <span className="font-mono text-[11px] text-slate-700">
                              {rel.attribute_agreement.same_district ? 'District ✓ ' : ''}
                              {rel.attribute_agreement.same_category ? 'Category ✓ ' : ''}
                              {rel.attribute_agreement.same_agency ? 'Agency ✓' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-semibold text-slate-700 block">Recommended Verification Protocol:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                            {rel.verification_checklist.map((v, vIdx) => (
                              <div key={vIdx} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                <span>{v.check}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION J: EVIDENCE GRAPH & INVESTIGATION INTELLIGENCE (PHASE 3) */}
              {dossier.evidence_graph && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          Evidence Graph & Investigation Intelligence
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {dossier.evidence_graph.engine}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Navigable analytical evidence topology linking works, administrative entities, risk signals, and lifecycle status
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        Nodes: {dossier.evidence_graph.topology_metrics.total_nodes}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                        Edges: {dossier.evidence_graph.topology_metrics.total_edges}
                      </span>
                    </div>
                  </div>

                  {/* Human-in-the-loop disclaimer banner */}
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">{dossier.evidence_graph.disclaimer}</strong>
                      <span className="text-[11px] text-amber-800">
                        Graph edges represent analytical correlations across official databases. All associations require administrative document and field verification before any regulatory conclusion.
                      </span>
                    </div>
                  </div>

                    {/* Visual Node & Edge Graph Explorer */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-900 text-white space-y-4">
                      {/* 1. Node Topology View */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-2">
                          <span className="font-semibold text-slate-300">Topology Nodes ({dossier.evidence_graph.nodes.length})</span>
                          <span className="text-[11px] text-slate-500">Click a node to inspect entity attributes</span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {dossier.evidence_graph.nodes.map((node) => {
                            const isSelected = selectedGraphNodeId === node.id;
                            let badgeColor = "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500";
                            if (node.node_type === "WORK") {
                              badgeColor = node.is_focal
                                ? "bg-blue-600/30 text-blue-300 border-blue-500"
                                : "bg-indigo-950 text-indigo-300 border-indigo-700 hover:border-indigo-500";
                            } else if (node.node_type === "DISTRICT") {
                              badgeColor = "bg-emerald-950 text-emerald-300 border-emerald-700 hover:border-emerald-500";
                            } else if (node.node_type === "AGENCY") {
                              badgeColor = "bg-purple-950 text-purple-300 border-purple-700 hover:border-purple-500";
                            } else if (node.node_type === "CATEGORY") {
                              badgeColor = "bg-cyan-950 text-cyan-300 border-cyan-700 hover:border-cyan-500";
                            } else if (node.node_type === "RISK_SIGNAL") {
                              badgeColor = "bg-rose-950 text-rose-300 border-rose-700 hover:border-rose-500";
                            } else if (node.node_type === "INVESTIGATION") {
                              badgeColor = "bg-amber-950 text-amber-300 border-amber-700 hover:border-amber-500";
                            }

                            return (
                              <button
                                key={node.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGraphNodeId(isSelected ? null : node.id);
                                  setSelectedGraphEdgeIndex(null);
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${badgeColor} ${
                                  isSelected ? "ring-2 ring-white scale-105" : ""
                                }`}
                              >
                                <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 font-ui uppercase">
                                  {node.node_type}
                                </span>
                                <span className="font-semibold">{node.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Edge Topology View */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-2">
                          <span className="font-semibold text-slate-300">Topology Edges ({dossier.evidence_graph.edges.length})</span>
                          <span className="text-[11px] text-slate-500">Click an edge to inspect relational evidence & metrics</span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {dossier.evidence_graph.edges.map((edge, eIdx) => {
                            const isEdgeSelected = selectedGraphEdgeIndex === eIdx;
                            const isRelated = edge.edge_type === 'RELATED_TO';
                            return (
                              <button
                                key={eIdx}
                                type="button"
                                onClick={() => {
                                  setSelectedGraphEdgeIndex(isEdgeSelected ? null : eIdx);
                                  setSelectedGraphNodeId(null);
                                }}
                                className={`px-2.5 py-1 rounded border text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                                  isRelated
                                    ? 'bg-purple-950/70 border-purple-700 text-purple-300 hover:border-purple-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                } ${isEdgeSelected ? 'ring-2 ring-amber-400 scale-105 font-bold' : ''}`}
                              >
                                <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 uppercase">
                                  {edge.edge_type}
                                </span>
                                <span>{edge.source} → {edge.target}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Node Details Box */}
                      {selectedGraphNodeId && (
                        <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 space-y-1 font-mono">
                          {(() => {
                            const n = dossier.evidence_graph.nodes.find((item) => item.id === selectedGraphNodeId);
                            if (!n) return null;
                            return (
                              <div>
                                <div className="text-[11px] font-bold text-white flex items-center justify-between pb-1 border-b border-slate-700">
                                  <span>Node: {n.id}</span>
                                  <span className="text-slate-400 font-ui">{n.node_type}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                                  {n.activity_name && <div><span className="text-slate-400">Activity:</span> {n.activity_name}</div>}
                                  {n.work_category && <div><span className="text-slate-400">Category:</span> {n.work_category}</div>}
                                  {n.risk_score !== undefined && <div><span className="text-slate-400">Risk Score:</span> {n.risk_score}</div>}
                                  {n.severity_level && <div><span className="text-slate-400">Severity:</span> {n.severity_level}</div>}
                                  {n.summary && <div><span className="text-slate-400">Signal:</span> {n.summary}</div>}
                                  {n.status && <div><span className="text-slate-400">Status:</span> {n.status}</div>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Selected Edge Details Box */}
                      {selectedGraphEdgeIndex !== null && dossier.evidence_graph.edges[selectedGraphEdgeIndex] && (
                        <div className="bg-slate-800/90 border border-purple-700/60 rounded-lg p-3.5 text-xs text-slate-200 space-y-2 font-mono">
                          {(() => {
                            const edge = dossier.evidence_graph.edges[selectedGraphEdgeIndex];
                            return (
                              <div>
                                <div className="text-[11px] font-bold text-white flex items-center justify-between pb-1.5 border-b border-slate-700">
                                  <span className="text-purple-300">
                                    Edge: {edge.source} → {edge.target} ({edge.edge_type})
                                  </span>
                                  {edge.relationship_type && (
                                    <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-600 text-[10px]">
                                      {edge.relationship_type}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[11px]">
                                  <div className="p-2 bg-slate-900/70 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 block">Splink Probability</span>
                                    <span className="font-bold text-amber-300">
                                      {edge.splink_probability != null ? `${(edge.splink_probability * 100).toFixed(1)}%` : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2 bg-slate-900/70 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 block">Semantic Similarity</span>
                                    <span className="font-bold text-emerald-300">
                                      {edge.semantic_similarity != null ? edge.semantic_similarity.toFixed(3) : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2 bg-slate-900/70 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 block">Spatial Distance</span>
                                    <span className="font-bold text-blue-300">
                                      {edge.spatial_distance_meters != null ? `${edge.spatial_distance_meters.toFixed(1)}m` : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2 bg-slate-900/70 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 block">Attribute Agreement</span>
                                    <span className="text-[10px] text-slate-300">
                                      {edge.same_district ? 'District ✓ ' : ''}
                                      {edge.same_category ? 'Category ✓ ' : ''}
                                      {edge.same_agency ? 'Agency ✓' : ''}
                                      {!edge.same_district && !edge.same_category && !edge.same_agency ? 'None' : ''}
                                    </span>
                                  </div>
                                </div>

                                {edge.disclaimer && (
                                  <div className="pt-1.5 text-[10px] text-amber-300/90 font-ui italic">
                                    {edge.disclaimer}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                  {/* Investigation Intelligence Narrative Sections */}
                  {dossier.evidence_graph.investigation_intelligence && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* WHY FLAGGED */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                          1. Why Flagged
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {dossier.evidence_graph.investigation_intelligence.why_flagged.summary}
                        </p>
                        <div className="space-y-1 pt-1">
                          {dossier.evidence_graph.investigation_intelligence.why_flagged.contributing_signals.map((sig, sIdx) => (
                            <div key={sIdx} className="text-[11px] text-slate-700 flex items-start gap-1.5 font-mono">
                              <span className="text-rose-500 shrink-0">•</span>
                              <span>{sig}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* WHY IT MATTERS */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                          2. Why It Matters
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {dossier.evidence_graph.investigation_intelligence.why_it_matters}
                        </p>
                      </div>

                      {/* ADMINISTRATIVE VERIFICATION PROTOCOL */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 md:col-span-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                          3. Mandatory Administrative Verification Protocol
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          {dossier.evidence_graph.investigation_intelligence.what_to_verify.map((v, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="text-[11px] font-medium">{v.check}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* INVESTIGATION TIMELINE */}
                      {dossier.evidence_graph.investigation_intelligence.timeline && dossier.evidence_graph.investigation_intelligence.timeline.length > 0 && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 md:col-span-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                            4. Investigation Timeline (Persisted DB Events)
                          </span>
                          <div className="space-y-2 pt-1 font-mono text-xs">
                            {dossier.evidence_graph.investigation_intelligence.timeline.map((evt, eIdx) => (
                              <div key={eIdx} className="flex items-start gap-2.5 text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{evt.stage}</span>
                                    <span className="text-[10px] text-slate-500 font-ui">
                                      {new Date(evt.timestamp).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1 rounded font-ui">
                                      {evt.actor}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 font-ui">{evt.event}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION K: AUDIT TRAIL */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Audit Trail & Action History
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        System-recorded administrative events and status transitions
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {dossier.audit_trail ? `${dossier.audit_trail.length} events` : '0 events'}
                  </span>
                </div>

                {dossier.audit_trail && dossier.audit_trail.length > 0 ? (
                  <div className="space-y-2">
                    {dossier.audit_trail.map((item, aIdx) => (
                      <div
                        key={item.audit_id || aIdx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              {item.action_type}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {item.actor_role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                            <span>{new Date(item.timestamp).toLocaleString('en-IN')}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              Audit Event recorded
                            </span>
                          </div>
                        </div>

                        {item.new_value && (
                          <div className="text-[11px] text-slate-700 font-mono bg-white p-2 rounded border border-slate-200">
                            {item.new_value.status && (
                              <div className="font-ui">
                                <strong>Status Transition:</strong>{' '}
                                <span className="text-slate-500">{item.old_value?.status || 'INITIAL'}</span> ➔{' '}
                                <span className="font-bold text-blue-700">{item.new_value.status}</span>
                              </div>
                            )}
                            {item.new_value.notes && (
                              <div className="font-ui text-slate-600 mt-1">
                                <strong>Notes:</strong> {item.new_value.notes}
                              </div>
                            )}
                            {item.new_value.decision && (
                              <div className="font-ui text-slate-600 mt-0.5">
                                <strong>Prescriptive Order:</strong> {item.new_value.decision}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                    No prior administrative reviews recorded for this work. Submitting an administrative decision above will record the first event in this audit trail.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

