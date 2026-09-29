import { useState, useEffect } from 'react';
import { GovHeader } from './components/layout/GovHeader';
import type { NavTab } from './components/layout/GovHeader';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { RiskExplorer } from './pages/RiskExplorer';
import { GeoSpatialView } from './pages/GeoSpatialView';
import { InvestigationQueue } from './pages/InvestigationQueue';
import { AuditTrailView } from './pages/AuditTrailView';
import { ExplainabilityDossier } from './components/explainability/ExplainabilityDossier';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedHouse, setSelectedHouse] = useState<string>('ALL');
  const [datasetMode, setDatasetMode] = useState<'ALL' | 'REAL' | 'SYNTHETIC'>('ALL');
  const [activeDossierWorkId, setActiveDossierWorkId] = useState<string | null>(null);
  const [spatialWorkId, setSpatialWorkId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [openInvestigationsCount, setOpenInvestigationsCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchGlobalStats();
  }, [refreshTrigger, selectedHouse, datasetMode]);

  const fetchGlobalStats = async () => {
    try {
      const summary = await api.getDashboardSummary({
        house: selectedHouse !== 'ALL' ? selectedHouse : undefined,
        is_synthetic:
          datasetMode === 'REAL' ? false : datasetMode === 'SYNTHETIC' ? true : undefined,
      });
      setOpenInvestigationsCount(summary.open_investigations_count);
    } catch (err) {
      console.error('Failed to load global stats:', err);
    }
  };

  const handleOpenDossier = (workId: string) => {
    setActiveDossierWorkId(workId);
    setIsDossierOpen(true);
  };

  const handleCloseDossier = () => {
    setIsDossierOpen(false);
  };

  const handleViewOnMap = (workId: string) => {
    setSpatialWorkId(workId);
    setCurrentTab('geospatial');
  };

  const handleStatusUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Gov Header & Primary Navigation */}
      <GovHeader
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedHouse={selectedHouse}
        onSelectHouse={setSelectedHouse}
        datasetMode={datasetMode}
        onSelectDatasetMode={setDatasetMode}
        openInvestigationsCount={openInvestigationsCount}
        onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Main Page Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'overview' && (
          <OverviewDashboard
            selectedHouse={selectedHouse}
            datasetMode={datasetMode}
            onOpenDossier={handleOpenDossier}
            onNavigateToTab={setCurrentTab}
          />
        )}

        {currentTab === 'explorer' && (
          <RiskExplorer
            selectedHouse={selectedHouse}
            datasetMode={datasetMode}
            onOpenDossier={handleOpenDossier}
          />
        )}

        {currentTab === 'geospatial' && (
          <GeoSpatialView
            onOpenDossier={handleOpenDossier}
            datasetMode={datasetMode}
            initialWorkId={spatialWorkId}
          />
        )}

        {currentTab === 'investigations' && (
          <InvestigationQueue
            selectedHouse={selectedHouse}
            onOpenDossier={handleOpenDossier}
            datasetMode={datasetMode}
          />
        )}

        {currentTab === 'audit' && (
          <AuditTrailView
            onOpenDossier={handleOpenDossier}
          />
        )}
      </main>

      {/* Slide-over Explainability Dossier Modal */}
      <ExplainabilityDossier
        workId={activeDossierWorkId}
        isOpen={isDossierOpen}
        onClose={handleCloseDossier}
        onStatusUpdated={handleStatusUpdated}
        onViewOnMap={handleViewOnMap}
      />

      {/* Official MoSPI Gov Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500 font-ui">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              Ministry of Statistics &amp; Programme Implementation (MoSPI)
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-secondary text-slate-600">Data Informatics &amp; Innovation Division (DIID)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-secondary text-[11px]">
            <span>SIH 2026 Problem Statement: <strong className="font-ui font-semibold text-slate-800">26102</strong></span>
            <span className="text-slate-300">•</span>
            <span className="font-data text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
              v1.0.0-PROD
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
