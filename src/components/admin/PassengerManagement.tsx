/**
 * Passenger CRM & Customer Profiles Management
 */

import React, { useState } from 'react';
import { Passenger } from '../../types';
import { Users, Search, Mail, Phone, Ticket, IndianRupee } from 'lucide-react';

interface PassengerManagementProps {
  passengers: Passenger[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export const PassengerManagement: React.FC<PassengerManagementProps> = ({
  passengers,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Passenger CRM Directory</span>
          </h2>
          <p className="text-xs text-slate-400">
            Registered customer identities, unique email credentials, and lifetime reservation counts.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Passengers Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Passenger ID</th>
                <th className="py-3 px-4 font-semibold">Full Name</th>
                <th className="py-3 px-4 font-semibold">Email Address</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Total Bookings</th>
                <th className="py-3 px-4 font-semibold">Cumulative Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {passengers.map((p) => (
                <tr key={p.passenger_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">#{p.passenger_id}</td>
                  <td className="py-3 px-4 font-bold text-white">{p.full_name}</td>
                  <td className="py-3 px-4 text-slate-300 font-mono flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-slate-500" />
                    <span>{p.email}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {p.phone || <span className="text-slate-600 italic">Not on file</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 font-bold text-blue-400 border border-blue-500/20 font-mono">
                      <Ticket className="h-3 w-3" />
                      {p.total_bookings ?? 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    ₹{Number(p.total_spent || 0).toLocaleString('en-IN')}
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
