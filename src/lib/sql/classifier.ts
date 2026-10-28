/**
 * SQL Classification & Safety Analyzer for SKY WINGS SQL Workbench
 * Strictly inspects SQL statements to determine safety category,
 * identifies mutations without WHERE clauses, detects schema changes,
 * and extracts individual executable statements.
 */

export type QueryClassificationType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'ALTER'
  | 'DROP'
  | 'TRUNCATE'
  | 'TRANSACTION'
  | 'EXPLAIN'
  | 'GRANT_REVOKE'
  | 'ADMINISTRATIVE'
  | 'UNSUPPORTED';

export interface QueryAnalysis {
  classification: QueryClassificationType;
  isReadOnly: boolean;
  isMutation: boolean;
  isSchemaChange: boolean;
  isDestructive: boolean;
  requiresExplicitConfirmation: boolean;
  warning?: string;
  normalizedSql: string;
  affectedTableHint?: string;
}

/**
 * Strips comments (both line -- and block /* * /) and normalizes whitespace
 */
export function stripCommentsAndNormalize(sql: string): string {
  if (!sql) return '';
  // Remove block comments
  let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Remove line comments
  cleaned = cleaned.replace(/--.*$/gm, ' ');
  return cleaned.trim().replace(/\s+/g, ' ');
}

/**
 * Splits multiple SQL statements safely while handling quotes and strings
 */
export function splitStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1] || '';

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      current += char;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        current += '*/';
        i++;
        continue;
      }
      current += char;
      continue;
    }
    if (char === '-' && nextChar === '-' && !inSingleQuote && !inDoubleQuote) {
      inLineComment = true;
      current += char;
      continue;
    }
    if (char === '/' && nextChar === '*' && !inSingleQuote && !inDoubleQuote) {
      inBlockComment = true;
      current += '/*';
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const remainder = current.trim();
  if (remainder) {
    statements.push(remainder);
  }

  return statements;
}

/**
 * Analyzes a single SQL statement for classification, safety boundaries,
 * and potential hazards (e.g. unconstrained UPDATE/DELETE).
 */
