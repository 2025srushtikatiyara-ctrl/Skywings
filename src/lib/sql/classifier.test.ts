import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripCommentsAndNormalize,
  splitStatements,
  analyzeSqlStatement,
} from './classifier';

test('stripCommentsAndNormalize removes line and block comments', () => {
  const sql = `
    -- Get all flights
    SELECT * /* all columns */ FROM flights
    WHERE price < 5000; -- filter under 5k
  `;
  const result = stripCommentsAndNormalize(sql);
  assert.equal(result, 'SELECT * FROM flights WHERE price < 5000;');
});

test('splitStatements handles semicolons within quotes', () => {
  const multiSql = `
    SELECT 'Hello; World' AS msg;
    UPDATE flights SET flight_number = 'AI-101' WHERE flight_id = 1;
  `;
  const statements = splitStatements(multiSql);
  assert.equal(statements.length, 2);
  assert.equal(statements[0], "SELECT 'Hello; World' AS msg");
  assert.equal(
    statements[1],
    "UPDATE flights SET flight_number = 'AI-101' WHERE flight_id = 1"
  );
});

test('analyzeSqlStatement recognizes SELECT queries as read-only', () => {
  const analysis = analyzeSqlStatement('SELECT * FROM bookings ORDER BY booking_date DESC');
  assert.equal(analysis.classification, 'SELECT');
  assert.equal(analysis.isReadOnly, true);
  assert.equal(analysis.isMutation, false);
  assert.equal(analysis.requiresExplicitConfirmation, false);
});

test('analyzeSqlStatement catches UPDATE without WHERE and flags warning', () => {
  const analysis = analyzeSqlStatement('UPDATE flights SET price = 9999');
  assert.equal(analysis.classification, 'UPDATE');
  assert.equal(analysis.isMutation, true);
  assert.equal(analysis.requiresExplicitConfirmation, true);
  assert.match(analysis.warning || '', /NO WHERE clause/i);
  assert.equal(analysis.affectedTableHint, 'flights');
});

test('analyzeSqlStatement allows safe UPDATE with WHERE clause', () => {
  const analysis = analyzeSqlStatement('UPDATE flights SET price = 4800 WHERE flight_id = 1');
  assert.equal(analysis.classification, 'UPDATE');
  assert.equal(analysis.requiresExplicitConfirmation, false);
  assert.equal(analysis.warning, undefined);
  assert.equal(analysis.affectedTableHint, 'flights');
});

test('analyzeSqlStatement detects destructive DROP and TRUNCATE', () => {
  const dropAnalysis = analyzeSqlStatement('DROP TABLE flights CASCADE');
  assert.equal(dropAnalysis.classification, 'DROP');
  assert.equal(dropAnalysis.isDestructive, true);
  assert.equal(dropAnalysis.requiresExplicitConfirmation, true);

  const truncAnalysis = analyzeSqlStatement('TRUNCATE TABLE bookings');
  assert.equal(truncAnalysis.classification, 'TRUNCATE');
  assert.equal(truncAnalysis.isDestructive, true);
});

test('analyzeSqlStatement classifies EXPLAIN vs EXPLAIN ANALYZE', () => {
  const explain = analyzeSqlStatement('EXPLAIN SELECT * FROM passengers');
  assert.equal(explain.classification, 'EXPLAIN');
  assert.equal(explain.isReadOnly, true);

  const explainAnalyze = analyzeSqlStatement('EXPLAIN ANALYZE DELETE FROM bookings WHERE booking_id = 99');
  assert.equal(explainAnalyze.classification, 'EXPLAIN');
  assert.equal(explainAnalyze.isReadOnly, false);
  assert.equal(explainAnalyze.requiresExplicitConfirmation, true);
});
