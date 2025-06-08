-- Debug script to check user profile issues
-- Run this in your Supabase SQL editor to diagnose the problem

-- 1. Check if the user exists in the users table
SELECT 
    id, 
    email, 
    full_name, 
    created_at,
    subscription_tier,
    document_count,
    storage_used_mb
FROM users 
WHERE id = '85404f26-943c-4bca-a767-3ecc653924d1';

-- 2. Check current authenticated user (should match the above ID)
SELECT auth.uid() as current_user_id;

-- 3. Check if RLS policies are blocking access
-- Try to select from users table with RLS bypass (as admin)
SET row_security = off;
SELECT count(*) as total_users FROM users;
SELECT id, email FROM users WHERE id = '85404f26-943c-4bca-a767-3ecc653924d1';
SET row_security = on;

-- 4. Check RLS policies on users table
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
WHERE tablename = 'users';

-- 5. Manual user creation (run this if the user doesn't exist)
-- Replace the values with actual user data
INSERT INTO users (
    id,
    email,
    full_name,
    subscription_tier,
    document_count,
    storage_used_mb,
    created_at
) VALUES (
    '85404f26-943c-4bca-a767-3ecc653924d1',
    'chiragdhouni20@gmail.com',
    'User',
    'free',
    0,
    0,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. Verify the user was created/exists
SELECT 
    id, 
    email, 
    full_name, 
    created_at
FROM users 
WHERE id = '85404f26-943c-4bca-a767-3ecc653924d1'; 