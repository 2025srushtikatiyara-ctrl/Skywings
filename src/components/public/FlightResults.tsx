/**
 * Flight Search Results & Listings
 * Renders flight schedules, airline identifiers, real-time seat inventory, and pricing.
 */

import React from 'react';
import { Flight } from '../../types';
import { Plane, Clock, ShieldCheck, Luggage, Wifi, Coffee, AlertCircle, ArrowRight } from 'lucide-react';

interface FlightResultsProps {
  flights: Flight[];
  seatsRequested: number;
  onSelectFlight: (flight: Flight) => void;
  isLoading: boolean;
  searchCriteria?: { source: string; destination: string };
}

export const FlightResults: React.FC<FlightResultsProps> = ({
  flights,
  seatsRequested,
  onSelectFlight,
  isLoading,
  searchCriteria,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-slate-900 border border-slate-800 p-6 h-36" />
        ))}
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
          <Plane className="h-7 w-7 transform -rotate-45" />
        </div>
        <h3 className="text-lg font-bold text-white">No Flights Found</h3>
        <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
          {searchCriteria
            ? `No scheduled flights with ${seatsRequested} seat(s) available between ${searchCriteria.source} and ${searchCriteria.destination}. Try another route or date.`
            : 'No flights are currently matching your search filters.'}
        </p>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const calculateDuration = (dep: string, arr: string) => {
    try {
      const diffMs = new Date(arr).getTime() - new Date(dep).getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    } catch {
      return '2h 15m';
    }
  };

  const getAirlineColor = (airline: string) => {
    if (airline.toLowerCase().includes('indigo')) return 'bg-blue-600/10 text-blue-400 border-blue-500/20';
    if (airline.toLowerCase().includes('air india')) return 'bg-red-600/10 text-red-400 border-red-500/20';
    if (airline.toLowerCase().includes('akasa')) return 'bg-amber-600/10 text-amber-400 border-amber-500/20';
    return 'bg-purple-600/10 text-purple-400 border-purple-500/20';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-slate-300">
          Showing <span className="text-white font-bold">{flights.length}</span> Scheduled Flight{flights.length === 1 ? '' : 's'}
        </h2>
        <span className="text-xs text-slate-500">Live PostgreSQL Inventory</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {flights.map((flight) => {
          const available = flight.available_seats !== undefined ? flight.available_seats : flight.total_seats;
          const isLowSeats = available > 0 && available <= 15;
          const isSoldOut = available < seatsRequested;

          return (
            <div
              key={flight.flight_id}
              className="group relative rounded-2xl bg-slate-900 border border-slate-800 p-5 transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Airline & Flight Number */}
                <div className="min-w-[170px]">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${getAirlineColor(flight.airline_name)}`}>
                      {flight.airline_name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      {flight.flight_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <Luggage className="h-3.5 w-3.5 text-slate-500" />
                    <span>15 kg Cabin + 7 kg Hand</span>
                  </div>
                </div>

                {/* Schedule & Route Timeline */}
                <div className="flex-1 flex items-center justify-between gap-4 max-w-lg">
                  {/* Origin */}
                  <div className="text-left">
                    <div className="text-xl font-bold text-white tracking-tight">
                      {formatTime(flight.departure_time)}
                    </div>
                    <div className="text-xs font-medium text-slate-300">{flight.source}</div>
                    <div className="text-[10px] text-slate-500">Scheduled Departure</div>
                  </div>

                  {/* Flight Duration Visual */}
                  <div className="flex-1 flex flex-col items-center px-4">
                    <span className="text-[11px] font-medium text-slate-400 mb-1">
                      {calculateDuration(flight.departure_time, flight.arrival_time)}
                    </span>
                    <div className="w-full flex items-center gap-1">
                      <div className="h-[2px] flex-1 bg-slate-800" />
                      <Plane className="h-4 w-4 text-cyan-400 transform rotate-90" />
                      <div className="h-[2px] flex-1 bg-slate-800" />
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1">Non-stop</span>
                  </div>

                  {/* Destination */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-white tracking-tight">
                      {formatTime(flight.arrival_time)}
                    </div>
                    <div className="text-xs font-medium text-slate-300">{flight.destination}</div>
                    <div className="text-[10px] text-slate-500">Estimated Arrival</div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-800 pt-3 md:pt-0 min-w-[150px]">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-slate-400">Fare per passenger</div>
                    <div className="text-2xl font-extrabold text-white">
                      ₹{Number(flight.price).toLocaleString('en-IN')}
                    </div>
                    {/* Seats inventory badge */}
                    <div className="mt-1">
                      {isSoldOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
                          <AlertCircle className="h-3 w-3" /> Sold Out
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          isLowSeats ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLowSeats ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          {available} seats remaining
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectFlight(flight)}
                    disabled={isSoldOut}
                    className={`mt-2 flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                      isSoldOut
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40'
                    }`}
                  >
                    <span>{isSoldOut ? 'Unavailable' : 'Book Now'}</span>
                    {!isSoldOut && <ArrowRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
