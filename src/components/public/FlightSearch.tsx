/**
 * Flight Search Widget & Popular Airline Routes
 */

import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, ArrowRightLeft, Sparkles, PlaneTakeoff, ShieldCheck } from 'lucide-react';

interface FlightSearchProps {
  onSearch: (params: { source: string; destination: string; date: string; seats: number }) => void;
  isSearching: boolean;
}

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];

export const FlightSearch: React.FC<FlightSearchProps> = ({ onSearch, isSearching }) => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [source, setSource] = useState('Mumbai');
  const [destination, setDestination] = useState('Delhi');
  const [date, setDate] = useState(tomorrow);
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source.toLowerCase() === destination.toLowerCase()) {
      setError('Source and Destination cities cannot be the same.');
      return;
    }
    setError(null);
    onSearch({ source, destination, date, seats });
  };

  const handleQuickRoute = (src: string, dst: string) => {
    setSource(src);
    setDestination(dst);
    setError(null);
    onSearch({ source: src, destination: dst, date, seats });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />

      {/* Header text */}
      <div className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-Time PostgreSQL Flight Engine</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
          Where would you like to fly today?
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-400">
          Book verified scheduled flights with instant seat locking and PostgreSQL inventory synchronization.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Source City */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              From (Origin)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-cyan-400" />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm font-semibold text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pt-4 md:pt-4">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap origin and destination"
              className="rounded-xl p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all transform hover:rotate-180"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Destination City */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              To (Destination)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-blue-400" />
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Departure Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm font-medium text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Seats Count */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Passengers
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <select
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm font-semibold text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Seat' : 'Seats'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Submit and Popular Route Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 font-medium">Sample Routes:</span>
            <button
              type="button"
              onClick={() => handleQuickRoute('Mumbai', 'Delhi')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
            >
              Mumbai → Delhi (6E-201)
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoute('Mumbai', 'Bengaluru')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
            >
              Mumbai → Bengaluru (AI-101)
            </button>
            <button
              type="button"
              onClick={() => handleQuickRoute('Delhi', 'Mumbai')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 text-slate-300 hover:text-white transition-colors"
            >
              Delhi → Mumbai (QP-140)
            </button>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {isSearching ? 'Searching Flights...' : 'Find Available Flights'}
          </button>
        </div>
      </form>
    </div>
  );
};
