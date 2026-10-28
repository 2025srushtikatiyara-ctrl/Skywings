/**
 * API Service Client for SKY WINGS
 * Dispatches requests to /api endpoints with structured error handling.
 */

import {
  Flight,
  Passenger,
  Booking,
  DashboardMetrics,
  TableMeta,
  SavedQuery,
  QueryHistoryItem,
  AuditLogItem,
  DatabaseStatus,
} from '../types';

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function fetchFlights(): Promise<Flight[]> {
  const res = await fetch(`${BASE_URL}/flights`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch flights');
  return data.flights;
}

export async function searchFlights(params: {
  source?: string;
  destination?: string;
  date?: string;
  seats?: number;
}): Promise<Flight[]> {
  const query = new URLSearchParams();
  if (params.source) query.set('source', params.source);
  if (params.destination) query.set('destination', params.destination);
  if (params.date) query.set('date', params.date);
  if (params.seats) query.set('seats', params.seats.toString());

  const res = await fetch(`${BASE_URL}/flights/search?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Search failed');
  return data.flights;
}

export async function createFlight(flightData: any): Promise<Flight> {
  const res = await fetch(`${BASE_URL}/flights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flightData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create flight');
  return data.flight;
}

export async function updateFlight(id: number, flightData: any): Promise<Flight> {
  const res = await fetch(`${BASE_URL}/flights/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flightData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update flight');
  return data.flight;
}

export async function createBooking(bookingData: {
  flight_id: number;
  seats_booked: number;
  full_name: string;
  email: string;
  phone?: string;
}): Promise<Booking> {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Booking submission failed');
  return data.booking;
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch(`${BASE_URL}/bookings`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch bookings');
  return data.bookings;
}

export async function lookupBookings(params: {
  email?: string;
  reference?: string;
}): Promise<Booking[]> {
  const query = new URLSearchParams();
  if (params.email) query.set('email', params.email);
  if (params.reference) query.set('reference', params.reference);

  const res = await fetch(`${BASE_URL}/bookings/lookup?${query.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Booking lookup failed');
  return data.bookings;
}

export async function cancelBooking(
  bookingId: number,
  email?: string
): Promise<{ success: boolean; message: string; refundAmount: number; seatsRestored: number }> {
  const res = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Cancellation failed');
  return data;
}

export async function fetchDashboardMetrics(): Promise<{
  metrics: DashboardMetrics;
  recentBookings: any[];
  dataSource: string;
}> {
  const res = await fetch(`${BASE_URL}/admin/dashboard`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch dashboard metrics');
  return data;
}

export async function fetchPassengers(search?: string): Promise<Passenger[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${BASE_URL}/admin/passengers${query}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch passengers');
  return data.passengers;
}

export async function fetchSchemaMetadata(): Promise<{
  databaseName: string;
  tables: TableMeta[];
}> {
  const res = await fetch(`${BASE_URL}/admin/schema`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch schema metadata');
  return data;
}

export async function executeSql(sql: string) {
  const res = await fetch(`${BASE_URL}/admin/sql/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  return res.json();
}

export async function explainSql(sql: string, analyze: boolean = false) {
  const res = await fetch(`${BASE_URL}/admin/sql/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, analyze }),
  });
  return res.json();
}

export async function fetchQueryHistory(): Promise<QueryHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/admin/sql/history`);
  const data = await res.json();
  return data.history || [];
}

export async function fetchSavedQueries(): Promise<SavedQuery[]> {
  const res = await fetch(`${BASE_URL}/admin/sql/saved`);
  const data = await res.json();
  return data.savedQueries || [];
}

export async function saveQuery(name: string, sql_text: string, description?: string) {
  const res = await fetch(`${BASE_URL}/admin/sql/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, sql_text, description }),
  });
  return res.json();
}

export async function deleteSavedQuery(id: number) {
  const res = await fetch(`${BASE_URL}/admin/sql/saved/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const res = await fetch(`${BASE_URL}/admin/audit`);
  const data = await res.json();
  return data.auditLogs || [];
}

export async function fetchDbStatus(): Promise<DatabaseStatus> {
  const res = await fetch(`${BASE_URL}/admin/db-status`);
  const data = await res.json();
  return data.status;
}
