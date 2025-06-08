-- Fix RLS policies for user profile access
-- Run this in your Supabase SQL editor

-- First, check what policies currently exist for users table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create corrected RLS policies for users table
-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow users to insert their own profile (for new user registration)
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Test the policies by checking if you can access your own profile
-- This should work for the currently authenticated user
SELECT 
    id, 
    email, 
    full_name, 
    created_at,
    subscription_tier,
    document_count,
    storage_used_mb
FROM users 
WHERE id = auth.uid();

-- If the above query works, the RLS policies are working correctly

-- If the above queries work, the RLS policies are fixed
-- If they still don't work, try this temporary fix:

-- Temporarily disable RLS for testing (NOT for production!)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Test again:
-- SELECT * FROM users WHERE id = '85404f26-943c-4bca-a767-3ecc653924d1';

-- Re-enable RLS after testing:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; 