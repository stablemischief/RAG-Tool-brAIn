-- RAG Tool Standalone - Enable Required Extensions
-- Run this FIRST in your Supabase SQL Editor

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