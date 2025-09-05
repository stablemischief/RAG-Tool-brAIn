-- RAG Tool Standalone - Complete Database Setup
-- Run this file to set up everything in one go
-- This works in any SQL editor including Supabase SQL Editor

-- ================================================
-- Step 1: Enable Required Extensions
-- ================================================

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are enabled
SELECT 
    extname as "Extension Name",
    extversion as "Version"
FROM pg_extension 
WHERE extname IN ('vector', 'uuid-ossp')
ORDER BY extname;

-- ================================================
-- Step 2: Create Documents Table
-- ================================================

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536) NOT NULL,  -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Index for metadata queries (file_id lookups)
CREATE INDEX IF NOT EXISTS documents_metadata_file_id_idx 
ON documents USING gin ((metadata->>'file_id'));

-- Index for content search (if needed)
CREATE INDEX IF NOT EXISTS documents_content_idx 
ON documents USING gin (to_tsvector('english', content));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Step 3: Create Vector Search Function
-- ================================================

CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        (1 - (documents.embedding <=> query_embedding)) AS similarity
    FROM documents
    WHERE 
        CASE 
            WHEN filter = '{}'::jsonb THEN true
            ELSE documents.metadata @> filter
        END
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ================================================
-- Step 4: Create Metadata Tables
-- ================================================

-- Document metadata table for file tracking
CREATE TABLE IF NOT EXISTS document_metadata (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    url TEXT,
    file_path TEXT,
    drive_file_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified TIMESTAMP WITH TIME ZONE,
    processing_status TEXT DEFAULT 'pending',
    chunk_count INTEGER DEFAULT 0,
    error_message TEXT
);

-- Index for drive file lookups
CREATE INDEX IF NOT EXISTS document_metadata_drive_file_id_idx 
ON document_metadata (drive_file_id);

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS document_metadata_status_idx 
ON document_metadata (processing_status);

-- Document processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
    id BIGSERIAL PRIMARY KEY,
    file_id TEXT REFERENCES document_metadata(id),
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS processing_logs_file_id_idx 
ON processing_logs (file_id);

CREATE INDEX IF NOT EXISTS processing_logs_created_at_idx 
ON processing_logs (created_at DESC);

-- Update triggers for document_metadata
CREATE OR REPLACE FUNCTION update_document_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_metadata_updated_at_trigger
    BEFORE UPDATE ON document_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_document_metadata_updated_at();

-- ================================================
-- Step 5: Create Admin Functions
-- ================================================

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    metric TEXT,
    value BIGINT,
    details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'total_documents'::TEXT,
        COUNT(*)::BIGINT,
        'Total number of document chunks'::TEXT
    FROM documents
    
    UNION ALL
    
    SELECT 
        'total_files'::TEXT,
        COUNT(*)::BIGINT,
        'Total number of source files'::TEXT
    FROM document_metadata
    
    UNION ALL
    
    SELECT 
        'processing_logs'::TEXT,
        COUNT(*)::BIGINT,
        'Total processing log entries'::TEXT
    FROM processing_logs
    
    UNION ALL
    
    SELECT 
        'database_size'::TEXT,
        pg_database_size(current_database())::BIGINT,
        'Total database size in bytes'::TEXT;
END;
$$;

-- Function to cleanup documents by file_id
CREATE OR REPLACE FUNCTION cleanup_document_by_file_id(file_id_param TEXT)
RETURNS TABLE (
    operation TEXT,
    affected_rows BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    docs_deleted BIGINT;
    metadata_deleted BIGINT;
    logs_deleted BIGINT;
BEGIN
    -- Delete document chunks
    DELETE FROM documents 
    WHERE metadata->>'file_id' = file_id_param;
    GET DIAGNOSTICS docs_deleted = ROW_COUNT;
    
    -- Delete processing logs
    DELETE FROM processing_logs 
    WHERE file_id = file_id_param;
    GET DIAGNOSTICS logs_deleted = ROW_COUNT;
    
    -- Delete metadata record
    DELETE FROM document_metadata 
    WHERE drive_file_id = file_id_param;
    GET DIAGNOSTICS metadata_deleted = ROW_COUNT;
    
    -- Return results
    RETURN QUERY
    SELECT 'documents_deleted'::TEXT, docs_deleted
    UNION ALL
    SELECT 'logs_deleted'::TEXT, logs_deleted
    UNION ALL
    SELECT 'metadata_deleted'::TEXT, metadata_deleted;
END;
$$;

-- Function to get recent processing activity
CREATE OR REPLACE FUNCTION get_recent_activity(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    file_title TEXT,
    operation TEXT,
    status TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(dm.title, pl.file_id) as file_title,
        pl.operation,
        pl.status,
        pl.message,
        pl.created_at
    FROM processing_logs pl
    LEFT JOIN document_metadata dm ON pl.file_id = dm.id
    WHERE pl.created_at > NOW() - INTERVAL '1 hour' * hours_back
    ORDER BY pl.created_at DESC
    LIMIT 100;
END;
$$;

-- Function to check system health
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Check if vector extension is available
    SELECT 
        'pgvector'::TEXT,
        CASE 
            WHEN EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') 
            THEN 'healthy'::TEXT 
            ELSE 'missing'::TEXT 
        END,
        'Vector similarity search extension'::TEXT
    
    UNION ALL
    
    -- Check documents table
    SELECT 
        'documents_table'::TEXT,
        CASE 
            WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') 
            THEN 'healthy'::TEXT 
            ELSE 'missing'::TEXT 
        END,
        'Main documents storage table'::TEXT
    
    UNION ALL
    
    -- Check if we have embeddings
    SELECT 
        'embeddings'::TEXT,
        CASE 
            WHEN EXISTS(SELECT 1 FROM documents WHERE embedding IS NOT NULL LIMIT 1) 
            THEN 'healthy'::TEXT 
            ELSE 'empty'::TEXT 
        END,
        'Vector embeddings availability'::TEXT;
END;
$$;

-- ================================================
-- Final Verification
-- ================================================

-- Show setup completion status
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

-- Display table info
SELECT 
    'documents' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('documents')) as table_size
FROM documents
UNION ALL
SELECT 
    'document_metadata' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('document_metadata')) as table_size
FROM document_metadata
UNION ALL
SELECT 
    'processing_logs' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('processing_logs')) as table_size
FROM processing_logs;