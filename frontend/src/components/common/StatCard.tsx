import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeColor?: string;
  footer?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-500',
  iconBg = 'bg-slate-50',
  badge,
  badgeColor = 'text-slate-600 border-slate-200 bg-slate-50',
  footer,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-ui text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {title}
          </p>
          {Icon && (
            <div className={`p-1 rounded text-slate-400`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="mt-1">
          <div className="font-data text-3xl font-bold tracking-tight text-slate-900 leading-none">
            {value}
          </div>
          {subtitle && (
            <p className="font-secondary text-xs text-slate-600 mt-2 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        {badge && (
          <div className="mb-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeColor}`}>
              {badge}
            </span>
          </div>
        )}

        {footer && (
          <div className="pt-2.5 border-t border-slate-100 font-secondary text-[11px] text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
