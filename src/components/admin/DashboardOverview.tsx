/**
 * Executive Admin Dashboard Overview
 * Displays live database aggregations, revenue stats, seat capacity, and recent booking activity.
 */

import React from 'react';
import { DashboardMetrics } from '../../types';
import {
  Plane,
  Users,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Armchair,
  Terminal,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardOverviewProps {
  metrics: DashboardMetrics;
  recentBookings: any[];
  dataSource: string;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  metrics,
  recentBookings,
  dataSource,
  onNavigateTab,
}) => {
  const cards = [
    {
      title: 'Gross Revenue',
      value: `₹${Number(metrics.total_revenue || 0).toLocaleString('en-IN')}`,
      subtext: 'From confirmed reservations',
      icon: IndianRupee,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Flights',
      value: metrics.total_flights,
      subtext: `${metrics.upcoming_flights} scheduled upcoming`,
      icon: Plane,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Active Bookings',
      value: metrics.confirmed_bookings,
      subtext: `${metrics.cancelled_bookings} cancelled bookings`,
      icon: CheckCircle2,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Registered Passengers',
      value: metrics.total_passengers,
      subtext: 'Unique passenger profiles',
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Available Inventory',
      value: metrics.seats_remaining,
      subtext: `Out of ${metrics.total_capacity} total seats`,
      icon: Armchair,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
              Operations Control
            </span>
            <span className="text-xs text-slate-400 font-mono">Source: {dataSource}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Airline Operations Overview</h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry aggregated directly from the <code className="text-cyan-400 font-mono">airline_reservation</code> PostgreSQL database.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('workbench')}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            <Terminal className="h-4 w-4" />
            <span>Launch SQL Workbench</span>
          </button>
          <button
            onClick={() => onNavigateTab('admin-flights')}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            Manage Flights
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">{c.title}</span>
                <span className={`p-2 rounded-xl border ${c.bg}`}>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{c.value}</div>
              <div className="text-[11px] text-slate-500 mt-1">{c.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Bookings Activity */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest reservations committed to PostgreSQL</p>
          </div>
          <button
            onClick={() => onNavigateTab('admin-bookings')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Booking ID</th>
                <th className="py-3 px-4 font-semibold">Passenger</th>
                <th className="py-3 px-4 font-semibold">Flight</th>
                <th className="py-3 px-4 font-semibold">Route</th>
                <th className="py-3 px-4 font-semibold">Seats</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {recentBookings.map((b) => (
                <tr key={b.booking_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-cyan-400 font-bold">#{b.booking_id}</td>
                  <td className="py-3 px-4 text-white">{b.passenger_name}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{b.flight_number}</td>
                  <td className="py-3 px-4 text-slate-400">{b.source} → {b.destination}</td>
                  <td className="py-3 px-4 text-white font-mono">{b.seats_booked}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    ₹{Number(b.total_amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        b.booking_status?.toLowerCase() === 'confirmed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {b.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
