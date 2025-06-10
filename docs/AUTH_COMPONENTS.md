# Authentication Components

This document explains the authentication-related components in the SmartScan application and their responsibilities.

## Component Overview

The authentication system in SmartScan consists of the following key components:

1. **AuthStore** - State management for authentication
2. **LoginScreen** - Main login interface
3. **GoogleSignInNative** - Native Google Sign-In implementation
4. **GoogleSignInWeb** - Web-based Google Sign-In for platforms without native support
5. **AuthDebugPanel** - Developer tool for debugging authentication state
6. **AuthValidator** - Component that validates user sessions
7. **AuthLayout** - Layout wrapper for authentication screens

## Component Details

### AuthStore (`stores/authStore.ts`)

The AuthStore is a Zustand store that manages authentication state across the application.

**Responsibilities:**

- Maintain user authentication state
- Handle sign-in and sign-out flows
- Validate user sessions
- Listen for auth state changes from Supabase
- Manage loading states during authentication
- Persist authentication state between app sessions

**Key Methods:**

- `signInWithGoogle()` - Legacy method for Google Sign-In
- `signOut()` - Sign out the current user
- `validateSession()` - Validate the current session
- `forceSignOut()` - Force sign out in case of invalid sessions
- `forceRefreshAuth()` - Force refresh the authentication state

### LoginScreen (`components/auth/LoginScreen.tsx`)

The LoginScreen component provides the UI for user authentication.

**Responsibilities:**

- Display login options to the user
- Handle authentication flows
- Manage loading states during login
- Navigate to main app after successful authentication
- Display authentication errors

**Key Features:**

- Safety timeouts to prevent stuck loading states
- Automatic navigation when user is authenticated
- Loading state visualization

### GoogleSignInNative (`components/auth/GoogleSignInNative.tsx`)

Native implementation of Google Sign-In for iOS and Android.

**Responsibilities:**

- Configure Google Sign-In SDK
- Handle native authentication flow
- Process ID tokens for Supabase authentication
- Handle authentication errors
- Update loading states appropriately

### GoogleSignInWeb (`components/auth/GoogleSignInWeb.tsx`)

Web-based implementation of Google Sign-In for platforms without native support.

**Responsibilities:**

- Handle web-based OAuth flow
- Process authentication redirects
- Update loading states during sign-in
- Handle authentication errors

### AuthDebugPanel (`components/auth/AuthDebugPanel.tsx`)

Developer tool for debugging authentication state.

**Responsibilities:**

- Display current authentication state
- Show user information when authenticated
- Provide debug actions (clear loading state, check profiles, etc.)
- Force navigation for debugging purposes
- View session information

### AuthValidator (`components/auth/AuthValidator.tsx`)

Component that validates user sessions.

**Responsibilities:**

- Validate user sessions on application start
- Handle session validation errors
- Force sign out if sessions are invalid
- Protect routes from unauthorized access

### AuthLayout (`components/layout/AuthLayout.tsx`)

Layout wrapper for authentication screens.

**Responsibilities:**

- Provide consistent layout for authentication UI
- Handle loading states during authentication
- Navigate to appropriate screens based on auth state

## Authentication Flow

1. User initiates sign-in via GoogleSignInNative or GoogleSignInWeb
2. Component sets loading state to true
3. Authentication happens through Google and Supabase
4. AuthStore receives auth state change event
5. User profile is loaded
6. Loading state is set to false
7. Navigation occurs to the main app

## Safety Mechanisms

The authentication system includes several safety mechanisms:

1. **Timeout Handlers**: Prevent stuck loading states by automatically resetting after a timeout
2. **Session Validation**: Regularly validate sessions to ensure they're still valid
3. **Force Navigation**: Automatically navigate when authentication state changes
4. **Error Handling**: Proper error handling at each step of the authentication flow
5. **Debug Tools**: AuthDebugPanel for troubleshooting authentication issues

## Common Authentication Issues

For common authentication issues and their solutions, see [AUTHENTICATION_ISSUES.md](AUTHENTICATION_ISSUES.md).
