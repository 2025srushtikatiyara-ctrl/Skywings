/**
 * SKY WINGS Application Footer
 * Features system status, architecture notices, and database preservation guarantees.
 */

import React from 'react';
import { Database, ShieldCheck, Cpu, Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              Target Database
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              PostgreSQL 18 instance (<code className="text-cyan-400 font-mono">airline_reservation</code>).
              Existing tables, sample records, sequences, and constraints are strictly preserved.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Transaction Safety
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Concurrent reservations locked via <code className="text-slate-200 font-mono">SELECT ... FOR UPDATE</code>.
              Seat inventory adjustments and cancellations execute in atomic transactions.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              Real-Time Invalidation
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Server-Sent Events (SSE) stream table change events across connected clients.
              Mutations executed in SQL Workbench immediately refresh open views.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              SQL Workbench Policy
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Server-side classification enforces read-only sandboxing, warns on unconstrained mutations,
              and audits all privileged operations with millisecond precision.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-6 text-[11px] text-slate-500">
          <p>© 2026 SKY WINGS Airline Systems. Enterprise-Grade Architecture.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 font-mono">
            <span>PGHOST: localhost:5432</span>
            <span>•</span>
            <span>PGDATABASE: airline_reservation</span>
            <span>•</span>
            <span className="text-emerald-400">SSE Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
