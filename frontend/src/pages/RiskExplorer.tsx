import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Building,
} from 'lucide-react';
import { api } from '../services/api';
import type { WorkItem, AnomalyItem } from '../services/types';
import { SeverityBadge, ScoreBadge, DataSourceBadge, StatusPill } from '../components/common/RiskBadge';

interface RiskExplorerProps {
  selectedHouse: string;
  datasetMode: 'ALL' | 'REAL' | 'SYNTHETIC';
  onOpenDossier: (workId: string) => void;
}

export const RiskExplorer: React.FC<RiskExplorerProps> = ({
  selectedHouse,
  datasetMode,
  onOpenDossier,
}) => {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 25;

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState('risk_desc');
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    loadWorks();
  }, [page, searchQuery, selectedSeverity, selectedCategory, selectedStatus, selectedState, sortBy, selectedHouse, datasetMode]);

  const loadStates = async () => {
    try {
      const st = await api.getStates();
      setStates(st);
    } catch (err) {
      console.error('Failed to load states:', err);
    }
  };

  const loadWorks = async () => {
    try {
      setLoading(true);
      const isSyntheticParam =
        datasetMode === 'REAL' ? false : datasetMode === 'SYNTHETIC' ? true : undefined;

      const { items, total } = await api.getWorks({
        skip: page * limit,
        limit,
        house: selectedHouse !== 'ALL' ? selectedHouse : undefined,
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        sort_by: sortBy,
        state_id: selectedState,
        is_synthetic: isSyntheticParam,
      });

      setWorks(items);
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to load works:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatLakhs = (val?: number) => {
    if (val === undefined || val === null) return '₹0L';
    return `₹${(val / 100000).toFixed(2)}L`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Triage Summary */}
      <div className="border-b border-slate-200/90 pb-5 pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-ui">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Central Sector Portfolio Explorer
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-600 font-medium">Predictive Risk &amp; Overrun Matrix</span>
          </div>
          <h2 className="font-display text-3xl font-normal text-slate-900 tracking-tight">
            Infrastructure Project Risk Explorer &amp; Inventory
          </h2>
          <p className="font-secondary text-xs text-slate-600 mt-1">
            Granular inspection of monitored projects, predictive cost/schedule overruns, and milestone telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 font-ui">
          <button
            onClick={() => {
              setPage(0);
              loadWorks();
            }}
            className="px-3 py-1.5 border border-slate-200 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium flex items-center gap-1.5 bg-white"
            title="Refresh Works Grid"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Grid</span>
          </button>
        </div>
      </div>

        {/* Multi-Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Work ID, title, MP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value);
                setPage(0);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Severity Levels</option>
              <option value="CRITICAL">Critical (80–100)</option>
              <option value="HIGH">High Risk (65–79)</option>
              <option value="MEDIUM">Moderate (40–64)</option>
              <option value="LOW">Low Risk (0–39)</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <select
              value={selectedState || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                setSelectedState(val);
                setPage(0);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="">All States & UTs</option>
              {states.map((st) => (
                <option key={st.state_id} value={st.state_id}>
                  {st.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="ALL">All Categories</option>
              <option value="Normal/Others">Normal / Others</option>
              <option value="Repair and Renovation">Repair & Renovation</option>
              <option value="Trust and Society">Trust and Society</option>
            </select>
          </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(0);
                }}
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="ALL">All Execution Statuses</option>
                <option value="Sanctioned">Sanctioned</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Stalled">Stalled</option>
              </select>
            </div>
          </div>

      {/* Table Header: Records Count and Sorting Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-900">{works.length}</span> of{' '}
          <span className="font-bold text-slate-900">{totalCount}</span> records
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(0);
            }}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="risk_desc">Risk score (high to low)</option>
            <option value="risk_asc">Risk score (low to high)</option>
            <option value="days_desc">Execution age (oldest first)</option>
            <option value="amount_desc">Sanctioned amount (highest first)</option>
            <option value="progress_asc">Physical progress (lowest first)</option>
            <option value="progress_desc">Physical progress (highest first)</option>
          </select>
        </div>
      </div>

      {/* Main Works Grid Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Project ID &amp; Sector</th>
                <th className="py-3 px-4">Project Scope Description</th>
                <th className="py-3 px-4">Location &amp; Nodal Agency</th>
                <th className="py-3 px-4">Approved Cost</th>
                <th className="py-3 px-4">Physical Progress</th>
                <th className="py-3 px-4">Early Warning Signal</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading works telemetry...</span>
                  </td>
                </tr>
              ) : works.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    No matching MPLADS works found for the selected filters.
                  </td>
                </tr>
              ) : (
                works.map((work) => (
                  <tr
                    key={work.work_id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onOpenDossier(work.work_id)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono font-bold text-[11px] text-slate-900 group-hover:text-blue-600">
                          {work.work_id}
                        </span>
                        <DataSourceBadge isSynthetic={work.is_synthetic} />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {work.work_category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="font-semibold text-slate-800 truncate" title={work.activity_name}>
                        {work.activity_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate" title={work.work_description}>
                        {work.work_description}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{work.district_name}, {work.state_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {work.mp_name} ({work.house === 'LOK_SABHA' ? 'LS' : 'RS'})
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatLakhs(work.sanctioned_amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              work.physical_progress_pct === 100
                                ? 'bg-emerald-500'
                                : work.physical_progress_pct > 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${work.physical_progress_pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-700">
                          {work.physical_progress_pct}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{work.work_status}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[190px]">
                      {work.primary_trigger_factor ? (
                        <span
                          className="inline-block text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded truncate max-w-full"
                          title={work.primary_trigger_factor}
                        >
                          {work.primary_trigger_factor}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Within normal parameters</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <ScoreBadge score={work.composite_risk_score ?? 0} />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossier(work.work_id);
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-[#0d2b45] hover:text-white hover:border-[#0d2b45] transition-all shadow-2xs"
                      >
                        Explain
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing Page <strong>{page + 1}</strong> of <strong>{Math.max(1, Math.ceil(totalCount / limit))}</strong> ({works.length} of {totalCount} records)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2 font-bold">{page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={works.length < limit || (page + 1) * limit >= totalCount}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
