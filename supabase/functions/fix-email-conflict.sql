-- Fix Email Conflict for User Profile Creation
-- This script identifies and resolves email conflicts in the users table

-- Step 1: Identify the conflicting records
SELECT 
    id,
    email,
    full_name,
    created_at,
    document_count,
    storage_used_mb
FROM users 
WHERE email = 'chiragdhouni20@gmail.com';

-- Step 2: Check auth.users table for the current authenticated user
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'chiragdhouni20@gmail.com';

-- Step 3: Find orphaned user records (exist in users table but not in auth.users)
SELECT 
    u.id as users_id,
    u.email,
    u.created_at as profile_created,
    au.id as auth_id,
    au.created_at as auth_created
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'chiragdhouni20@gmail.com';

-- Step 4: Clean up strategy options

-- Option A: Delete the orphaned user record (if it has no important data)
-- WARNING: This will delete the user profile and all associated documents!
-- Only run this if you're sure the orphaned record is not needed
/*
DELETE FROM document_embeddings 
WHERE document_id IN (
    SELECT id FROM documents 
    WHERE user_id IN (
        SELECT u.id FROM users u
        LEFT JOIN auth.users au ON u.id = au.id
        WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
    )
);

DELETE FROM documents 
WHERE user_id IN (
    SELECT u.id FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
);

DELETE FROM users 
WHERE id IN (
    SELECT u.id FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
);
*/

-- Option B: Update the email of the orphaned record to allow new profile creation
-- This preserves the old data but changes the email
/*
UPDATE users 
SET email = 'chiragdhouni20+old@gmail.com',
    updated_at = NOW()
WHERE id IN (
    SELECT u.id FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
);
*/

-- Step 5: Verify the fix
-- After running either option above, check that the conflict is resolved:
SELECT 
    id,
    email,
    full_name,
    created_at
FROM users 
WHERE email = 'chiragdhouni20@gmail.com'; 