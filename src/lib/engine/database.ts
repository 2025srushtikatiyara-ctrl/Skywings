/**
 * In-Browser Relational Database Engine for SKY WINGS
 * 100% Client-Side SQL execution, reactive subscriptions, and persistence.
 * Zero external database or backend server required.
 */

import { parseSql, ParserError } from './parser';
import {
  Statement,
  SelectStatement,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  CreateTableStatement,
  AlterTableStatement,
  DropTableStatement,
  DescribeStatement,
  ExplainStatement,
} from './ast';
import { evaluateExpression, formatFunctionKey } from './evaluator';

export interface ColumnSchema {
  name: string;
  type: string;
  isPrimary?: boolean;
  nullable?: boolean;
  defaultValue?: any;
}

export interface TableData {
  name: string;
  columns: ColumnSchema[];
  rows: Record<string, any>[];
  autoIncrementId: number;
}

export interface ExecutionResult {
  success: boolean;
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  rowCount: number;
  rowsAffected: number;
  executionTimeMs: number;
  statementType: string;
  message?: string;
  explainPlan?: any;
  warnings?: string[];
}

export type DatabaseChangeListener = (event: {
  table: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'SCHEMA_CHANGE' | 'RESET';
  affectedRows?: number;
}) => void;

const STORAGE_KEY = 'skywings_browser_database_v2';
const SAVED_QUERIES_KEY = 'skywings_saved_queries_v2';
const QUERY_HISTORY_KEY = 'skywings_query_history_v2';
const AUDIT_LOGS_KEY = 'skywings_audit_logs_v2';

const DEFAULT_SAVED_QUERIES = [
  {
    query_id: 1,
    name: 'Scheduled Flights by Departure',
    sql_text: 'SELECT * FROM flights ORDER BY departure_time;',
    description: 'All scheduled flights sorted chronologically',
    created_at: new Date().toISOString(),
  },
  {
    query_id: 2,
    name: 'Full 3-Table Relational JOIN',
    sql_text: `SELECT b.booking_id, p.full_name, p.email, f.flight_number, f.source, f.destination, b.seats_booked, b.total_amount, b.booking_status
FROM bookings b
JOIN passengers p ON p.passenger_id = b.passenger_id
JOIN flights f ON f.flight_id = b.flight_id
ORDER BY b.booking_date DESC;`,
    description: 'Joined bookings with passenger details and flight route',
    created_at: new Date().toISOString(),
  },
  {
    query_id: 3,
    name: 'Flight Seat Inventory Check',
    sql_text: `SELECT flight_number, source, destination, total_seats, available_seats, (total_seats - available_seats) AS seats_booked
FROM flights
ORDER BY available_seats ASC;`,
    description: 'Available and booked seats breakdown per flight',
    created_at: new Date().toISOString(),
  },
];

export class BrowserDatabase {
  private tables: Map<string, TableData> = new Map();
  private listeners: Set<DatabaseChangeListener> = new Set();
  private queryHistory: any[] = [];
  private savedQueries: any[] = [];
  private auditLogs: any[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    const loaded = this.loadFromStorage();
    if (!loaded) {
      this.resetToSeedData(false);
    }
    this.loadAuxiliaryFromStorage();
    this.isInitialized = true;
  }

