import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Download,
  Filter,
  RefreshCw,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import type { AuditLogItem } from '../services/types';

interface AuditTrailViewProps {
  onOpenDossier: (workId: string) => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ onOpenDossier }) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntityId, setFilterEntityId] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [filterEntityId]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(filterEntityId || undefined);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Audit ID', 'Timestamp', 'Actor Role', 'Action', 'Entity ID', 'Details'];
    const rows = logs.map((l) => [
      l.audit_id,
      l.timestamp,
      l.actor_role,
      l.action_type,
      l.entity_id,
      JSON.stringify(l.new_value || {}),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mplads_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Administrative Audit Log • Compliance Verification
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Administrative Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Append-only chronological record of all risk evaluations, status transitions, and officer reviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={loadAuditLogs}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh Audit Trail"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security & Integrity Banner */}
      <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 flex items-center justify-between text-xs text-slate-800">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">System Audit Trail Active:</span> All
            administrative status transitions and review decisions are chronologically recorded in the database with actor role, IP address, and timestamp.
          </div>
        </div>
        <span className="font-mono text-[11px] font-bold bg-white px-2.5 py-0.5 rounded border border-slate-300 text-slate-700">
          AUDIT LOG ACTIVE
        </span>
      </div>

      {/* Filter by Entity ID */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter audit logs by Work ID (e.g. WS/DEMO/2025/101)..."
          value={filterEntityId}
          onChange={(e) => setFilterEntityId(e.target.value)}
          className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Timeline List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Verifying ledger entries...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit log entries matching the specified filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((entry) => (
              <div key={entry.audit_id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      LOG #{entry.audit_id}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {entry.action_type}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {entry.entity_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">
                      {new Date(entry.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Actor Role</span>
                    <span className="font-semibold text-slate-800">{entry.actor_role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Terminal IP</span>
                    <span className="font-mono text-slate-600">{entry.ip_address}</span>
                  </div>
                  <div className="sm:text-right">
                    <button
                      onClick={() => onOpenDossier(entry.entity_id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Inspect Work File →
                    </button>
                  </div>
                </div>

                {entry.new_value && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-xs font-mono text-slate-700 mt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      State Transition Payload
                    </span>
                    <div className="text-[11px] overflow-x-auto">
                      {typeof entry.new_value === 'object' ? (
                        <div className="space-y-1">
                          {entry.old_value?.status && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <span>Status:</span>
                              <span className="font-bold text-slate-700">{entry.old_value.status}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-bold text-blue-700">{entry.new_value.status}</span>
                            </div>
                          )}
                          {entry.new_value.notes && (
                            <div className="text-slate-800 font-sans">
                              <strong>Notes:</strong> {entry.new_value.notes}
                            </div>
                          )}
                          {entry.new_value.decision && (
                            <div className="text-emerald-800 font-sans">
                              <strong>Decision:</strong> {entry.new_value.decision}
                            </div>
                          )}
                        </div>
                      ) : (
                        JSON.stringify(entry.new_value)
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
