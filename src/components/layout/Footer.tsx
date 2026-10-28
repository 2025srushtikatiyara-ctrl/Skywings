/**
 * SKY WINGS Application Footer
 * Features truthful system status, browser-based SQL engine architecture, and reactive guarantees.
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
              Database Engine
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              SKY WINGS In-Browser SQL Engine with persistent relational tables (<code className="text-cyan-400 font-mono">flights</code>, <code className="text-cyan-400 font-mono">passengers</code>, <code className="text-cyan-400 font-mono">bookings</code>).
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Transaction Safety
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Atomic booking creation, seat availability checks, and inventory restorations with instant rollback on conflicts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              Reactive Invalidation
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Reactive event subscription stream. Mutations executed in the SQL Workbench immediately refresh all cards, search results, and charts.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              SQL Workbench Policy
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Lexical tokenizer, AST parser, and evaluator supporting SELECT, JOIN, AGGREGATE, INSERT, UPDATE, DELETE, and schema inspection.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-900 pt-6 text-[11px] text-slate-500">
          <p>© 2026 SKY WINGS Airline Systems. In-Browser SQL Workbench & Reservation System.</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0 font-mono text-[10px]">
            <span>Storage: <strong className="text-slate-300">Current Browser (localStorage)</strong></span>
            <span>•</span>
            <span>Engine: <strong className="text-cyan-400">Browser SQL Engine</strong></span>
            <span>•</span>
            <span className="text-emerald-400">Status: Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