  public subscribe(listener: DatabaseChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(table: string, action: any, affectedRows?: number) {
    this.saveToStorage();
    for (const listener of this.listeners) {
      try {
        listener({ table, action, affectedRows });
      } catch (e) {
        console.error('Error in db listener:', e);
      }
    }
  }

  // --- SEED DATA INITIALIZATION ---
  public resetToSeedData(notifyChange = true) {
    this.tables.clear();

    const now = new Date();
    const d1 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const a1 = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const d2 = new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const a2 = new Date(now.getTime() + 32 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const d3 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const a3 = new Date(now.getTime() + 50 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const d4 = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const a4 = new Date(now.getTime() + 39 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // 1. FLIGHTS TABLE
    this.tables.set('flights', {
      name: 'flights',
      columns: [
        { name: 'flight_id', type: 'INTEGER', isPrimary: true, nullable: false },
        { name: 'airline_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'flight_number', type: 'VARCHAR(20)', nullable: false },
        { name: 'source', type: 'VARCHAR(100)', nullable: false },
        { name: 'destination', type: 'VARCHAR(100)', nullable: false },
        { name: 'departure_time', type: 'TIMESTAMP', nullable: false },
        { name: 'arrival_time', type: 'TIMESTAMP', nullable: false },
        { name: 'price', type: 'NUMERIC(10,2)', nullable: false },
        { name: 'total_seats', type: 'INTEGER', nullable: false },
        { name: 'available_seats', type: 'INTEGER', nullable: false },
      ],
      rows: [
        {
          flight_id: 1,
          airline_name: 'IndiGo',
          flight_number: '6E-201',
          source: 'Mumbai',
          destination: 'Delhi',
          departure_time: d1,
          arrival_time: a1,
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
          departure_time: d2,
          arrival_time: a2,
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
          departure_time: d3,
          arrival_time: a3,
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
          departure_time: d4,
          arrival_time: a4,
          price: 5800.0,
          total_seats: 186,
          available_seats: 186,
        },
      ],
      autoIncrementId: 5,
    });

    // 2. PASSENGERS TABLE
    this.tables.set('passengers', {
      name: 'passengers',
      columns: [
        { name: 'passenger_id', type: 'INTEGER', isPrimary: true, nullable: false },
        { name: 'full_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(100)', nullable: false },
        { name: 'phone', type: 'VARCHAR(15)', nullable: true },
      ],
      rows: [
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
      autoIncrementId: 4,
    });

    // 3. BOOKINGS TABLE
    this.tables.set('bookings', {
      name: 'bookings',
      columns: [
        { name: 'booking_id', type: 'INTEGER', isPrimary: true, nullable: false },
        { name: 'passenger_id', type: 'INTEGER', nullable: false },
        { name: 'flight_id', type: 'INTEGER', nullable: false },
        { name: 'booking_date', type: 'TIMESTAMP', nullable: false },
        { name: 'seats_booked', type: 'INTEGER', nullable: false },
        { name: 'total_amount', type: 'NUMERIC(10,2)', nullable: false },
        { name: 'booking_status', type: 'VARCHAR(20)', nullable: false },
      ],
      rows: [
        {
          booking_id: 1,
          passenger_id: 1,
          flight_id: 1,
          booking_date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
          seats_booked: 2,
          total_amount: 9000.0,
          booking_status: 'Confirmed',
        },
      ],
      autoIncrementId: 2,
    });

    // 4. AIRLINES TABLE
    this.tables.set('airlines', {
      name: 'airlines',
      columns: [
        { name: 'airline_id', type: 'INTEGER', isPrimary: true, nullable: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: false },
        { name: 'iata_code', type: 'VARCHAR(5)', nullable: false },
      ],
      rows: [
        { airline_id: 1, name: 'IndiGo', iata_code: '6E' },
        { airline_id: 2, name: 'Air India', iata_code: 'AI' },
        { airline_id: 3, name: 'Akasa Air', iata_code: 'QP' },
        { airline_id: 4, name: 'Vistara', iata_code: 'UK' },
      ],
      autoIncrementId: 5,
    });

    // 5. AIRPORTS TABLE
    this.tables.set('airports', {
      name: 'airports',
      columns: [
        { name: 'airport_code', type: 'VARCHAR(5)', isPrimary: true, nullable: false },
        { name: 'city', type: 'VARCHAR(100)', nullable: false },
        { name: 'airport_name', type: 'VARCHAR(150)', nullable: false },
      ],
      rows: [
        { airport_code: 'BOM', city: 'Mumbai', airport_name: 'Chhatrapati Shivaji Maharaj International Airport' },
        { airport_code: 'DEL', city: 'Delhi', airport_name: 'Indira Gandhi International Airport' },
        { airport_code: 'BLR', city: 'Bengaluru', airport_name: 'Kempegowda International Airport' },
        { airport_code: 'GOI', city: 'Goa', airport_name: 'Dabolim Airport' },
      ],
      autoIncrementId: 5,
    });

    this.saveToStorage();
    if (notifyChange) {
      this.notify('all', 'RESET');
    }
  }

  // --- PERSISTENCE ---
  private saveToStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const data: Record<string, any> = {};
      for (const [key, t] of this.tables.entries()) {
        data[key] = {
          name: t.name,
          columns: t.columns,
          rows: t.rows,
          autoIncrementId: t.autoIncrementId,
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
  }

  private loadFromStorage(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;

      this.tables.clear();
      for (const key of Object.keys(parsed)) {
        this.tables.set(key, parsed[key]);
      }
      return this.tables.size > 0;
    } catch {
      return false;
    }
  }

  private loadAuxiliaryFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const saved = localStorage.getItem(SAVED_QUERIES_KEY);
      if (saved) {
        this.savedQueries = JSON.parse(saved);
      } else {
        this.savedQueries = [...DEFAULT_SAVED_QUERIES];
        this.saveSavedQueries();
      }

      const history = localStorage.getItem(QUERY_HISTORY_KEY);
      if (history) {
        this.queryHistory = JSON.parse(history);
      }

      const audit = localStorage.getItem(AUDIT_LOGS_KEY);
      if (audit) {
        this.auditLogs = JSON.parse(audit);
      }
    } catch (e) {
      this.savedQueries = [...DEFAULT_SAVED_QUERIES];
    }
  }

  private saveSavedQueries() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(this.savedQueries));
      }
    } catch {}
  }

