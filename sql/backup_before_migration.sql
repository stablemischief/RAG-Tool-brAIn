-- Backup Script - Run BEFORE Migration
-- Purpose: Create backup of document_rows data before schema migration
-- Date: 2025-09-05
-- Usage: Run this in Supabase SQL Editor before applying migration

-- ============================================
-- OPTION 1: Create Backup Table (Recommended)
-- ============================================

-- Create a backup table with timestamp
CREATE TABLE IF NOT EXISTS document_rows_backup_20250905 AS 
SELECT * FROM document_rows;

-- Verify backup
SELECT COUNT(*) as backup_count FROM document_rows_backup_20250905;
SELECT COUNT(*) as original_count FROM document_rows;

-- ============================================
-- OPTION 2: Export to JSON (for external backup)
-- ============================================

-- Export all document_rows data as JSON
-- Copy this result and save it externally
SELECT json_agg(row_to_json(t)) as backup_json
FROM (
    SELECT * FROM document_rows
    ORDER BY id
) t;

-- ============================================
-- OPTION 3: Create a view for easy rollback
-- ============================================

-- Create a view that preserves the current state
CREATE OR REPLACE VIEW document_rows_pre_migration AS
SELECT 
    id,
    file_id,  -- Will become dataset_id
    row_number,
    data,     -- Will become row_data
    created_at,
    updated_at
FROM document_rows;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check current schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'document_rows'
ORDER BY ordinal_position;

-- Check data integrity
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT file_id) as unique_files,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM document_rows;

-- Check for any NULL values that might cause issues
SELECT 
    COUNT(*) FILTER (WHERE file_id IS NULL) as null_file_ids,
    COUNT(*) FILTER (WHERE data IS NULL) as null_data,
    COUNT(*) FILTER (WHERE row_number IS NULL) as null_row_numbers
FROM document_rows;

-- ============================================
-- RESTORE SCRIPT (if migration fails)
-- ============================================

/*
-- To restore from backup table:
TRUNCATE document_rows;
INSERT INTO document_rows SELECT * FROM document_rows_backup_20250905;

-- Or to restore specific columns if schema changed:
INSERT INTO document_rows (id, file_id, row_number, data, created_at, updated_at)
SELECT id, file_id, row_number, data, created_at, updated_at 
FROM document_rows_backup_20250905;
*/