-- RAG Tool Standalone - Documents Table
-- Main table for storing document chunks with vector embeddings
-- SINGLE-USER DESIGN (no tenant_id)

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

-- Display table info
SELECT 
    'documents' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('documents')) as table_size
FROM documents;