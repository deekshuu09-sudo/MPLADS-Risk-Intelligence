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

      const [analyticsRes, anomRes] = await Promise.all([
        api.getExecutiveOverviewAnalytics({ house: houseParam, is_synthetic: isSyntheticParam }),
        api.getAnomalies({ limit: 5, is_synthetic: isSyntheticParam }),
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
    <div className="space-y-6">
      {/* 1. TOP EXECUTIVE CONTEXT HEADER & SCOPE BADGE */}
      <div className="bg-gradient-to-r from-[#0d2b45] to-[#1a3d60] rounded-xl p-5 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              EXECUTIVE SITUATIONAL AWARENESS
            </span>
            <span className="text-xs text-slate-300 font-medium">| National Programme Overview</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            MPLAD Scheme Programme-Wide Risk & Expenditure Intelligence
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Decision-support analytics aggregating {kpis.total_works_analysed} works across 543 Lok Sabha and 245 Rajya Sabha constituencies. Designed for prescriptively identifying analytical anomaly concentrations for administrative verification.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white/10 text-white border border-white/20">
              {scope?.dataset_mode || 'SYNTHETIC'} TELEMETRY BASELINE
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-300">
            Analysis Scope: {scope?.total_records} Works | Flagged: {scope?.flagged_records} (Score ≥ {scope?.min_flagged_score})
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Analytics generated: {scope?.generated_at}
          </span>
        </div>
      </div>

      {/* PRIMARY OPERATIONAL ACTION & BENCHMARK DEMO STRIP */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('investigations')}
            className="px-4 py-2 bg-[#0d2b45] text-white rounded-lg text-xs font-bold hover:bg-[#1a4163] transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Review Risk Queue ({pipeline.total_unresolved} Unresolved)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateToTab('explorer')}
            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Explore Works</span>
          </button>
          <button
            onClick={() => onNavigateToTab('geospatial')}
            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-600" />
            <span>Spatial Intelligence</span>
          </button>
        </div>

        {/* Demo Case Walkthrough Quick Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Demo Walkthrough:
          </span>
          <button
            onClick={() => onOpenDossier('WS/DEMO/2025/101')}
            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            title="Launch Primary Demo Case: Tender Splitting & High Similarity Review (Score 61 HIGH)"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Work 101 (Tender Splitting • 61 HIGH)</span>
          </button>
          <button
            onClick={() => onOpenDossier('WS/DEMO/2025/801')}
            className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            title="Launch Safeguard Counterexample: Spatial Proximity Counterexample (801 ↔ 802 No Relationship)"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Work 801 (Proximity Safeguard • Counterexample)</span>
          </button>
        </div>
      </div>

      {/* 2. MACRO EXECUTIVE KPI STRIP (4 RECONCILED CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sanctioned Works"
          value={kpis.total_works_analysed.toLocaleString('en-IN')}
          subtitle={`Total Sanctioned: ${formatCr(kpis.total_sanctioned_amount_inr)}`}
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          badge="18th Lok Sabha Tenure"
          footer="Cumulative works registered under eSAKSHI baseline"
        />

        <StatCard
          title="Active Risk Signals"
          value={kpis.flagged_works_count.toLocaleString('en-IN')}
          subtitle={`${kpis.flagged_percentage.toFixed(1)}% Flagged Signal Concentration`}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          badge={`Exposure: ${formatCr(kpis.flagged_sanctioned_amount_inr)}`}
          badgeColor="bg-red-100 text-red-800"
          footer="Flagged for administrative review (Composite Score ≥ 30)"
        />

        <StatCard
          title="Financial Disbursal Exposure"
          value={formatCr(kpis.total_disbursed_amount_inr)}
          subtitle={`Flagged Disbursed: ${formatCr(kpis.flagged_disbursed_amount_inr)}`}
          icon={Coins}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          badge="Verified Vouchers"
          badgeColor="bg-emerald-100 text-emerald-800"
          footer="Total disbursed funds tracked across Treasury/PFMS vouchers"
        />

        <StatCard
          title="Unresolved Queue Cases"
          value={pipeline.total_unresolved.toLocaleString('en-IN')}
          subtitle={`Verification Req: ${pipeline.verification_required}`}
          icon={CheckSquare}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          badge="Pending Review"
          badgeColor="bg-indigo-100 text-indigo-800"
          footer="Reconciled active cases in District/Nodal Officer queue (Score ≥ 30)"
        />
      </div>

      {/* 3. DATA-DRIVEN EXECUTIVE INSIGHT CARDS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Data-Driven Executive Insights & Action Priorities</span>
            </h3>
            <p className="text-xs text-slate-500">
              Prescriptive operational findings synthesized directly from multi-engine detection signals
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono font-medium">{analytics.executive_insights.length} Active Directives</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analytics.executive_insights.map((card) => (
            <div
              key={card.insight_id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                card.severity === 'CRITICAL'
                  ? 'bg-red-50/50 border-red-200'
                  : card.severity === 'HIGH'
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      card.severity === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : card.severity === 'HIGH'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-600 text-white'
                    }`}
                  >
                    {card.severity} ANALYTICAL PRIORITY
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{card.category}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">{card.title}</h4>
                <div className="text-xs text-slate-700 space-y-1.5 mb-3">
                  <p><strong className="text-slate-900">Pattern:</strong> {card.observed_pattern}</p>
                  <p className="text-slate-600"><strong className="text-slate-800">Evidence:</strong> {card.evidence_summary}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 mt-2">
                <div className="text-[11px] text-slate-800 font-medium mb-3">
                  <strong className="text-slate-900 block mb-0.5">Suggested Verification Action:</strong>
                  {card.recommended_action}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono font-semibold">
                    {card.affected_works_count} Works {card.affected_amount_cr > 0 ? `(${card.affected_amount_cr} Cr)` : ''}
                  </span>
                  {card.affected_works_count > 0 && (
                    <button
                      onClick={() => onNavigateToTab('queue')}
                      className="px-2.5 py-1 bg-[#0d2b45] text-white rounded text-[11px] font-semibold hover:bg-[#19466e] flex items-center gap-1 transition-colors"
                    >
                      Investigate <ChevronRight className="w-3 h-3" />
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

          <p className="text-[11px] text-slate-500 mt-4 italic">
            *Multi-signal works demonstrate +{(signalOverlap.avg_score_multi_signal - signalOverlap.avg_score_single_signal).toFixed(1)} points higher analytical confidence.
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
                <span>Geographic Signal Rate & Exposure Concentration</span>
              </h3>
              <p className="text-xs text-slate-500">
                States ranked by normalized risk signal rate % (Flagged Works / Total Sanctioned)
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('map')}
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
            onClick={() => onNavigateToTab('map')}
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
                  <span className="font-medium text-slate-800 truncate max-w-[170px]">{cat.category}</span>
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
                      <span className="inline-block text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[160px]">
                        {anom.primary_factor_summary}
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
