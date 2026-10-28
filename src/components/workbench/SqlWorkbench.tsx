/**
 * THE CORE FEATURE: Professional PostgreSQL SQL Workbench
 * Integrated with the airline_reservation database, schema explorer,
 * real-time SSE invalidation, EXPLAIN analyzer, and interactive results grid.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  TableMeta,
  SavedQuery,
  QueryHistoryItem,
  DatabaseStatus,
} from '../../types';
import {
  executeSql,
  explainSql,
  fetchSchemaMetadata,
  fetchSavedQueries,
  saveQuery,
  deleteSavedQuery,
  fetchQueryHistory,
} from '../../services/api';
import { analyzeSqlStatement } from '../../lib/sql/classifier';
import {
  Play,
  RotateCcw,
  Sparkles,
  Database,
  Terminal,
  Bookmark,
  History,
  Copy,
  Download,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Key,
  ShieldCheck,
  RefreshCw,
  FileCode,
  Zap,
} from 'lucide-react';

interface SqlWorkbenchProps {
  dbStatus: DatabaseStatus;
  onMutationExecuted?: () => void;
}

const TEMPLATES = [
  {
    name: 'Scheduled Flights by Departure',
    sql: 'SELECT * FROM flights ORDER BY departure_time;',
  },
  {
    name: 'Registered Passengers Directory',
    sql: 'SELECT * FROM passengers ORDER BY passenger_id;',
  },
  {
    name: 'Latest Bookings Ledger',
    sql: 'SELECT * FROM bookings ORDER BY booking_date DESC;',
  },
  {
    name: 'Full 3-Table Relational JOIN',
    sql: `SELECT 
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
  },
  {
    name: 'Information Schema Tables',
    sql: `SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;`,
  },
  {
    name: 'Flight Seat Inventory Check',
    sql: `SELECT flight_number, source, destination, total_seats, available_seats,
       (total_seats - available_seats) AS seats_booked
FROM flights
ORDER BY available_seats ASC;`,
  },
];

export const SqlWorkbench: React.FC<SqlWorkbenchProps> = ({ dbStatus, onMutationExecuted }) => {
  const [sql, setSql] = useState<string>(TEMPLATES[0].sql);
  const [selectedText, setSelectedText] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'RESULTS' | 'EXPLAIN' | 'HISTORY' | 'SCHEMA'>('RESULTS');

  // Schema & Saved queries
  const [schema, setSchema] = useState<{ databaseName: string; tables: TableMeta[] } | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    flights: true,
    bookings: true,
    passengers: false,
  });

  // Save query modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState('');
  const [saveQueryDesc, setSaveQueryDesc] = useState('');

  // Confirmation for unconstrained mutations
  const [confirmUnconstrained, setConfirmUnconstrained] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load schema, saved queries, and history on mount
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const [sData, qData, hData] = await Promise.all([
        fetchSchemaMetadata(),
        fetchSavedQueries(),
        fetchQueryHistory(),
      ]);
      setSchema(sData);
      setSavedQueries(qData);
      setHistory(hData);
    } catch (err) {
      console.error('Failed to load workbench metadata', err);
    }
  };

  // Immediate classification analysis of current SQL
  const analysis = analyzeSqlStatement(sql);

  // Check selection
  const handleSelectText = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(sql.substring(start, end));
      } else {
        setSelectedText('');
      }
    }
  };

  const handleRunQuery = async (targetSql?: string) => {
    const queryToRun = (targetSql || selectedText || sql).trim();
    if (!queryToRun) return;

    if (analysis.requiresExplicitConfirmation && !confirmUnconstrained) {
      setActiveTab('RESULTS');
      return;
    }

    setIsExecuting(true);
    try {
      const res = await executeSql(queryToRun);
      setResult(res);
      setActiveTab('RESULTS');

      if (res.success && (analysis.isMutation || analysis.isSchemaChange)) {
        if (onMutationExecuted) {
          onMutationExecuted();
        }
      }

      // Refresh history
      const updatedHistory = await fetchQueryHistory();
      setHistory(updatedHistory);
    } catch (err: any) {
      setResult({
        success: false,
        durationMs: 0,
        errorMessage: err.message || 'Execution failed',
        queryClassification: analysis.classification,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExplain = async (analyze: boolean = false) => {
    const queryToRun = (selectedText || sql).trim();
    if (!queryToRun) return;

    setIsExecuting(true);
    try {
      const res = await explainSql(queryToRun, analyze);
      setResult(res);
      setActiveTab('EXPLAIN');
    } catch (err: any) {
      setResult({
        success: false,
        errorMessage: err.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveQueryName.trim()) return;

    try {
      await saveQuery(saveQueryName.trim(), sql, saveQueryDesc.trim());
      setShowSaveModal(false);
      setSaveQueryName('');
      setSaveQueryDesc('');
      const updated = await fetchSavedQueries();
      setSavedQueries(updated);
    } catch (err: any) {
      alert(`Failed to save query: ${err.message}`);
    }
  };

  const handleDeleteSaved = async (id: number) => {
    try {
      await deleteSavedQuery(id);
      const updated = await fetchSavedQueries();
      setSavedQueries(updated);
    } catch (err: any) {
      alert(`Failed to delete saved query: ${err.message}`);
    }
  };

  const handleCopyCell = (val: any, cellKey: string) => {
    const str = val === null || val === undefined ? 'NULL' : String(val);
    navigator.clipboard.writeText(str);
    setCopiedCell(cellKey);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const handleDownloadCsv = () => {
    if (!result?.rows || result.rows.length === 0) return;
    const cols = result.columns?.map((c: any) => c.name) || Object.keys(result.rows[0]);
    const header = cols.join(',');
    const rows = result.rows.map((row: any) =>
      cols
        .map((col: string) => {
          const val = row[col];
          if (val === null || val === undefined) return '""';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skywings_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFormatSql = () => {
    // Light formatter: capitalize keywords and format clean line breaks
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON', 'ORDER BY', 'GROUP BY', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM'];
    let formatted = sql;
    keywords.forEach((kw) => {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(reg, kw);
    });
    setSql(formatted);
  };

  const toggleTable = (tName: string) => {
    setExpandedTables((prev) => ({ ...prev, [tName]: !prev[tName] }));
  };

  const handleInjectSelect = (tName: string) => {
    const query = `SELECT * FROM ${tName} LIMIT 50;`;
    setSql(query);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Connection Information */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
            <Terminal className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">PostgreSQL 18 SQL Workbench</h2>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                Authorized Admin
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
              <span>DB: <strong className="text-white">airline_reservation</strong></span>
              <span>•</span>
              <span>Host: <strong className="text-cyan-400">{dbStatus.host}:{dbStatus.port}</strong></span>
              <span>•</span>
              <span>Role: <strong className="text-slate-200">postgres</strong></span>
            </div>
          </div>
        </div>

        {/* Templates and Saved Queries dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Templates */}
          <select
            onChange={(e) => {
              if (e.target.value) setSql(e.target.value);
            }}
            value=""
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="" disabled>Load SQL Template...</option>
            {TEMPLATES.map((t, i) => (
              <option key={i} value={t.sql}>{t.name}</option>
            ))}
          </select>

          {/* Saved queries */}
          <select
            onChange={(e) => {
              if (e.target.value) setSql(e.target.value);
            }}
            value=""
            className="rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="" disabled>Saved Queries ({savedQueries.length})...</option>
            {savedQueries.map((q) => (
              <option key={q.query_id} value={q.sql_text}>{q.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowSaveModal(true)}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Workbench Layout: Left Schema Explorer + Right Editor & Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Schema Explorer Tree (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl flex flex-col h-[650px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Schema Explorer</span>
            </div>
            <button
              onClick={loadMetadata}
              title="Refresh Schema"
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {schema?.tables.map((table) => {
              const isExpanded = expandedTables[table.tableName];
              return (
                <div key={table.tableName} className="rounded-xl bg-slate-950/60 border border-slate-800/80 overflow-hidden">
                  <div
                    onClick={() => toggleTable(table.tableName)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      <span>{table.tableName}</span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        (~{table.approxRowCount} rows)
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInjectSelect(table.tableName);
                      }}
                      title="Insert SELECT template"
                      className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-cyan-400 font-mono transition-colors"
                    >
                      SELECT
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-2 space-y-1 bg-slate-950/40 text-[11px] font-mono">
                      {table.columns.map((col) => (
                        <div key={col.name} className="flex items-center justify-between py-0.5 px-2 rounded hover:bg-slate-900/60">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            {col.isPrimary ? (
                              <Key className="h-3 w-3 text-amber-400 shrink-0" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />
                            )}
                            <span className={col.isPrimary ? 'font-bold text-white' : ''}>
                              {col.name}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px]">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: SQL Editor, Action Toolbar, and Results Grid (8 cols on lg) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Editor Container */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-4 shadow-xl space-y-3">
            {/* Editor Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {/* Classification badge */}
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    analysis.isReadOnly
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : analysis.isDestructive
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {analysis.classification} {analysis.isReadOnly ? '[Read-Only]' : '[Mutation]'}
                </span>

                {selectedText && (
                  <span className="text-[11px] text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40 font-mono">
                    Text Range Selected ({selectedText.length} chars)
                  </span>
                )}
              </div>

              {/* Execution Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatSql}
                  title="Format SQL indentation"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
                >
                  Format
                </button>

                <button
                  type="button"
                  onClick={() => setSql('')}
                  title="Clear SQL Editor"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => handleExplain(false)}
                  disabled={isExecuting}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
                >
                  Explain
                </button>

                {selectedText && (
                  <button
                    type="button"
                    onClick={() => handleRunQuery(selectedText)}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Run Selection</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRunQuery()}
                  disabled={isExecuting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isExecuting ? 'Executing...' : 'Run Query'}</span>
                  <span className="hidden sm:inline text-[10px] text-blue-200/80 font-mono">⌘↵</span>
                </button>
              </div>
            </div>

            {/* Safety Warning Banner for unconstrained mutations */}
            {analysis.requiresExplicitConfirmation && (
              <div className="rounded-2xl bg-amber-950/40 border border-amber-500/40 p-3 text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>Safety Guardrail Triggered: {analysis.warning}</span>
                </div>
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmUnconstrained}
                    onChange={(e) => setConfirmUnconstrained(e.target.checked)}
                    className="rounded bg-slate-950 border-amber-500 text-amber-600 focus:ring-0"
                  />
                  <span className="font-semibold text-white">
                    I acknowledge this statement modifies data and confirm execution.
                  </span>
                </label>
              </div>
            )}

            {/* Monaco-style Code Editor Textarea */}
            <div className="relative font-mono text-xs">
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onSelect={handleSelectText}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunQuery();
                  }
                }}
                rows={7}
                placeholder="Enter SQL statements (e.g. SELECT * FROM flights;)..."
                className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-4 font-mono text-xs text-cyan-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-y leading-relaxed selection:bg-cyan-500/30"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Results / Explain / History Area */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl flex flex-col min-h-[350px]">
            {/* View Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('RESULTS')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'RESULTS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Results Grid {result?.rows && `(${result.rows.length})`}
                </button>
                <button
                  onClick={() => setActiveTab('EXPLAIN')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'EXPLAIN'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Query Plan (EXPLAIN)
                </button>
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'HISTORY'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Execution History ({history.length})
                </button>
              </div>

              {/* Status metrics bar */}
              {result && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  {result.success ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="h-3.5 w-3.5" /> Query Succeeded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-400 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5" /> Failed
                    </span>
                  )}
                  <span className="text-slate-400">• {result.durationMs} ms</span>
                  {result.rowsAffected !== undefined && (
                    <span className="text-cyan-400">• {result.rowsAffected} affected</span>
                  )}
                  {result.rows && result.rows.length > 0 && (
                    <button
                      onClick={handleDownloadCsv}
                      title="Download results as CSV"
                      className="ml-2 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] text-slate-300 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span>CSV</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB: RESULTS GRID */}
            {activeTab === 'RESULTS' && (
              <div className="flex-1 overflow-x-auto">
                {result?.errorMessage && (
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 font-mono space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>PostgreSQL Execution Error:</span>
                    </div>
                    <p className="whitespace-pre-wrap">{result.errorMessage}</p>
                  </div>
                )}

                {result?.success && result.rows && result.rows.length > 0 && (
                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <div className="max-h-[360px] overflow-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 bg-slate-950 text-slate-600 font-bold w-12 text-center">#</th>
                            {result.columns?.map((col: any) => (
                              <th key={col.name} className="py-2.5 px-3 font-semibold whitespace-nowrap bg-slate-950">
                                <span>{col.name}</span>
                                <span className="ml-1 text-[9px] text-slate-500 font-normal lowercase">({col.dataType})</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                          {result.rows.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-2 px-3 text-center text-slate-600 select-none text-[10px]">
                                {rIdx + 1}
                              </td>
                              {result.columns?.map((col: any) => {
                                const val = row[col.name];
                                const isNull = val === null || val === undefined;
                                const cellKey = `${rIdx}_${col.name}`;
                                return (
                                  <td
                                    key={col.name}
                                    onClick={() => handleCopyCell(val, cellKey)}
                                    title="Click to copy cell value"
                                    className={`py-2 px-3 cursor-pointer whitespace-nowrap transition-colors relative ${
                                      isNull ? 'text-slate-600 italic' : 'text-slate-200 hover:text-cyan-300'
                                    }`}
                                  >
                                    {isNull ? 'NULL' : String(val)}
                                    {copiedCell === cellKey && (
                                      <span className="absolute right-1 top-1 rounded bg-cyan-600 px-1 py-0.2 text-[9px] text-white">
                                        Copied!
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result?.success && (!result.rows || result.rows.length === 0) && (
                  <div className="py-12 text-center text-xs text-slate-400 font-mono space-y-1">
                    <Check className="h-6 w-6 mx-auto text-emerald-400 mb-2" />
                    <p className="font-bold text-white">Statement executed successfully.</p>
                    <p>{result.rowsAffected || 0} row(s) affected in {result.durationMs} ms.</p>
                  </div>
                )}

                {!result && (
                  <div className="py-16 text-center text-xs text-slate-500 font-mono space-y-2">
                    <Terminal className="h-8 w-8 mx-auto text-slate-700" />
                    <p>Enter an SQL query above and press "Run Query" (⌘↵) to inspect PostgreSQL results.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: EXPLAIN PLAN */}
            {activeTab === 'EXPLAIN' && (
              <div className="flex-1 rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-auto max-h-[360px] whitespace-pre-wrap">
                {result?.rows ? (
                  result.rows.map((r: any, i: number) => (
                    <div key={i} className="py-0.5 leading-relaxed text-cyan-200">
                      {r['QUERY PLAN'] || JSON.stringify(r)}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">Run "Explain" on an SQL statement to view the execution tree.</p>
                )}
              </div>
            )}

            {/* TAB: QUERY HISTORY */}
            {activeTab === 'HISTORY' && (
              <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2">
                {history.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-500 font-mono">No query history recorded yet.</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.history_id}
                      className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 text-xs font-mono space-y-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{new Date(item.created_at).toLocaleTimeString()}</span>
                        <div className="flex items-center gap-2">
                          <span className={item.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}>
                            {item.status} ({item.execution_time_ms} ms)
                          </span>
                          <button
                            onClick={() => {
                              setSql(item.sql_text);
                              setActiveTab('RESULTS');
                            }}
                            className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-cyan-400 text-[10px]"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                      <div className="text-slate-200 font-semibold truncate">{item.sql_text}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Query Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-cyan-400" />
              <span>Save Current Query</span>
            </h3>
            <form onSubmit={handleSaveQuery} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Query Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight Pricing Audit"
                  value={saveQueryName}
                  onChange={(e) => setSaveQueryName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes on usage..."
                  value={saveQueryDesc}
                  onChange={(e) => setSaveQueryDesc(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-xl px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 font-bold text-white transition-all"
                >
                  Save to Workbench
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
