-- Fix User Profile Access Issues
-- This script ensures proper RLS policies for the users table

-- First, check if RLS is enabled on users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them properly)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create proper RLS policies for users table
-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON users 
FOR SELECT 
USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" 
ON users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON users 
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Ensure proper permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;

-- Check documents table RLS as well
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop and recreate documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Documents policies
CREATE POLICY "Users can view own documents" 
ON documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
ON documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
ON documents 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
ON documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure proper permissions for documents
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT USAGE ON SEQUENCE documents_id_seq TO authenticated;

-- Document embeddings RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own embeddings" ON document_embeddings;
DROP POLICY IF EXISTS "Users can insert own embeddings" ON document_embeddings;

CREATE POLICY "Users can view own embeddings" 
ON document_embeddings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = document_embeddings.document_id 
  AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can insert own embeddings" 
ON document_embeddings 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = document_embeddings.document_id 
  AND documents.user_id = auth.uid()
));

GRANT SELECT, INSERT ON document_embeddings TO authenticated;

-- Verify policies are in place
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename IN ('users', 'documents', 'document_embeddings')
ORDER BY tablename, policyname; 