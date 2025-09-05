-- RAG Tool Standalone - Document Metadata Tables
-- Additional tables for document management and processing tracking

-- Document rows table for spreadsheet data
CREATE TABLE IF NOT EXISTS document_rows (
    id BIGSERIAL PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dataset_id, row_number)
);

-- Index for dataset_id lookups
CREATE INDEX IF NOT EXISTS document_rows_dataset_id_idx 
ON document_rows (dataset_id);

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

-- Display setup status
SELECT 
    'document_rows' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('document_rows')) as table_size
FROM document_rows
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