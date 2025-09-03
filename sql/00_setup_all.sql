-- RAG Tool Standalone - Complete Database Setup
-- Run this file to set up everything in the correct order
-- This is the MASTER setup file for fresh Supabase projects

-- Enable required extensions first
\echo 'Step 1: Enabling PostgreSQL extensions...'
\i 01_enable_extensions.sql

-- Create main documents table
\echo 'Step 2: Creating documents table...'
\i 02_create_documents_table.sql

-- Create search function
\echo 'Step 3: Creating search function...'
\i 03_create_search_function.sql

-- Create metadata tables
\echo 'Step 4: Creating metadata tables...'
\i 04_create_metadata_tables.sql

-- Create admin functions
\echo 'Step 5: Creating admin functions...'
\i 05_create_admin_functions.sql

-- Final verification
\echo 'Database setup complete! Running health check...'

SELECT 
    'Setup Complete' as status,
    NOW() as timestamp;

-- Show all tables created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('documents', 'document_metadata', 'processing_logs')
ORDER BY tablename;

-- Show enabled extensions
SELECT 
    extname as "Extension Name",
    extversion as "Version"
FROM pg_extension 
WHERE extname IN ('vector', 'uuid-ossp')
ORDER BY extname;

-- Run health check
SELECT * FROM check_system_health();

-- Show initial stats
SELECT * FROM get_database_stats();