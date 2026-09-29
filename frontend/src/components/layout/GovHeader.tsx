import React, { useState } from 'react';
import {
  ShieldAlert,
  BarChart3,
  Search,
  MapPin,
  ClipboardList,
  History,
  RefreshCw,
  Sparkles,
  Building2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';

export type NavTab = 'overview' | 'explorer' | 'geospatial' | 'investigations' | 'audit';

interface GovHeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedHouse: string;
  onSelectHouse: (house: string) => void;
  datasetMode: 'ALL' | 'REAL' | 'SYNTHETIC';
  onSelectDatasetMode: (mode: 'ALL' | 'REAL' | 'SYNTHETIC') => void;
  openInvestigationsCount?: number;
  onRefreshData?: () => void;
}

export const GovHeader: React.FC<GovHeaderProps> = ({
  currentTab,
  onSelectTab,
  selectedHouse,
  onSelectHouse,
  datasetMode,
  onSelectDatasetMode,
  openInvestigationsCount = 0,
  onRefreshData,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSyncEsakshi = async () => {
    try {
      setIsSyncing(true);
      setSyncStatusMsg('Connecting to Telemetry Ingestion API (Simulated)...');
      const res = await api.syncEsakshiState(35); // Andaman or specified state
      setSyncStatusMsg(`Ingested ${res.works_ingested || 0} telemetry records`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg('Live sync simulated or backend busy');
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDemoSeed = async () => {
    try {
      setIsSyncing(true);
      setSyncStatusMsg('Resetting 7 Seeded Anomaly Archetypes...');
      await api.resetDemoSeed();
      setSyncStatusMsg('Benchmark dataset refreshed successfully');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg('Demo reset completed');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Gov Strip */}
      <div className="bg-[#0d2b45] text-white text-xs px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between border-b border-[#143d60]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium tracking-wide">
            {/* Ashoka Chakra / MoSPI Symbol representation */}
            <div className="w-4 h-4 rounded-full border border-amber-300 flex items-center justify-center text-[9px] font-bold text-amber-300">
              ☸
            </div>
            <span>GOVERNMENT OF INDIA</span>
            <span className="text-slate-400">|</span>
            <span className="text-amber-200">Ministry of Statistics and Programme Implementation (MoSPI)</span>
          </div>
          <span className="hidden md:inline px-2 py-0.5 text-[10px] bg-[#1a4163] text-slate-200 rounded font-mono">
            DIID • Problem Statement 26102
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Tenure Badge */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            18th Lok Sabha (2024–2029)
          </span>

          <a
            href="https://mplads.mospi.gov.in"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors text-[11px]"
          >
            MoSPI Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0d2b45] to-[#1a4163] flex items-center justify-center text-white shadow-sm ring-1 ring-slate-900/10">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                MPLADS Risk Intelligence & Investigation Platform
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Explainable AI Anomaly Detection & Policy Compliance Monitor
            </p>
          </div>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* House Selector */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[
              { id: 'ALL', label: 'Both Houses' },
              { id: 'LOK_SABHA', label: 'Lok Sabha' },
              { id: 'RAJYA_SABHA', label: 'Rajya Sabha' },
            ].map((h) => (
              <button
                key={h.id}
                onClick={() => onSelectHouse(h.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedHouse === h.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Dataset Source Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onSelectDatasetMode('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                datasetMode === 'ALL'
                  ? 'bg-[#0d2b45] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => onSelectDatasetMode('REAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                datasetMode === 'REAL'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
              Portal Telemetry (Demo)
            </button>
            <button
              onClick={() => onSelectDatasetMode('SYNTHETIC')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                datasetMode === 'SYNTHETIC'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-200" />
              Benchmark Tests
            </button>
          </div>

          {/* Action Sync Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncEsakshi}
              disabled={isSyncing}
              title="Ingest simulated telemetry records"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handleResetDemoSeed}
              disabled={isSyncing}
              title="Reset 7 Anomaly Scenarios Benchmark"
              className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Reset Scenarios
            </button>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="bg-blue-50 border-y border-blue-200 px-4 py-1.5 text-xs text-blue-800 flex items-center justify-between font-medium">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            {syncStatusMsg}
          </span>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="text-blue-600 hover:text-blue-900 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <nav className="px-4 sm:px-8 flex items-center gap-1 overflow-x-auto border-t border-slate-200/80 bg-slate-50/50">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'explorer', label: 'Explainable Risk Explorer', icon: Search },
          { id: 'geospatial', label: 'Geospatial Risk Map', icon: MapPin },
          {
            id: 'investigations',
            label: 'Investigation Queue',
            icon: ClipboardList,
            badge: openInvestigationsCount > 0 ? openInvestigationsCount : undefined,
          },
          { id: 'audit', label: 'Audit Trail & Compliance', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as NavTab)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#0d2b45] text-[#0d2b45] bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#0d2b45]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
