/**
 * PostgreSQL Database Connection & Compatibility Engine
 * Connects to PostgreSQL 18 `airline_reservation` database via `pg.Pool`
 * Includes LISTEN/NOTIFY listener, health detection, and fallback memory replica.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

dotenv.config();

const { Pool } = pg;

export interface DatabaseStatus {
  isConnectedToPostgres: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
  lastChecked: string;
  errorMessage?: string;
  isFallbackMode: boolean;
}

// Global Event Emitter for Real-Time SSE broadcasts
export const dbEvents = new EventEmitter();

const PGHOST = (process.env.PGHOST || 'localhost').trim().replace(/[*]+$/, '') || 'localhost';
const PGPORT = parseInt(process.env.PGPORT || '5432', 10);
const PGDATABASE = (process.env.PGDATABASE || 'airline_reservation').trim();
const PGUSER = (process.env.PGUSER || 'postgres').trim();
const PGPASSWORD = process.env.PGPASSWORD || '';

// Connection pool configuration
export const pool = new Pool({
  host: PGHOST,
  port: PGPORT,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  statement_timeout: 10000,
});

let isPgConnected = false;
let lastPgError = '';

// In-Memory PostgreSQL replica for fallback/immediate dev preview with existing sample records
export interface InMemoryState {
  passengers: Array<{
    passenger_id: number;
    full_name: string;
    email: string;
    phone: string | null;
  }>;
  flights: Array<{
    flight_id: number;
    airline_name: string;
    flight_number: string;
    source: string;
    destination: string;
    departure_time: string;
    arrival_time: string;
    price: number;
    total_seats: number;
    available_seats: number;
  }>;
  bookings: Array<{
    booking_id: number;
    passenger_id: number;
    flight_id: number;
    booking_date: string;
    seats_booked: number;
    total_amount: number;
    booking_status: string;
  }>;
  saved_queries: Array<{
    query_id: number;
    name: string;
    sql_text: string;
    description: string;
    created_at: string;
  }>;
  query_history: Array<{
    history_id: number;
    sql_text: string;
    execution_time_ms: number;
    row_count: number;
    status: string;
    error_summary: string | null;
    created_at: string;
  }>;
  audit_logs: Array<{
    audit_id: number;
    admin_user: string;
    action_category: string;
    execution_id: string;
    query_classification: string;
    sanitized_sql: string;
    affected_rows: number;
    duration_ms: number;
    status: string;
    created_at: string;
  }>;
}

// Expected existing data from directive Section 3:
// Sample passengers, sample flights (IndiGo 6E-201, Air India AI-101, Akasa Air QP-140),
// and at least one booking with passenger ID 1, flight ID 1, 2 seats, ₹9,000.
export const memoryDb: InMemoryState = {
  passengers: [
    {
      passenger_id: 1,
      full_name: 'Rajesh Sharma',
      email: 'rajesh.sharma@example.com',
      phone: '+91 98765 43210',
    },
    {
      passenger_id: 2,
      full_name: 'Priya Iyer',
      email: 'priya.iyer@example.com',
      phone: '+91 98201 11223',
    },
    {
      passenger_id: 3,
      full_name: 'Vikram Malhotra',
      email: 'vikram.m@example.com',
      phone: '+91 97112 33445',
    },
  ],
  flights: [
    {
      flight_id: 1,
      airline_name: 'IndiGo',
      flight_number: '6E-201',
      source: 'Mumbai',
      destination: 'Delhi',
      departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      arrival_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      price: 4500.0,
      total_seats: 180,
      available_seats: 178, // 180 - 2 (booked)
    },
    {
      flight_id: 2,
      airline_name: 'Air India',
      flight_number: 'AI-101',
      source: 'Mumbai',
      destination: 'Bengaluru',
      departure_time: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      arrival_time: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      price: 5200.0,
      total_seats: 180,
      available_seats: 180,
    },
    {
      flight_id: 3,
      airline_name: 'Akasa Air',
      flight_number: 'QP-140',
      source: 'Delhi',
      destination: 'Mumbai',
      departure_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      arrival_time: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      price: 4200.0,
      total_seats: 189,
      available_seats: 189,
    },
    {
      flight_id: 4,
      airline_name: 'IndiGo',
      flight_number: '6E-504',
      source: 'Bengaluru',
      destination: 'Delhi',
      departure_time: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      arrival_time: new Date(Date.now() + 39 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      price: 5800.0,
      total_seats: 186,
      available_seats: 186,
    },
  ],
  bookings: [
    {
      booking_id: 1,
      passenger_id: 1,
      flight_id: 1,
      booking_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      seats_booked: 2,
      total_amount: 9000.0,
      booking_status: 'Confirmed',
    },
  ],
  saved_queries: [
    {
      query_id: 1,
      name: 'List Upcoming Flights',
      sql_text: 'SELECT * FROM flights ORDER BY departure_time;',
      description: 'Fetch all scheduled flights ordered by departure time',
      created_at: new Date().toISOString(),
    },
    {
      query_id: 2,
      name: 'Passenger Directory',
      sql_text: 'SELECT * FROM passengers ORDER BY passenger_id;',
      description: 'Inspect registered passengers and contacts',
      created_at: new Date().toISOString(),
    },
    {
      query_id: 3,
      name: 'Full Booking Audit with Passenger & Flight JOIN',
      sql_text: `SELECT 
    b.booking_id,
    p.full_name,
    p.email,
    f.flight_number,
    f.source,
    f.destination,
    b.seats_booked,
    b.total_amount,
    b.booking_status
FROM bookings b
JOIN passengers p ON p.passenger_id = b.passenger_id
JOIN flights f ON f.flight_id = b.flight_id
ORDER BY b.booking_date DESC;`,
      description: 'Comprehensive 3-table relational JOIN of bookings, passengers, and flights',
      created_at: new Date().toISOString(),
    },
    {
      query_id: 4,
      name: 'Schema Tables Inspection',
      sql_text: `SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;`,
      description: 'Inspect user tables in the current PostgreSQL catalog',
      created_at: new Date().toISOString(),
    },
  ],
  query_history: [],
  audit_logs: [],
};

// Check PostgreSQL connectivity periodically
export async function checkPostgresHealth(): Promise<DatabaseStatus> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      isPgConnected = true;
      lastPgError = '';
    } finally {
      client.release();
    }
  } catch (err: any) {
    isPgConnected = false;
    lastPgError = err.message || 'Connection failed';
  }

  return {
    isConnectedToPostgres: isPgConnected,
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    poolTotal: pool.totalCount,
    poolIdle: pool.idleCount,
    poolWaiting: pool.waitingCount,
    lastChecked: new Date().toISOString(),
    errorMessage: lastPgError || undefined,
    isFallbackMode: !isPgConnected,
  };
}

// Fire health check immediately on start
checkPostgresHealth().catch(() => {});
setInterval(() => checkPostgresHealth().catch(() => {}), 15000);

// Notify all connected frontend SSE clients about table invalidations
export function publishDbChange(table: string, action: string, details?: any) {
  const eventPayload = {
    table,
    action,
    timestamp: new Date().toISOString(),
    details,
  };
  dbEvents.emit('change', eventPayload);
}
