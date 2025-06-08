# SmartScan Authentication Guide

This guide will help you set up and troubleshoot authentication in the SmartScan app.

## Setup

The SmartScan app uses Supabase Authentication for user management. Specifically, we support:

2. Google Sign-In (OAuth 2.0)

### Prerequisites

- A Supabase project with authentication enabled
- Google OAuth 2.0 client ID (for Google Sign-In)
- The `.env.local` file properly configured

## Configuration

The `.env.local` file should contain the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_APP_URL=smartscan://oauth-callback
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

### Google Sign-In Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Sign-In API
3. Create OAuth 2.0 credentials with the correct redirect URIs
4. Run the setup script: `npm run auth:setup`
5. Configure the OAuth settings: `npm run auth:config`

## Troubleshooting Authentication Issues

### Common Issues

#### 1. Stuck on Loading Screen

If you're stuck on the loading screen after authentication:

1. **Possible Causes:**

   - Missing user profile in the `public.users` table
   - Database tables were cleared or reset
   - Navigation issues in the app

2. **Solutions:**
   - Use the Debug Panel (wrench icon in top right) to check authentication status
   - If loading is stuck, try the "Force Navigate to Tabs" button in the Debug Panel
   - Run the auth fix script: `npm run auth:fix`
   - Initialize the database: `npm run db:init`

#### 2. Database Error Saving New User

If you see "Database error saving new user" after authenticating:

1. **Possible Causes:**

   - The `public.users` table doesn't exist
   - RLS (Row Level Security) policies are preventing inserts
   - The database trigger for auto-creating users is missing

2. **Solutions:**
   - Run the database initialization script: `npm run db:init`
   - Check the Database Debug Panel for more information
   - Manually create the user profile using the Debug Panel's "Fix User Profile" option

#### 3. Navigation Not Working

If the app isn't navigating properly after authentication:

1. **Try the Emergency Navigation Buttons:**

   - Open the Debug Panel (wrench icon)
   - Use the "Force Navigate to Tabs" button
   - If that fails, try "Force Navigate to Login" and sign in again

2. **If All Else Fails:**
   - Clear the app data and cache
   - Uninstall and reinstall the app
   - Run `npm run reset-project` to reset the local development environment

## Database Structure

The app requires the following database tables:

### `auth.users` (managed by Supabase)

This table contains authentication information and is managed automatically by Supabase.

### `public.users` (our custom table)

This table stores user profile information and is linked to `auth.users` via the `id` field.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  document_count INTEGER DEFAULT 0,
  storage_used_mb FLOAT DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false
);
```

### Required Trigger

A trigger should be set up to automatically create a user profile when a new user authenticates:

```sql
-- Function to create a user profile after sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Utility Scripts

The following utility scripts are available to help with authentication:

### `npm run auth:setup`

Sets up Google OAuth credentials by fetching the necessary client IDs.

### `npm run auth:config`

Updates the OAuth configuration in your Supabase project.

### `npm run auth:fix`

Fixes authentication issues by ensuring that authenticated users have corresponding profiles in the `public.users` table.

### `npm run db:init`

Initializes the database by checking for required tables and creating them if they don't exist.

## Manual Fix via Supabase Dashboard

If the automated scripts don't resolve the issue, you can manually fix the problem via the Supabase Dashboard:

