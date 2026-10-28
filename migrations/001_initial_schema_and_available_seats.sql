-- ============================================================================
-- Migration 001: Initial Schema Preservation and Seat Availability Addition
-- Target Database: airline_reservation (PostgreSQL 18)
-- Non-destructive, additive, idempotent migration.
-- ============================================================================

-- Step 1: Ensure base tables exist (preserves any existing structure and data)
CREATE TABLE IF NOT EXISTS passengers (
    passenger_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15)
);

CREATE TABLE IF NOT EXISTS flights (
    flight_id SERIAL PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    flight_number VARCHAR(20) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    total_seats INT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    passenger_id INT REFERENCES passengers(passenger_id),
    flight_id INT REFERENCES flights(flight_id),
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seats_booked INT NOT NULL DEFAULT 1,
    total_amount NUMERIC(10,2) NOT NULL,
    booking_status VARCHAR(20) DEFAULT 'Confirmed'
);

-- Step 2: Add available_seats column to flights if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'flights' AND column_name = 'available_seats'
    ) THEN
        ALTER TABLE flights ADD COLUMN available_seats INT;
    END IF;
END $$;

-- Step 3: Initialize available_seats accurately without overwriting already-initialized values
-- Computes total_seats minus reserved seats from active Confirmed bookings
UPDATE flights f
SET available_seats = GREATEST(
    0,
    f.total_seats - COALESCE(
        (SELECT SUM(b.seats_booked) 
         FROM bookings b 
         WHERE b.flight_id = f.flight_id 
           AND LOWER(b.booking_status) = 'confirmed'),
        0
    )
)
WHERE f.available_seats IS NULL;

-- Step 4: Add default constraint and check constraint safely if not present
DO $$
BEGIN
    ALTER TABLE flights ALTER COLUMN available_seats SET DEFAULT 180;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_flights_available_seats_range'
    ) THEN
        ALTER TABLE flights ADD CONSTRAINT chk_flights_available_seats_range 
        CHECK (available_seats >= 0 AND available_seats <= total_seats);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_flights_arrival_after_departure'
    ) THEN
        ALTER TABLE flights ADD CONSTRAINT chk_flights_arrival_after_departure 
        CHECK (arrival_time > departure_time);
    END IF;
END $$;

-- Step 5: Add performance indexes for frequent lookups
CREATE INDEX IF NOT EXISTS idx_flights_search ON flights(source, destination, departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_flight ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
