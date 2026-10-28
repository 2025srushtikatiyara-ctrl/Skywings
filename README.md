# SKY WINGS — Enterprise-Grade Airline Reservation System with an Integrated SQL Workbench

An enterprise-class commercial airline reservation platform featuring real-time flight scheduling, transaction-safe seat inventory management, live Server-Sent Events (SSE) synchronization, and a fully integrated, privileged PostgreSQL 18 Database Workbench / SQL Console.

---

## 1. ARCHITECTURE OVERVIEW

SKY WINGS is architected around an authoritative PostgreSQL database with strict preservation guarantees for existing records and sequences.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SKY WINGS CLIENT TIERS                          │
├───────────────────────────────────┬────────────────────────────────────┤
│     Public Passenger Portal       │       Administrative Center        │
│  - Real-Time Flight Search        │  - Executive Operational Metrics   │
│  - Concurrency-Guarded Booking    │  - Flight Fleet & Capacity Config  │
│  - Simulated Payment Gateway      │  - Passenger CRM & Bookings Ledger │
│  - PNR Ticket & Boarding Pass     │  - Integrated SQL Workbench        │
│  - Self-Service Cancellation      │  - Schema Explorer & Audit Trail   │
└─────────────────┬─────────────────┴─────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                EXPRESS REST API & SSE EVENT BROKER                     │
│  - Parameterized Queries with strict type coercion                     │
│  - SQL Classification & Safety Policy Enforcement                      │
│  - Row-Level Locking (`SELECT ... FOR UPDATE`)                         │
│  - Server-Sent Events (SSE) `/api/admin/events` Stream                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  POSTGRESQL 18 DATABASE ENGINE                         │
│                     `airline_reservation`                              │
│  - Tables: `flights`, `passengers`, `bookings`, `schema_migrations`,   │
│            `admin_users`, `audit_logs`, `saved_queries`, etc.          │
│  - Post-Commit Notification Triggers (`skywings_notify_event`)         │
│  - Least-Privilege Role Separation (`skywings_app_user`, etc.)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TECHNOLOGY STACK

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, `pg` (node-postgres pool connection), `dotenv`.
- **Database**: PostgreSQL 18 (Target: `airline_reservation` on `localhost:5432`).
- **Real-Time Communication**: Server-Sent Events (SSE) with PostgreSQL trigger-based invalidation.
- **Testing**: Built-in `node:test` and `node:assert/strict` via `npx --yes tsx --test`.

---

## 3. EXISTING DATABASE PRESERVATION STRATEGY

The application respects the existing PostgreSQL `airline_reservation` database:
- **No Destructive Operations**: Setup scripts never execute `DROP DATABASE`, `DROP TABLE`, or `TRUNCATE`.
- **Sample Records Preserved**: Existing records (`IndiGo 6E-201`, `Air India AI-101`, `Akasa Air QP-140`, Passenger ID 1, Booking ID 1 for ₹9,000) are verified and preserved.
- **Additive Migrations**: Missing columns (e.g. `available_seats` on `flights`) are added conditionally (`IF NOT EXISTS`) and initialized safely from `total_seats - COALESCE(SUM(seats_booked), 0)` of confirmed bookings without resetting sequence generators.

---

## 4. LOCAL SETUP & INSTALLATION (STEP-BY-STEP)

### Prerequisites
- Node.js 20+ or 22+
- PostgreSQL 18 running locally on port `5432` with database `airline_reservation` created.

### Windows / macOS / Linux Setup

1. **Clone or navigate to the repository**:
   ```bash
   cd airline-reservation-system
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   # Windows (Command Prompt)
   copy .env.example .env

   # Windows (PowerShell) / macOS / Linux
   cp .env.example .env
   ```
   Open `.env` and set your actual local PostgreSQL password:
   ```env
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=airline_reservation
   PGUSER=postgres
   PGPASSWORD=your_actual_password_here
   PORT=3000
   CLIENT_ORIGIN=http://localhost:3000
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Execute Safe Database Migrations**:
   The migration runner verifies database identity, checks `schema_migrations`, and applies versioned migrations inside transactions:
   ```bash
   npm run migrate
   ```

5. **Start Application**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:3000`** in your browser.

---

## 5. DATABASE MIGRATIONS OVERVIEW

Migrations are located in `/migrations`:
1. `001_initial_schema_and_available_seats.sql`:
   - Non-destructively creates base tables if missing.
   - Adds `available_seats` column to `flights`.
   - Initializes `available_seats` based on active confirmed bookings.
   - Enforces check constraints: `available_seats >= 0 AND available_seats <= total_seats` and `arrival_time > departure_time`.
