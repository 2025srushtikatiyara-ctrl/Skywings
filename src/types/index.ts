/**
 * Core Domain Interfaces for SKY WINGS Airline Reservation System
 */

export interface Flight {
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
}

export interface Passenger {
  passenger_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  total_bookings?: number;
  total_spent?: number;
}

export interface Booking {
  booking_id: number;
  booking_reference?: string;
  passenger_id: number;
  passenger_name?: string;
  passenger_email?: string;
  passenger_phone?: string;
  flight_id: number;
  airline_name?: string;
  flight_number?: string;
  source?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  booking_date: string;
  seats_booked: number;
  total_amount: number;
  booking_status: 'Confirmed' | 'Cancelled' | string;
}

export interface DashboardMetrics {
  total_flights: number;
  upcoming_flights: number;
  total_passengers: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_revenue: number;
  seats_remaining: number;
  total_capacity: number;
}

export interface TableColumnMeta {
  name: string;
  type: string;
  isPrimary: boolean;
  nullable: boolean;
  defaultValue: string | null;
  isUnique?: boolean;
}

export interface TableMeta {
  tableName: string;
  approxRowCount: number;
  description: string;
  columns: TableColumnMeta[];
  indexes: string[];
  foreignKeys: Array<{
    column: string;
    foreignTable: string;
    foreignColumn: string;
  }>;
}

export interface SavedQuery {
  query_id: number;
  name: string;
  sql_text: string;
  description: string;
  created_at: string;
}

export interface QueryHistoryItem {
  history_id: number;
  sql_text: string;
  execution_time_ms: number;
  row_count: number;
  status: 'SUCCESS' | 'FAILED';
  error_summary: string | null;
  created_at: string;
}

export interface AuditLogItem {
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
}

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
