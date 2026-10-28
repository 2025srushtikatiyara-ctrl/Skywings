/**
 * Unit Test Suite for SKY WINGS In-Browser SQL Engine
 * Verifies parsing, execution, queries, mutations, joins, and aggregates.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserDatabase } from './database';

test('BrowserDatabase initializes seed tables correctly', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('SHOW TABLES;');
  assert.equal(res.success, true);
  assert.ok(res.rows.length >= 4);
  const tableNames = res.rows.map((r) => r.table_name);
  assert.ok(tableNames.includes('flights'));
  assert.ok(tableNames.includes('passengers'));
  assert.ok(tableNames.includes('bookings'));
});

test('SELECT * FROM flights returns existing sample flights', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('SELECT * FROM flights;');
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 4);
  const flightNumbers = res.rows.map((r) => r.flight_number);
  assert.ok(flightNumbers.includes('6E-201'));
  assert.ok(flightNumbers.includes('AI-101'));
  assert.ok(flightNumbers.includes('QP-140'));
});

test('SELECT with WHERE, comparison, and AND/OR works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute("SELECT flight_number, price FROM flights WHERE price <= 4500 AND source = 'Mumbai';");
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 1);
  assert.equal(res.rows[0].flight_number, '6E-201');
  assert.equal(res.rows[0].price, 4500);
});

test('SELECT with LIKE wildcard works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute("SELECT flight_number FROM flights WHERE flight_number LIKE '6E%';");
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 2);
});

test('SELECT with IN and BETWEEN works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const resIn = db.execute("SELECT flight_number FROM flights WHERE source IN ('Mumbai', 'Delhi');");
  assert.equal(resIn.rowCount, 3);

  const resBetween = db.execute('SELECT flight_number FROM flights WHERE price BETWEEN 4000 AND 5000;');
  assert.equal(resBetween.rowCount, 2);
});

test('SELECT with ORDER BY, LIMIT, and OFFSET works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('SELECT flight_number, price FROM flights ORDER BY price DESC LIMIT 2 OFFSET 1;');
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 2);
  // Highest is 5800, offset 1 is 5200 (AI-101), next is 4500 (6E-201)
  assert.equal(res.rows[0].flight_number, 'AI-101');
  assert.equal(res.rows[1].flight_number, '6E-201');
});

test('Aggregates COUNT, SUM, AVG, MIN, MAX work', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('SELECT COUNT(*) AS total, SUM(price) AS sum_price, MIN(price) AS min_price, MAX(price) AS max_price FROM flights;');
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 1);
  assert.equal(res.rows[0].total, 4);
  assert.equal(res.rows[0].sum_price, 4500 + 5200 + 4200 + 5800);
  assert.equal(res.rows[0].min_price, 4200);
  assert.equal(res.rows[0].max_price, 5800);
});

test('GROUP BY with aggregate works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('SELECT source, COUNT(*) AS flight_count FROM flights GROUP BY source ORDER BY flight_count DESC;');
  assert.equal(res.success, true);
  // Mumbai has 2 flights
  const mumbai = res.rows.find((r) => r.source === 'Mumbai');
  assert.ok(mumbai);
  assert.equal(mumbai.flight_count, 2);
});

test('INNER JOIN between bookings and flights works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute(`
    SELECT b.booking_id, b.seats_booked, f.flight_number, f.source, f.destination
    FROM bookings b
    JOIN flights f ON b.flight_id = f.flight_id;
  `);

  assert.equal(res.success, true);
  assert.equal(res.rowCount, 1);
  assert.equal(res.rows[0].flight_number, '6E-201');
  assert.equal(res.rows[0].seats_booked, 2);
});

test('UPDATE modifies shared data and returns affected rows', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute("UPDATE flights SET price = 4900 WHERE flight_number = '6E-201';");
  assert.equal(res.success, true);
  assert.equal(res.rowsAffected, 1);

  // Verify updated in store
  const check = db.execute("SELECT price FROM flights WHERE flight_number = '6E-201';");
  assert.equal(check.rows[0].price, 4900);
});

test('UPDATE supporting fare alias works', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute("UPDATE flights SET fare = 5250 WHERE flight_number = '6E-201';");
  assert.equal(res.success, true);
  assert.equal(res.rowsAffected, 1);

  const check = db.execute("SELECT price FROM flights WHERE flight_number = '6E-201';");
  assert.equal(check.rows[0].price, 5250);
});

test('INSERT INTO creates record and increases row count', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute(`
    INSERT INTO flights (airline_name, flight_number, source, destination, departure_time, arrival_time, price, total_seats, available_seats)
    VALUES ('Vistara', 'UK-835', 'Mumbai', 'Goa', '2026-11-05 08:00:00', '2026-11-05 09:15:00', 3600, 168, 168);
  `);
  assert.equal(res.success, true);
  assert.equal(res.rowsAffected, 1);

  const check = db.execute("SELECT * FROM flights WHERE flight_number = 'UK-835';");
  assert.equal(check.rowCount, 1);
  assert.equal(check.rows[0].airline_name, 'Vistara');
});

test('DELETE removes matching record', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute("DELETE FROM flights WHERE flight_number = 'QP-140';");
  assert.equal(res.success, true);
  assert.equal(res.rowsAffected, 1);

  const check = db.execute("SELECT * FROM flights WHERE flight_number = 'QP-140';");
  assert.equal(check.rowCount, 0);
});

test('CREATE TABLE, ALTER TABLE, and DROP TABLE work', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  // CREATE TABLE
  const resCreate = db.execute('CREATE TABLE pilots (pilot_id INT PRIMARY KEY, pilot_name VARCHAR(100));');
  assert.equal(resCreate.success, true);

  // INSERT INTO new table
  db.execute("INSERT INTO pilots (pilot_id, pilot_name) VALUES (1, 'Capt. S. Verma');");
  const checkInsert = db.execute('SELECT * FROM pilots;');
  assert.equal(checkInsert.rowCount, 1);

  // ALTER TABLE
  const resAlter = db.execute('ALTER TABLE pilots ADD COLUMN flying_hours INT;');
  assert.equal(resAlter.success, true);

  // DROP TABLE
  const resDrop = db.execute('DROP TABLE pilots;');
  assert.equal(resDrop.success, true);
});

test('DESCRIBE table returns column definitions', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('DESCRIBE flights;');
  assert.equal(res.success, true);
  assert.ok(res.rows.length >= 8);
  const colNames = res.rows.map((r) => r.column_name);
  assert.ok(colNames.includes('flight_id'));
  assert.ok(colNames.includes('flight_number'));
  assert.ok(colNames.includes('price'));
  assert.ok(colNames.includes('available_seats'));
});

test('EXPLAIN query returns execution plan', () => {
  const db = new BrowserDatabase();
  db.resetToSeedData(false);

  const res = db.execute('EXPLAIN SELECT * FROM flights WHERE price > 4000;');
  assert.equal(res.success, true);
  assert.ok(res.rows.length > 0);
  assert.ok(res.rows[0]['QUERY PLAN'].includes('Sequential Scan'));
});

test('Invalid SQL returns descriptive error message without crashing', () => {
  const db = new BrowserDatabase();
  const res = db.execute('SELEC * FORM fligts');
  assert.equal(res.success, false);
  assert.ok(res.message);
  assert.match(res.message, /Unsupported|Error/i);
});
