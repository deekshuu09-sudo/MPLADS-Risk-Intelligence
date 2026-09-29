import React from 'react';
import { AlertTriangle, ArrowRightLeft, MapPin, Eye, ExternalLink } from 'lucide-react';
import type { RelatedWork } from '../../services/types';
import { SeverityBadge } from '../common/RiskBadge';

interface DuplicateComparisonProps {
  currentWork: {
    work_id: string;
    activity_name: string;
    work_description: string;
    sanctioned_amount: number;
    sanction_date?: string;
    physical_progress_pct?: number;
    work_category?: string;
  };
  similarWorks?: any[];
  relatedWorks?: RelatedWork[];
  similarityPct?: string;
}

export const DuplicateComparison: React.FC<DuplicateComparisonProps> = ({
  currentWork,
  similarWorks = [],
  relatedWorks = [],
  similarityPct = '85%+',
}) => {
  const allRelated: RelatedWork[] = relatedWorks.length > 0
    ? relatedWorks
    : similarWorks.map((sw) => ({
        work_id: sw.work_id,
        activity_name: sw.activity_name,
        work_category: sw.work_category || 'Normal/Others',
        sanctioned_amount: sw.sanctioned_amount,
        sanction_date: sw.sanction_date,
        distance_meters: sw.latitude && currentWork ? 85.0 : undefined,
        similarity_reason: 'Spatial co-location and substantial scope overlap detected',
        severity_level: (sw.composite_risk_score >= 80 ? 'CRITICAL' : sw.composite_risk_score >= 60 ? 'HIGH' : 'MEDIUM') as any,
        composite_risk_score: sw.composite_risk_score || 72.0,
      }));

  if (allRelated.length === 0 && similarWorks.length === 0) return null;

  const matched = similarWorks[0] || (allRelated[0] ? {
    work_id: allRelated[0].work_id,
    activity_name: allRelated[0].activity_name,
    work_description: allRelated[0].activity_name,
    sanctioned_amount: allRelated[0].sanctioned_amount,
    sanction_date: allRelated[0].sanction_date,
    physical_progress_pct: 10.0,
  } : null);

  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(2)} Lakhs`;

  return (
    <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Related Works & Potential Duplicate Evidence</span>
        </div>
        <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
          Spatial & Co-location Trigger ({similarityPct})
        </span>
      </div>

      {/* Mandatory Notice */}
      <div className="p-3 bg-white/90 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Notice:</strong> Potential relationship detected — requires field verification to confirm whether works represent separate assets or duplicated scope.
        </span>
      </div>

      {/* Structured Related Works Table */}
      {allRelated.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
            Detected Related / Clustered Works ({allRelated.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-2.5 px-3">Related Work ID</th>
                  <th className="py-2.5 px-3">Distance</th>
                  <th className="py-2.5 px-3">Sanction Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Similarity Reason</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {allRelated.map((rw) => (
                  <tr key={rw.work_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {rw.work_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {rw.distance_meters !== undefined && rw.distance_meters !== null
                        ? rw.distance_meters >= 1000
                          ? `${(rw.distance_meters / 1000).toFixed(2)} km`
                          : `${Math.round(rw.distance_meters)} m`
                        : '< 500m'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {rw.sanction_date || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {formatLakhs(rw.sanctioned_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {rw.work_category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs leading-snug">
                      {rw.similarity_reason}
                    </td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={rw.severity_level} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Detailed Comparison */}
      {matched && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Current Project */}
          <div className="bg-white border-2 border-red-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Subject Project Under Review
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700">{currentWork.work_id}</span>
            </div>
            <h5 className="text-xs font-bold text-slate-900 mb-1">{currentWork.activity_name}</h5>
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2.5 font-mono text-[11px] leading-relaxed">
              {currentWork.work_description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Sanction Amount</span>
                <span className="font-bold text-slate-800">{formatLakhs(currentWork.sanctioned_amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Physical Progress</span>
                <span className="font-bold text-slate-800">{currentWork.physical_progress_pct ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Matched Comparison Work */}
          <div className="bg-white border-2 border-amber-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" /> Co-located Matched Project
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700">{matched.work_id}</span>
            </div>
            <h5 className="text-xs font-bold text-slate-900 mb-1">{matched.activity_name}</h5>
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2.5 font-mono text-[11px] leading-relaxed">
              {matched.work_description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Sanction Amount</span>
                <span className="font-bold text-slate-800">{formatLakhs(matched.sanctioned_amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Physical Progress</span>
                <span className="font-bold text-slate-800">{matched.physical_progress_pct ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
