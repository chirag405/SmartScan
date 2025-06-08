-- Create function for searching document embeddings using vector similarity
CREATE OR REPLACE FUNCTION search_document_embeddings(
    query_embedding vector,
    match_threshold float DEFAULT 0.6,
    match_count int DEFAULT 10,
    user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content_chunk text,
    chunk_index int,
    chunk_type text,
    chunk_metadata jsonb,
    tokens_count int,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.document_id,
        de.content_chunk,
        de.chunk_index,
        de.chunk_type,
        de.chunk_metadata,
        de.tokens_count,
        de.created_at,
        1 - (de.embedding::vector <=> query_embedding) AS similarity
    FROM document_embeddings de
    INNER JOIN documents d ON de.document_id = d.id
    WHERE 
        (user_id IS NULL OR d.user_id = user_id)
        AND d.ocr_status = 'completed'
        AND de.embedding IS NOT NULL
        AND de.embedding != ''
        AND (1 - (de.embedding::vector <=> query_embedding)) > match_threshold
    ORDER BY de.embedding::vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx 
ON document_embeddings (document_id);

CREATE INDEX IF NOT EXISTS documents_user_ocr_status_idx 
ON documents (user_id, ocr_status);

-- Grant access to the function
GRANT EXECUTE ON FUNCTION search_document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_embeddings TO anon;
