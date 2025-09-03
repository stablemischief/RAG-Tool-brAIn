-- RAG Tool Standalone - Vector Search Function
-- This function performs semantic similarity search

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

-- Test the function (this will return empty results until you have data)
-- SELECT * FROM match_documents('[0.1,0.2,0.3,0.4]'::vector, 1);

SELECT 'match_documents function created successfully' as status;