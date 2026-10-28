/**
 * Airline Booking Logic, Pricing, and Seat Inventory Rules
 * Used both in server booking routes and client validations.
 */

export interface FlightRecord {
  flight_id: number;
  airline_name: string;
  flight_number: string;
  source: string;
  destination: string;
  departure_time: string | Date;
  arrival_time: string | Date;
  price: number | string;
  total_seats: number;
  available_seats?: number;
}

export interface BookingValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  totalAmount?: number;
}

export interface CancellationResult {
  isEligible: boolean;
  refundAmount: number;
  seatsToRestore: number;
  reason?: string;
}

/**
 * Calculates total booking amount reliably from authoritative database price
 */
export function calculateAuthoritativePrice(
  flightPrice: number | string,
  seatsBooked: number
): number {
  const numericPrice = typeof flightPrice === 'string' ? parseFloat(flightPrice) : flightPrice;
  if (isNaN(numericPrice) || numericPrice <= 0) {
    throw new Error('Invalid flight price');
  }
  if (!Number.isInteger(seatsBooked) || seatsBooked <= 0) {
    throw new Error('Seats booked must be a positive whole integer');
  }
  return Math.round(numericPrice * seatsBooked * 100) / 100;
}

/**
 * Validates a booking request against flight details
 */
export function validateBookingRequest(
  flight: FlightRecord,
  seatsRequested: number,
  now: Date = new Date()
): BookingValidationResult {
  if (!flight) {
    return {
      isValid: false,
      errorCode: 'FLIGHT_NOT_FOUND',
      errorMessage: 'The selected flight could not be found.',
    };
  }

  const depTime = new Date(flight.departure_time);
  if (isNaN(depTime.getTime())) {
    return {
      isValid: false,
      errorCode: 'INVALID_DEPARTURE_TIME',
      errorMessage: 'Invalid departure time for this flight.',
    };
  }

  if (depTime.getTime() <= now.getTime()) {
    return {
      isValid: false,
      errorCode: 'FLIGHT_ALREADY_DEPARTED',
      errorMessage: 'This flight has already departed and cannot be booked.',
    };
  }

  if (!Number.isInteger(seatsRequested) || seatsRequested < 1 || seatsRequested > 9) {
    return {
      isValid: false,
      errorCode: 'INVALID_SEAT_COUNT',
      errorMessage: 'Please select between 1 and 9 seats.',
    };
  }

  const available = flight.available_seats !== undefined ? flight.available_seats : flight.total_seats;
  if (available < seatsRequested) {
    return {
      isValid: false,
      errorCode: 'INSUFFICIENT_SEATS',
      errorMessage: `Only ${available} seat(s) available. You requested ${seatsRequested}.`,
    };
  }

  const totalAmount = calculateAuthoritativePrice(flight.price, seatsRequested);

  return {
    isValid: true,
    totalAmount,
  };
}

/**
 * Validates cancellation eligibility
 */
export function evaluateCancellationEligibility(
  booking: {
    booking_id: number;
    booking_status: string;
    seats_booked: number;
    total_amount: number | string;
    flight_departure_time: string | Date;
  },
  now: Date = new Date()
): CancellationResult {
  if (booking.booking_status.toLowerCase() === 'cancelled') {
    return {
      isEligible: false,
      refundAmount: 0,
      seatsToRestore: 0,
      reason: 'This booking has already been cancelled.',
    };
  }

  const depTime = new Date(booking.flight_departure_time);
  if (depTime.getTime() <= now.getTime()) {
    return {
      isEligible: false,
      refundAmount: 0,
      seatsToRestore: 0,
      reason: 'Flights that have already departed cannot be cancelled.',
    };
  }

  const amount = typeof booking.total_amount === 'string'
    ? parseFloat(booking.total_amount)
    : booking.total_amount;

  // Full refund if cancelled more than 2 hours prior to departure
  const hoursRemaining = (depTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const refundPercent = hoursRemaining >= 2 ? 1.0 : 0.8;
  const refundAmount = Math.round(amount * refundPercent * 100) / 100;

  return {
    isEligible: true,
    refundAmount,
    seatsToRestore: booking.seats_booked,
  };
}

/**
 * Generates an airline PNR booking reference (e.g. SKW-8F3K9)
 */
export function generateBookingReference(bookingId: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = bookingId * 2654435761;
  let code = '';
  for (let i = 0; i < 5; i++) {
    const idx = Math.abs((hash >> (i * 5)) & 31) % chars.length;
    code += chars[idx];
  }
  return `SKW-${code}`;
}
