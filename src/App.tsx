/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { FlightSearch } from './components/public/FlightSearch';
import { FlightResults } from './components/public/FlightResults';
import { BookingModal } from './components/public/BookingModal';
import { MyBookings } from './components/public/MyBookings';
import { DashboardOverview } from './components/admin/DashboardOverview';
import { FlightManagement } from './components/admin/FlightManagement';
import { PassengerManagement } from './components/admin/PassengerManagement';
import { BookingManagement } from './components/admin/BookingManagement';
import { AuditLogView } from './components/admin/AuditLogView';
import { SqlWorkbench } from './components/workbench/SqlWorkbench';
import { ArchitectureGuide } from './components/docs/ArchitectureGuide';
import { useDatabaseEvents, DbChangeEvent } from './hooks/useDatabaseEvents';
import {
  fetchFlights,
  searchFlights,
  fetchBookings,
  fetchPassengers,
  fetchDashboardMetrics,
  fetchAuditLogs,
  fetchDbStatus,
} from './services/api';
import {
  Flight,
  Passenger,
  Booking,
  DashboardMetrics,
  AuditLogItem,
  DatabaseStatus,
} from './types';
import {
  Plane,
  Shield,
  Terminal,
  Zap,
  CheckCircle2,
  RefreshCw,
  Bell,
  X,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('search');

  // Application Data States
  const [flights, setFlights] = useState<Flight[]>([]);
  const [searchResults, setSearchResults] = useState<Flight[] | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [passengerSearch, setPassengerSearch] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total_flights: 4,
    upcoming_flights: 4,
    total_passengers: 3,
    confirmed_bookings: 1,
    cancelled_bookings: 0,
    total_revenue: 9000,
    seats_remaining: 733,
    total_capacity: 735,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    isConnectedToPostgres: false,
    host: 'localhost',
    port: 5432,
    database: 'airline_reservation',
    user: 'postgres',
    poolTotal: 0,
    poolIdle: 0,
    poolWaiting: 0,
    lastChecked: new Date().toISOString(),
    isFallbackMode: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchParams, setSearchParams] = useState<{ source: string; destination: string; seats: number } | null>(null);

  // Booking Modal
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);

  // Live Sync Toast Banner
  const [syncToast, setSyncToast] = useState<{ message: string; table: string } | null>(null);

  // Refresh canonical server data
  const loadAllData = useCallback(async () => {
    try {
      const [fData, bData, pData, mData, aData, dbStat] = await Promise.all([
        fetchFlights(),
        fetchBookings(),
        fetchPassengers(passengerSearch),
        fetchDashboardMetrics(),
        fetchAuditLogs(),
        fetchDbStatus(),
      ]);
      setFlights(fData);
      setBookings(bData);
      setPassengers(pData);
      setMetrics(mData.metrics);
      setRecentBookings(mData.recentBookings || []);
      setAuditLogs(aData);
      setDbStatus(dbStat);
    } catch (err) {
      console.error('Error fetching application state:', err);
    }
  }, [passengerSearch]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Hook into Server-Sent Events (SSE) from /api/admin/events
  const handleLiveEvent = useCallback((event: DbChangeEvent) => {
    const tableCapitalized = event.table.charAt(0).toUpperCase() + event.table.slice(1);
    const msg = `⚡ PostgreSQL Invalidation: Table '${event.table}' updated via ${event.action} — Views synchronized!`;
    setSyncToast({ message: msg, table: event.table });
    setTimeout(() => setSyncToast(null), 4500);

    // Auto-refresh canonical data
    loadAllData();
  }, [loadAllData]);

  const { isConnected: isSseConnected, lastSyncTime } = useDatabaseEvents(handleLiveEvent);

  const handleSearchFlights = async (params: { source: string; destination: string; date: string; seats: number }) => {
    setIsSearching(true);
    setSearchParams(params);
    try {
      const results = await searchFlights(params);
      setSearchResults(results);
    } catch (err) {
      console.error('Flight search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenBooking = (flight: Flight) => {
    setSelectedFlight(flight);
    setBookingSeats(searchParams?.seats || 1);
  };

  const handleBookingCompleted = (_booking: Booking) => {
    loadAllData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDbConnected={dbStatus.isConnectedToPostgres}
        isSynced={isSseConnected}
        lastSyncTime={lastSyncTime}
        onRefreshAll={loadAllData}
      />

      {/* Real-time Invalidation Toast Banner */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 border border-cyan-500/50 px-5 py-3.5 shadow-2xl shadow-cyan-950/80 animate-in slide-in-from-bottom-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Zap className="h-4 w-4 animate-pulse" />
          </span>
          <div>
            <div className="text-xs font-bold text-white">PostgreSQL 18 Event Received</div>
            <div className="text-[11px] text-cyan-300 font-mono">{syncToast.message}</div>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-slate-500 hover:text-white ml-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Subheader Bar (when in admin tabs) */}
        {activeTab.startsWith('admin') && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900/90 border border-slate-800 p-2 text-xs">
            <button
              onClick={() => setActiveTab('admin-dashboard')}
              className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === 'admin-dashboard' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('admin-flights')}
              className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === 'admin-flights' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Flights Fleet ({flights.length})
            </button>
            <button
              onClick={() => setActiveTab('admin-bookings')}
              className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === 'admin-bookings' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bookings Ledger ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('admin-passengers')}
              className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === 'admin-passengers' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Passengers CRM ({passengers.length})
            </button>
            <button
              onClick={() => setActiveTab('admin-audit')}
              className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                activeTab === 'admin-audit' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
            <div className="h-4 w-[1px] bg-slate-800 mx-1" />
            <button
              onClick={() => setActiveTab('workbench')}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 font-bold text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>SQL Workbench</span>
            </button>
          </div>
        )}

        {/* TAB 1: PUBLIC FLIGHT SEARCH & RESULTS */}
        {activeTab === 'search' && (
          <div className="space-y-8">
            <FlightSearch onSearch={handleSearchFlights} isSearching={isSearching} />
            <FlightResults
              flights={searchResults !== null ? searchResults : flights}
              seatsRequested={searchParams?.seats || 1}
              onSelectFlight={handleOpenBooking}
              isLoading={isLoading}
              searchCriteria={searchParams || undefined}
            />
          </div>
        )}

        {/* TAB 2: MY BOOKINGS PORTAL */}
        {activeTab === 'my-bookings' && <MyBookings />}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin-dashboard' && (
          <DashboardOverview
            metrics={metrics}
            recentBookings={recentBookings}
            dataSource={dbStatus.isConnectedToPostgres ? 'PostgreSQL 18 Database' : 'PostgreSQL Local Engine'}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 4: ADMIN FLIGHTS MANAGEMENT */}
        {activeTab === 'admin-flights' && (
          <FlightManagement flights={flights} onRefresh={loadAllData} />
        )}

        {/* TAB 5: ADMIN PASSENGERS CRM */}
        {activeTab === 'admin-passengers' && (
          <PassengerManagement
            passengers={passengers}
            searchTerm={passengerSearch}
            onSearchChange={setPassengerSearch}
          />
        )}

        {/* TAB 6: ADMIN BOOKINGS LEDGER */}
        {activeTab === 'admin-bookings' && (
          <BookingManagement bookings={bookings} onRefresh={loadAllData} />
        )}

        {/* TAB 7: ADMIN AUDIT LOG */}
        {activeTab === 'admin-audit' && (
          <AuditLogView logs={auditLogs} onRefresh={loadAllData} />
        )}

        {/* TAB 8: THE CORE FEATURE — SQL WORKBENCH */}
        {activeTab === 'workbench' && (
          <SqlWorkbench dbStatus={dbStatus} onMutationExecuted={loadAllData} />
        )}

        {/* TAB 9: ARCHITECTURE & DATABASE PRESERVATION GUIDE */}
        {activeTab === 'docs' && (
          <ArchitectureGuide dbStatus={dbStatus} onRefreshDbStatus={loadAllData} />
        )}
      </main>

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal
          flight={selectedFlight}
          seatsRequested={bookingSeats}
          onClose={() => setSelectedFlight(null)}
          onBookingComplete={handleBookingCompleted}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
