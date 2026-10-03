import React, { useState, useEffect } from 'react';
import {
  Building2,
  Coins,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  Sparkles,
  Info,
  MapPin,
  Layers,
  Activity,
  ArrowUpRight,
  CheckSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import type {
  ExecutiveOverviewAnalytics,
  AnomalyItem,
} from '../services/types';
import { StatCard } from '../components/common/StatCard';
import { ScoreBadge, DataSourceBadge } from '../components/common/RiskBadge';

interface OverviewDashboardProps {
  selectedHouse: string;
  datasetMode: 'ALL' | 'REAL' | 'SYNTHETIC';
  onOpenDossier: (workId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

const ENGINE_COLOR_MAP: Record<string, string> = {
  "Tender Threshold Splitting": "#dc2626",
  "Near-Duplicate Geo-Spatial Proximity": "#ea580c",
  "Severe Cost & Scope Outliers": "#d97706",
  "Advance Disbursal Overpayment": "#0284c7",
  "Chronic Completion & Statutory Lag": "#4f46e5",
  "Vendor Disbursal Concentration": "#7c3aed",
  "Non-Governmental Trust Cap Exceeded": "#c026d3",
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  selectedHouse,
  datasetMode,
  onOpenDossier,
  onNavigateToTab,
}) => {
  const [analytics, setAnalytics] = useState<ExecutiveOverviewAnalytics | null>(null);
  const [topAnomalies, setTopAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedHouse, datasetMode]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const isSyntheticParam =
        datasetMode === 'REAL' ? false : datasetMode === 'SYNTHETIC' ? true : undefined;
      const houseParam = selectedHouse !== 'ALL' ? selectedHouse : undefined;
      // In benchmark demonstration mode, show synthetic archetypes; in portfolio view (REAL or ALL), show operational portfolio works
      const anomalySyntheticFilter = datasetMode === 'SYNTHETIC' ? true : false;

      const [analyticsRes, anomRes] = await Promise.all([
        api.getExecutiveOverviewAnalytics({ house: houseParam, is_synthetic: isSyntheticParam }),
        api.getAnomalies({ limit: 5, is_synthetic: anomalySyntheticFilter }),
      ]);

      setAnalytics(analyticsRes);
      setTopAnomalies(anomRes);
    } catch (err: any) {
      console.error('Failed to load executive analytics data:', err);
      setError('Programme analytics unavailable. Please check server status or retry.');
    } finally {
      setLoading(false);
    }
  };

  const formatCr = (val?: number) => {
    if (val === undefined || val === null) return '₹0 Cr';
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Loading programme analytics…</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center my-8">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900 mb-1">Programme Analytics Unavailable</h3>
        <p className="text-xs text-red-700 max-w-md mx-auto mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Loading Analytics
        </button>
      </div>
    );
  }

  const kpis = analytics.kpis;
  const signalOverlap = analytics.signal_overlap;
  const pipeline = analytics.investigation_pipeline;
  const scope = analytics.scope;

  return (
    <div className="space-y-8">
      {/* 1. TOP EXECUTIVE CONTEXT HEADER & SCOPE BADGE */}
      <div className="border-b border-slate-200/90 pb-6 pt-2">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2 font-ui">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Central Sector Portfolio Surveillance
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-600 font-medium">MoSPI IPMD / PAIMANA Analytical Framework</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 leading-tight">
              Predictive Infrastructure Project Intelligence &amp; Early Warning System
            </h2>
            <p className="font-secondary text-sm text-slate-600 mt-2.5 leading-relaxed">
              Integrated predictive surveillance platform analyzing {kpis.total_works_analysed} Central Sector Infrastructure Projects. Identifies emerging cost escalation, milestone schedule overruns, and implementation bottlenecks across infrastructure sectors.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 font-ui text-xs text-slate-600 border-l sm:border-l-0 sm:border-r-0 border-slate-200 pl-4 sm:pl-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider">
                {datasetMode === 'SYNTHETIC' ? 'BENCHMARK DEMONSTRATION MODE' : datasetMode === 'REAL' ? 'PORTFOLIO DATASET' : 'ALL RECORDS (DEMONSTRATION)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-secondary">
              Monitored: <span className="font-ui font-semibold text-slate-800">{scope?.total_records} Projects</span> | Early Warnings: <span className="font-ui font-semibold text-slate-800">{scope?.flagged_records}</span> (Risk Score ≥ {scope?.min_flagged_score})
            </div>
            <div className="text-[10px] text-slate-400 font-secondary">
              Analysis snapshot: {scope?.generated_at}
            </div>
          </div>
        </div>

        {/* PRIMARY OPERATIONAL ACTION & BENCHMARK DEMO STRIP */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-ui">
            <button
              onClick={() => onNavigateToTab('investigations')}
              className="px-3.5 py-1.5 bg-[#0d2b45] text-white rounded text-xs font-semibold hover:bg-[#153a5c] transition-colors flex items-center gap-1.5"
            >
              <span>Early Warning Queue ({pipeline.total_unresolved} Requiring Action)</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <button
              onClick={() => onNavigateToTab('explorer')}
              className="px-3.5 py-1.5 bg-white text-slate-700 rounded text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Project Risk Explorer</span>
            </button>
            <button
              onClick={() => onNavigateToTab('geospatial')}
              className="px-3.5 py-1.5 bg-white text-slate-700 rounded text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Geospatial Project Map</span>
            </button>
          </div>

          {/* Demo Case Walkthrough Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-ui text-xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Archetype Walkthrough:
            </span>
            <button
              onClick={() => onOpenDossier('WS/DEMO/2025/101')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              title="Launch Benchmark Case: Schedule Overrun & Milestone Stall (Score 61 HIGH)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Project 101 (Schedule Overrun • 61 HIGH)</span>
            </button>
            <button
              onClick={() => onOpenDossier('WS/DEMO/2025/801')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors"
              title="Launch Safeguard Counterexample: Spatial Proximity Counterexample (801 ↔ 802 No Relationship)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>Project 801 (Proximity Safeguard • Counterexample)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MACRO EXECUTIVE KPI STRIP (4 RECONCILED CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Infrastructure Projects"
          value={kpis.total_works_analysed.toLocaleString('en-IN')}
          subtitle={`₹${(kpis.total_sanctioned_amount_inr / 10000000).toFixed(2)} Cr Approved Cost`}
          badge="Central Sector Scope"
          badgeColor="text-slate-700 bg-slate-50 border-slate-200"
          footer="Cumulative infrastructure projects monitored across sectors"
        />

        <StatCard
          title="Active Early Warning Signals"
          value={kpis.flagged_works_count.toLocaleString('en-IN')}
          subtitle={`${kpis.flagged_percentage.toFixed(1)}% Early Warning Rate`}
          badge={`Approved Cost in Early-Warning Cases: ₹${(kpis.flagged_sanctioned_amount_inr / 10000000).toFixed(2)} Cr`}
          badgeColor="text-amber-900 bg-amber-50/80 border-amber-200"
          footer="Flagged for administrative intervention (Risk Score ≥ 30)"
        />

        <StatCard
          title="Cumulative Expenditure"
          value={formatCr(kpis.total_disbursed_amount_inr)}
          subtitle={`Disbursed in Flagged Works: ₹${(kpis.flagged_disbursed_amount_inr / 10000000).toFixed(2)} Cr`}
          badge="Treasury / PFMS Tracked"
          badgeColor="text-slate-700 bg-slate-50 border-slate-200"
          footer="Cumulative financial utilization tracked across milestone vouchers"
        />

        <StatCard
          title="Projects Requiring Intervention"
          value={pipeline.total_unresolved.toLocaleString('en-IN')}
          subtitle={`Urgent Verification: ${pipeline.verification_required}`}
          badge="Pending Review"
          badgeColor="text-slate-700 bg-slate-50 border-slate-200"
          footer="Active early warnings in IPMD / Monitoring Officer review queue"
        />
      </div>

      {/* 3. ANALYTICAL PRIORITIES BRIEFING */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="font-display text-xl font-normal text-slate-900 tracking-tight">
              Analytical Priorities
            </h3>
            <p className="font-secondary text-xs text-slate-500 mt-0.5">
              Highest-priority signals requiring administrative review
            </p>
          </div>
          <span className="font-ui text-xs text-slate-400 font-medium">{analytics.executive_insights.length} Active Directives</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {analytics.executive_insights.map((card) => (
            <div
              key={card.insight_id}
              className={`rounded-md border p-5 flex flex-col justify-between transition-colors bg-white ${
                card.severity === 'CRITICAL'
                  ? 'border-red-200/90'
                  : card.severity === 'HIGH'
                  ? 'border-amber-200/90'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-[10px] font-ui font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      card.severity === 'CRITICAL'
                        ? 'bg-red-50 text-red-900 border border-red-200'
                        : card.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {card.severity} Priority
                  </span>
                  <span className="font-ui text-[11px] text-slate-500">{card.category}</span>
                </div>
                <h4 className="font-ui text-sm font-bold text-slate-900 mb-2 leading-snug">{card.title}</h4>
                <div className="font-secondary text-xs text-slate-600 space-y-2 mb-4 leading-relaxed">
                  <p><span className="font-ui font-semibold text-slate-800">Pattern:</span> {card.observed_pattern}</p>
                  <p><span className="font-ui font-semibold text-slate-800">Evidence:</span> {card.evidence_summary}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="font-secondary text-xs text-slate-700 mb-3 leading-relaxed">
                  <span className="font-ui font-semibold text-slate-900 block mb-0.5">Suggested Verification Action:</span>
                  {card.recommended_action}
                </div>

                <div className="flex items-center justify-between text-xs font-ui pt-1">
                  <span className="font-data text-slate-600 text-xs font-semibold">
                    {card.affected_works_count} Works {card.affected_amount_cr > 0 ? `(₹${card.affected_amount_cr} Cr)` : ''}
                  </span>
                  {card.affected_works_count > 0 && (
                    <button
                      onClick={() => onNavigateToTab('investigations')}
                      className="px-2.5 py-1 bg-[#0d2b45] text-white rounded text-[11px] font-medium hover:bg-[#153a5c] flex items-center gap-1 transition-colors"
                    >
                      <span>Investigate</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. SIGNAL ENGINE BREAKDOWN & SIGNAL OVERLAP MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signal Engine Distribution (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Detection Engine Signal Distribution & Exposure</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Breakdown of analytical triggers across 7 specialized anomaly engines
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('explorer')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Risk Explorer <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.signal_engines}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 155, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'dataMax + 5']} />
                  <YAxis
                    dataKey="engine_name"
                    type="category"
                    tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                    width={150}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} works flagged`, 'Signal Count']}
                    contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="triggered_count" radius={[0, 4, 4, 0]}>
                    {analytics.signal_engines.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ENGINE_COLOR_MAP[entry.engine_name] || '#0d2b45'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Engine triggers represent independent diagnostic passes; single works may trigger multiple engines.</span>
            </span>
          </div>
        </div>

        {/* Signal Overlap Matrix (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Multi-Signal Overlap Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Signal overlap correlation indicating risk score escalation
            </p>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800">Single Signal Cases</span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {signalOverlap.single_signal_count} works
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${(signalOverlap.single_signal_count / kpis.flagged_works_count) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Isolated Engine Trigger</span>
                  <span className="font-bold text-blue-700">Mean Score: {signalOverlap.avg_score_single_signal}/100</span>
                </div>
              </div>

              <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-900">Dual Signal Overlap</span>
                  <span className="text-xs font-mono font-bold text-amber-900">
                    {signalOverlap.dual_signal_count} works
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${(signalOverlap.dual_signal_count / kpis.flagged_works_count) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800 font-mono">
                  <span>{signalOverlap.dual_signal_count > 0 ? "2 Engine Co-occurrences" : "No dual-engine overlap detected"}</span>
                  <span className="font-bold text-amber-800">
                    {signalOverlap.dual_signal_count > 0 ? `Mean Score: ${signalOverlap.avg_score_dual_signal}/100` : "N/A"}
                  </span>
                </div>
              </div>

              <div className="bg-red-50/80 rounded-xl p-3.5 border border-red-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-red-900">Multi-Signal Overlap (3+)</span>
                  <span className="text-xs font-mono font-bold text-red-900">
                    {signalOverlap.multi_signal_count} works
                  </span>
                </div>
                <div className="w-full bg-red-200 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className="bg-red-600 h-full"
                    style={{
                      width: `${(signalOverlap.multi_signal_count / kpis.flagged_works_count) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-red-800 font-mono">
                  <span>{signalOverlap.multi_signal_count > 0 ? "High-Confidence Escalation" : "No 3+ engine overlap detected"}</span>
                  <span className="font-bold text-red-700">
                    {signalOverlap.multi_signal_count > 0 ? `Mean Score: ${signalOverlap.avg_score_multi_signal}/100` : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 font-secondary">
            *Multi-signal works demonstrate <span className="font-ui font-semibold text-slate-700">Mean Risk Score Difference: +{(signalOverlap.avg_score_multi_signal - signalOverlap.avg_score_single_signal).toFixed(1)} points</span> vs single-signal cases.
          </p>
        </div>
      </div>

      {/* 5. GEOGRAPHIC CONCENTRATION & SPATIAL RISK MAP ROUTING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Risk Concentration Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span>Geographic Signal Rate &amp; Exposure Concentration</span>
              </h3>
              <p className="text-xs text-slate-500">
                States ranked by flagged work rate (%) • (Flagged Works / Total Works)
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('geospatial')}
              className="px-3 py-1.5 bg-[#0d2b45] text-white rounded text-xs font-semibold hover:bg-[#19466e] flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Launch Spatial Map
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">State Name</th>
                  <th className="py-2.5">Total Works</th>
                  <th className="py-2.5">Flagged Works</th>
                  <th className="py-2.5">Flagged Work Rate %</th>
                  <th className="py-2.5">Total Sanctioned</th>
                  <th className="py-2.5">Flagged Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.state_concentration.slice(0, 6).map((st) => (
                  <tr key={st.state_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-semibold text-slate-900">{st.state_name}</td>
                    <td className="py-3 font-mono text-slate-600">{st.total_works}</td>
                    <td className="py-3 font-mono font-bold text-red-600">{st.flagged_works}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                        {st.signal_rate_pct}%
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-700">₹{st.total_sanctioned_cr} Cr</td>
                    <td className="py-3 font-mono font-bold text-slate-900">₹{st.flagged_sanctioned_cr} Cr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* District Hotspot Ranking (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>District Hotspots Concentration</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Top districts with highest absolute count of flagged works
            </p>

            <div className="space-y-2.5">
              {analytics.top_district_hotspots.slice(0, 5).map((dist) => (
                <div key={dist.district_id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">{dist.district_name}</div>
                    <div className="text-[11px] text-slate-500">{dist.state_name}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-red-600 block">{dist.flagged_works} Flagged / {dist.total_works} Total</span>
                    <span className="text-[10px] text-slate-400 font-mono">{dist.signal_rate_pct}% Signal Rate</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('geospatial')}
            className="w-full mt-4 py-2 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200 flex items-center justify-center gap-1 transition-colors"
          >
            Explore District Hotspots on Map <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6. WORK CATEGORY CONCENTRATION & PRIORITY CASES TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Exposure Bar Chart (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Category Flagged Work Rate</span>
            </h3>
            <p className="text-xs text-slate-500">
              Work categories by proportion of flagged works
            </p>
          </div>

          <div className="space-y-3">
            {analytics.category_concentration.slice(0, 5).map((cat, i) => (
              <div key={i} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                    <span className="font-medium text-slate-800 truncate">{cat.category}</span>
                    {cat.total_works <= 5 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-ui">
                        Small sample
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {cat.flagged_works}/{cat.total_works} ({cat.signal_rate_pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0d2b45] h-full"
                    style={{ width: `${cat.signal_rate_pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Total: ₹{cat.total_sanctioned_cr} Cr</span>
                  <span className="text-red-600 font-semibold">Flagged: ₹{cat.flagged_sanctioned_cr} Cr</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Review Queue Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Priority Review Queue (Highest Composite Risk)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Showing top {topAnomalies.length} of {kpis.flagged_works_count} flagged works requiring administrative verification
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('explorer')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All ({kpis.flagged_works_count}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">Work ID & Description</th>
                  <th className="py-2.5">State & MP</th>
                  <th className="py-2.5">Sanctioned</th>
                  <th className="py-2.5">Primary Indicator</th>
                  <th className="py-2.5">Risk Score</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topAnomalies.map((anom) => (
                  <tr key={anom.anomaly_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono font-bold text-[11px] text-slate-800">
                          {anom.work_id}
                        </span>
                        <DataSourceBadge isSynthetic={anom.is_synthetic} />
                      </div>
                      <div className="text-slate-600 truncate max-w-[180px]" title={anom.activity_name}>
                        {anom.activity_name}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-800">{anom.state_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[110px]">{anom.mp_name}</div>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-800">
                      ₹{(anom.sanctioned_amount / 100000).toFixed(2)}L
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-block text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded truncate max-w-[170px] cursor-help transition-colors"
                        title={anom.primary_factor_summary || 'Risk Signal Indicator'}
                      >
                        {anom.primary_factor_summary || 'Risk Signal Indicator'}
                      </span>
                    </td>
                    <td className="py-3">
                      <ScoreBadge score={anom.composite_risk_score} showBar={false} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onOpenDossier(anom.work_id)}
                        className="px-2.5 py-1 bg-[#0d2b45] text-white rounded text-[11px] font-semibold hover:bg-[#19466e] transition-colors"
                      >
                        Open Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
