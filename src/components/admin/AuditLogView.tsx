/**
 * Administrative Audit Trail View
 * Displays immutable record of executed SQL commands, mutations, durations, and actors.
 */

import React from 'react';
import { AuditLogItem } from '../../types';
import { Shield, Clock, Database, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogItem[];
  onRefresh: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs, onRefresh }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Database Audit & Privileged Logs</span>
          </h2>
          <p className="text-xs text-slate-400">
            Historical trace of administrative operations, SQL classifications, row mutations, and latency.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors"
        >
          Refresh Audit Trail
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Execution ID</th>
                <th className="py-3 px-4 font-semibold">Administrator</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">Sanitized SQL Statement</th>
                <th className="py-3 px-4 font-semibold">Rows Affected</th>
                <th className="py-3 px-4 font-semibold">Duration</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No administrative audit events recorded yet. Run a query in the SQL Workbench to record activity.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.execution_id}</td>
                    <td className="py-3 px-4 text-white font-sans font-semibold">{log.admin_user}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-400 font-bold text-[10px]">
                        {log.query_classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.sanitized_sql}>
                      {log.sanitized_sql}
                    </td>
                    <td className="py-3 px-4 text-white font-bold">{log.affected_rows}</td>
                    <td className="py-3 px-4 text-slate-400">{log.duration_ms} ms</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
