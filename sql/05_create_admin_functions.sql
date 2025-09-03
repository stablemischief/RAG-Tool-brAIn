-- RAG Tool Standalone - Admin Functions
-- Utility functions for database management and cleanup

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

-- Test all functions
SELECT 'Admin functions created successfully' as status;
SELECT * FROM get_database_stats();
SELECT * FROM check_system_health();