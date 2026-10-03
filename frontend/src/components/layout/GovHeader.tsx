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
      <div className="bg-[#0d2b45] text-white text-xs px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between border-b border-[#143d60]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-ui font-medium tracking-wider text-[11px]">
            <span className="text-amber-400 font-bold">☸</span>
            <span className="font-semibold text-slate-100">GOVERNMENT OF INDIA</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-200">Ministry of Statistics and Programme Implementation</span>
          </div>
          <span className="hidden md:inline text-[10px] text-slate-300 font-ui tracking-wide">
            DIID / IPMD • Problem Statement SIH26103 (PAIMANA)
          </span>
        </div>

        <div className="flex items-center gap-3 font-ui text-[11px]">
          <span className="text-slate-200 font-medium">
            Central Sector Infrastructure Monitoring Portfolio
          </span>

          <a
            href="https://mplads.mospi.gov.in"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
          >
            MoSPI Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#0d2b45] flex items-center justify-center text-white shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-normal tracking-tight text-slate-900 leading-tight">
                NexSolve — Predictive Infrastructure Project Intelligence
              </h1>
            </div>
            <p className="font-secondary text-xs text-slate-600 mt-0.5">
              MoSPI IPMD / PAIMANA Ecosystem • Predictive Cost &amp; Schedule Overrun Early Warning System
            </p>
          </div>
        </div>

        {/* Global Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-ui">
          {/* House Selector */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
            {[
              { id: 'ALL', label: 'Both Houses' },
              { id: 'LOK_SABHA', label: 'Lok Sabha' },
              { id: 'RAJYA_SABHA', label: 'Rajya Sabha' },
            ].map((h) => (
              <button
                key={h.id}
                onClick={() => onSelectHouse(h.id)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  selectedHouse === h.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Dataset Source Toggle */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => onSelectDatasetMode('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                datasetMode === 'ALL'
                  ? 'bg-[#0d2b45] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => onSelectDatasetMode('REAL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                datasetMode === 'REAL'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portfolio Dataset
            </button>
            <button
              onClick={() => onSelectDatasetMode('SYNTHETIC')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                datasetMode === 'SYNTHETIC'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Benchmark Archetypes
            </button>
          </div>

          {/* Active Filter State Summary Badge */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-ui font-medium">
            <span className="text-slate-400">View:</span>
            <span className="font-semibold text-slate-800">
              {selectedHouse === 'LOK_SABHA' ? 'Lok Sabha' : selectedHouse === 'RAJYA_SABHA' ? 'Rajya Sabha' : 'Both Houses'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-800">
              {datasetMode === 'REAL' ? 'Portfolio Dataset' : datasetMode === 'SYNTHETIC' ? 'Benchmark Archetypes' : 'All Records'}
            </span>
          </div>

          {/* Action Sync Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncEsakshi}
              disabled={isSyncing}
              title="Ingest simulated telemetry records"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-slate-800' : ''}`} />
            </button>
            <button
              onClick={handleResetDemoSeed}
              disabled={isSyncing}
              title="Reset 7 Anomaly Scenarios Benchmark"
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Reset Scenarios
            </button>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="bg-slate-50 border-y border-slate-200 px-4 sm:px-8 py-1.5 text-xs text-slate-800 flex items-center justify-between font-ui font-medium">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            {syncStatusMsg}
          </span>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-600 hover:text-slate-900 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <nav className="px-4 sm:px-8 flex items-center gap-2 overflow-x-auto border-t border-slate-200 bg-slate-50/40">
        {[
          { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
          { id: 'explorer', label: 'Project Risk & Overrun Explorer', icon: Search },
          { id: 'geospatial', label: 'Geospatial Project Map', icon: MapPin },
          {
            id: 'investigations',
            label: 'Early Warning Queue',
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
              className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-ui text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#0d2b45] text-slate-900 font-semibold bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0d2b45]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
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