export function analyzeSqlStatement(rawSql: string): QueryAnalysis {
  const normalized = stripCommentsAndNormalize(rawSql);
  if (!normalized) {
    return {
      classification: 'UNSUPPORTED',
      isReadOnly: true,
      isMutation: false,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: false,
      normalizedSql: '',
    };
  }

  const upper = normalized.toUpperCase();

  // EXPLAIN detection (e.g. EXPLAIN (ANALYZE, BUFFERS) SELECT ...)
  if (upper.startsWith('EXPLAIN')) {
    const hasAnalyze = upper.includes('ANALYZE');
    return {
      classification: 'EXPLAIN',
      isReadOnly: !hasAnalyze,
      isMutation: hasAnalyze,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: hasAnalyze,
      warning: hasAnalyze
        ? 'EXPLAIN ANALYZE executes the statement and may modify database records.'
        : undefined,
      normalizedSql: normalized,
    };
  }

  // Transaction statements
  if (
    upper === 'BEGIN' ||
    upper === 'START TRANSACTION' ||
    upper === 'COMMIT' ||
    upper === 'ROLLBACK' ||
    upper.startsWith('SAVEPOINT') ||
    upper.startsWith('RELEASE SAVEPOINT')
  ) {
    return {
      classification: 'TRANSACTION',
      isReadOnly: false,
      isMutation: false,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: false,
      normalizedSql: normalized,
    };
  }

  // Destructive statements (DROP, TRUNCATE)
  if (upper.startsWith('DROP')) {
    return {
      classification: 'DROP',
      isReadOnly: false,
      isMutation: false,
      isSchemaChange: true,
      isDestructive: true,
      requiresExplicitConfirmation: true,
      warning: 'DROP operation detected. This is a destructive schema change.',
      normalizedSql: normalized,
    };
  }

  if (upper.startsWith('TRUNCATE')) {
    return {
      classification: 'TRUNCATE',
      isReadOnly: false,
      isMutation: true,
      isSchemaChange: false,
      isDestructive: true,
      requiresExplicitConfirmation: true,
      warning: 'TRUNCATE removes all rows immediately and resets table content.',
      normalizedSql: normalized,
    };
  }

  // Schema changes (CREATE, ALTER)
  if (upper.startsWith('CREATE')) {
    return {
      classification: 'CREATE',
      isReadOnly: false,
      isMutation: false,
      isSchemaChange: true,
      isDestructive: false,
      requiresExplicitConfirmation: true,
      warning: 'CREATE statement modifies database schema.',
      normalizedSql: normalized,
    };
  }

  if (upper.startsWith('ALTER')) {
    return {
      classification: 'ALTER',
      isReadOnly: false,
      isMutation: false,
      isSchemaChange: true,
      isDestructive: false,
      requiresExplicitConfirmation: true,
      warning: 'ALTER statement modifies existing table or schema definitions.',
      normalizedSql: normalized,
    };
  }

  // Data Mutations: INSERT
  if (upper.startsWith('INSERT')) {
    const match = normalized.match(/INSERT\s+INTO\s+([a-zA-Z0-9_."]+)/i);
    return {
      classification: 'INSERT',
      isReadOnly: false,
      isMutation: true,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: false,
      affectedTableHint: match ? match[1].replace(/["']/g, '') : undefined,
      normalizedSql: normalized,
    };
  }

  // Data Mutations: UPDATE
  if (upper.startsWith('UPDATE')) {
    const match = normalized.match(/UPDATE\s+([a-zA-Z0-9_."]+)/i);
    const hasWhere = /\bWHERE\b/i.test(normalized);
    const isUnconstrained = !hasWhere;

    return {
      classification: 'UPDATE',
      isReadOnly: false,
      isMutation: true,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: isUnconstrained,
      warning: isUnconstrained
        ? 'Caution: UPDATE statement has NO WHERE clause. This will update every row in the table!'
        : undefined,
      affectedTableHint: match ? match[1].replace(/["']/g, '') : undefined,
      normalizedSql: normalized,
    };
  }

  // Data Mutations: DELETE
  if (upper.startsWith('DELETE')) {
    const match = normalized.match(/DELETE\s+FROM\s+([a-zA-Z0-9_."]+)/i);
    const hasWhere = /\bWHERE\b/i.test(normalized);
    const isUnconstrained = !hasWhere;

    return {
      classification: 'DELETE',
      isReadOnly: false,
      isMutation: true,
      isSchemaChange: false,
      isDestructive: isUnconstrained,
      requiresExplicitConfirmation: true,
      warning: isUnconstrained
        ? 'Danger: DELETE statement has NO WHERE clause. This will permanently delete all rows in the table!'
        : 'DELETE mutation will remove records matching the WHERE criteria.',
      affectedTableHint: match ? match[1].replace(/["']/g, '') : undefined,
      normalizedSql: normalized,
    };
  }

  // SELECT or WITH queries (Read-Only)
  if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('SHOW')) {
    return {
      classification: 'SELECT',
      isReadOnly: true,
      isMutation: false,
      isSchemaChange: false,
      isDestructive: false,
      requiresExplicitConfirmation: false,
      normalizedSql: normalized,
    };
  }

  // GRANT / REVOKE
  if (upper.startsWith('GRANT') || upper.startsWith('REVOKE')) {
    return {
      classification: 'GRANT_REVOKE',
      isReadOnly: false,
      isMutation: false,
      isSchemaChange: true,
      isDestructive: false,
      requiresExplicitConfirmation: true,
      warning: 'Security privilege modifications require explicit confirmation.',
      normalizedSql: normalized,
    };
  }

  // Default fallback
  return {
    classification: 'UNSUPPORTED',
    isReadOnly: true,
    isMutation: false,
    isSchemaChange: false,
    isDestructive: false,
    requiresExplicitConfirmation: true,
    warning: 'Unrecognized SQL dialect or statement structure.',
    normalizedSql: normalized,
  };
}
