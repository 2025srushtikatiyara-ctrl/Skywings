/**
 * Database Migration Runner for SKY WINGS
 * Connects to PostgreSQL 18 `airline_reservation` database,
 * verifies database identity, checks schema_migrations table,
 * and runs versioned additive migrations idempotently in transactions.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigrations() {
  const PGHOST = (process.env.PGHOST || 'localhost').trim().replace(/[*]+$/, '') || 'localhost';
  const PGPORT = parseInt(process.env.PGPORT || '5432', 10);
  const PGDATABASE = (process.env.PGDATABASE || 'airline_reservation').trim();
  const PGUSER = (process.env.PGUSER || 'postgres').trim();
  const PGPASSWORD = process.env.PGPASSWORD || '';

  console.log('----------------------------------------------------');
  console.log('🚀 SKY WINGS Migration Engine');
  console.log(`📡 Connecting to PostgreSQL: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}`);
  console.log('----------------------------------------------------');

  const pool = new Pool({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to target database.');

    // Verify current database name to ensure we never touch the wrong database
    const dbNameRes = await client.query('SELECT current_database();');
    const currentDb = dbNameRes.rows[0].current_database;
    if (currentDb !== PGDATABASE) {
      throw new Error(`Safety violation: Connected to '${currentDb}', expected '${PGDATABASE}'`);
    }

    // Ensure migration table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const appliedRes = await client.query('SELECT version FROM schema_migrations;');
    const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    console.log(`📁 Found ${files.length} migration file(s) in /migrations`);

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (appliedVersions.has(version)) {
        console.log(`⏩ [Skipped] Migration ${version} already applied.`);
        continue;
      }

      console.log(`⏳ [Executing] Running migration: ${version}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN;');
      try {
        await client.query(sqlContent);
        await client.query(
          `INSERT INTO schema_migrations (version, description) VALUES ($1, $2);`,
          [version, `Applied migration ${file}`]
        );
        await client.query('COMMIT;');
        console.log(`✅ [Success] Migration ${version} committed successfully.`);
      } catch (migrationErr: any) {
        await client.query('ROLLBACK;');
        console.error(`❌ [Failed] Migration ${version} failed. Rolled back.`);
        throw migrationErr;
      }
    }

    console.log('----------------------------------------------------');
    console.log('🎉 All database migrations are up to date!');
    console.log('----------------------------------------------------');
  } catch (err: any) {
    console.error('❌ Migration Error:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigrations();
