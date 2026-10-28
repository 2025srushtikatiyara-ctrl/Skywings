/**
 * Bookings Ledger & Transaction Status Administration
 */

import React, { useState } from 'react';
import { Booking } from '../../types';
import { cancelBooking } from '../../services/api';
import {
  CheckCircle2,
  XCircle,
  Ticket,
  Search,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface BookingManagementProps {
  bookings: Booking[];
  onRefresh: () => void;
}

export const BookingManagement: React.FC<BookingManagementProps> = ({ bookings, onRefresh }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'ALL' && b.booking_status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = b.passenger_name?.toLowerCase().includes(term);
      const matchEmail = b.passenger_email?.toLowerCase().includes(term);
      const matchFlight = b.flight_number?.toLowerCase().includes(term);
      const matchId = b.booking_id.toString().includes(term);
      if (!matchName && !matchEmail && !matchFlight && !matchId) return false;
    }
    return true;
  });

  const handleCancelBooking = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Cancel reservation #${booking.booking_id} for ${booking.passenger_name}? This restores ${booking.seats_booked} seat(s) to flight ${booking.flight_number}.`
    );
    if (!confirmed) return;

    setCancellingId(booking.booking_id);
    try {
      await cancelBooking(booking.booking_id, booking.passenger_email);
      onRefresh();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-cyan-400" />
            <span>Master Bookings Ledger</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit of all flight bookings, seat allocations, and payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {['ALL', 'Confirmed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter passenger / flight..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bookings Ledger Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Booking ID</th>
                <th className="py-3 px-4 font-semibold">Booking Date</th>
                <th className="py-3 px-4 font-semibold">Passenger Profile</th>
                <th className="py-3 px-4 font-semibold">Flight Service</th>
                <th className="py-3 px-4 font-semibold">Route</th>
                <th className="py-3 px-4 font-semibold">Seats</th>
                <th className="py-3 px-4 font-semibold">Amount (₹)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((b) => {
                const isCancelled = b.booking_status?.toLowerCase() === 'cancelled';
                return (
                  <tr key={b.booking_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">#{b.booking_id}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(b.booking_date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{b.passenger_name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">{b.passenger_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.airline_name}</div>
                      <div className="text-cyan-400 font-mono text-[11px]">{b.flight_number}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span>{b.source}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span>{b.destination}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{b.seats_booked}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₹{Number(b.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          isCancelled
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {b.booking_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelBooking(b)}
                          disabled={cancellingId === b.booking_id}
                          className="rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50"
                        >
                          {cancellingId === b.booking_id ? 'Cancelling...' : 'Cancel & Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
