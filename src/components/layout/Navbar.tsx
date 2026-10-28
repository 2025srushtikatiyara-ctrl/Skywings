/**
 * SKY WINGS Navigation Header
 * Features brand identity, portal tabs (Passenger, Admin, SQL Workbench, Docs),
 * and live PostgreSQL synchronization indicator.
 */

import React from 'react';
import { Plane, Database, Shield, BookOpen, Layers, Terminal, Activity, CheckCircle2, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDbConnected: boolean;
  isSynced: boolean;
  lastSyncTime: Date;
  onRefreshAll?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDbConnected,
  isSynced,
  lastSyncTime,
  onRefreshAll,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('search')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-400 text-white shadow-lg shadow-blue-500/25">
            <Plane className="h-5 w-5 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">SKY WINGS</span>
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                AIRLINE
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Airline Reservation & SQL Workbench</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            Book Flight
          </button>

          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'my-bookings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            My Bookings
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          <button
            onClick={() => setActiveTab('admin-dashboard')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab.startsWith('admin')
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Center
          </button>

          <button
            onClick={() => setActiveTab('workbench')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all relative ${
              activeTab === 'workbench'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/50'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>SQL Workbench</span>
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Docs & DB
          </button>
        </nav>

        {/* Live Database Sync Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSynced ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isSynced ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            <span className="text-[11px] font-medium text-slate-300">
              {isSynced ? 'Engine: Ready' : 'Initializing...'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {onRefreshAll && (
            <button
              onClick={onRefreshAll}
              title="Manual refresh from database"
              aria-label="Refresh application data"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 bg-slate-950 px-3 py-2 gap-1.5 scrollbar-none">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'search' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900'
          }`}
        >
          <Plane className="h-3 w-3" /> Book
        </button>
        <button
          onClick={() => setActiveTab('my-bookings')}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'my-bookings' ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900'
          }`}
        >
          <BookOpen className="h-3 w-3" /> My Bookings
        </button>
        <button
          onClick={() => setActiveTab('admin-dashboard')}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
            activeTab.startsWith('admin') ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 bg-slate-900'
          }`}
        >
          <Shield className="h-3 w-3" /> Admin
        </button>
        <button
          onClick={() => setActiveTab('workbench')}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold ${
            activeTab === 'workbench' ? 'bg-cyan-600 text-white' : 'text-cyan-400 bg-cyan-950/60'
          }`}
        >
          <Terminal className="h-3 w-3" /> SQL Workbench
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
            activeTab === 'docs' ? 'bg-slate-800 text-white' : 'text-slate-400 bg-slate-900'
          }`}
        >
          <Layers className="h-3 w-3" /> Docs
        </button>
      </div>
    </header>
  );
};
