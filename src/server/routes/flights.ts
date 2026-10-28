/**
 * Flights API Routes
 * Handles flight search, listings, creation, updating, and schedule management.
 */

import { Router } from 'express';
import { pool, memoryDb, publishDbChange, checkPostgresHealth } from '../db/connection';

export const flightsRouter = Router();

// GET /api/flights - Retrieve all flights
flightsRouter.get('/', async (_req, res) => {
  try {
    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      const result = await pool.query(`
        SELECT flight_id, airline_name, flight_number, source, destination, 
               departure_time, arrival_time, price, total_seats,
               COALESCE(available_seats, total_seats) as available_seats
        FROM flights
        ORDER BY departure_time ASC;
      `);
      return res.json({ success: true, flights: result.rows });
    }

    // Memory replica
    return res.json({ success: true, flights: memoryDb.flights });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/flights/search - Search flights with validation
flightsRouter.get('/search', async (req, res) => {
  try {
    const { source, destination, date, seats = '1' } = req.query;

    const seatsNum = parseInt(seats as string, 10);
    if (isNaN(seatsNum) || seatsNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid seat count' });
    }

    const sourceStr = (source as string || '').trim().toLowerCase();
    const destStr = (destination as string || '').trim().toLowerCase();

    if (sourceStr && destStr && sourceStr === destStr) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination cities cannot be identical.',
      });
    }

    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      let query = `
        SELECT flight_id, airline_name, flight_number, source, destination, 
               departure_time, arrival_time, price, total_seats,
               COALESCE(available_seats, total_seats) as available_seats
        FROM flights
        WHERE departure_time > NOW()
          AND COALESCE(available_seats, total_seats) >= $1
      `;
      const params: any[] = [seatsNum];

      if (sourceStr) {
        params.push(`%${sourceStr}%`);
        query += ` AND LOWER(source) LIKE $${params.length}`;
      }
      if (destStr) {
        params.push(`%${destStr}%`);
        query += ` AND LOWER(destination) LIKE $${params.length}`;
      }
      if (date) {
        params.push(date);
        query += ` AND DATE(departure_time) = $${params.length}`;
      }

      query += ` ORDER BY departure_time ASC;`;

      const result = await pool.query(query, params);
      return res.json({ success: true, flights: result.rows });
    }

    // Memory filter
    const now = new Date();
    const filtered = memoryDb.flights.filter((f) => {
      const depDate = new Date(f.departure_time);
      if (depDate <= now) return false;
      if (f.available_seats < seatsNum) return false;
      if (sourceStr && !f.source.toLowerCase().includes(sourceStr)) return false;
      if (destStr && !f.destination.toLowerCase().includes(destStr)) return false;
      if (date && f.departure_time.slice(0, 10) !== (date as string)) return false;
      return true;
    });

    return res.json({ success: true, flights: filtered });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/flights/:id - Single flight lookup
flightsRouter.get('/:id', async (req, res) => {
  try {
    const flightId = parseInt(req.params.id, 10);
    const dbStatus = await checkPostgresHealth();

    if (dbStatus.isConnectedToPostgres) {
      const result = await pool.query(
        `SELECT * FROM flights WHERE flight_id = $1`,
        [flightId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
      }
      return res.json({ success: true, flight: result.rows[0] });
    }

    const flight = memoryDb.flights.find((f) => f.flight_id === flightId);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }
    return res.json({ success: true, flight });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/flights - Admin create new flight
flightsRouter.post('/', async (req, res) => {
  try {
    const { airline_name, flight_number, source, destination, departure_time, arrival_time, price, total_seats } = req.body;

    if (!airline_name || !flight_number || !source || !destination || !departure_time || !arrival_time || !price || !total_seats) {
      return res.status(400).json({ success: false, message: 'All flight fields are required.' });
    }

    if (new Date(arrival_time) <= new Date(departure_time)) {
      return res.status(400).json({ success: false, message: 'Arrival time must be after departure time.' });
    }

    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      const result = await pool.query(
        `INSERT INTO flights (airline_name, flight_number, source, destination, departure_time, arrival_time, price, total_seats, available_seats)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING *;`,
        [airline_name, flight_number, source, destination, departure_time, arrival_time, price, total_seats]
      );
      publishDbChange('flights', 'INSERT', { flight_id: result.rows[0].flight_id });
      return res.status(201).json({ success: true, flight: result.rows[0] });
    }

    const nextId = memoryDb.flights.length > 0 ? Math.max(...memoryDb.flights.map((f) => f.flight_id)) + 1 : 1;
    const newFlight = {
      flight_id: nextId,
      airline_name,
      flight_number,
      source,
      destination,
      departure_time,
      arrival_time,
      price: parseFloat(price),
      total_seats: parseInt(total_seats, 10),
      available_seats: parseInt(total_seats, 10),
    };
    memoryDb.flights.push(newFlight);
    publishDbChange('flights', 'INSERT', { flight_id: nextId });
    return res.status(201).json({ success: true, flight: newFlight });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/flights/:id - Admin update flight
flightsRouter.put('/:id', async (req, res) => {
  try {
    const flightId = parseInt(req.params.id, 10);
    const { price, departure_time, arrival_time, available_seats } = req.body;

    const dbStatus = await checkPostgresHealth();
    if (dbStatus.isConnectedToPostgres) {
      const result = await pool.query(
        `UPDATE flights
         SET price = COALESCE($1, price),
             departure_time = COALESCE($2, departure_time),
             arrival_time = COALESCE($3, arrival_time),
             available_seats = COALESCE($4, available_seats)
         WHERE flight_id = $5
         RETURNING *;`,
        [price, departure_time, arrival_time, available_seats, flightId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Flight not found' });
      }
      publishDbChange('flights', 'UPDATE', { flight_id: flightId });
      return res.json({ success: true, flight: result.rows[0] });
    }

    const flight = memoryDb.flights.find((f) => f.flight_id === flightId);
    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }
    if (price !== undefined) flight.price = parseFloat(price);
    if (departure_time !== undefined) flight.departure_time = departure_time;
    if (arrival_time !== undefined) flight.arrival_time = arrival_time;
    if (available_seats !== undefined) flight.available_seats = parseInt(available_seats, 10);

    publishDbChange('flights', 'UPDATE', { flight_id: flightId });
    return res.json({ success: true, flight });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
