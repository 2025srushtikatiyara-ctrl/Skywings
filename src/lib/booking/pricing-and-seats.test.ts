import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAuthoritativePrice,
  validateBookingRequest,
  evaluateCancellationEligibility,
  generateBookingReference,
} from './pricing-and-seats';

test('calculateAuthoritativePrice handles numbers and strings accurately', () => {
  assert.equal(calculateAuthoritativePrice(4500, 2), 9000);
  assert.equal(calculateAuthoritativePrice('5200.50', 3), 15601.5);
});

test('calculateAuthoritativePrice rejects non-positive or non-integer seats', () => {
  assert.throws(() => calculateAuthoritativePrice(4500, 0));
  assert.throws(() => calculateAuthoritativePrice(4500, -1));
  assert.throws(() => calculateAuthoritativePrice(4500, 1.5));
});

test('validateBookingRequest rejects departed flights', () => {
  const flight = {
    flight_id: 1,
    airline_name: 'IndiGo',
    flight_number: '6E-201',
    source: 'Mumbai',
    destination: 'Delhi',
    departure_time: '2026-01-01T10:00:00Z',
    arrival_time: '2026-01-01T12:00:00Z',
    price: 4500,
    total_seats: 180,
    available_seats: 100,
  };
  const now = new Date('2026-01-02T10:00:00Z');
  const res = validateBookingRequest(flight, 2, now);
  assert.equal(res.isValid, false);
  assert.equal(res.errorCode, 'FLIGHT_ALREADY_DEPARTED');
});

test('validateBookingRequest rejects when requested seats exceed available', () => {
  const flight = {
    flight_id: 1,
    airline_name: 'IndiGo',
    flight_number: '6E-201',
    source: 'Mumbai',
    destination: 'Delhi',
    departure_time: '2026-11-01T10:00:00Z',
    arrival_time: '2026-11-01T12:00:00Z',
    price: 4500,
    total_seats: 180,
    available_seats: 2,
  };
  const now = new Date('2026-10-28T10:00:00Z');
  const res = validateBookingRequest(flight, 3, now);
  assert.equal(res.isValid, false);
  assert.equal(res.errorCode, 'INSUFFICIENT_SEATS');
});

test('validateBookingRequest approves valid reservation', () => {
  const flight = {
    flight_id: 1,
    airline_name: 'IndiGo',
    flight_number: '6E-201',
    source: 'Mumbai',
    destination: 'Delhi',
    departure_time: '2026-11-01T10:00:00Z',
    arrival_time: '2026-11-01T12:00:00Z',
    price: 4500,
    total_seats: 180,
    available_seats: 50,
  };
  const now = new Date('2026-10-28T10:00:00Z');
  const res = validateBookingRequest(flight, 2, now);
  assert.equal(res.isValid, true);
  assert.equal(res.totalAmount, 9000);
});

test('evaluateCancellationEligibility handles cancelled or departed bookings correctly', () => {
  const cancelledBooking = {
    booking_id: 1,
    booking_status: 'Cancelled',
    seats_booked: 2,
    total_amount: 9000,
    flight_departure_time: '2026-11-01T10:00:00Z',
  };
  assert.equal(evaluateCancellationEligibility(cancelledBooking).isEligible, false);

  const activeBooking = {
    booking_id: 1,
    booking_status: 'Confirmed',
    seats_booked: 2,
    total_amount: 9000,
    flight_departure_time: '2026-11-01T10:00:00Z',
  };
  const now = new Date('2026-10-28T10:00:00Z');
  const eligible = evaluateCancellationEligibility(activeBooking, now);
  assert.equal(eligible.isEligible, true);
  assert.equal(eligible.refundAmount, 9000);
  assert.equal(eligible.seatsToRestore, 2);
});

test('generateBookingReference produces consistent PNR code', () => {
  const pnr1 = generateBookingReference(101);
  const pnr2 = generateBookingReference(101);
  assert.equal(pnr1, pnr2);
  assert.match(pnr1, /^SKW-[A-Z0-9]{5}$/);
});
