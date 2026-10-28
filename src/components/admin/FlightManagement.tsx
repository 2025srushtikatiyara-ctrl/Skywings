/**
 * Administrative Flight Management
 * Inspect, search, add, and adjust scheduled flight services.
 */

import React, { useState } from 'react';
import { Flight } from '../../types';
import { createFlight, updateFlight } from '../../services/api';
import {
  Plane,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  Armchair,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface FlightManagementProps {
  flights: Flight[];
  onRefresh: () => void;
}

export const FlightManagement: React.FC<FlightManagementProps> = ({ flights, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New flight form state
  const [airlineName, setAirlineName] = useState('IndiGo');
  const [flightNumber, setFlightNumber] = useState('');
  const [source, setSource] = useState('Mumbai');
  const [destination, setDestination] = useState('Delhi');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [price, setPrice] = useState('4500');
  const [totalSeats, setTotalSeats] = useState('180');

  // Edit flight form state
  const [editPrice, setEditPrice] = useState('');
  const [editSeats, setEditSeats] = useState('');

  const filtered = flights.filter(
    (f) =>
      f.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.airline_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightNumber.trim()) {
      setError('Flight number is required.');
      return;
    }
    if (new Date(arrivalTime) <= new Date(departureTime)) {
      setError('Arrival time must be after departure time.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createFlight({
        airline_name: airlineName,
        flight_number: flightNumber.trim().toUpperCase(),
        source,
        destination,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        price: parseFloat(price),
        total_seats: parseInt(totalSeats, 10),
      });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create flight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlight) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await updateFlight(editingFlight.flight_id, {
        price: editPrice ? parseFloat(editPrice) : undefined,
        available_seats: editSeats ? parseInt(editSeats, 10) : undefined,
      });
      setEditingFlight(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update flight');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-400" />
            <span>Flight Fleet & Schedules</span>
          </h2>
          <p className="text-xs text-slate-400">
            View, schedule, and configure fares for all PostgreSQL scheduled routes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search flight # or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              const now = new Date();
              const dep = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
              const arr = new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString().slice(0, 16);
              setDepartureTime(dep);
              setArrivalTime(arr);
              setFlightNumber(`6E-${Math.floor(200 + Math.random() * 800)}`);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Flight</span>
          </button>
        </div>
      </div>

      {/* Flight Fleet Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Airline & Number</th>
                <th className="py-3 px-4 font-semibold">Route</th>
                <th className="py-3 px-4 font-semibold">Departure Time</th>
                <th className="py-3 px-4 font-semibold">Arrival Time</th>
                <th className="py-3 px-4 font-semibold">Fare (₹)</th>
                <th className="py-3 px-4 font-semibold">Capacity & Left</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((f) => (
                <tr key={f.flight_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">#{f.flight_id}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{f.airline_name}</div>
                    <div className="font-mono text-cyan-400 text-[11px]">{f.flight_number}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="font-semibold text-white">{f.source}</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="font-semibold text-white">{f.destination}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {new Date(f.departure_time).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {new Date(f.arrival_time).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    ₹{Number(f.price).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-emerald-400 font-bold">{f.available_seats}</span>
                      <span className="text-slate-500">/ {f.total_seats}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingFlight(f);
                        setEditPrice(f.price.toString());
                        setEditSeats(f.available_seats.toString());
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Edit Flight"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Flight Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plane className="h-4 w-4 text-blue-400" />
                <span>Add Scheduled Flight</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Airline Carrier</label>
                  <select
                    value={airlineName}
                    onChange={(e) => setAirlineName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  >
                    <option value="IndiGo">IndiGo</option>
                    <option value="Air India">Air India</option>
                    <option value="Akasa Air">Akasa Air</option>
                    <option value="Vistara">Vistara</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Flight Number *</label>
                  <input
                    type="text"
                    required
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Source City *</label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Destination City *</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Departure Timestamp *</label>
                  <input
                    type="datetime-local"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Arrival Timestamp *</label>
                  <input
                    type="datetime-local"
                    required
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Ticket Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total Aircraft Seats *</label>
                  <input
                    type="number"
                    required
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 font-bold text-white shadow-lg transition-all"
                >
                  {isSubmitting ? 'Creating Flight...' : 'Create Flight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Flight Modal */}
      {editingFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Edit {editingFlight.flight_number}
              </h3>
              <button onClick={() => setEditingFlight(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Available Seats</label>
                <input
                  type="number"
                  value={editSeats}
                  onChange={(e) => setEditSeats(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingFlight(null)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 font-bold text-white transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
