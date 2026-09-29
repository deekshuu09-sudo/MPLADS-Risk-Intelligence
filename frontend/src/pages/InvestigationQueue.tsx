import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Building,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ArrowUpDown,
  FileCheck,
  XCircle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import type { InvestigationQueueItem } from '../services/types';
import { SeverityBadge, ScoreBadge, DataSourceBadge, StatusPill } from '../components/common/RiskBadge';

interface InvestigationQueueProps {
  onOpenDossier: (workId: string) => void;
  datasetMode: 'ALL' | 'REAL' | 'SYNTHETIC';
}

export const InvestigationQueue: React.FC<InvestigationQueueProps> = ({
  onOpenDossier,
  datasetMode,
}) => {
  const [queue, setQueue] = useState<InvestigationQueueItem[]>([]);
  const [allQueue, setAllQueue] = useState<InvestigationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Sort States
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [signalFilter, setSignalFilter] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('risk_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [selectedStatus, severityFilter, selectedState, signalFilter, sortBy, datasetMode]);

  const loadStates = async () => {
    try {
      const st = await api.getStates();
      setStates(st);
    } catch (err) {
      console.error('Failed to load states for queue:', err);
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      const isSyntheticParam =
        datasetMode === 'REAL' ? false : datasetMode === 'SYNTHETIC' ? true : undefined;

      // Always fetch the baseline unstatused queue to keep tab counts accurate across lifecycle
      const [allData, filteredData] = await Promise.all([
        api.getInvestigationQueue({
          severity: severityFilter !== 'ALL' ? severityFilter : undefined,
          state_id: selectedState,
          primary_signal: signalFilter !== 'ALL' ? signalFilter : undefined,
          sort_by: sortBy,
          is_synthetic: isSyntheticParam,
        }),
        selectedStatus !== 'ALL'
          ? api.getInvestigationQueue({
              status: selectedStatus,
              severity: severityFilter !== 'ALL' ? severityFilter : undefined,
              state_id: selectedState,
              primary_signal: signalFilter !== 'ALL' ? signalFilter : undefined,
              sort_by: sortBy,
              is_synthetic: isSyntheticParam,
            })
          : Promise.resolve(null),
      ]);

      setAllQueue(allData);
      setQueue(filteredData !== null ? filteredData : allData);
    } catch (err) {
      console.error('Failed to load investigation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter(
      (item) =>
        item.work_id.toLowerCase().includes(q) ||
        item.activity_name.toLowerCase().includes(q) ||
        item.district_name.toLowerCase().includes(q) ||
        item.state_name.toLowerCase().includes(q) ||
        item.assigned_role.toLowerCase().includes(q) ||
        item.primary_signal.toLowerCase().includes(q)
    );
  }, [queue, searchQuery]);

  const countByStatus = (status: string) => {
    return allQueue.filter((i) => i.status.toUpperCase() === status.toUpperCase()).length;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Administrative Oversight • Operational Case Management
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Field Inspection & Anomaly Verification Queue
          </h2>
          <p className="text-xs text-slate-500">
            Lifecycle tracking of works requiring review (Composite Risk Score ≥ 20.0 or active case records: {queue.length} total cases)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadQueue}
            className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1.5"
            title="Refresh Queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Priority Guardrail Notice */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-blue-900 block text-xs">
            Analytical Priority for Verification
          </span>
          <p className="text-blue-850 leading-relaxed text-[11px]">
            Risk scores and severity levels establish administrative priority for physical field inspection. They do not constitute findings of wrongdoing. Final determinations require authorized officer review and recorded verification.
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'All Cases', count: queue.length },
          { id: 'VERIFICATION_REQUIRED', label: 'Verification Required', count: countByStatus('VERIFICATION_REQUIRED') },
          { id: 'OPEN', label: 'Open (Unreviewed)', count: countByStatus('OPEN') },
          { id: 'INSPECTION_SCHEDULED', label: 'Site Inspection', count: countByStatus('INSPECTION_SCHEDULED') },
          { id: 'UNDER_REVIEW', label: 'Under Review', count: countByStatus('UNDER_REVIEW') },
          { id: 'IN_REVIEW', label: 'In Review', count: countByStatus('IN_REVIEW') },
          { id: 'RESOLVED', label: 'Resolved', count: countByStatus('RESOLVED') },
          { id: 'DISMISSED', label: 'Dismissed', count: countByStatus('DISMISSED') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              selectedStatus === tab.id
                ? 'bg-[#0d2b45] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedStatus === tab.id
                  ? 'bg-[#19466e] text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Advanced Filter Bar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Work ID, location, signal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-600 font-medium">Risk:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>

          {/* Primary Signal Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-600 font-medium">Signal:</span>
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Signals</option>
              <option value="COMPLETION">Completion Lag</option>
              <option value="THRESHOLD">Threshold Clustering</option>
              <option value="DISBURSEMENT">Progress/Disbursement Gap</option>
              <option value="VENDOR">Vendor Monopoly</option>
              <option value="OUTLIER">Cost Outlier</option>
            </select>
          </div>

          {/* State Filter */}
          <select
            value={selectedState || ''}
            onChange={(e) => setSelectedState(e.target.value ? Number(e.target.value) : undefined)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States / UTs</option>
            {states.map((s) => (
              <option key={s.state_id} value={s.state_id}>
                {s.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600 font-medium">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-blue-500"
          >
            <option value="risk_desc">Highest Risk Score</option>
            <option value="oldest_unresolved">Oldest Unresolved</option>
            <option value="recently_updated">Recently Updated</option>
            <option value="financial_exposure">Highest Financial Exposure</option>
            <option value="completion_lag">Longest Completion Lag</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading investigation cases from database...</span>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h4 className="text-sm font-bold text-slate-700">No Investigation Cases Found</h4>
          <p className="text-xs text-slate-400 mt-1">
            No records match the current filter criteria or status queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueue.map((item) => (
            <div
              key={item.investigation_id}
              className={`bg-white border rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.status === 'DISMISSED' ? 'opacity-75 bg-slate-50/80 border-slate-200' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2 flex-1">
                {/* Header Tag Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.work_id}
                  </span>
                  <DataSourceBadge isSynthetic={item.is_synthetic} />
                  <StatusPill status={item.status} />
                  <SeverityBadge severity={item.severity_level} size="sm" />
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.days_elapsed}d elapsed
                  </span>
                </div>

                {/* Work Title & Location */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.activity_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: <strong className="text-slate-700">{item.work_category}</strong> • Location: <strong className="text-slate-700">{item.district_name}, {item.state_name}</strong> • Assigned Role: <strong className="text-blue-900">{item.assigned_role}</strong>
                  </p>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Sanction Amount</span>
                    <span className="font-bold text-slate-800">₹{(item.sanctioned_amount / 100000).toFixed(2)}L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Physical Progress</span>
                    <span className="font-bold text-slate-800">{item.physical_progress_pct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Queue Status</span>
                    <span className="font-bold text-blue-900">{item.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Days in Queue</span>
                    <span className="font-bold text-slate-700">{item.days_in_review} days</span>
                  </div>
                </div>

                {/* Primary Signal Summary */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Primary Risk Signal Summary:</span>
                  <p className="text-[11px] text-slate-800 font-medium leading-tight">{item.primary_signal}</p>
                </div>

                {/* Latest Reviewer Notes if available */}
                {item.reviewer_notes && (
                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200 text-xs text-slate-800">
                    <span className="text-[10px] uppercase font-bold text-blue-900 block mb-0.5">
                      Latest Administrative Decision & Notes
                    </span>
                    <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-700">
                      {item.reviewer_notes}
                    </p>
                    {item.outcome_decision && (
                      <div className="mt-1 pt-1 border-t border-blue-200 font-semibold text-[11px] text-blue-900">
                        Prescriptive Outcome: {item.outcome_decision}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Score & Action Button */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Risk Score</span>
                  <ScoreBadge score={item.composite_risk_score} showBar={false} />
                </div>

                <button
                  onClick={() => onOpenDossier(item.work_id)}
                  className="px-4 py-2 bg-[#0d2b45] text-white font-bold rounded-lg text-xs hover:bg-[#1a4163] transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <span>Review Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvestigationQueue;
