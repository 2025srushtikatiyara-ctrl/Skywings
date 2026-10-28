-- ============================================================================
-- Migration 002: Administrative, Auditing, and Workbench Persistence Tables
-- Non-destructive, additive migration
-- ============================================================================

-- Schema migrations tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Administrative accounts
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for sensitive operations and SQL Workbench execution
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id SERIAL PRIMARY KEY,
    admin_user VARCHAR(100) NOT NULL,
    action_category VARCHAR(50) NOT NULL,
    execution_id VARCHAR(50),
    query_classification VARCHAR(30),
    sanitized_sql TEXT,
    affected_rows INT DEFAULT 0,
    duration_ms NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved queries for SQL Workbench
CREATE TABLE IF NOT EXISTS saved_queries (
    query_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sql_text TEXT NOT NULL,
    description TEXT,
    created_by VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query history
CREATE TABLE IF NOT EXISTS query_history (
    history_id SERIAL PRIMARY KEY,
    sql_text TEXT NOT NULL,
    execution_time_ms NUMERIC(10,2) NOT NULL,
    row_count INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at DESC);
