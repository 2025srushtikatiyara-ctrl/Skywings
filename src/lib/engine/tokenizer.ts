/**
 * SQL Tokenizer for SKY WINGS In-Browser SQL Engine
 * Pure TypeScript tokenizer with zero external dependencies.
 */

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'STAR'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  raw: string;
  pos: number;
}

const KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS',
  'NULL',
  'AS',
  'ORDER',
  'BY',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'GROUP',
  'HAVING',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'OUTER',
  'ON',
  'DISTINCT',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'SHOW',
  'TABLES',
  'DESCRIBE',
  'DESC',
  'CREATE',
  'TABLE',
  'ALTER',
  'ADD',
  'DROP',
  'RENAME',
  'COLUMN',
  'TO',
  'EXPLAIN',
  'ANALYZE',
  'PRIMARY',
  'KEY',
  'DEFAULT',
  'INT',
  'INTEGER',
  'VARCHAR',
  'TEXT',
  'NUMERIC',
  'BOOLEAN',
  'TIMESTAMP',
  'TRUE',
  'FALSE',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
]);

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const char = sql[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Line comments (-- comment)
    if (char === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Block comments (/* comment */)
    if (char === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    // Strings ('string' or "string")
    if (char === "'" || char === '"') {
      const quote = char;
      const start = i;
      i++;
      let value = '';
      while (i < len) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            value += quote;
            i += 2;
          } else {
            i++;
            break;
          }
        } else if (sql[i] === '\\' && i + 1 < len) {
          value += sql[i + 1];
          i += 2;
        } else {
          value += sql[i];
          i++;
        }
      }
      tokens.push({
        type: 'STRING',
        value,
        raw: sql.substring(start, i),
        pos: start,
      });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sql[i + 1] || ''))) {
      const start = i;
      let hasDot = false;
      while (i < len && (/[0-9]/.test(sql[i]) || (sql[i] === '.' && !hasDot))) {
        if (sql[i] === '.') hasDot = true;
        i++;
      }
      const raw = sql.substring(start, i);
      tokens.push({
        type: 'NUMBER',
        value: raw,
        raw,
        pos: start,
      });
      continue;
    }

    // Comparison Operators (>=, <=, !=, <>, =, >, <)
    if (char === '<' || char === '>' || char === '!' || char === '=') {
      const start = i;
      const next = sql[i + 1];
      if ((char === '<' && next === '=') || (char === '>' && next === '=') || (char === '!' && next === '=') || (char === '<' && next === '>')) {
        tokens.push({
          type: 'OPERATOR',
          value: sql.substring(start, start + 2),
          raw: sql.substring(start, start + 2),
          pos: start,
        });
        i += 2;
        continue;
      }
      tokens.push({
        type: 'OPERATOR',
        value: char,
        raw: char,
        pos: start,
      });
      i++;
      continue;
    }

    // Arithmetic operators (+, -, /) except * which can also be SELECT *
    if (char === '+' || char === '-' || char === '/') {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        raw: char,
        pos: i,
      });
      i++;
      continue;
    }

    // Star (*)
    if (char === '*') {
      tokens.push({
        type: 'STAR',
        value: '*',
        raw: '*',
        pos: i,
      });
      i++;
      continue;
    }

    // Punctuation (, ; ( ) .)
    if (char === ',' || char === ';' || char === '(' || char === ')' || char === '.') {
      tokens.push({
        type: 'PUNCTUATION',
        value: char,
        raw: char,
        pos: i,
      });
      i++;
      continue;
    }

    // Identifiers or Keywords
    if (/[a-zA-Z_]/.test(char) || char === '`') {
      const start = i;
      if (char === '`') {
        i++;
        while (i < len && sql[i] !== '`') {
          i++;
        }
        i++; // skip closing `
        const raw = sql.substring(start, i);
        const val = raw.slice(1, -1);
        tokens.push({
          type: 'IDENTIFIER',
          value: val,
          raw,
          pos: start,
        });
        continue;
      }

      while (i < len && /[a-zA-Z0-9_]/.test(sql[i])) {
        i++;
      }
      const raw = sql.substring(start, i);
      const upper = raw.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({
          type: 'KEYWORD',
          value: upper,
          raw,
          pos: start,
        });
      } else {
        tokens.push({
          type: 'IDENTIFIER',
          value: raw,
          raw,
          pos: start,
        });
      }
      continue;
    }

    // Unknown single character
    tokens.push({
      type: 'PUNCTUATION',
      value: char,
      raw: char,
      pos: i,
    });
    i++;
  }

  tokens.push({
    type: 'EOF',
    value: '',
    raw: '',
    pos: len,
  });

  return tokens;
}
