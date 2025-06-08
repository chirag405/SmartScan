-- Row Level Security Policies for SmartScan Application
-- Execute these policies in your Supabase SQL editor

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- 1. USERS TABLE POLICIES
-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile (for new user registration)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 2. DOCUMENTS TABLE POLICIES
-- Allow users to read their own documents
CREATE POLICY "Users can read their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own documents
CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own documents
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- 3. DOCUMENT EMBEDDINGS TABLE POLICIES
-- Allow users to read embeddings for their own documents
CREATE POLICY "Users can read embeddings for their own documents" ON document_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_embeddings.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Allow users to insert embeddings for their own documents
CREATE POLICY "Users can insert embeddings for their own documents" ON document_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_embeddings.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Allow users to update embeddings for their own documents
CREATE POLICY "Users can update embeddings for their own documents" ON document_embeddings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_embeddings.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Allow users to delete embeddings for their own documents
CREATE POLICY "Users can delete embeddings for their own documents" ON document_embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_embeddings.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- 4. AI CONVERSATIONS TABLE POLICIES
-- Allow users to read their own conversations
CREATE POLICY "Users can read their own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own conversations
CREATE POLICY "Users can insert their own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own conversations
CREATE POLICY "Users can update their own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations" ON ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- 5. AI MESSAGES TABLE POLICIES
-- Allow users to read their own messages
CREATE POLICY "Users can read their own messages" ON ai_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own messages
CREATE POLICY "Users can insert their own messages" ON ai_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages" ON ai_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages" ON ai_messages
  FOR DELETE USING (auth.uid() = user_id);

-- 6. DOCUMENT ACCESS LOGS TABLE POLICIES
-- Allow users to read their own access logs
CREATE POLICY "Users can read their own access logs" ON document_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own access logs
CREATE POLICY "Users can insert their own access logs" ON document_access_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STORAGE BUCKET POLICIES (for the 'documents' bucket)
-- These MUST be set in the Supabase dashboard under Storage > Policies
-- Storage policies cannot be created via SQL anymore, use the dashboard:
-- 1. Go to Storage > documents bucket > Policies
-- 2. Create policy: "Users can upload their own files"
--    - Policy type: INSERT
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
-- 3. Create policy: "Users can read their own files"  
--    - Policy type: SELECT
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
-- 4. Create policy: "Users can update their own files"
--    - Policy type: UPDATE  
--    - Target roles: authenticated
--    - Policy definition: bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
-- 5. Create policy: "Users can delete their own files"
--    - Policy type: DELETE
--    - Target roles: authenticated  
--    - Policy definition: bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated; 