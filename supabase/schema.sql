-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Users table for storing profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email_verification_token TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'free',
  document_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10, 2) DEFAULT 0,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents table for storing document metadata
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  supabase_storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  title TEXT,
  document_type TEXT,
  ocr_status TEXT DEFAULT 'pending',
  ocr_confidence_score NUMERIC(4, 3),
  extracted_data JSONB,
  uploaded_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document embeddings table for vector search
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_type TEXT DEFAULT 'text',
  chunk_metadata JSONB,
  embedding vector(1536),  -- OpenAI's text-embedding-3-small uses 1536 dimensions
  tokens_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Create index for faster document_id lookups
  CONSTRAINT document_embeddings_document_id_chunk_index_unique UNIQUE (document_id, chunk_index)
);

-- Create a vector index for fast similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON public.document_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- AI Conversations table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  system_prompt TEXT,
  message_count INTEGER DEFAULT 0,
  context_window_size INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Messages table
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  processing_time_ms INTEGER,
  referenced_documents UUID[],
  retrieved_chunks UUID[],
  similarity_scores NUMERIC[],
  tools_used TEXT[],
  attached_files JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document access logs for tracking usage
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  access_type TEXT NOT NULL, -- 'view', 'download', 'search', 'ai_reference'
  query_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector similarity search function
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
        AND (1 - (de.embedding::vector <=> query_embedding)) > match_threshold
    ORDER BY de.embedding::vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION search_document_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_embeddings TO anon;

-- Auto-create user profile when user signs up through Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    subscription_tier,
    document_count,
    storage_used_mb,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'free',
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- Apply RLS policies from rls-policies.sql
-- Users can only access their own data

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 