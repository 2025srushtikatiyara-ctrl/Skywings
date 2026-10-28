/**
 * Bookings API Routes
 * Handles passenger registration, transaction-guarded booking with FOR UPDATE lock,
 * seat decrement, booking lookup, and atomic cancellation.
 */

import { Router } from 'express';
import { pool, memoryDb, publishDbChange, checkPostgresHealth } from '../db/connection';
import {
  validateBookingRequest,
  evaluateCancellationEligibility,
  calculateAuthoritativePrice,
  generateBookingReference,
} from '../../lib/booking/pricing-and-seats';

export const bookingsRouter = Router();

// GET /api/bookings - Admin list of all bookings with full JOINs
bookingsRouter.get('/', async (_req, res) => {
  try {
    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      const result = await pool.query(`
        SELECT 
          b.booking_id,
          b.booking_date,
          b.seats_booked,
          b.total_amount,
          b.booking_status,
          p.passenger_id,
          p.full_name AS passenger_name,
          p.email AS passenger_email,
          p.phone AS passenger_phone,
          f.flight_id,
          f.airline_name,
          f.flight_number,
          f.source,
          f.destination,
          f.departure_time,
          f.arrival_time
        FROM bookings b
        JOIN passengers p ON p.passenger_id = b.passenger_id
        JOIN flights f ON f.flight_id = b.flight_id
        ORDER BY b.booking_date DESC;
      `);
      return res.json({ success: true, bookings: result.rows });
    }

    // Memory replica with JOIN
    const joined = memoryDb.bookings.map((b) => {
      const passenger = memoryDb.passengers.find((p) => p.passenger_id === b.passenger_id);
      const flight = memoryDb.flights.find((f) => f.flight_id === b.flight_id);
      return {
        booking_id: b.booking_id,
        booking_date: b.booking_date,
        seats_booked: b.seats_booked,
        total_amount: b.total_amount,
        booking_status: b.booking_status,
        passenger_id: b.passenger_id,
        passenger_name: passenger?.full_name || 'Passenger',
        passenger_email: passenger?.email || '',
        passenger_phone: passenger?.phone || '',
        flight_id: b.flight_id,
        airline_name: flight?.airline_name || '',
        flight_number: flight?.flight_number || '',
        source: flight?.source || '',
        destination: flight?.destination || '',
        departure_time: flight?.departure_time || '',
        arrival_time: flight?.arrival_time || '',
      };
    });

    return res.json({ success: true, bookings: joined });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/lookup - Passenger lookup by booking reference or email
bookingsRouter.get('/lookup', async (req, res) => {
  try {
    const { email, reference } = req.query;

    if (!email && !reference) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either passenger email or booking reference to look up reservations.',
      });
    }

    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      let query = `
        SELECT 
          b.booking_id,
          b.booking_date,
          b.seats_booked,
          b.total_amount,
          b.booking_status,
          p.passenger_id,
          p.full_name AS passenger_name,
          p.email AS passenger_email,
          p.phone AS passenger_phone,
          f.flight_id,
          f.airline_name,
          f.flight_number,
          f.source,
          f.destination,
          f.departure_time,
          f.arrival_time
        FROM bookings b
        JOIN passengers p ON p.passenger_id = b.passenger_id
        JOIN flights f ON f.flight_id = b.flight_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (email) {
        params.push((email as string).trim().toLowerCase());
        query += ` AND LOWER(p.email) = $${params.length}`;
      }

      if (reference) {
        // Parse booking_id if given reference like SKW-XXXXX or numeric ID
        const refStr = (reference as string).trim();
        const numMatch = refStr.match(/\d+/);
        if (numMatch) {
          params.push(parseInt(numMatch[0], 10));
          query += ` AND b.booking_id = $${params.length}`;
        }
      }

      query += ` ORDER BY b.booking_date DESC;`;

      const result = await pool.query(query, params);
      const bookings = result.rows.map((row) => ({
        ...row,
        booking_reference: generateBookingReference(row.booking_id),
      }));

      return res.json({ success: true, bookings });
    }

    // Memory lookup
    let results = memoryDb.bookings.map((b) => {
      const passenger = memoryDb.passengers.find((p) => p.passenger_id === b.passenger_id);
      const flight = memoryDb.flights.find((f) => f.flight_id === b.flight_id);
      return {
        booking_id: b.booking_id,
        booking_reference: generateBookingReference(b.booking_id),
        booking_date: b.booking_date,
        seats_booked: b.seats_booked,
        total_amount: b.total_amount,
        booking_status: b.booking_status,
        passenger_id: b.passenger_id,
        passenger_name: passenger?.full_name || '',
        passenger_email: passenger?.email || '',
        passenger_phone: passenger?.phone || '',
        flight_id: b.flight_id,
        airline_name: flight?.airline_name || '',
        flight_number: flight?.flight_number || '',
        source: flight?.source || '',
        destination: flight?.destination || '',
        departure_time: flight?.departure_time || '',
        arrival_time: flight?.arrival_time || '',
      };
    });

    if (email) {
      const targetEmail = (email as string).trim().toLowerCase();
      results = results.filter((b) => b.passenger_email.toLowerCase() === targetEmail);
    }

    if (reference) {
      const targetRef = (reference as string).trim().toUpperCase();
      results = results.filter(
        (b) => b.booking_reference === targetRef || b.booking_id.toString() === targetRef
      );
    }

    return res.json({ success: true, bookings: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings - Atomic reservation creation with row locking
bookingsRouter.post('/', async (req, res) => {
  const { flight_id, seats_booked = 1, full_name, email, phone } = req.body;

  if (!flight_id || !full_name || !email) {
    return res.status(400).json({
      success: false,
      message: 'Flight, passenger full name, and email are required.',
    });
  }

  const seats = parseInt(seats_booked, 10);
  if (isNaN(seats) || seats < 1 || seats > 9) {
    return res.status(400).json({
      success: false,
      message: 'Seats booked must be between 1 and 9.',
    });
  }

  const dbStatus = await checkPostgresHealth();

  if (dbStatus.isConnectedToPostgres) {
    // REAL POSTGRESQL TRANSACTION WITH FOR UPDATE LOCK
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      // Lock flight row
      const flightRes = await client.query(
        `SELECT flight_id, airline_name, flight_number, source, destination,
                departure_time, arrival_time, price, total_seats,
                COALESCE(available_seats, total_seats) as available_seats
         FROM flights
         WHERE flight_id = $1
         FOR UPDATE;`,
        [flight_id]
      );

      if (flightRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        return res.status(404).json({ success: false, message: 'Flight not found.' });
      }

      const flight = flightRes.rows[0];
      const validation = validateBookingRequest(flight, seats);
      if (!validation.isValid) {
        await client.query('ROLLBACK;');
        return res.status(400).json({ success: false, message: validation.errorMessage });
      }

      // Check or create passenger by unique email
      let passengerId: number;
      const passengerRes = await client.query(
        `SELECT passenger_id FROM passengers WHERE LOWER(email) = LOWER($1);`,
        [email.trim()]
      );

      if (passengerRes.rows.length > 0) {
        passengerId = passengerRes.rows[0].passenger_id;
        // Optionally update phone if provided
        if (phone) {
          await client.query(
            `UPDATE passengers SET phone = $1 WHERE passenger_id = $2;`,
            [phone, passengerId]
          );
        }
      } else {
        const insertPassenger = await client.query(
          `INSERT INTO passengers (full_name, email, phone)
           VALUES ($1, $2, $3)
           RETURNING passenger_id;`,
          [full_name.trim(), email.trim().toLowerCase(), phone || null]
        );
        passengerId = insertPassenger.rows[0].passenger_id;
      }

      // Calculate authoritative amount
      const totalAmount = calculateAuthoritativePrice(flight.price, seats);

      // Insert booking
      const bookingRes = await client.query(
        `INSERT INTO bookings (passenger_id, flight_id, seats_booked, total_amount, booking_status)
         VALUES ($1, $2, $3, $4, 'Confirmed')
         RETURNING booking_id, booking_date, seats_booked, total_amount, booking_status;`,
        [passengerId, flight_id, seats, totalAmount]
      );

      const createdBooking = bookingRes.rows[0];

      // Decrement available seats
      await client.query(
        `UPDATE flights
         SET available_seats = available_seats - $1
         WHERE flight_id = $2;`,
        [seats, flight_id]
      );

      await client.query('COMMIT;');

      // Publish live invalidation events
      publishDbChange('bookings', 'INSERT', { booking_id: createdBooking.booking_id });
      publishDbChange('flights', 'UPDATE', { flight_id });

      const bookingReference = generateBookingReference(createdBooking.booking_id);

      return res.status(201).json({
        success: true,
        booking: {
          ...createdBooking,
          booking_reference: bookingReference,
          passenger_name: full_name,
          passenger_email: email,
          airline_name: flight.airline_name,
          flight_number: flight.flight_number,
          source: flight.source,
          destination: flight.destination,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
        },
      });
    } catch (err: any) {
      await client.query('ROLLBACK;');
      return res.status(500).json({ success: false, message: `Booking failed: ${err.message}` });
    } finally {
      client.release();
    }
  } else {
    // MEMORY ENGINE REPLICA
    const flight = memoryDb.flights.find((f) => f.flight_id === flight_id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found.' });
    }

    const validation = validateBookingRequest(flight, seats);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errorMessage });
    }

    // Reuse or create passenger
    let passenger = memoryDb.passengers.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (!passenger) {
      const nextPid = memoryDb.passengers.length > 0
        ? Math.max(...memoryDb.passengers.map((p) => p.passenger_id)) + 1
        : 1;
      passenger = {
        passenger_id: nextPid,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || null,
      };
      memoryDb.passengers.push(passenger);
    }

    const totalAmount = calculateAuthoritativePrice(flight.price, seats);
    const nextBid = memoryDb.bookings.length > 0
      ? Math.max(...memoryDb.bookings.map((b) => b.booking_id)) + 1
      : 1;

    const newBooking = {
      booking_id: nextBid,
      passenger_id: passenger.passenger_id,
      flight_id: flight.flight_id,
      booking_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      seats_booked: seats,
      total_amount: totalAmount,
      booking_status: 'Confirmed',
    };

    memoryDb.bookings.push(newBooking);
    flight.available_seats -= seats;

    publishDbChange('bookings', 'INSERT', { booking_id: nextBid });
    publishDbChange('flights', 'UPDATE', { flight_id });

    const bookingReference = generateBookingReference(nextBid);

    return res.status(201).json({
      success: true,
      booking: {
        ...newBooking,
        booking_reference: bookingReference,
        passenger_name: passenger.full_name,
        passenger_email: passenger.email,
        airline_name: flight.airline_name,
        flight_number: flight.flight_number,
        source: flight.source,
        destination: flight.destination,
        departure_time: flight.departure_time,
        arrival_time: flight.arrival_time,
      },
    });
  }
});

// POST /api/bookings/:id/cancel - Cancellation with seat restoration in atomic transaction
bookingsRouter.post('/:id/cancel', async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const { email } = req.body;

  const dbStatus = await checkPostgresHealth();

  if (dbStatus.isConnectedToPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const bookingRes = await client.query(
        `SELECT 
          b.booking_id,
          b.booking_status,
          b.seats_booked,
          b.total_amount,
          f.flight_id,
          f.departure_time AS flight_departure_time,
          p.email AS passenger_email
         FROM bookings b
         JOIN flights f ON f.flight_id = b.flight_id
         JOIN passengers p ON p.passenger_id = b.passenger_id
         WHERE b.booking_id = $1
         FOR UPDATE OF b, f;`,
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        await client.query('ROLLBACK;');
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const booking = bookingRes.rows[0];

      // Verify email if provided (security check)
      if (email && booking.passenger_email.toLowerCase() !== email.trim().toLowerCase()) {
        await client.query('ROLLBACK;');
        return res.status(403).json({
          success: false,
          message: 'The email provided does not match the passenger record on this booking.',
        });
      }

      const evalRes = evaluateCancellationEligibility(booking);
      if (!evalRes.isEligible) {
        await client.query('ROLLBACK;');
        return res.status(400).json({ success: false, message: evalRes.reason });
      }

      // Update status
      await client.query(
        `UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = $1;`,
        [bookingId]
      );

      // Restore seats exactly once
      await client.query(
        `UPDATE flights SET available_seats = available_seats + $1 WHERE flight_id = $2;`,
        [evalRes.seatsToRestore, booking.flight_id]
      );

      await client.query('COMMIT;');

      publishDbChange('bookings', 'UPDATE', { booking_id: bookingId, status: 'Cancelled' });
      publishDbChange('flights', 'UPDATE', { flight_id: booking.flight_id });

      return res.json({
        success: true,
        message: 'Booking cancelled successfully. Seats have been restored.',
        refundAmount: evalRes.refundAmount,
        seatsRestored: evalRes.seatsToRestore,
      });
    } catch (err: any) {
      await client.query('ROLLBACK;');
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      client.release();
    }
  } else {
    // Memory engine
    const booking = memoryDb.bookings.find((b) => b.booking_id === bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const flight = memoryDb.flights.find((f) => f.flight_id === booking.flight_id);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Associated flight not found.' });
    }

    const passenger = memoryDb.passengers.find((p) => p.passenger_id === booking.passenger_id);
    if (email && passenger && passenger.email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'The email provided does not match the passenger record.',
      });
    }

    const evalRes = evaluateCancellationEligibility({
      booking_id: booking.booking_id,
      booking_status: booking.booking_status,
      seats_booked: booking.seats_booked,
      total_amount: booking.total_amount,
      flight_departure_time: flight.departure_time,
    });

    if (!evalRes.isEligible) {
      return res.status(400).json({ success: false, message: evalRes.reason });
    }

    booking.booking_status = 'Cancelled';
    flight.available_seats += evalRes.seatsToRestore;

    publishDbChange('bookings', 'UPDATE', { booking_id: bookingId, status: 'Cancelled' });
    publishDbChange('flights', 'UPDATE', { flight_id: flight.flight_id });

    return res.json({
      success: true,
      message: 'Booking cancelled successfully. Seats have been restored to available inventory.',
      refundAmount: evalRes.refundAmount,
      seatsRestored: evalRes.seatsToRestore,
    });
  }
});
