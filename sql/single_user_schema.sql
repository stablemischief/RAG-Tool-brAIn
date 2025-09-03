-- RAG Tool Standalone - Single User Database Schema
-- CRITICAL: Preserves vector dimensions and search functionality
-- Simplified: Removes ALL multi-tenant complexity (no tenant_id, users, RLS)

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the main documents table (simplified from original)
CREATE TABLE IF NOT EXISTS documents (
  id bigserial primary key,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata (file_id, file_title, etc.)
  embedding vector(1536) -- CRITICAL: MUST be 1536 for text-embedding-3-small
);

-- Create document metadata table (simplified - no tenant_id)
CREATE TABLE IF NOT EXISTS document_metadata (
    id TEXT PRIMARY KEY, -- file_id from Google Drive or local identifier
    title TEXT,
    url TEXT, 
    created_at TIMESTAMP DEFAULT NOW(),
    schema TEXT -- JSON string for tabular file schemas
);

-- Create document rows table for structured data (simplified - no tenant_id)
CREATE TABLE IF NOT EXISTS document_rows (
    id SERIAL PRIMARY KEY,
    dataset_id TEXT REFERENCES document_metadata(id) ON DELETE CASCADE,
    row_data JSONB
);

-- CRITICAL: Preserve the exact match_documents function from original
-- This function MUST work with 1536 dimensions for text-embedding-3-small
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536), -- CRITICAL: Must be 1536 dimensions
  match_count int default null,
  filter jsonb DEFAULT '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create indexes for performance (simplified - no tenant_id partitioning)
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_metadata_file_id_idx ON documents 
  USING gin ((metadata->'file_id'));

CREATE INDEX IF NOT EXISTS documents_metadata_mime_type_idx ON documents 
  USING gin ((metadata->'mime_type'));

-- Create indexes for document_metadata
CREATE INDEX IF NOT EXISTS document_metadata_title_idx ON document_metadata(title);
CREATE INDEX IF NOT EXISTS document_metadata_created_at_idx ON document_metadata(created_at);

-- Create indexes for document_rows  
CREATE INDEX IF NOT EXISTS document_rows_dataset_id_idx ON document_rows(dataset_id);
CREATE INDEX IF NOT EXISTS document_rows_row_data_idx ON document_rows USING gin (row_data);

-- Add some helpful utility functions for the single-user system

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
    total_documents bigint,
    total_chunks bigint,
    total_files bigint,
    avg_similarity float
)
LANGUAGE plpgsql
AS $$
begin
    return query
    select
        (select count(distinct metadata->>'file_id') from documents)::bigint as total_documents,
        (select count(*) from documents)::bigint as total_chunks,
        (select count(*) from document_metadata)::bigint as total_files,
        0.0::float as avg_similarity; -- Placeholder for average similarity
end;
$$;

-- Function to cleanup orphaned records
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS TABLE (
    orphaned_chunks_deleted bigint,
    orphaned_rows_deleted bigint
)
LANGUAGE plpgsql
AS $$
declare
    chunks_deleted bigint := 0;
    rows_deleted bigint := 0;
begin
    -- Delete document chunks that don't have corresponding metadata
    DELETE FROM documents 
    WHERE (metadata->>'file_id') NOT IN (
        SELECT id FROM document_metadata
    );
    
    GET DIAGNOSTICS chunks_deleted = ROW_COUNT;
    
    -- Delete document rows that don't have corresponding metadata
    DELETE FROM document_rows 
    WHERE dataset_id NOT IN (
        SELECT id FROM document_metadata
    );
    
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    
    return query select chunks_deleted, rows_deleted;
end;
$$;

-- Function to search documents by text (useful for the dashboard)
CREATE OR REPLACE FUNCTION search_documents_by_text(
    search_text text,
    limit_results int DEFAULT 10
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    rank real
)
LANGUAGE plpgsql
AS $$
begin
    return query
    select
        documents.id,
        documents.content,
        documents.metadata,
        ts_rank(to_tsvector('english', documents.content), plainto_tsquery('english', search_text)) as rank
    from documents
    where to_tsvector('english', documents.content) @@ plainto_tsquery('english', search_text)
    order by rank desc
    limit limit_results;
end;
$$;

-- Create a view for easier file management in the dashboard
CREATE OR REPLACE VIEW file_summary AS
SELECT 
    dm.id,
    dm.title,
    dm.url,
    dm.created_at,
    dm.schema,
    count(d.id) as chunk_count,
    count(dr.id) as row_count
FROM document_metadata dm
LEFT JOIN documents d ON dm.id = (d.metadata->>'file_id')
LEFT JOIN document_rows dr ON dm.id = dr.dataset_id
GROUP BY dm.id, dm.title, dm.url, dm.created_at, dm.schema
ORDER BY dm.created_at DESC;

-- Performance tuning settings for vector operations
-- These are suggestions - adjust based on your hardware
-- ALTER SYSTEM SET shared_preload_libraries = 'vector';
-- ALTER SYSTEM SET maintenance_work_mem = '2GB';  
-- ALTER SYSTEM SET max_parallel_maintenance_workers = 4;

-- Add helpful comments for maintenance
COMMENT ON TABLE documents IS 'Main table storing document chunks and their vector embeddings. Single-user simplified version.';
COMMENT ON TABLE document_metadata IS 'Metadata for uploaded files. Simplified without tenant isolation.';
COMMENT ON TABLE document_rows IS 'Structured data rows for tabular files (CSV, Excel, etc).';
COMMENT ON FUNCTION match_documents IS 'CRITICAL: Vector similarity search using pgvector. MUST use 1536 dimensions.';
COMMENT ON FUNCTION get_document_stats IS 'Utility function to get document statistics for dashboard.';
COMMENT ON FUNCTION cleanup_orphaned_records IS 'Utility function to cleanup orphaned records.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RAG Tool Standalone database schema created successfully!';
    RAISE NOTICE 'Key features:';
    RAISE NOTICE '- Single-user design (no tenant_id complexity)';
    RAISE NOTICE '- Vector search with 1536 dimensions for text-embedding-3-small';
    RAISE NOTICE '- Preserved all original search functionality';
    RAISE NOTICE '- Added utility functions for maintenance';
    RAISE NOTICE '- Optimized indexes for performance';
END $$;