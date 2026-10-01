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
  selectedHouse?: string;
}

export const InvestigationQueue: React.FC<InvestigationQueueProps> = ({
  onOpenDossier,
  datasetMode,
  selectedHouse,
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
  }, [selectedStatus, severityFilter, selectedState, signalFilter, sortBy, datasetMode, selectedHouse]);

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
      const houseParam = selectedHouse && selectedHouse !== 'ALL' ? selectedHouse : undefined;

      // Always fetch the baseline unstatused queue to keep tab counts accurate across lifecycle
      const [allData, filteredData] = await Promise.all([
        api.getInvestigationQueue({
          house: houseParam,
          severity: severityFilter !== 'ALL' ? severityFilter : undefined,
          state_id: selectedState,
          primary_signal: signalFilter !== 'ALL' ? signalFilter : undefined,
          sort_by: sortBy,
          is_synthetic: isSyntheticParam,
        }),
        selectedStatus !== 'ALL'
          ? api.getInvestigationQueue({
              house: houseParam,
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
      <div className="border-b border-slate-200/90 pb-5 pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-ui">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Project Execution Surveillance
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-600 font-medium">Early Warning &amp; Milestone Intervention Grid</span>
          </div>
          <h2 className="font-display text-3xl font-normal text-slate-900 tracking-tight">
            Early Warning &amp; Escalation Queue
          </h2>
          <p className="font-secondary text-xs text-slate-600 mt-1">
            Predictive tracking of infrastructure projects exhibiting cost escalation, schedule delays, or milestone slippage (<span className="font-data font-semibold text-slate-800">{queue.length}</span> active project warnings)
          </p>
        </div>

        <div className="flex items-center gap-2 font-ui">
          <button
            onClick={loadQueue}
            className="px-3 py-1.5 border border-slate-200 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium flex items-center gap-1.5 bg-white"
            title="Refresh Queue"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Priority Guardrail Notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-ui font-semibold text-slate-900 block text-xs">
            Analytical Priority for Administrative Verification
          </span>
          <p className="font-secondary text-slate-600 leading-relaxed text-xs">
            Risk scores and severity levels establish administrative priority for physical field inspection. They do not constitute findings of wrongdoing. Final determinations require authorized officer review and recorded verification.
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2.5 font-ui">
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
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all ${
              selectedStatus === tab.id
                ? 'bg-[#0d2b45] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-data font-semibold ${
                selectedStatus === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
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
        <div className="space-y-3 font-ui">
          {filteredQueue.map((item) => (
            <div
              key={item.investigation_id}
              className={`bg-white border rounded-md p-4.5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.status === 'DISMISSED' ? 'opacity-70 bg-slate-50 border-slate-200' : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2 flex-1">
                {/* Header Tag Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-data font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.work_id}
                  </span>
                  <DataSourceBadge isSynthetic={item.is_synthetic} />
                  <StatusPill status={item.status} />
                  <SeverityBadge severity={item.severity_level} size="sm" />
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-secondary">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.days_elapsed}d elapsed
                  </span>
                </div>

                {/* Work Title & Location */}
                <div>
                  <h3 className="font-ui text-sm font-bold text-slate-900 leading-snug">{item.activity_name}</h3>
                  <p className="font-secondary text-xs text-slate-600 mt-0.5">
                    Category: <span className="font-ui font-medium text-slate-800">{item.work_category}</span> • Location: <span className="font-ui font-medium text-slate-800">{item.district_name}, {item.state_name}</span> • Role: <span className="font-ui font-medium text-slate-800">{item.assigned_role}</span>
                  </p>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/70 p-2 rounded border border-slate-200/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Approved Cost</span>
                    <span className="font-data font-bold text-slate-800">₹{(item.sanctioned_amount / 100000).toFixed(2)}L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Physical Progress</span>
                    <span className="font-data font-bold text-slate-800">{item.physical_progress_pct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Schedule Forecast</span>
                    <span className={`font-ui font-semibold ${
                      item.forecast_delay_months && item.forecast_delay_months > 0
                        ? 'text-red-600'
                        : item.schedule_forecast_status === 'STALLED_ZERO_PROGRESS'
                        ? 'text-amber-700'
                        : 'text-slate-800'
                    }`}>
                      {item.forecast_delay_months && item.forecast_delay_months > 0
                        ? `+${item.forecast_delay_months}m Delay`
                        : item.schedule_forecast_status === 'STALLED_ZERO_PROGRESS'
                        ? 'Zero Progress'
                        : item.schedule_forecast_status === 'EARLY_STAGE'
                        ? 'Early Stage'
                        : item.schedule_forecast_status === 'INSUFFICIENT_EVIDENCE'
                        ? 'Insufficient Data'
                        : 'On Track'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Days in Review</span>
                    <span className="font-data font-bold text-slate-700">{item.days_in_review} days</span>
                  </div>
                </div>

                {/* Primary Signal Summary */}
                <div className="bg-slate-50/40 p-2 rounded border border-slate-200/70 text-xs">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5 font-ui">Primary Early Warning Signal:</span>
                  <p className="text-xs text-slate-800 font-secondary leading-snug">{item.primary_signal}</p>
                </div>

                {/* Latest Reviewer Notes if available */}
                {item.reviewer_notes && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs text-slate-800 font-secondary">
                    <span className="text-[10px] uppercase font-semibold text-slate-700 block mb-0.5 font-ui">
                      Latest Administrative Notes
                    </span>
                    <p className="whitespace-pre-line text-xs text-slate-700 leading-relaxed">
                      {item.reviewer_notes}
                    </p>
                    {item.outcome_decision && (
                      <div className="mt-1 pt-1 border-t border-slate-200 font-medium text-[11px] text-slate-900 font-ui">
                        Recorded Outcome: {item.outcome_decision}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Score & Action Button */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Risk Score</span>
                  <ScoreBadge score={item.composite_risk_score} showBar={false} />
                </div>

                <button
                  onClick={() => onOpenDossier(item.work_id)}
                  className="px-3.5 py-1.5 bg-[#0d2b45] text-white font-medium rounded text-xs hover:bg-[#153a5c] transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>Open Dossier</span>
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