  private saveHistory() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(this.queryHistory));
      }
    } catch {}
  }

  private saveAuditLogs() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(this.auditLogs));
      }
    } catch {}
  }

  private recordHistoryAndAudit(sql: string, res: ExecutionResult) {
    const historyItem = {
      history_id: Date.now() + Math.floor(Math.random() * 1000),
      sql_text: sql,
      execution_time_ms: res.executionTimeMs,
      row_count: res.rowCount,
      status: res.success ? ('SUCCESS' as const) : ('FAILED' as const),
      error_summary: res.success ? null : res.message,
      created_at: new Date().toISOString(),
    };
    this.queryHistory.unshift(historyItem);
    if (this.queryHistory.length > 50) this.queryHistory.pop();
    this.saveHistory();

    const isMutation = ['INSERT', 'UPDATE', 'DELETE', 'CREATE_TABLE', 'ALTER_TABLE', 'DROP_TABLE'].includes(res.statementType || '');
    if (isMutation) {
      const auditItem = {
        audit_id: Date.now() + Math.floor(Math.random() * 1000),
        admin_user: 'local_workbench_admin',
        action_category: 'SQL_MUTATION',
        execution_id: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        query_classification: res.statementType || 'MUTATION',
        sanitized_sql: sql,
        affected_rows: res.rowsAffected || 0,
        duration_ms: res.executionTimeMs,
        status: res.success ? 'SUCCESS' : 'FAILED',
        created_at: new Date().toISOString(),
      };
      this.auditLogs.unshift(auditItem);
      if (this.auditLogs.length > 50) this.auditLogs.pop();
      this.saveAuditLogs();
    }
  }

  // --- QUERY EXECUTION ENTRY POINT ---
  public execute(sql: string): ExecutionResult {
    const startTime = performance.now();
    try {
      const trimmed = sql.trim();
      if (!trimmed) {
        return {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          rowsAffected: 0,
          executionTimeMs: 0,
          statementType: 'EMPTY',
          message: 'Empty query',
        };
      }

      const stmt = parseSql(trimmed);
      const res = this.executeStatement(stmt);
      const duration = Math.round((performance.now() - startTime) * 100) / 100;
      res.executionTimeMs = Math.max(1, duration);
      this.recordHistoryAndAudit(trimmed, res);
      return res;
    } catch (err: any) {
      const duration = Math.round((performance.now() - startTime) * 100) / 100;
      const res: ExecutionResult = {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        rowsAffected: 0,
        executionTimeMs: Math.max(1, duration),
        statementType: 'ERROR',
        message: err.message || 'Execution error',
      };
      this.recordHistoryAndAudit(sql.trim(), res);
      return res;
    }
  }

  private executeStatement(stmt: Statement): ExecutionResult {
    switch (stmt.type) {
      case 'SELECT':
        return this.executeSelect(stmt);
      case 'INSERT':
        return this.executeInsert(stmt);
      case 'UPDATE':
        return this.executeUpdate(stmt);
      case 'DELETE':
        return this.executeDelete(stmt);
      case 'SHOW_TABLES':
        return this.executeShowTables();
      case 'DESCRIBE':
        return this.executeDescribe(stmt);
      case 'CREATE_TABLE':
        return this.executeCreateTable(stmt);
      case 'ALTER_TABLE':
        return this.executeAlterTable(stmt);
      case 'DROP_TABLE':
        return this.executeDropTable(stmt);
      case 'EXPLAIN':
        return this.executeExplain(stmt);
      default:
        throw new Error('Unsupported statement');
    }
  }

  // --- SELECT EXECUTION ---
  private executeSelect(stmt: SelectStatement): ExecutionResult {
    let rows: Record<string, any>[] = [];
    let baseCols: { name: string; type: string }[] = [];

    // FROM table
    if (stmt.fromTable) {
      const t = this.getTable(stmt.fromTable);
      const alias = stmt.fromAlias || stmt.fromTable;
      rows = t.rows.map((r) => {
        const rowWithAlias: Record<string, any> = { ...r };
        for (const [k, v] of Object.entries(r)) {
          rowWithAlias[`${alias}.${k}`] = v;
        }
        return rowWithAlias;
      });
      baseCols = t.columns.map((c) => ({ name: c.name, type: c.type }));

      // JOINS
      if (stmt.joins && stmt.joins.length > 0) {
        for (const join of stmt.joins) {
          const joinedTable = this.getTable(join.table);
          const jAlias = join.alias || join.table;
          const joinedRows: Record<string, any>[] = [];

          for (const leftRow of rows) {
            let matched = false;
            for (const rightRow of joinedTable.rows) {
              const merged: Record<string, any> = { ...leftRow, ...rightRow };
              for (const [k, v] of Object.entries(rightRow)) {
                merged[`${jAlias}.${k}`] = v;
              }

              if (evaluateExpression(join.on, merged)) {
                joinedRows.push(merged);
                matched = true;
              }
            }

            if (!matched && join.type === 'LEFT') {
              const nullRight: Record<string, any> = {};
              for (const col of joinedTable.columns) {
                nullRight[col.name] = null;
                nullRight[`${jAlias}.${col.name}`] = null;
              }
              joinedRows.push({ ...leftRow, ...nullRight });
            }
          }
          rows = joinedRows;
          baseCols.push(...joinedTable.columns.map((c) => ({ name: `${jAlias}.${c.name}`, type: c.type })));
        }
      }
    } else {
      // SELECT without FROM (e.g. SELECT 1 + 1 AS result;)
      rows = [{}];
    }

    // WHERE filtering
    if (stmt.where) {
      rows = rows.filter((r) => Boolean(evaluateExpression(stmt.where!, r)));
    }

    // Check if query has aggregation
    const hasAggregates = stmt.columns.some((c) => hasAggregateFunction(c.expression));

    // GROUP BY or AGGREGATION
    if (stmt.groupBy || hasAggregates) {
      const groups = new Map<string, Record<string, any>[]>();

      for (const row of rows) {
        let groupKey = '';
        if (stmt.groupBy) {
          groupKey = stmt.groupBy.map((expr) => String(evaluateExpression(expr, row))).join('||');
        } else {
          groupKey = 'ALL';
        }
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
      }

      const aggregatedRows: Record<string, any>[] = [];

      for (const [_key, groupRows] of groups.entries()) {
        const repRow = groupRows[0] || {};
        const aggResultRow: Record<string, any> = { ...repRow };

        // Precompute aggregate values for this group
        for (const col of stmt.columns) {
          this.computeAggregateOnExpression(col.expression, groupRows, aggResultRow);
        }

        // HAVING check
        if (stmt.having) {
          if (!Boolean(evaluateExpression(stmt.having, aggResultRow))) {
            continue;
          }
        }

        aggregatedRows.push(aggResultRow);
      }

      rows = aggregatedRows;
    }

    // PROJECTION (Select Columns)
    const resultCols: { name: string; type: string }[] = [];
    const projectedRows: Record<string, any>[] = [];

    const isSelectStar = stmt.columns.length === 1 && stmt.columns[0].expression.type === 'STAR';

    if (isSelectStar) {
      if (stmt.fromTable) {
        const t = this.getTable(stmt.fromTable);
        resultCols.push(...t.columns.map((c) => ({ name: c.name, type: c.type })));
        projectedRows.push(
          ...rows.map((r) => {
            const clean: Record<string, any> = {};
            for (const col of t.columns) {
              clean[col.name] = r[col.name] !== undefined ? r[col.name] : null;
            }
            return clean;
          })
        );
      } else {
        projectedRows.push(...rows);
      }
    } else {
      // Determine final column names
      for (const col of stmt.columns) {
        let colName = col.alias;
        if (!colName) {
          if (col.expression.type === 'IDENTIFIER') {
            colName = col.expression.name;
          } else if (col.expression.type === 'FUNCTION_CALL') {
            colName = formatFunctionKey(col.expression);
          } else {
            colName = 'col_' + (resultCols.length + 1);
          }
        }
        resultCols.push({ name: colName, type: 'VARCHAR' });
      }

      for (const row of rows) {
        const proj: Record<string, any> = {};
        for (let i = 0; i < stmt.columns.length; i++) {
          const col = stmt.columns[i];
          const colName = resultCols[i].name;
          proj[colName] = evaluateExpression(col.expression, row);
        }
        projectedRows.push(proj);
      }
    }

    let finalRows = projectedRows;

    // DISTINCT
    if (stmt.isDistinct) {
      const seen = new Set<string>();
      finalRows = finalRows.filter((r) => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // ORDER BY
    if (stmt.orderBy && stmt.orderBy.length > 0) {
      finalRows.sort((a, b) => {
        for (const order of stmt.orderBy!) {
          const valA = evaluateExpression(order.expression, a);
          const valB = evaluateExpression(order.expression, b);
          if (valA === valB) continue;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          const cmp = valA < valB ? -1 : 1;
          return order.direction === 'DESC' ? -cmp : cmp;
        }
        return 0;
      });
    }

    // OFFSET & LIMIT
    if (stmt.offset !== undefined) {
      finalRows = finalRows.slice(stmt.offset);
    }
    if (stmt.limit !== undefined) {
      finalRows = finalRows.slice(0, stmt.limit);
    }

    return {
      success: true,
      columns: resultCols,
      rows: finalRows,
      rowCount: finalRows.length,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'SELECT',
    };
  }

  private computeAggregateOnExpression(expr: any, groupRows: Record<string, any>[], outRow: Record<string, any>) {
    if (!expr) return;
    if (expr.type === 'FUNCTION_CALL') {
      const fnName = expr.name.toUpperCase();
      const fnKey = formatFunctionKey(expr);

      if (fnName === 'COUNT') {
        if (expr.arguments[0]?.type === 'STAR') {
          outRow[fnKey] = groupRows.length;
        } else {
          let count = 0;
          for (const r of groupRows) {
            const v = evaluateExpression(expr.arguments[0], r);
            if (v !== null && v !== undefined) count++;
          }
          outRow[fnKey] = count;
        }
      } else if (fnName === 'SUM') {
        let sum = 0;
        for (const r of groupRows) {
          const v = Number(evaluateExpression(expr.arguments[0], r));
          if (!isNaN(v)) sum += v;
        }
        outRow[fnKey] = Math.round(sum * 100) / 100;
      } else if (fnName === 'AVG') {
        let sum = 0;
        let count = 0;
        for (const r of groupRows) {
          const v = Number(evaluateExpression(expr.arguments[0], r));
          if (!isNaN(v)) {
            sum += v;
            count++;
          }
        }
        outRow[fnKey] = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      } else if (fnName === 'MIN') {
        let minVal: any = null;
        for (const r of groupRows) {
          const v = evaluateExpression(expr.arguments[0], r);
          if (v !== null && v !== undefined) {
            if (minVal === null || v < minVal) minVal = v;
          }
        }
        outRow[fnKey] = minVal;
      } else if (fnName === 'MAX') {
        let maxVal: any = null;
        for (const r of groupRows) {
          const v = evaluateExpression(expr.arguments[0], r);
          if (v !== null && v !== undefined) {
            if (maxVal === null || v > maxVal) maxVal = v;
          }
        }
        outRow[fnKey] = maxVal;
      }
    } else if (expr.left && expr.right) {
      this.computeAggregateOnExpression(expr.left, groupRows, outRow);
      this.computeAggregateOnExpression(expr.right, groupRows, outRow);
    }
  }

  // --- INSERT EXECUTION ---
  private executeInsert(stmt: InsertStatement): ExecutionResult {
    const t = this.getTable(stmt.table);
    let affected = 0;

    for (const rowExprs of stmt.values) {
      const newRow: Record<string, any> = {};

      if (stmt.columns) {
        if (stmt.columns.length !== rowExprs.length) {
          throw new Error(`INSERT column count (${stmt.columns.length}) does not match values count (${rowExprs.length})`);
        }
        for (let i = 0; i < stmt.columns.length; i++) {
          newRow[stmt.columns[i]] = evaluateExpression(rowExprs[i], {});
        }
      } else {
        // Values for all columns
        for (let i = 0; i < t.columns.length && i < rowExprs.length; i++) {
          newRow[t.columns[i].name] = evaluateExpression(rowExprs[i], {});
        }
      }

      // Fill primary key auto-increment if missing
      for (const col of t.columns) {
        if (col.isPrimary && (newRow[col.name] === undefined || newRow[col.name] === null)) {
          newRow[col.name] = t.autoIncrementId++;
        }
        if (newRow[col.name] === undefined) {
          newRow[col.name] = col.defaultValue !== undefined ? col.defaultValue : null;
        }
      }

      // Check unique constraints (e.g. flight_number or email)
      for (const col of t.columns) {
        if (col.isPrimary) {
          const exists = t.rows.some((r) => r[col.name] === newRow[col.name]);
          if (exists) {
            throw new Error(`Unique constraint violation: Primary key ${col.name} = ${newRow[col.name]} already exists in ${t.name}`);
          }
        }
      }

      t.rows.push(newRow);
      affected++;
    }

    this.notify(t.name, 'INSERT', affected);

    return {
      success: true,
      columns: [{ name: 'rows_affected', type: 'INTEGER' }],
      rows: [{ rows_affected: affected }],
      rowCount: 1,
      rowsAffected: affected,
      executionTimeMs: 0,
      statementType: 'INSERT',
      message: `INSERT 0 ${affected}`,
    };
  }

  // --- UPDATE EXECUTION ---
  private executeUpdate(stmt: UpdateStatement): ExecutionResult {
    const t = this.getTable(stmt.table);
    let affected = 0;

    for (const row of t.rows) {
      const match = stmt.where ? Boolean(evaluateExpression(stmt.where, row)) : true;
      if (match) {
        for (const assign of stmt.assignments) {
          const val = evaluateExpression(assign.value, row);
          const colName = assign.column;

          // Check if updating price / fare
          if (colName.toLowerCase() === 'fare' && !('fare' in row) && 'price' in row) {
            row['price'] = val;
          } else {
            row[colName] = val;
          }
        }
        affected++;
      }
    }

    this.notify(t.name, 'UPDATE', affected);

    return {
      success: true,
      columns: [{ name: 'rows_affected', type: 'INTEGER' }],
      rows: [{ rows_affected: affected }],
      rowCount: 1,
      rowsAffected: affected,
      executionTimeMs: 0,
      statementType: 'UPDATE',
      message: `UPDATE ${affected}`,
    };
  }

  // --- DELETE EXECUTION ---
  private executeDelete(stmt: DeleteStatement): ExecutionResult {
    const t = this.getTable(stmt.table);
    const initialLen = t.rows.length;

    t.rows = t.rows.filter((row) => {
      if (!stmt.where) return false; // DELETE all if no where
      return !Boolean(evaluateExpression(stmt.where, row));
    });

    const affected = initialLen - t.rows.length;
    this.notify(t.name, 'DELETE', affected);

    return {
      success: true,
      columns: [{ name: 'rows_affected', type: 'INTEGER' }],
      rows: [{ rows_affected: affected }],
      rowCount: 1,
      rowsAffected: affected,
      executionTimeMs: 0,
      statementType: 'DELETE',
      message: `DELETE ${affected}`,
    };
  }

  // --- SCHEMA OPERATIONS ---
  private executeShowTables(): ExecutionResult {
    const rows = Array.from(this.tables.values()).map((t) => ({
      table_name: t.name,
      row_count: t.rows.length,
      columns_count: t.columns.length,
    }));

    return {
      success: true,
      columns: [
        { name: 'table_name', type: 'VARCHAR' },
        { name: 'row_count', type: 'INTEGER' },
        { name: 'columns_count', type: 'INTEGER' },
      ],
      rows,
      rowCount: rows.length,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'SHOW_TABLES',
    };
  }

  private executeDescribe(stmt: DescribeStatement): ExecutionResult {
    const t = this.getTable(stmt.table);
    const rows = t.columns.map((c) => ({
      column_name: c.name,
      data_type: c.type,
      is_primary_key: c.isPrimary ? 'YES' : 'NO',
      is_nullable: c.nullable ? 'YES' : 'NO',
      default_value: c.defaultValue !== undefined ? String(c.defaultValue) : 'NULL',
    }));

    return {
      success: true,
      columns: [
        { name: 'column_name', type: 'VARCHAR' },
        { name: 'data_type', type: 'VARCHAR' },
        { name: 'is_primary_key', type: 'VARCHAR' },
        { name: 'is_nullable', type: 'VARCHAR' },
        { name: 'default_value', type: 'VARCHAR' },
      ],
      rows,
      rowCount: rows.length,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'DESCRIBE',
    };
  }

  private executeCreateTable(stmt: CreateTableStatement): ExecutionResult {
    const tName = stmt.table.toLowerCase();
    if (this.tables.has(tName)) {
      if (stmt.ifNotExists) {
        return {
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          rowsAffected: 0,
          executionTimeMs: 0,
          statementType: 'CREATE_TABLE',
          message: `Table '${stmt.table}' already exists (skipped).`,
        };
      }
      throw new Error(`Table '${stmt.table}' already exists.`);
    }

    this.tables.set(tName, {
      name: stmt.table,
      columns: stmt.columns.map((c) => ({
        name: c.name,
        type: c.dataType,
        isPrimary: c.isPrimary,
        nullable: c.nullable,
        defaultValue: c.defaultValue,
      })),
      rows: [],
      autoIncrementId: 1,
    });

    this.notify(stmt.table, 'SCHEMA_CHANGE');

    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'CREATE_TABLE',
      message: `CREATE TABLE ${stmt.table} created successfully.`,
    };
  }

  private executeAlterTable(stmt: AlterTableStatement): ExecutionResult {
    const t = this.getTable(stmt.table);

    if (stmt.operation === 'ADD_COLUMN' && stmt.columnDefinition) {
      const colDef = stmt.columnDefinition;
      if (t.columns.some((c) => c.name.toLowerCase() === colDef.name.toLowerCase())) {
        throw new Error(`Column '${colDef.name}' already exists in table '${stmt.table}'`);
      }
      t.columns.push({
        name: colDef.name,
        type: colDef.dataType,
        isPrimary: false,
        nullable: true,
      });
      for (const r of t.rows) {
        r[colDef.name] = null;
      }
    } else if (stmt.operation === 'DROP_COLUMN' && stmt.columnName) {
      t.columns = t.columns.filter((c) => c.name.toLowerCase() !== stmt.columnName!.toLowerCase());
      for (const r of t.rows) {
        delete r[stmt.columnName!];
      }
    } else if (stmt.operation === 'RENAME_COLUMN' && stmt.columnName && stmt.newColumnName) {
      const col = t.columns.find((c) => c.name.toLowerCase() === stmt.columnName!.toLowerCase());
      if (col) {
        col.name = stmt.newColumnName;
        for (const r of t.rows) {
          r[stmt.newColumnName] = r[stmt.columnName!];
          delete r[stmt.columnName!];
        }
      }
    }

    this.notify(t.name, 'SCHEMA_CHANGE');

    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'ALTER_TABLE',
      message: `ALTER TABLE ${stmt.table} succeeded.`,
    };
  }

  private executeDropTable(stmt: DropTableStatement): ExecutionResult {
    const tName = stmt.table.toLowerCase();
    if (!this.tables.has(tName)) {
      if (stmt.ifExists) {
        return {
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          rowsAffected: 0,
          executionTimeMs: 0,
          statementType: 'DROP_TABLE',
          message: `Table '${stmt.table}' does not exist (skipped).`,
        };
      }
      throw new Error(`Table '${stmt.table}' does not exist.`);
    }

    this.tables.delete(tName);
    this.notify(stmt.table, 'SCHEMA_CHANGE');

    return {
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'DROP_TABLE',
      message: `DROP TABLE ${stmt.table} succeeded.`,
    };
  }

  private executeExplain(stmt: ExplainStatement): ExecutionResult {
    const inner = stmt.statement;
    const planLines: string[] = [];

    if (inner.type === 'SELECT') {
      planLines.push(`-> Browser In-Memory Sequential Scan on '${inner.fromTable || 'dual'}'`);
      if (inner.joins) {
        for (const j of inner.joins) {
          planLines.push(`   -> Nested Loop ${j.type} Join on '${j.table}'`);
        }
      }
      if (inner.where) {
        planLines.push(`   -> Filter: [Expression evaluation]`);
      }
      if (inner.groupBy) {
        planLines.push(`   -> HashAggregate grouping on ${inner.groupBy.length} key(s)`);
      }
      if (inner.orderBy) {
        planLines.push(`   -> Sort: ${inner.orderBy.map((o) => o.direction).join(', ')}`);
      }
    } else {
      planLines.push(`-> Direct Engine Mutation: ${inner.type}`);
    }

    return {
      success: true,
      columns: [{ name: 'QUERY PLAN', type: 'TEXT' }],
      rows: planLines.map((line) => ({ 'QUERY PLAN': line })),
      rowCount: planLines.length,
      rowsAffected: 0,
      executionTimeMs: 0,
      statementType: 'EXPLAIN',
      explainPlan: { lines: planLines },
    };
  }

  private getTable(name: string): TableData {
    const lower = name.toLowerCase();
    const t = this.tables.get(lower);
    if (!t) {
      throw new Error(`Table '${name}' does not exist in local schema`);
    }
    return t;
  }

  // --- BUSINESS APPLICATION METHODS (FOR FRONTEND INTERFACES) ---
  public getFlights(): any[] {
    const t = this.getTable('flights');
    return [...t.rows];
  }

  public getBookings(): any[] {
    const bTable = this.getTable('bookings');
    const pTable = this.getTable('passengers');
    const fTable = this.getTable('flights');

    return bTable.rows.map((b) => {
      const passenger = pTable.rows.find((p) => p.passenger_id === b.passenger_id);
      const flight = fTable.rows.find((f) => f.flight_id === b.flight_id);
      return {
        ...b,
        passenger_name: passenger?.full_name || 'Passenger',
        passenger_email: passenger?.email || '',
        passenger_phone: passenger?.phone || '',
        airline_name: flight?.airline_name || '',
        flight_number: flight?.flight_number || '',
        source: flight?.source || '',
        destination: flight?.destination || '',
        departure_time: flight?.departure_time || '',
        arrival_time: flight?.arrival_time || '',
      };
    });
  }

  public getPassengers(): any[] {
    const pTable = this.getTable('passengers');
    const bTable = this.getTable('bookings');

    return pTable.rows.map((p) => {
      const pBookings = bTable.rows.filter((b) => b.passenger_id === p.passenger_id);
      const totalSpent = pBookings
        .filter((b) => String(b.booking_status).toLowerCase() === 'confirmed')
        .reduce((sum, b) => sum + Number(b.total_amount), 0);
      return {
        ...p,
        total_bookings: pBookings.length,
        total_spent: totalSpent,
      };
    });
  }

  public getDashboardMetrics(): any {
    const flights = this.getTable('flights').rows;
    const passengers = this.getTable('passengers').rows;
    const bookings = this.getTable('bookings').rows;

    const confirmed = bookings.filter((b) => String(b.booking_status).toLowerCase() === 'confirmed');
    const cancelled = bookings.filter((b) => String(b.booking_status).toLowerCase() === 'cancelled');

    const totalRevenue = confirmed.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const seatsRemaining = flights.reduce((sum, f) => sum + Number(f.available_seats), 0);
    const totalCapacity = flights.reduce((sum, f) => sum + Number(f.total_seats), 0);

    return {
      total_flights: flights.length,
      upcoming_flights: flights.length,
      total_passengers: passengers.length,
      confirmed_bookings: confirmed.length,
      cancelled_bookings: cancelled.length,
      total_revenue: totalRevenue,
      seats_remaining: seatsRemaining,
      total_capacity: totalCapacity,
    };
  }

  public createBooking(payload: {
    flight_id: number;
    seats_booked: number;
    full_name: string;
    email: string;
    phone?: string;
  }) {
    const fTable = this.getTable('flights');
    const pTable = this.getTable('passengers');
    const bTable = this.getTable('bookings');

    const flight = fTable.rows.find((f) => f.flight_id === payload.flight_id);
    if (!flight) throw new Error('Flight not found');

    if (flight.available_seats < payload.seats_booked) {
      throw new Error(`Insufficient seats. Requested: ${payload.seats_booked}, available: ${flight.available_seats}`);
    }

    // Reuse or create passenger
    let passenger = pTable.rows.find((p) => p.email.toLowerCase() === payload.email.trim().toLowerCase());
    if (!passenger) {
      passenger = {
        passenger_id: pTable.autoIncrementId++,
        full_name: payload.full_name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone || null,
      };
      pTable.rows.push(passenger);
    }

    const price = Number(flight.price || flight.fare || 0);
    const totalAmount = Math.round(price * payload.seats_booked * 100) / 100;

    const bookingId = bTable.autoIncrementId++;
    const newBooking = {
      booking_id: bookingId,
      passenger_id: passenger.passenger_id,
      flight_id: flight.flight_id,
      booking_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      seats_booked: payload.seats_booked,
      total_amount: totalAmount,
      booking_status: 'Confirmed',
    };

    bTable.rows.push(newBooking);
    flight.available_seats -= payload.seats_booked;

    this.notify('bookings', 'INSERT', 1);

    return {
      ...newBooking,
      booking_reference: `SKW-${bookingId.toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 899)}`,
      passenger_name: passenger.full_name,
      passenger_email: passenger.email,
      airline_name: flight.airline_name,
      flight_number: flight.flight_number,
      source: flight.source,
      destination: flight.destination,
      departure_time: flight.departure_time,
      arrival_time: flight.arrival_time,
    };
  }

  public cancelBooking(bookingId: number, email?: string) {
    const bTable = this.getTable('bookings');
    const fTable = this.getTable('flights');
    const pTable = this.getTable('passengers');

    const booking = bTable.rows.find((b) => b.booking_id === bookingId);
    if (!booking) throw new Error('Booking not found');

    if (String(booking.booking_status).toLowerCase() === 'cancelled') {
      throw new Error('This booking is already cancelled');
    }

    if (email) {
      const passenger = pTable.rows.find((p) => p.passenger_id === booking.passenger_id);
      if (passenger && passenger.email.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Email does not match booking record');
      }
    }

    booking.booking_status = 'Cancelled';

    const flight = fTable.rows.find((f) => f.flight_id === booking.flight_id);
    if (flight) {
      flight.available_seats += booking.seats_booked;
    }

    this.notify('bookings', 'UPDATE', 1);

    return {
      success: true,
      refundAmount: booking.total_amount,
      seatsRestored: booking.seats_booked,
    };
  }

  public getSchemaMetadata(): { databaseName: string; tables: any[] } {
    const tablesList: any[] = [];
    for (const t of this.tables.values()) {
      tablesList.push({
        tableName: t.name,
        approxRowCount: t.rows.length,
        description: `Local in-browser table ${t.name}`,
        columns: t.columns.map((c) => ({
          name: c.name,
          type: c.type,
          isPrimary: Boolean(c.isPrimary),
          nullable: Boolean(c.nullable),
          defaultValue: c.defaultValue !== undefined ? String(c.defaultValue) : null,
        })),
        indexes: [`${t.name}_pkey`],
        foreignKeys: [],
      });
    }
    return {
      databaseName: 'SKY WINGS Local Engine',
      tables: tablesList,
    };
  }

  public explain(sql: string, _analyze: boolean = false): ExecutionResult {
    const trimmed = sql.trim();
    if (trimmed.toUpperCase().startsWith('EXPLAIN')) {
      return this.execute(trimmed);
    }
    return this.execute(`EXPLAIN ${trimmed}`);
  }

  public searchFlights(params: {
    source?: string;
    destination?: string;
    date?: string;
    seats?: number;
  }): any[] {
    const flights = this.getFlights();
    return flights.filter((f) => {
      if (params.source && !f.source.toLowerCase().includes(params.source.toLowerCase())) {
        return false;
      }
      if (params.destination && !f.destination.toLowerCase().includes(params.destination.toLowerCase())) {
        return false;
      }
      if (params.seats && Number(f.available_seats) < Number(params.seats)) {
        return false;
      }
      if (params.date && f.departure_time) {
        const fDate = String(f.departure_time).slice(0, 10);
        if (fDate === params.date) {
          return true;
        }
      }
      return true;
    });
  }

  public createFlight(data: any): any {
    const t = this.getTable('flights');
    const newFlight = {
      flight_id: t.autoIncrementId++,
      airline_name: data.airline_name || 'IndiGo',
      flight_number: data.flight_number,
      source: data.source,
      destination: data.destination,
      departure_time: data.departure_time,
      arrival_time: data.arrival_time,
      price: Number(data.price || data.fare || 0),
      total_seats: Number(data.total_seats || 180),
      available_seats: Number(data.available_seats || data.total_seats || 180),
    };
    t.rows.push(newFlight);
    this.notify('flights', 'INSERT', 1);
    return newFlight;
  }

  public updateFlight(id: number, data: any): any {
    const t = this.getTable('flights');
    const idx = t.rows.findIndex((f) => f.flight_id === id);
    if (idx === -1) throw new Error(`Flight ${id} not found`);
    t.rows[idx] = { ...t.rows[idx], ...data };
    this.notify('flights', 'UPDATE', 1);
    return t.rows[idx];
  }

  public lookupBookings(params: { email?: string; reference?: string }): any[] {
    const all = this.getBookings();
    return all.filter((b) => {
      if (params.email && (!b.passenger_email || b.passenger_email.toLowerCase() !== params.email.trim().toLowerCase())) {
        return false;
      }
      if (params.reference && (!b.booking_reference || !b.booking_reference.toLowerCase().includes(params.reference.trim().toLowerCase()))) {
        return false;
      }
      return true;
    });
  }

  public getSavedQueries(): any[] {
    return [...this.savedQueries];
  }

  public saveQuery(name: string, sqlText: string, description?: string): any {
    const newQuery = {
      query_id: Date.now(),
      name,
      sql_text: sqlText,
      description: description || '',
      created_at: new Date().toISOString(),
    };
    this.savedQueries.push(newQuery);
    this.saveSavedQueries();
    return newQuery;
  }

  public deleteSavedQuery(id: number): boolean {
    const before = this.savedQueries.length;
    this.savedQueries = this.savedQueries.filter((q) => q.query_id !== id);
    this.saveSavedQueries();
    return this.savedQueries.length < before;
  }

  public getQueryHistory(): any[] {
    return [...this.queryHistory];
  }

  public getAuditLogs(): any[] {
    return [...this.auditLogs];
  }

  public getDbStatus(): any {
    return {
      isConnectedToPostgres: true,
      host: 'Current Browser (localStorage)',
      port: 0,
      database: 'airline_reservation',
      user: 'workbench_admin',
      poolTotal: 1,
      poolIdle: 1,
      poolWaiting: 0,
      lastChecked: new Date().toISOString(),
      isFallbackMode: false,
    };
  }
}

function hasAggregateFunction(expr: any): boolean {
  if (!expr) return false;
  if (expr.type === 'FUNCTION_CALL') {
    const n = expr.name.toUpperCase();
    return ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(n);
  }
  if (expr.left || expr.right) {
    return hasAggregateFunction(expr.left) || hasAggregateFunction(expr.right);
  }
  return false;
}

// Global Singleton Instance for shared in-browser state
export const browserDb = new BrowserDatabase();