2. `002_create_admin_and_audit_tables.sql`:
   - Creates `schema_migrations`, `admin_users`, `audit_logs`, `saved_queries`, and `query_history`.
3. `003_create_notify_triggers.sql`:
   - Installs PostgreSQL trigger function `skywings_notify_event()` to broadcast compact table invalidation events on `skywings_channel`.

---

## 6. LEAST-PRIVILEGE ROLE HARDENING

To operate with least privilege in production, execute these commands in `psql`:

```sql
-- 1. Create dedicated application role
CREATE ROLE skywings_app_user WITH LOGIN PASSWORD 'app_secure_password';
GRANT CONNECT ON DATABASE airline_reservation TO skywings_app_user;
GRANT USAGE ON SCHEMA public TO skywings_app_user;
GRANT SELECT, INSERT, UPDATE ON TABLE flights, passengers, bookings TO skywings_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skywings_app_user;

-- 2. Dedicated administrative role for SQL Workbench
CREATE ROLE skywings_admin WITH LOGIN PASSWORD 'admin_secure_password';
GRANT CONNECT ON DATABASE airline_reservation TO skywings_admin;
GRANT USAGE ON SCHEMA public TO skywings_admin;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER ON ALL TABLES IN SCHEMA public TO skywings_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO skywings_admin;
```

---

## 7. THE SQL WORKBENCH: POLICY & CONTROLS

The integrated SQL Workbench provides a privileged database console with strict server-side safeguards:

1. **Classification Pipeline**:
   - Analyzes statements before execution.
   - Categories: `SELECT` (Read-only), `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `EXPLAIN`, `TRANSACTION`.
2. **Unconstrained Mutation Protection**:
   - Detects `UPDATE` or `DELETE` statements that omit a `WHERE` clause.
   - Flags high-impact warning and requires explicit confirmation in the UI.
3. **Execution Limits**:
   - `statement_timeout = 10000ms` enforced at the PostgreSQL connection level.
   - Results are capped at 500 rows to prevent unbounded browser memory usage.
4. **Interactive Results Grid**:
   - Sticky headers with column types (`integer`, `varchar`, `numeric`, `timestamp`).
   - Row numbers and NULL badges.
   - One-click cell copy, row copy, and CSV export.
5. **EXPLAIN Visualizer**:
   - Runs `EXPLAIN` without `ANALYZE` by default to prevent accidental side effects.
6. **Query History & Saved Queries**:
   - Saved queries stored with descriptions.
   - Full history of query durations and row counts.

---

## 8. LIVE DATABASE-TO-FRONTEND SYNCHRONIZATION

1. When a flight fare, departure schedule, or booking status is updated via the SQL Workbench or API, the backend calls `publishDbChange(table, action)`.
2. Connected frontends receive the event over Server-Sent Events (`/api/admin/events`).
3. An unobtrusive notification displays:
   `⚡ PostgreSQL Invalidation: Table 'flights' updated via UPDATE — Views synchronized!`
4. The client automatically refreshes query caches, keeping flight listings, booking ledgers, and dashboard metrics synchronized without a full-page reload.

---

## 9. CONCURRENCY & BOOKING ATOMICITY

- Concurrent reservations are protected against overbooking using PostgreSQL row locking:
  ```sql
  SELECT * FROM flights WHERE flight_id = $1 FOR UPDATE;
  ```
- Checked within an atomic transaction:
  - Flight departure has not passed.
  - Requested seats <= `available_seats`.
  - Authoritative price calculated from database `price * seats`.
  - Passenger created or reused by unique email.
  - Booking inserted and `flights.available_seats` decremented in one transaction.
- Cancellation:
  - Verifies passenger email against booking record.
  - Updates status to `'Cancelled'` and restores `available_seats` exactly once within a transaction.

---

## 10. RUNNING AUTOMATED UNIT TESTS

Unit tests verify SQL classification, WHERE-clause safety detection, pricing math, departure validation, and cancellation rules:

```bash
# Run all unit tests
npm test

# Run individual test suites
npx --yes tsx --test src/lib/sql/classifier.test.ts
npx --yes tsx --test src/lib/booking/pricing-and-seats.test.ts
```

---

## 11. KNOWN LIMITATIONS & SECURITY NOTES

- **Self-Service Lookup Security**: Passenger booking lookup by email allows customers to view their reservations. For high-security environments, two-factor OTP or account sign-in should be enforced.
- **DDL Execution**: Schema modifications (`CREATE`, `ALTER`) in the Workbench trigger schema refreshes. Destructive `DROP` statements remain blocked by default in production mode.
