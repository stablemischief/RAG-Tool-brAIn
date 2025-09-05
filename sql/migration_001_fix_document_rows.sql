-- Migration 001: Fix document_rows table schema
-- Purpose: Align column names with original RAG_Pipeline source
-- Date: 2025-09-05
-- Author: AI IDE Agent (BMad Master)

-- ============================================
-- BACKUP WARNING
-- ============================================
-- CRITICAL: Create a backup before running this migration!
-- Run in Supabase SQL Editor:
-- 1. Export your data first
-- 2. Take a snapshot of your database
-- 3. Test on a development instance first

BEGIN;

-- Step 1: Check if migration is needed
DO $$
BEGIN
    -- Check if old column names exist
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'document_rows' 
        AND column_name = 'file_id'
    ) THEN
        RAISE NOTICE 'Migration needed: file_id column exists';
    ELSE
        RAISE NOTICE 'Column file_id not found - migration may have already been applied';
    END IF;
END $$;

-- Step 2: Rename columns if they exist with old names
DO $$
BEGIN
    -- Rename file_id to dataset_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_rows' AND column_name = 'file_id'
    ) THEN
        ALTER TABLE document_rows RENAME COLUMN file_id TO dataset_id;
        RAISE NOTICE 'Renamed column: file_id -> dataset_id';
    END IF;
    
    -- Rename data to row_data  
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_rows' AND column_name = 'data'
    ) THEN
        ALTER TABLE document_rows RENAME COLUMN data TO row_data;
        RAISE NOTICE 'Renamed column: data -> row_data';
    END IF;
END $$;

-- Step 3: Update the unique constraint
DO $$
BEGIN
    -- Drop old unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'document_rows' 
        AND constraint_name = 'document_rows_file_id_row_number_key'
    ) THEN
        ALTER TABLE document_rows DROP CONSTRAINT document_rows_file_id_row_number_key;
        RAISE NOTICE 'Dropped old unique constraint';
    END IF;
    
    -- Create new unique constraint with correct column name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'document_rows' 
        AND constraint_name = 'document_rows_dataset_id_row_number_key'
    ) THEN
        ALTER TABLE document_rows ADD CONSTRAINT document_rows_dataset_id_row_number_key 
        UNIQUE(dataset_id, row_number);
        RAISE NOTICE 'Created new unique constraint';
    END IF;
END $$;

-- Step 4: Update the index
DO $$
BEGIN
    -- Drop old index if it exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_rows' 
        AND indexname = 'document_rows_file_id_idx'
    ) THEN
        DROP INDEX document_rows_file_id_idx;
        RAISE NOTICE 'Dropped old index';
    END IF;
    
    -- Create new index with correct column name
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_rows' 
        AND indexname = 'document_rows_dataset_id_idx'
    ) THEN
        CREATE INDEX document_rows_dataset_id_idx ON document_rows (dataset_id);
        RAISE NOTICE 'Created new index';
    END IF;
END $$;

-- Step 5: Verify the migration
DO $$
DECLARE
    has_dataset_id BOOLEAN;
    has_row_data BOOLEAN;
    has_old_columns BOOLEAN;
BEGIN
    -- Check for new columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_rows' AND column_name = 'dataset_id'
    ) INTO has_dataset_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_rows' AND column_name = 'row_data'
    ) INTO has_row_data;
    
    -- Check old columns are gone
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_rows' 
        AND column_name IN ('file_id', 'data')
    ) INTO has_old_columns;
    
    IF has_dataset_id AND has_row_data AND NOT has_old_columns THEN
        RAISE NOTICE 'Migration successful! Schema is now correct.';
    ELSE
        RAISE EXCEPTION 'Migration verification failed. Please check the schema.';
    END IF;
END $$;

-- Step 6: Display final schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'document_rows'
ORDER BY ordinal_position;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- If you need to rollback this migration, run:
/*
BEGIN;
ALTER TABLE document_rows RENAME COLUMN dataset_id TO file_id;
ALTER TABLE document_rows RENAME COLUMN row_data TO data;
-- Recreate old constraints and indexes
COMMIT;
*/