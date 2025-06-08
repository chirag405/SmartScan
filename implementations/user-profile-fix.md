# User Profile Creation Issue Fix

## 🚨 Issue Identified

**Error**: `insert or update on table "documents" violates foreign key constraint "documents_user_id_fkey"`

**Root Cause**: The user exists in Supabase Auth but not in the custom `users` table, causing foreign key constraint violations when trying to create documents.

## 🔍 Problem Analysis

The error sequence:

1. User authenticates successfully with Supabase Auth (ID: `5505252e-0df2-41ed-892c-7140ca40edbf`)
2. App tries to create/fetch user profile from `users` table
3. Gets "duplicate key" error but then can't retrieve the existing profile
4. App continues without user profile
5. Document creation fails due to foreign key constraint

**Likely Causes:**

- Row Level Security (RLS) policies blocking access
- User ID mismatch between auth session and query
- Missing permissions on `users` table
- Corrupted user record

## ✅ Fixes Applied

### 1. Enhanced Authentication Context Validation

**File**: `server/auth.ts`

**Improvements:**

- Added session validation before all database operations
- Verify user ID matches authenticated session
- Better error logging with session details
- Improved duplicate key error handling with retries

### 2. Improved Document Upload Process

**File**: `server/documents.ts`

**Improvements:**

- Fail fast if user profile cannot be created
- Better error messages for profile issues
- Clean up uploaded files if document creation fails
- Enhanced logging throughout the process

### 3. Better Error Handling in UI

**File**: `stores/documentStore.ts`

**Improvements:**

- User-friendly error messages for common issues
- Specific guidance for profile-related errors
- Graceful degradation when profile issues occur

### 4. Database RLS Policy Fix

**File**: `supabase/functions/fix-user-profile-rls.sql`

**Added proper RLS policies:**

```sql
-- Users can view/insert/update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
-- ... etc
```

## 🛠️ Implementation Steps

### Step 1: Apply Database Fixes

Run the RLS policy fix script:

```bash
psql -h your-supabase-host -d postgres -f supabase/functions/fix-user-profile-rls.sql
```

### Step 2: Clear User Data (If Needed)

If the issue persists, you may need to clear corrupted user data:

```sql
-- Check for orphaned auth users
SELECT auth.users.id, auth.users.email, users.id as profile_id
FROM auth.users
LEFT JOIN users ON auth.users.id = users.id
WHERE users.id IS NULL;

-- For the specific problematic user, delete and recreate
DELETE FROM users WHERE id = '5505252e-0df2-41ed-892c-7140ca40edbf';
```

### Step 3: Test User Profile Creation

```typescript
// Test in browser console or app
const { data: session } = await supabase.auth.getSession();
console.log("Current session:", session);

// Try to manually create profile
const { data, error } = await supabase.from("users").insert({
  id: session.user.id,
  email: session.user.email,
  full_name: "Test User",
  subscription_tier: "free",
  document_count: 0,
  storage_used_mb: 0,
});

console.log("Profile creation result:", { data, error });
```

## 🔍 Debugging Tools

### Check Current Auth State

```typescript
const { data: session } = await supabase.auth.getSession();
console.log("User ID:", session?.user?.id);
console.log("Email:", session?.user?.email);
```

### Verify RLS Policies

```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Check User Profile Status

```sql
SELECT * FROM users WHERE id = 'user-id-here';
```

## 🎯 Expected Results

After applying fixes:

1. ✅ Users can sign in without profile creation errors
2. ✅ User profiles are created automatically on first sign-in
3. ✅ Document uploads work without foreign key errors
4. ✅ Clear error messages guide users when issues occur
5. ✅ RLS policies properly secure user data

## 🛡️ Prevention Measures

1. **Robust Error Handling**: All auth operations now validate session context
2. **User-Friendly Messages**: Specific guidance for common auth issues
3. **Proper RLS Policies**: Secure data access with correct permissions
4. **Session Validation**: Verify user context before database operations
5. **Graceful Degradation**: App continues to function even with profile issues

## 🚨 If Issues Persist

If the problem continues:

1. **Check Supabase Dashboard**: Verify RLS policies are active
2. **Clear Browser Data**: Remove cached auth tokens
3. **Sign Out/In**: Force fresh authentication session
4. **Check Network**: Ensure stable connection to Supabase
5. **Review Logs**: Check Supabase logs for additional error details

The enhanced error handling should now provide clearer guidance to users experiencing authentication issues.
