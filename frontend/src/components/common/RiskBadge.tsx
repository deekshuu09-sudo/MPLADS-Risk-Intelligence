import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SeverityBadgeProps {
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity = 'LOW',
  className = '',
  size = 'md',
}) => {
  let norm = (severity || 'LOW').toUpperCase();
  if (norm === 'MODERATE') norm = 'MEDIUM';

  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    CRITICAL: {
      bg: 'bg-red-50/80 text-red-800 border-red-200/90',
      text: 'Critical Indicator',
      icon: <AlertCircle className="w-3 h-3 mr-1 text-red-700" />,
    },
    HIGH: {
      bg: 'bg-amber-50/80 text-amber-900 border-amber-200/90',
      text: 'High Risk Indicator',
      icon: <AlertTriangle className="w-3 h-3 mr-1 text-amber-700" />,
    },
    MEDIUM: {
      bg: 'bg-yellow-50/80 text-yellow-900 border-yellow-200/90',
      text: 'Moderate Review',
      icon: <Clock className="w-3 h-3 mr-1 text-yellow-700" />,
    },
    LOW: {
      bg: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/90',
      text: 'Nominal / Low Risk',
      icon: <CheckCircle className="w-3 h-3 mr-1 text-emerald-700" />,
    },
  };

  const current = styles[norm] || styles.LOW;
  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-2.5 py-1 text-xs'
      : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center rounded border font-ui font-semibold tracking-normal uppercase ${current.bg} ${sizeClasses} ${className}`}
    >
      {current.icon}
      <span>{norm === 'MEDIUM' ? 'MODERATE' : norm}</span>
    </span>
  );
};

interface ScoreBadgeProps {
  score?: number;
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score = 0, showBar = true }) => {
  const rounded = Math.round(score * 10) / 10;
  let color = 'text-emerald-800 bg-emerald-50/70 border-emerald-200';
  let barColor = 'bg-emerald-600';

  if (score >= 80) {
    color = 'text-red-900 bg-red-50/80 border-red-200';
    barColor = 'bg-red-600';
  } else if (score >= 65) {
    color = 'text-amber-900 bg-amber-50/80 border-amber-200';
    barColor = 'bg-amber-600';
  } else if (score >= 40) {
    color = 'text-yellow-900 bg-yellow-50/80 border-yellow-200';
    barColor = 'bg-yellow-600';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`px-1.5 py-0.5 rounded font-data font-bold text-xs border ${color}`}>
        {rounded.toFixed(1)}/100
      </div>
      {showBar && (
        <div className="w-14 h-1.5 bg-slate-200/80 rounded-sm overflow-hidden">
          <div
            className={`h-full rounded-sm transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
};

interface DataSourceBadgeProps {
  isSynthetic: boolean;
  className?: string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ isSynthetic, className = '' }) => {
  if (!isSynthetic) {
    return null;
  }

  return (
    <span
      title="Curated Benchmark Archetype for Verification & Demonstration"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-ui font-semibold tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-300 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
      BENCHMARK
    </span>
  );
};

interface StatusPillProps {
  status: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const norm = (status || 'OPEN').toUpperCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    OPEN: { bg: 'bg-slate-100 border-slate-200 text-slate-700', text: 'text-slate-700', label: 'Unreviewed' },
    VERIFICATION_REQUIRED: { bg: 'bg-orange-50 border-orange-200 text-orange-900', text: 'text-orange-900', label: 'Verification Required' },
    UNDER_REVIEW: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-900', text: 'text-indigo-900', label: 'Under Review' },
    IN_REVIEW: { bg: 'bg-blue-50 border-blue-200 text-blue-900', text: 'text-blue-900', label: 'In Review' },
    INSPECTION_SCHEDULED: { bg: 'bg-amber-50 border-amber-200 text-amber-900', text: 'text-amber-900', label: 'Site Inspection Scheduled' },
    DOCUMENTS_REQUESTED: { bg: 'bg-cyan-50 border-cyan-200 text-cyan-900', text: 'text-cyan-900', label: 'Documents Requested' },
    CLARIFICATION_REQUESTED: { bg: 'bg-purple-50 border-purple-200 text-purple-900', text: 'text-purple-900', label: 'Clarification Requested' },
    MONITORING_CONTINUED: { bg: 'bg-teal-50 border-teal-200 text-teal-900', text: 'text-teal-900', label: 'Monitoring Continued' },
    RESOLVED: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', text: 'text-emerald-900', label: 'Resolved / Verified' },
    ESCALATED: { bg: 'bg-red-50 border-red-200 text-red-900', text: 'text-red-900', label: 'Special Audit Escalation' },
    DISMISSED: { bg: 'bg-slate-100 border-slate-300 text-slate-600', text: 'text-slate-600', label: 'Dismissed (Non-Confirmatory)' },
  };

  const cur = map[norm] || map.OPEN;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-ui font-medium border ${cur.bg}`}>
      {cur.label}
    </span>
  );
};
