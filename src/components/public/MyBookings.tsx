/**
 * My Bookings & Self-Service Cancellation Portal
 * Fetches passenger reservations using real PostgreSQL JOINs and handles atomic cancellation.
 */

import React, { useState } from 'react';
import { Booking } from '../../types';
import { lookupBookings, cancelBooking } from '../../services/api';
import {
  Search,
  BookOpen,
  Mail,
  Ticket,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plane,
  RefreshCw,
  Clock,
} from 'lucide-react';

export const MyBookings: React.FC = () => {
  const [searchType, setSearchType] = useState<'EMAIL' | 'REFERENCE'>('EMAIL');
  const [searchValue, setSearchValue] = useState('rajesh.sharma@example.com');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchValue.trim()) {
      setError('Please enter an email or booking reference to search.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      const results = await lookupBookings({
        email: searchType === 'EMAIL' ? searchValue.trim() : undefined,
        reference: searchType === 'REFERENCE' ? searchValue.trim() : undefined,
      });
      setBookings(results);
    } catch (err: any) {
      setError(err.message || 'Failed to locate booking records.');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel booking #${booking.booking_id} (${booking.flight_number})? This will restore ${booking.seats_booked} seat(s) to inventory.`
    );
    if (!confirmed) return;

    setCancellingId(booking.booking_id);
    setError(null);
    setActionMessage(null);

    try {
      const res = await cancelBooking(booking.booking_id, booking.passenger_email);
      setActionMessage(`✅ ${res.message} (₹${res.refundAmount} refunded, ${res.seatsRestored} seats restored).`);
      // Refresh current list
      handleSearch();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Manage My Reservations</h2>
            <p className="text-xs text-slate-400">
              Retrieve your electronic tickets, check flight statuses, or request reservation cancellations.
            </p>
          </div>
        </div>

        {/* Search controls */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSearchType('EMAIL'); setSearchValue('rajesh.sharma@example.com'); }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                searchType === 'EMAIL'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              Lookup by Passenger Email
            </button>
            <button
              type="button"
              onClick={() => { setSearchType('REFERENCE'); setSearchValue('SKW-'); }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                searchType === 'REFERENCE'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              Lookup by PNR Reference / ID
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              {searchType === 'EMAIL' ? (
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              ) : (
                <Ticket className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              )}
              <input
                type={searchType === 'EMAIL' ? 'email' : 'text'}
                placeholder={searchType === 'EMAIL' ? 'Enter passenger email address' : 'Enter Booking Reference (e.g. SKW-XXXXX)'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Find Bookings</span>
            </button>
          </div>
        </form>

        {actionMessage && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
            {actionMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Bookings List Results */}
      {bookings !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-300">
              Found <span className="text-white font-bold">{bookings.length}</span> Reservation{bookings.length === 1 ? '' : 's'}
            </h3>
            <span className="text-xs text-slate-500">Live PostgreSQL Records</span>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center text-slate-400">
              <Ticket className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No reservations found matching this lookup criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => {
                const isCancelled = booking.booking_status.toLowerCase() === 'cancelled';
                return (
                  <div
                    key={booking.booking_id}
                    className="rounded-2xl bg-slate-900 border border-slate-800 p-5 hover:border-slate-700 transition-all shadow-lg"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-cyan-400">
                            {booking.booking_reference || `SKW-${booking.booking_id}`}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                              isCancelled
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {booking.booking_status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Booked on: {new Date(booking.booking_date).toLocaleString()} • Passenger ID #{booking.passenger_id}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-xs text-slate-400">Total Billed</div>
                        <div className="text-xl font-bold text-white font-mono">
                          ₹{Number(booking.total_amount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">{booking.seats_booked} Reserved Seat(s)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Passenger</span>
                        <div className="font-semibold text-white mt-0.5">{booking.passenger_name}</div>
                        <div className="text-slate-400">{booking.passenger_email}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Flight Route</span>
                        <div className="font-semibold text-white mt-0.5">
                          {booking.airline_name} ({booking.flight_number})
                        </div>
                        <div className="text-cyan-400">{booking.source} → {booking.destination}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Departure Time</span>
                        <div className="font-semibold text-white mt-0.5">
                          {booking.departure_time ? new Date(booking.departure_time).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {!isCancelled && (
                      <div className="flex justify-end border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={() => handleCancel(booking)}
                          disabled={cancellingId === booking.booking_id}
                          className="flex items-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>
                            {cancellingId === booking.booking_id ? 'Cancelling & Restoring Seats...' : 'Cancel Booking & Refund'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
