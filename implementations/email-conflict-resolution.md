# Email Conflict Resolution Guide

## 🚨 Issue Summary

**Error**: `duplicate key value violates unique constraint "users_email_key"`

**What's happening**: Your email `chiragdhouni20@gmail.com` is already associated with another user record in the database, but with a different user ID than your current authentication session.

**Current Auth ID**: `5505252e-0df2-41ed-892c-7140ca40edbf`
**Conflicting Email**: `chiragdhouni20@gmail.com`

## 🔍 Root Cause

This typically happens when:

1. You previously signed up with the same email but different auth method
2. There's an orphaned user record from previous testing/development
3. The database has stale records that weren't properly cleaned up

## ✅ Quick Resolution Steps

### Step 1: Check Database State

Run this in your Supabase SQL editor to see the conflict:

```sql
-- Check what user records exist for your email
SELECT
    id,
    email,
    full_name,
    created_at,
    document_count
FROM users
WHERE email = 'chiragdhouni20@gmail.com';

-- Check auth.users table
SELECT
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'chiragdhouni20@gmail.com';
```

### Step 2: Identify Orphaned Records

```sql
-- Find records that exist in users table but not in auth.users
SELECT
    u.id as users_id,
    u.email,
    u.created_at as profile_created,
    au.id as auth_id,
    au.created_at as auth_created
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'chiragdhouni20@gmail.com';
```

### Step 3: Clean Up (Choose One Option)

#### Option A: Delete Orphaned Record (Recommended for fresh start)

**⚠️ Warning**: This deletes any existing documents and data for the orphaned user.

```sql
-- Delete associated data first
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

-- Delete the orphaned user record
DELETE FROM users
WHERE id IN (
    SELECT u.id FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
);
```

#### Option B: Rename Orphaned Record (Preserves data)

```sql
-- Change email of orphaned record to preserve data
UPDATE users
SET email = 'chiragdhouni20+old@gmail.com',
    updated_at = NOW()
WHERE id IN (
    SELECT u.id FROM users u
    LEFT JOIN auth.users au ON u.id = au.id
    WHERE u.email = 'chiragdhouni20@gmail.com' AND au.id IS NULL
);
```

### Step 4: Verify Resolution

```sql
-- Check that only one record remains
SELECT
    id,
    email,
    full_name,
    created_at
FROM users
WHERE email = 'chiragdhouni20@gmail.com';
```

### Step 5: Test App

1. Close and reopen the app
2. The app should now create your user profile successfully
3. Try uploading a document to confirm everything works

## 🛠️ Alternative Solutions

### Quick Fix: Sign Out and Back In

Sometimes the simplest solution works:

1. Sign out of the app completely
2. Clear browser cache/app data
3. Sign back in with Google
4. The app may resolve the conflict automatically

### Manual Profile Creation

If the above doesn't work, manually create your profile:

```sql
-- Insert your profile manually (use your current auth ID)
INSERT INTO users (
    id,
    email,
    full_name,
    subscription_tier,
    document_count,
    storage_used_mb,
    created_at,
    updated_at
) VALUES (
    '5505252e-0df2-41ed-892c-7140ca40edbf',
    'chiragdhouni20@gmail.com',
    'Chirag Dhouni',
    'free',
    0,
    0,
    NOW(),
    NOW()
);
```

## 🎯 Expected Results

After resolution:

- ✅ App opens without profile creation errors
- ✅ User can upload documents successfully
- ✅ No more "duplicate key" or "foreign key constraint" errors
- ✅ User profile displays correctly in app

## 🛡️ Prevention

To prevent this in the future:

1. Proper cleanup of test data during development
2. Better handling of auth provider changes
3. Implement profile migration when users switch auth methods

## 📞 Need Help?

If these steps don't resolve the issue:

1. Share the output of the diagnostic queries
2. Let me know which cleanup option you used
3. Provide any new error messages that appear

The enhanced error handling should now provide clearer feedback about what's happening and guide you through the resolution process.
