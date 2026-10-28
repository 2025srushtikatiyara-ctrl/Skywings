/**
 * Passenger Details, Simulated Payment, and PNR Confirmation Modal
 */

import React, { useState } from 'react';
import { Flight, Booking } from '../../types';
import { createBooking } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  CheckCircle2,
  Plane,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  Download,
  Share2,
} from 'lucide-react';

interface BookingModalProps {
  flight: Flight;
  seatsRequested: number;
  onClose: () => void;
  onBookingComplete: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  flight,
  seatsRequested,
  onClose,
  onBookingComplete,
}) => {
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'CONFIRMATION'>('DETAILS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState(seatsRequested);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'NETBANKING'>('CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const totalAmount = Math.round(Number(flight.price) * seats * 100) / 100;

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Passenger full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    setStep('PAYMENT');
  };

  const handlePaymentSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({
        flight_id: flight.flight_id,
        seats_booked: seats,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
      });

      setConfirmedBooking(booking);
      setStep('CONFIRMATION');
      onBookingComplete(booking);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err.message || 'Booking submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Plane className="h-4 w-4 transform -rotate-45" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                {step === 'CONFIRMATION' ? 'Reservation Confirmed' : `Book ${flight.airline_name} ${flight.flight_number}`}
              </h3>
              <p className="text-xs text-slate-400">
                {flight.source} → {flight.destination}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Passenger Information */}
        {step === 'DETAILS' && (
          <form onSubmit={handleDetailsSubmit} className="p-6 space-y-4">
            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Flight:</span>
                <span className="ml-1 font-semibold text-white">{flight.flight_number}</span>
              </div>
              <div>
                <span className="text-slate-400">Base Fare:</span>
                <span className="ml-1 font-semibold text-cyan-400">₹{Number(flight.price).toLocaleString('en-IN')} / seat</span>
              </div>
              <div>
                <span className="text-slate-400">Seats:</span>
                <span className="ml-1 font-bold text-white">{seats}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Passenger Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address (for ticket & receipt) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh.sharma@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-9 pr-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Number of Passengers / Seats
                </label>
                <select
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div>
                <div className="text-[11px] text-slate-400">Total Authoritative Fare</div>
                <div className="text-xl font-extrabold text-white">₹{totalAmount.toLocaleString('en-IN')}</div>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all"
              >
                Continue to Payment
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Simulated Payment */}
        {step === 'PAYMENT' && (
          <div className="p-6 space-y-5">
            <div className="rounded-2xl bg-cyan-950/30 border border-cyan-800/40 p-4 text-xs text-cyan-300">
              <div className="flex items-center gap-2 font-bold text-cyan-200 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Simulated Payment Gateway (Academic Environment)</span>
              </div>
              <p className="text-[11px] text-cyan-300/80">
                This is a mock payment simulation. No actual credit card charge will be made.
                Upon submission, a PostgreSQL transaction will lock the flight row and decrement inventory.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`rounded-xl p-3 border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`rounded-xl p-3 border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'UPI'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold">UPI</span>
                  <span>Fast Pay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('NETBANKING')}
                  className={`rounded-xl p-3 border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'NETBANKING'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Plane className="h-4 w-4" />
                  <span>NetBanking</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Passenger</span>
                <span className="font-semibold text-white">{fullName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Email</span>
                <span className="text-white">{email}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Seats</span>
                <span className="text-white">{seats} passenger(s)</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-900 pt-2 font-bold text-sm text-white">
                <span>Total Amount Due</span>
                <span className="text-cyan-400 font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Back to Details
              </button>
              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Acquiring Lock & Confirming...' : `Pay ₹${totalAmount.toLocaleString('en-IN')}`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation & Boarding Pass */}
        {step === 'CONFIRMATION' && confirmedBooking && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-xl font-extrabold text-white">Booking Confirmed!</h4>
              <p className="text-xs text-slate-400">
                Your flight reservation has been committed to the PostgreSQL database.
              </p>
            </div>

            {/* Boarding Pass Card */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/60 p-5 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-4 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                    Booking Reference (PNR)
                  </div>
                  <div className="text-2xl font-mono font-black text-cyan-400 tracking-wider">
                    {confirmedBooking.booking_reference || `SKW-${confirmedBooking.booking_id}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    Confirmed
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    ID #{confirmedBooking.booking_id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div>
                  <span className="text-[10px] text-slate-400">Passenger</span>
                  <div className="font-bold text-white text-sm">{fullName}</div>
                  <div className="text-slate-400 text-[11px]">{email}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Flight & Airline</span>
                  <div className="font-bold text-white text-sm">{flight.airline_name} {flight.flight_number}</div>
                  <div className="text-cyan-400 text-[11px]">{seats} Reserved Seat(s)</div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white">{flight.source}</div>
                  <div className="text-[10px] text-slate-400">Origin</div>
                </div>
                <div className="flex flex-col items-center px-4">
                  <Plane className="h-4 w-4 text-cyan-400" />
                  <span className="text-[9px] text-slate-500">Non-Stop</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{flight.destination}</div>
                  <div className="text-[10px] text-slate-400">Destination</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Print / Save Ticket</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
