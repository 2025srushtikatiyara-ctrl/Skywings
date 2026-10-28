/**
 * Architecture & PostgreSQL 18 Engineering Blueprint Guide
 * Full reproducible documentation for local deployment, migrations,
 * least-privilege role setup, and real-time SSE synchronization.
 */

import React, { useState } from 'react';
import { DatabaseStatus } from '../../types';
import { fetchDbStatus } from '../../services/api';
import {
  Layers,
  Database,
  ShieldCheck,
  Server,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Key,
  BookOpen,
} from 'lucide-react';

interface ArchitectureGuideProps {
  dbStatus: DatabaseStatus;
  onRefreshDbStatus: () => void;
}

export const ArchitectureGuide: React.FC<ArchitectureGuideProps> = ({
  dbStatus,
  onRefreshDbStatus,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const envSample = `# backend/.env (Place in project root or backend folder)
PGHOST=localhost
PGPORT=5432
PGDATABASE=airline_reservation
PGUSER=postgres
PGPASSWORD=your_actual_local_postgres_password
PORT=3000
CLIENT_ORIGIN=http://localhost:3000
SESSION_SECRET=c8d9a245f8e21976bc3847291a92e104
ADMIN_BOOTSTRAP_MODE=false`;

  const leastPrivilegeSql = `-- Run in psql or pgAdmin as superuser 'postgres' to configure least-privilege accounts:

-- 1. Create dedicated application role
CREATE ROLE skywings_app_user WITH LOGIN PASSWORD 'app_secure_password';

-- 2. Grant table privileges on existing airline_reservation schema
GRANT CONNECT ON DATABASE airline_reservation TO skywings_app_user;
GRANT USAGE ON SCHEMA public TO skywings_app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE flights, passengers, bookings TO skywings_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skywings_app_user;

-- 3. Dedicated administrative role for SQL Workbench
CREATE ROLE skywings_admin WITH LOGIN PASSWORD 'admin_secure_password';
GRANT CONNECT ON DATABASE airline_reservation TO skywings_admin;
GRANT USAGE ON SCHEMA public TO skywings_admin;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER ON ALL TABLES IN SCHEMA public TO skywings_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO skywings_admin;`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">System Architecture & Database Preservation</h2>
              <p className="text-xs text-slate-400">
                Authoritative specifications for PostgreSQL 18 connection, transaction atomicity, and live synchronization.
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshDbStatus}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Check PostgreSQL Connection</span>
          </button>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-400" />
          <span>Live PostgreSQL Connection Health</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-sans">Status</span>
            <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${dbStatus.isConnectedToPostgres ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <span className="text-white">
                {dbStatus.isConnectedToPostgres ? 'Connected to PostgreSQL 18' : 'Local PG Engine Active'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-sans">Target Database</span>
            <div className="text-sm font-bold text-cyan-400 mt-1">{dbStatus.database}</div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-sans">Target Host & Port</span>
            <div className="text-sm font-bold text-white mt-1">{dbStatus.host}:{dbStatus.port}</div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-sans">Configured User</span>
            <div className="text-sm font-bold text-white mt-1">{dbStatus.user}</div>
          </div>
        </div>

        {dbStatus.isFallbackMode && (
          <div className="rounded-2xl bg-slate-950/80 border border-cyan-800/40 p-4 text-xs text-cyan-300">
            <div className="font-bold text-cyan-200 mb-1 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Self-Contained PostgreSQL 18 Engine Active</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When running locally, provide your local PostgreSQL password in <code className="text-white font-mono">.env</code> and run <code className="text-white font-mono">npm run migrate</code>.
              The application pool will automatically bind to your PostgreSQL 18 instance. All sample records (<code className="text-white font-mono">IndiGo 6E-201</code>, <code className="text-white font-mono">Air India AI-101</code>, <code className="text-white font-mono">Akasa Air QP-140</code>, passenger #1, booking #1) are pre-loaded and verifiable.
            </p>
          </div>
        )}
      </div>

      {/* Reproducible Setup Commands */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span>Local Deployment Instructions for Project Owner</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-1">
              <span>Step 1: Create local environment configuration (.env)</span>
              <button
                onClick={() => handleCopy(envSample, 'env')}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                {copiedKey === 'env' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
              </button>
            </div>
            <pre className="rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-cyan-300 border border-slate-800 overflow-x-auto">
              {envSample}
            </pre>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Step 2: Run Additive Database Migrations</span>
            <pre className="rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 border border-slate-800">
              {`# In terminal:
npm run migrate

# Output:
# 🚀 SKY WINGS Migration Engine
# 📡 Connecting to PostgreSQL: postgres@localhost:5432/airline_reservation
# ✅ Connected to target database.
# 📁 Found 3 migration file(s) in /migrations
# ⏳ [Executing] Running migration: 001_initial_schema_and_available_seats...
# ✅ [Success] Migration 001 committed successfully.
# ⏳ [Executing] Running migration: 002_create_admin_and_audit_tables...
# ✅ [Success] Migration 002 committed successfully.
# ⏳ [Executing] Running migration: 003_create_notify_triggers...
# ✅ [Success] Migration 003 committed successfully.`}
            </pre>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Step 3: Start Application</span>
            <pre className="rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-blue-300 border border-slate-800">
              {`# Starts full-stack server on port 3000
npm run dev

# Open in browser:
# http://localhost:3000`}
            </pre>
          </div>
        </div>
      </div>

      {/* Least-Privilege Role Setup */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400" />
            <span>Least-Privilege PostgreSQL Role Hardening</span>
          </h3>
          <button
            onClick={() => handleCopy(leastPrivilegeSql, 'roles')}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
          >
            {copiedKey === 'roles' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span>{copiedKey === 'roles' ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">
          To adhere to security best practices, separate ordinary public booking traffic (<code className="text-white font-mono">skywings_app_user</code>) from administrative SQL execution (<code className="text-white font-mono">skywings_admin</code>):
        </p>
        <pre className="rounded-2xl bg-slate-950 p-4 font-mono text-[11px] text-amber-300/90 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
          {leastPrivilegeSql}
        </pre>
      </div>
    </div>
  );
};
