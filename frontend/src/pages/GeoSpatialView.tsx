import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import {
  MapPin,
  Filter,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldAlert,
  Layers,
  Search,
  ArrowRight,
  Compass,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import type {
  GeoJSONCollection,
  GeoJSONFeature,
  SpatialRelationshipsResponse,
  SpatialRelationshipItem
} from '../services/types';
import { SeverityBadge, ScoreBadge, DataSourceBadge } from '../components/common/RiskBadge';

interface GeoSpatialViewProps {
  onOpenDossier: (workId: string) => void;
  datasetMode: 'ALL' | 'REAL' | 'SYNTHETIC';
  initialWorkId?: string | null;
}

// Leaflet Map Resize & View Helper
function MapController({
  center,
  zoom
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size immediately and after multiple intervals to catch render passes
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const container = map.getContainer();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
      map.invalidateSize();
    }
  }, [center, zoom, map]);

  return null;
}

// Custom Leaflet Pin Generator
const createCustomPin = (severity: string, score: number, isSelected: boolean = false) => {
  let bgColor = '#10b981'; // Low
  let borderColor = '#059669';

  if (severity === 'CRITICAL' || score >= 80) {
    bgColor = '#dc2626'; // Critical
    borderColor = '#991b1b';
  } else if (severity === 'HIGH' || score >= 50) {
    bgColor = '#f59e0b'; // High
    borderColor = '#d97706';
  } else if (severity === 'MEDIUM' || score >= 30) {
    bgColor = '#3b82f6'; // Medium
    borderColor = '#1d4ed8';
  }

  const size = isSelected ? 32 : 24;
  const pulseHtml = isSelected
    ? `<span style="position: absolute; width: 140%; height: 140%; top: -20%; left: -20%; border-radius: 9999px; background-color: ${bgColor}; opacity: 0.4;" class="animate-ping"></span>`
    : '';

  const selectedBorder = isSelected ? 'border-3 border-amber-400 scale-110 shadow-lg' : 'border-2 border-white shadow-md';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        ${pulseHtml}
        <div style="width: ${size - 8}px; height: ${size - 8}px; border-radius: 9999px; background-color: ${bgColor}; z-index: 10;" class="${selectedBorder}"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Custom Cluster Badge Generator
const createClusterIcon = (count: number) => {
  let size = 32;
  let bg = 'bg-[#0d2b45]/90';
  if (count > 50) {
    size = 44;
    bg = 'bg-red-700/90';
  } else if (count > 15) {
    size = 38;
    bg = 'bg-amber-600/90';
  }

  return L.divIcon({
    className: 'custom-leaflet-cluster',
    html: `
      <div class="${bg} text-white font-mono font-bold text-xs rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export const GeoSpatialView: React.FC<GeoSpatialViewProps> = ({
  onOpenDossier,
  datasetMode,
  initialWorkId,
}) => {
  const [geoData, setGeoData] = useState<GeoJSONCollection | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [minScore, setMinScore] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [radiusMeters, setRadiusMeters] = useState<number>(500);
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);

  // Selected Work & Spatial Investigation State
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(initialWorkId || 'WS/DEMO/2025/102');

  useEffect(() => {
    if (initialWorkId) {
      setSelectedWorkId(initialWorkId);
    }
  }, [initialWorkId]);
  const [spatialData, setSpatialData] = useState<SpatialRelationshipsResponse | null>(null);
  const [loadingSpatial, setLoadingSpatial] = useState(false);

  // Map viewport state
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // Center of India
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(5);

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    loadGeoData();
  }, [minScore, severityFilter, selectedState, categoryFilter, datasetMode, radiusMeters]);

  useEffect(() => {
    if (selectedWorkId) {
      loadSpatialRelationships(selectedWorkId, radiusMeters);
    } else {
      setSpatialData(null);
    }
  }, [selectedWorkId, radiusMeters]);

  const loadStates = async () => {
    try {
      const st = await api.getStates();
      setStates(st);
    } catch (err) {
      console.error('Failed to load states for map:', err);
    }
  };

  const loadGeoData = async () => {
    try {
      setLoading(true);
      const isSyntheticParam =
        datasetMode === 'REAL' ? false : datasetMode === 'SYNTHETIC' ? true : undefined;

      const data = await api.getGeospatialRiskMap({
        min_score: minScore > 0 ? minScore : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        state_id: selectedState,
        work_category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        radius_meters: radiusMeters,
        is_synthetic: isSyntheticParam,
      });
      setGeoData(data);
    } catch (err) {
      console.error('Failed to load geospatial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSpatialRelationships = async (workId: string, radius: number) => {
    try {
      setLoadingSpatial(true);
      const resp = await api.getSpatialRelationships(workId, radius);
      setSpatialData(resp);

      if (resp.selected_work?.latitude && resp.selected_work?.longitude) {
        setMapCenter([resp.selected_work.latitude, resp.selected_work.longitude]);
        setMapZoom(14);
      }
    } catch (err) {
      console.error('Failed to load spatial relationships:', err);
    } finally {
      setLoadingSpatial(false);
    }
  };

  const handleSelectWork = (workId: string) => {
    setSelectedWorkId(workId);
  };

  // Supercluster setup for zoom level 5-11
  const clusterIndex = useMemo(() => {
    if (!geoData?.features || geoData.features.length === 0) return null;

    const points = geoData.features.map((feat) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        workId: feat.properties.work_id,
        rawProps: feat.properties,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: feat.geometry.coordinates, // [lon, lat]
      },
    }));

    const index = new Supercluster({
      radius: 45,
      maxZoom: 12,
    });
    index.load(points);
    return index;
  }, [geoData]);

  // Derived Summary Counters
  const totalWorksInView = geoData?.features.length || 0;
  const highCriticalCount =
    geoData?.features.filter(
      (f) => f.properties.severity_level === 'HIGH' || f.properties.severity_level === 'CRITICAL'
    ).length || 0;
  const spatialRelationshipClustersCount =
    geoData?.features.filter((f) => (f.properties.nearby_works_count || 0) > 0).length || 0;

  return (
    <div className="space-y-4">
      {/* Top Map Filter & Header Bar */}
      <div className="border-b border-slate-200/90 pb-4 pt-1 flex flex-wrap items-end justify-between gap-4 font-ui">
        <div>
          <div className="flex items-center gap-2 mb-1 font-ui">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Geospatial Intelligence
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-600 font-medium">Spatial Proximity Analytics</span>
          </div>
          <h2 className="font-display text-3xl font-normal text-slate-900 tracking-tight">
            Constituency Risk GIS &amp; Spatial Proximity Explorer
          </h2>
          <p className="font-secondary text-xs text-slate-600 mt-0.5">
            Decision-support spatial analytics mapping works and detecting spatial relationships within configured parameters
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
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
              <option value="HIGH">High & Critical</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Proximity Radius Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-600 font-medium">Radius:</span>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="bg-transparent font-bold text-blue-700 focus:outline-hidden"
            >
              <option value={100}>100 m</option>
              <option value={250}>250 m</option>
              <option value={500}>500 m (Configured)</option>
              <option value={1000}>1000 m (1 km)</option>
            </select>
          </div>

          {/* State Filter */}
          <select
            value={selectedState || ''}
            onChange={(e) =>
              setSelectedState(e.target.value ? Number(e.target.value) : undefined)
            }
            className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States / UTs</option>
            {states.map((s) => (
              <option key={s.state_id} value={s.state_id}>
                {s.state_name}
              </option>
            ))}
          </select>

          {/* Quick Preset Buttons for Test Cases */}
          <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-[11px] text-slate-400 font-medium">Demo Cases:</span>
            <button
              onClick={() => handleSelectWork('WS/DEMO/2025/001')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedWorkId === 'WS/DEMO/2025/001'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              001 (A-Isolated)
            </button>
            <button
              onClick={() => handleSelectWork('WS/DEMO/2025/102')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedWorkId === 'WS/DEMO/2025/102'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              102 (B-Proximity)
            </button>
            <button
              onClick={() => handleSelectWork('WS/DEMO/2025/501')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedWorkId === 'WS/DEMO/2025/501'
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              501 (C-Critical)
            </button>
            <button
              onClick={() => handleSelectWork('WS/DEMO/2025/801')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                selectedWorkId === 'WS/DEMO/2025/801'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              801 (D-Counterexample)
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container with Floating Spatial Evidence Investigation Overlay */}
      <div className="relative w-full h-[720px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Full-width Base Leaflet Map */}
        <div className="absolute inset-0 w-full h-full">
          <MapContainer
            center={defaultCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapController center={mapCenter} zoom={mapZoom} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render Buffer Circle for Selected Work */}
            {spatialData?.selected_work && (
              <Circle
                center={[spatialData.selected_work.latitude, spatialData.selected_work.longitude]}
                radius={radiusMeters}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  dashArray: '5, 5',
                  weight: 2,
                }}
              />
            )}

            {/* Render Markers for Geocoded Works */}
            {geoData?.features.map((feat: GeoJSONFeature, idx: number) => {
              const [lon, lat] = feat.geometry.coordinates;
              const props = feat.properties;
              const isSelected = selectedWorkId === props.work_id;
              const icon = createCustomPin(props.severity_level, props.composite_risk_score, isSelected);

              return (
                <Marker
                  key={`marker-${props.work_id}-${idx}`}
                  position={[lat, lon]}
                  icon={icon}
                  eventHandlers={{
                    click: () => handleSelectWork(props.work_id),
                  }}
                >
                  <Popup className="gov-map-popup">
                    <div className="p-1 max-w-[260px] text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-[10px] text-slate-700">
                          {props.work_id}
                        </span>
                        <SeverityBadge severity={props.severity_level} />
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs leading-tight">
                        {props.activity_name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {props.district_name}, {props.state_name}
                      </p>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">Sanction</span>
                          <span className="font-bold text-slate-800">
                            ₹{(props.sanctioned_amount / 100000).toFixed(2)}L
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Risk Score</span>
                          <span className="font-bold text-red-600">
                            {props.composite_risk_score.toFixed(1)}/100
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSelectWork(props.work_id)}
                          className="flex-1 py-1 bg-blue-50 text-blue-700 font-semibold border border-blue-200 rounded text-[11px] hover:bg-blue-100"
                        >
                          Investigate Spatial Context
                        </button>
                        <button
                          onClick={() => onOpenDossier(props.work_id)}
                          className="py-1 px-2 bg-[#0d2b45] text-white font-bold rounded text-[11px] hover:bg-[#1a4163]"
                        >
                          Dossier
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Bottom Dynamic Map Summary Bar */}
        <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg p-3 shadow-md text-xs pointer-events-auto">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Works in View</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{totalWorksInView}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">High / Critical</span>
              <span className="font-mono font-bold text-amber-600 text-sm">{highCriticalCount}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[10px] text-slate-500 uppercase block font-bold">Spatial Proximity (<span className="normal-case">{radiusMeters}m</span>)</span>
              <span className="font-mono font-bold text-blue-700 text-sm">{spatialRelationshipClustersCount}</span>
            </div>
          </div>
        </div>

        {/* Floating Spatial Evidence Investigation Overlay Drawer */}
        {selectedWorkId && (
          <div className="absolute top-4 right-4 z-[600] w-[calc(100%-2rem)] sm:w-auto sm:max-w-[460px] max-h-[calc(100%-2rem)] bg-white/98 backdrop-blur-sm border border-slate-300 rounded-xl p-4 shadow-xl space-y-4 overflow-y-auto">
            {/* Panel Top Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#0d2b45]" />
                <h3 className="font-bold text-slate-900 text-sm">Spatial Evidence Investigation</h3>
              </div>
              <button
                onClick={() => setSelectedWorkId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                title="Close Investigation Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingSpatial ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <div className="animate-spin w-6 h-6 border-2 border-[#0d2b45] border-t-transparent rounded-full mx-auto mb-2"></div>
                Calculating spatial relationships...
              </div>
            ) : spatialData ? (
              <>
                {/* 1. Selected Work Header Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Selected Target Work</span>
                    <DataSourceBadge isSynthetic={true} />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-blue-900">{spatialData.selected_work.work_id}</span>
                      <h4 className="font-bold text-slate-900 text-xs leading-tight mt-0.5">
                        {spatialData.selected_work.activity_name}
                      </h4>
                    </div>
                    <SeverityBadge severity={spatialData.selected_work.severity_level} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Location</span>
                      <span className="font-semibold text-slate-800">{spatialData.selected_work.district_name}, {spatialData.selected_work.state_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Sanction Amount</span>
                      <span className="font-semibold text-slate-800">₹{(spatialData.selected_work.sanctioned_amount / 100000).toFixed(2)}L</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Composite Risk</span>
                      <span className="font-bold text-red-600">{spatialData.selected_work.composite_risk_score.toFixed(1)}/100</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700 block text-[10px]">Primary Risk Signal:</span>
                    {spatialData.selected_work.primary_signal}
                  </div>
                </div>

                {/* 2. Spatial Relationships Evidence List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Potential Spatial Relationships ({spatialData.total_nearby_count})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Parameter: &lt; {radiusMeters} m
                    </span>
                  </div>

                  {spatialData.related_works.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        No Spatial Proximity Signals Detected
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        No additional sanctioned works exist within the configured {radiusMeters}-meter radius buffer. Absence of nearby works indicates standard geographic isolation.
                      </p>
                    </div>
                  ) : (
                    spatialData.related_works.map((item: SpatialRelationshipItem) => (
                      <div
                        key={item.work_id}
                        className={`p-3 rounded-lg border transition-all ${
                          item.is_counterexample
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-white border-blue-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono font-bold text-xs text-slate-800">
                            ↕ {item.work_id}
                          </span>
                          <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {item.distance_meters} m
                          </span>
                        </div>

                        <h5 className="font-semibold text-slate-900 text-xs mb-1">
                          {item.activity_name}
                        </h5>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mb-2">
                          <span>Category: <strong className="text-slate-700">{item.work_category}</strong></span>
                          <span>•</span>
                          <span>Sanction: <strong className="text-slate-700">₹{(item.sanctioned_amount / 100000).toFixed(2)}L</strong></span>
                          <span>•</span>
                          <span>Risk: <strong className="text-red-600">{item.composite_risk_score.toFixed(1)}</strong></span>
                        </div>

                        {/* Why Related Factors */}
                        <div className="bg-slate-50 p-2 rounded text-[11px] space-y-1 mb-2">
                          <span className="font-bold text-slate-700 block text-[10px]">Spatial Relationship Analysis:</span>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {item.why_related.map((reason, rIdx) => (
                              <li key={rIdx}>{reason}</li>
                            ))}
                          </ul>
                        </div>

                        {item.is_counterexample && (
                          <div className="mb-2 p-2 bg-amber-100/80 border border-amber-300 rounded text-[10px] text-amber-900 font-medium flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span>
                              <strong>Proximity Counterexample:</strong> Geographic proximity alone does not establish duplication. Distinct asset categories require verification.
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => handleSelectWork(item.work_id)}
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                        >
                          Select this work on map <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* 3. Open Full Dossier Navigation */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <button
                    onClick={() => onOpenDossier(spatialData.selected_work.work_id)}
                    className="w-full py-2.5 bg-[#0d2b45] text-white font-bold rounded-lg text-xs hover:bg-[#1a4163] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Detailed Explainability Dossier ({spatialData.selected_work.work_id})
                  </button>

                  <p className="text-[10px] text-slate-500 text-center">
                    DECISION-SUPPORT PROTOTYPE — NOT AN OFFICIAL MoSPI FINDING. Risk scores indicate priority for verification, not findings of misconduct.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoSpatialView;
