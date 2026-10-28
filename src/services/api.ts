/**
 * Direct In-Browser Database Client for SKY WINGS
 * Operates entirely client-side on local simulated relational data.
 * Zero external HTTP dependencies, full offline/static hosting readiness,
 * and persistent storage backed by localStorage.
 */

import { browserDb } from '../lib/engine/database';
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

export async function fetchHealth() {
  return {
    status: 'HEALTHY',
    engine: 'SKY WINGS Browser SQL Engine',
    storage: 'localStorage',
    timestamp: new Date().toISOString(),
  };
}

export async function fetchFlights(): Promise<Flight[]> {
  return browserDb.getFlights();
}

export async function searchFlights(params: {
  source?: string;
  destination?: string;
  date?: string;
  seats?: number;
}): Promise<Flight[]> {
  return browserDb.searchFlights(params);
}

export async function createFlight(flightData: any): Promise<Flight> {
  return browserDb.createFlight(flightData);
}

export async function updateFlight(id: number, flightData: any): Promise<Flight> {
  return browserDb.updateFlight(id, flightData);
}

export async function createBooking(bookingData: {
  flight_id: number;
  seats_booked: number;
  full_name: string;
  email: string;
  phone?: string;
}): Promise<Booking> {
  return browserDb.createBooking(bookingData) as any;
}

export async function fetchBookings(): Promise<Booking[]> {
  return browserDb.getBookings();
}

export async function lookupBookings(params: {
  email?: string;
  reference?: string;
}): Promise<Booking[]> {
  return browserDb.lookupBookings(params);
}

export async function cancelBooking(
  bookingId: number,
  email?: string
): Promise<{ success: boolean; message: string; refundAmount: number; seatsRestored: number }> {
  const res = browserDb.cancelBooking(bookingId, email);
  return {
    ...res,
    message: 'Booking cancelled successfully and seats restored to flight inventory.',
  };
}

export async function fetchDashboardMetrics(): Promise<{
  metrics: DashboardMetrics;
  recentBookings: any[];
  dataSource: string;
}> {
  const metrics = browserDb.getDashboardMetrics();
  const bookings = browserDb.getBookings();
  return {
    metrics,
    recentBookings: bookings.slice(0, 5),
    dataSource: 'Local In-Browser Engine',
  };
}

export async function fetchPassengers(search?: string): Promise<Passenger[]> {
  let list = browserDb.getPassengers();
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function fetchSchemaMetadata(): Promise<{
  databaseName: string;
  tables: TableMeta[];
}> {
  return browserDb.getSchemaMetadata();
}

export async function executeSql(sql: string) {
  return browserDb.execute(sql);
}

export async function explainSql(sql: string, analyze: boolean = false) {
  return browserDb.explain(sql, analyze);
}

export async function fetchQueryHistory(): Promise<QueryHistoryItem[]> {
  return browserDb.getQueryHistory();
}

export async function fetchSavedQueries(): Promise<SavedQuery[]> {
  return browserDb.getSavedQueries();
}

export async function saveQuery(name: string, sql_text: string, description?: string) {
  const query = browserDb.saveQuery(name, sql_text, description);
  return { success: true, query };
}

export async function deleteSavedQuery(id: number) {
  const success = browserDb.deleteSavedQuery(id);
  return { success };
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  return browserDb.getAuditLogs();
}

export async function fetchDbStatus(): Promise<DatabaseStatus> {
  return browserDb.getDbStatus();
}

export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  browserDb.resetToSeedData(true);
  return { success: true, message: 'Database reset to canonical initial state.' };
}
