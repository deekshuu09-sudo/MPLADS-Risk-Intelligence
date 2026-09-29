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

  const styles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    CRITICAL: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      text: 'Critical Indicator',
      border: 'border-red-300',
      icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600 animate-pulse" />,
    },
    HIGH: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      text: 'High Risk Indicator',
      border: 'border-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />,
    },
    MEDIUM: {
      bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      text: 'Moderate Review',
      border: 'border-yellow-300',
      icon: <Clock className="w-3.5 h-3.5 mr-1 text-yellow-600" />,
    },
    LOW: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Nominal / Low Risk',
      border: 'border-emerald-300',
      icon: <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
    },
  };

  const current = styles[norm] || styles.LOW;
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-semibold'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs font-medium tracking-tight ${current.bg} ${sizeClasses} ${className}`}
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
  let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let barColor = 'bg-emerald-500';

  if (score >= 80) {
    color = 'text-red-700 bg-red-50 border-red-200';
    barColor = 'bg-red-500';
  } else if (score >= 65) {
    color = 'text-amber-700 bg-amber-50 border-amber-200';
    barColor = 'bg-amber-500';
  } else if (score >= 40) {
    color = 'text-yellow-700 bg-yellow-50 border-yellow-200';
    barColor = 'bg-yellow-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${color}`}>
        {rounded.toFixed(1)}/100
      </div>
      {showBar && (
        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
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
    OPEN: { bg: 'bg-slate-100 border-slate-300 text-slate-700', text: 'text-slate-700', label: 'Unreviewed' },
    VERIFICATION_REQUIRED: { bg: 'bg-orange-50 border-orange-200 text-orange-800', text: 'text-orange-800', label: 'Verification Required' },
    UNDER_REVIEW: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-800', text: 'text-indigo-800', label: 'Under Review' },
    IN_REVIEW: { bg: 'bg-blue-50 border-blue-200 text-blue-800', text: 'text-blue-800', label: 'In Review' },
    INSPECTION_SCHEDULED: { bg: 'bg-amber-50 border-amber-200 text-amber-800', text: 'text-amber-800', label: 'Site Inspection Scheduled' },
    DOCUMENTS_REQUESTED: { bg: 'bg-cyan-50 border-cyan-200 text-cyan-800', text: 'text-cyan-800', label: 'Documents Requested' },
    CLARIFICATION_REQUESTED: { bg: 'bg-purple-50 border-purple-200 text-purple-800', text: 'text-purple-800', label: 'Clarification Requested' },
    MONITORING_CONTINUED: { bg: 'bg-teal-50 border-teal-200 text-teal-800', text: 'text-teal-800', label: 'Monitoring Continued' },
    RESOLVED: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', text: 'text-emerald-800', label: 'Resolved / Verified' },
    ESCALATED: { bg: 'bg-red-50 border-red-200 text-red-800', text: 'text-red-800', label: 'Special Audit Escalation' },
    DISMISSED: { bg: 'bg-slate-200 border-slate-300 text-slate-700', text: 'text-slate-700', label: 'Dismissed (Non-Confirmatory)' },
  };

  const cur = map[norm] || map.OPEN;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${cur.bg}`}>
      {cur.label}
    </span>
  );
};
