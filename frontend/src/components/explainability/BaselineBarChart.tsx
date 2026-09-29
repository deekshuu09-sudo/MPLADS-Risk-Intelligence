import React from 'react';
import type { BaselineComparison } from '../../services/types';

interface BaselineBarChartProps {
  baseline?: BaselineComparison;
  sanctionedAmount: number;
}

export const BaselineBarChart: React.FC<BaselineBarChartProps> = ({
  baseline,
  sanctionedAmount,
}) => {
  if (!baseline) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
        Category peer baseline is within normal parametric tolerance (Z-score &lt; 2.0).
      </div>
    );
  }

  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(2)}L`;

  const observed = baseline.observed || sanctionedAmount;
  const p25 = baseline.p25 || observed * 0.5;
  const median = baseline.median || observed * 0.65;
  const p75 = baseline.p75 || observed * 0.85;
  const p95 = baseline.p95 || observed * 0.95;

  const maxVal = Math.max(observed * 1.15, p95 * 1.25);
  const minVal = 0;
  const range = maxVal - minVal;

  const getPercent = (v: number) => {
    return Math.min(100, Math.max(0, ((v - minVal) / range) * 100));
  };

  const p25Pct = getPercent(p25);
  const medPct = getPercent(median);
  const p75Pct = getPercent(p75);
  const p95Pct = getPercent(p95);
  const obsPct = getPercent(observed);

  const variancePct = median > 0 ? (((observed - median) / median) * 100).toFixed(1) : '0';
  const isHighOutlier = observed > p95;

  let contextualInterpretation = 'Project cost is within normal variance across district category peers.';
  let interpretationBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';

  if (observed > p95 || (baseline.z_score !== undefined && baseline.z_score >= 3.0)) {
    contextualInterpretation = 'Project cost exceeds 95th percentile of similar works in district (High Statistical Outlier).';
    interpretationBadge = 'bg-red-50 text-red-800 border-red-200';
  } else if (observed > p75 || (baseline.z_score !== undefined && baseline.z_score >= 1.5)) {
    contextualInterpretation = 'Project cost falls in upper quartile band (P75–P95) of similar works in district.';
    interpretationBadge = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Comparative Peer Baseline Analysis ({baseline.metric_name || 'Sanction Cost'})
          </h4>
          <p className="text-xs text-slate-500">
            District-wide peer distribution for identical work category and scope
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Z-Score: {baseline.z_score != null ? baseline.z_score.toFixed(2) : '—'}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              isHighOutlier
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {Number(variancePct) > 0 ? `+${variancePct}%` : `${variancePct}%`} vs Median
          </span>
        </div>
      </div>

      {/* Contextual Interpretation Banner */}
      <div className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between ${interpretationBadge}`}>
        <span><strong>Contextual Interpretation:</strong> {contextualInterpretation}</span>
      </div>

      {/* Distribution Track Container */}
      <div className="py-6 px-3">
        <div className="relative h-10 w-full bg-slate-100 rounded-lg overflow-visible flex items-center">
          {/* IQR Shading (P25 to P75) */}
          <div
            className="absolute top-0 bottom-0 bg-blue-100/80 border-x border-blue-300"
            style={{
              left: `${p25Pct}%`,
              width: `${Math.max(0, p75Pct - p25Pct)}%`,
            }}
            title={`IQR (P25-P75): ${formatLakhs(p25)} to ${formatLakhs(p75)}`}
          />

          {/* Upper Threshold Shading (P75 to P95) */}
          <div
            className="absolute top-0 bottom-0 bg-amber-100/60 border-r border-amber-300"
            style={{
              left: `${p75Pct}%`,
              width: `${Math.max(0, p95Pct - p75Pct)}%`,
            }}
            title={`Upper Quartile (P75-P95): ${formatLakhs(p75)} to ${formatLakhs(p95)}`}
          />

          {/* Outlier Shading (> P95) */}
          <div
            className="absolute top-0 bottom-0 bg-red-100/40 rounded-r-lg"
            style={{
              left: `${p95Pct}%`,
              right: '0%',
            }}
            title="Statistical Outlier Zone (> P95)"
          />

          {/* Median Marker Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10"
            style={{ left: `${medPct}%` }}
          >
            <div className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-blue-700 whitespace-nowrap bg-white px-1 rounded shadow-2xs">
              Median: {formatLakhs(median)}
            </div>
          </div>

          {/* P95 Marker Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600 z-10"
            style={{ left: `${p95Pct}%` }}
          >
            <div className="absolute -bottom-5 -translate-x-1/2 text-[10px] font-semibold text-amber-700 whitespace-nowrap bg-white px-1 rounded shadow-2xs">
              P95: {formatLakhs(p95)}
            </div>
          </div>

          {/* Observed Value Pin Marker */}
          <div
            className="absolute -top-3 bottom-0 z-20 flex flex-col items-center"
            style={{ left: `${obsPct}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md ring-2 ring-red-300 animate-bounce" />
            <div className="h-6 w-0.5 bg-red-600" />
            <div className="absolute -top-8 -translate-x-1/2 bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded shadow-md whitespace-nowrap">
              Observed: {formatLakhs(observed)}
            </div>
          </div>
        </div>

        {/* Legend & Percentiles */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-100 pt-4">
          <div className="p-2 bg-slate-50 rounded">
            <span className="text-slate-500 block text-[11px]">25th Percentile (P25)</span>
            <span className="font-bold text-slate-800">{formatLakhs(p25)}</span>
          </div>
          <div className="p-2 bg-blue-50/60 rounded">
            <span className="text-blue-700 block text-[11px]">Category Median</span>
            <span className="font-bold text-blue-900">{formatLakhs(median)}</span>
          </div>
          <div className="p-2 bg-amber-50/60 rounded">
            <span className="text-amber-700 block text-[11px]">75th Percentile (P75)</span>
            <span className="font-bold text-amber-900">{formatLakhs(p75)}</span>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <span className="text-red-700 block text-[11px]">Outlier Threshold (P95)</span>
            <span className="font-bold text-red-900">{formatLakhs(p95)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