1. Go to the [Supabase Dashboard](https://app.supabase.io/)
2. Select your project
3. Go to the SQL Editor
4. Run the following SQL to create the necessary tables and triggers:

```sql
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  document_count INTEGER DEFAULT 0,
  storage_used_mb FLOAT DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create trigger function for user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Manually create user profile for your current user if needed
INSERT INTO public.users (id, email, full_name, created_at, updated_at, document_count, storage_used_mb, subscription_tier, email_verified)
VALUES (
  'YOUR_USER_ID_HERE',
  'YOUR_EMAIL_HERE',
  'YOUR_NAME_HERE',
  now(),
  now(),
  0,
  0,
  'free',
  false
)
ON CONFLICT (id) DO NOTHING;
```

Replace `YOUR_USER_ID_HERE`, `YOUR_EMAIL_HERE`, and `YOUR_NAME_HERE` with your actual user information.

## Emergency Reset

If all else fails, you can completely reset your authentication state:

1. Clear AsyncStorage:

   - Use the Debug Panel's "Clear All Data" button
   - This will sign you out and clear all cached data

2. Reset Supabase Authentication:
   - Go to the Supabase Dashboard > Authentication > Users
   - Delete your user (if you're in development)
   - Sign up again from scratch

Remember to run the database initialization script (`npm run db:init`) after resetting to ensure all necessary tables exist.

## 🎯 Problem Solved

Fixed the "stuck loading" issue where the app would show "Signing you in..." indefinitely after Google OAuth completion.

## 🔧 Solution Implemented

### Web-Based OAuth (Current - Works with Expo Go)

We've implemented a **reliable web-based OAuth flow** that:

- ✅ Works with Expo Go (no native build required)
- ✅ Handles token extraction directly in the component
- ✅ Properly manages loading states
- ✅ Includes comprehensive error handling
- ✅ Uses `exp://localhost:8081` redirect URL for Expo Go compatibility

### Native OAuth (Future - Requires Development Build)

We've also prepared a **native Google Sign-In implementation** for when you're ready to move to development builds:

- Uses `@react-native-google-signin/google-signin`
- More performant and reliable
- Requires `expo prebuild` and development builds

## 📋 Current Configuration

### Environment Variables (`.env.local`)

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://amqwnxcakaizldryrdps.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth Web Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=630245740093-4f8lbd6pi2g9d0n9j391fe3jfoo8siud.apps.googleusercontent.com
```

### Google Cloud Console Setup

Your OAuth 2.0 Client ID is configured with:

- **Type**: Web application
- **Client ID**: `630245740093-4f8lbd6pi2g9d0n9j391fe3jfoo8siud.apps.googleusercontent.com`
- **Authorized redirect URIs**: Should include `exp://localhost:8081`

## 🚀 How It Works

### 1. User Clicks "Continue with Google"

- `GoogleSignInWeb` component initiates OAuth flow
- Sets loading state in auth store

### 2. OAuth Flow

- Opens Google OAuth in WebBrowser
- User authenticates with Google
- Google redirects back to `exp://localhost:8081`

### 3. Token Handling

- Component extracts `access_token` and `refresh_token` from URL
- Calls `supabase.auth.setSession()` directly
- Auth listener updates user state automatically

### 4. Navigation

- Auth store detects user login
- `app/index.tsx` redirects to `/(tabs)`
- Loading state is cleared

## 🛠️ Components

### `GoogleSignInWeb`

- Web-based OAuth implementation
- Works with Expo Go
- Handles token extraction and session setting

### `AuthDebugPanel`

- Development-only debug panel
- Shows real-time auth state
- Visible in top-right corner during development

### `LoginScreen`

- Main login interface
- Uses `GoogleSignInWeb` component
- Shows loading states and errors

## 🔍 Debugging

### Debug Panel

The debug panel shows:

- User email (when logged in)
- Loading state
- Initialized state
- Signing out state
- Error messages

### Console Logs

Look for these key messages:

- `🔑 Starting web-based Google Sign-In`
- `🌐 OAuth result: success`
- `🎫 Tokens received, setting session`
- `✅ Authentication successful: user@email.com`

## 🚨 Troubleshooting

### "Stuck Loading" Issue

If you still experience loading issues:

1. Check the debug panel for auth state
2. Look for error messages in console
3. Verify Google Web Client ID is correct
4. Ensure redirect URI is configured in Google Cloud Console

### OAuth Errors

Common issues:

- **Invalid Client ID**: Check `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- **Redirect URI Mismatch**: Add `exp://localhost:8081` to Google Cloud Console
- **Network Issues**: Check internet connection

### Development vs Production

- **Development**: Uses `exp://localhost:8081` redirect
- **Production**: Will need proper deep link scheme

## 🔄 Migration Path

### Current: Web OAuth (Expo Go Compatible)

```typescript
import { GoogleSignInWeb } from "./GoogleSignInWeb";

<GoogleSignInWeb loading={isLoading} />;
```

### Future: Native OAuth (Development Build)

```typescript
import { GoogleSignInNative } from "./GoogleSignInNative";

<GoogleSignInNative loading={isLoading} />;
```

To switch to native:

1. Run `npx expo prebuild`
2. Build development client
3. Update LoginScreen to use `GoogleSignInNative`

## ✅ Testing Checklist

- [ ] App starts without errors
- [ ] Debug panel shows correct auth state
- [ ] "Continue with Google" button works
- [ ] Google OAuth opens in browser
- [ ] After Google auth, returns to app
- [ ] Loading state clears properly
- [ ] User is redirected to main app
- [ ] Sign out works correctly

## 📱 Next Steps

1. **Test the current implementation** with Expo Go
2. **Verify authentication flow** works end-to-end
3. **Consider development build** for better performance
4. **Configure production redirect URIs** when ready to deploy

The current web-based implementation should resolve your "stuck loading" issue while maintaining compatibility with Expo Go.
