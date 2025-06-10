# Authentication Issues and Fixes

This document outlines common authentication issues in the SmartScan application and their solutions.

## Common Issues

### 1. Stuck Loading State After Login

**Problem:**

- After successful login, the application gets stuck on the loading screen
- The auth debug panel shows the user is signed in but the loading state remains true
- Navigation to the main app doesn't occur automatically

**Cause:**

- Loading state in the authStore is not properly reset after successful authentication
- Navigation logic depends on the loading state, so it doesn't trigger
- Race conditions between authentication callbacks and navigation

**Solution:**

- Added safety timeouts that automatically reset loading state after a maximum period
- Improved the loading state management in LoginScreen to force navigation when a user is detected
- Modified the auth state listener to properly handle loading state transitions

**Implementation:**

```typescript
// In LoginScreen.tsx
useEffect(() => {
  if (user) {
    console.log("User authenticated:", user.email);

    // Clear loading state and navigate to tabs
    useAuthStore.setState({ loading: false });
    router.replace("/(tabs)");
  }
}, [user]);

// Safety timeout for stuck loading state
useEffect(() => {
  let timeoutId: ReturnType<typeof setTimeout>;

  if (loading) {
    timeoutId = setTimeout(() => {
      console.log("⚠️ Loading timeout reached, forcing reset");
      useAuthStore.setState({ loading: false });

      // If user is authenticated, force navigation
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        router.replace("/(tabs)");
      }
    }, 8000);
  }

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [loading]);
```

### 2. OAuth Callback Issues

**Problem:**

- OAuth callback sometimes fails to complete the authentication flow
- User remains on the callback screen instead of navigating to the main app

**Cause:**

- Delays in session establishment after OAuth callback
- Loading state not properly managed

**Solution:**

- Added explicit loading state management in the OAuth callback
- Added timeouts to ensure navigation occurs even if other processes are delayed

### 3. User Profile Loading Delays

**Problem:**

- User authentication completes but profile loading delays the UI
- Application appears unresponsive during profile loading

**Cause:**

- Sequential loading of user data and profile
- Navigation depends on completed profile loading

**Solution:**

- Separated user authentication from profile loading
- Allowed navigation to proceed based on user authentication, not profile loading
- Added background profile loading after navigation

## Best Practices for Authentication

1. **Always include safety timeouts**: Every loading state should have a maximum time before automatic reset

2. **Separate authentication from profile loading**: Don't block navigation on profile data

3. **Use the AuthDebugPanel during development**: This provides real-time authentication state visualization

4. **Test on slow connections**: Authentication issues often only appear on slower connections

5. **Implement proper cleanup**: Always clean up timeouts and subscriptions to prevent memory leaks

## Testing Authentication

To test authentication fixes:

1. Enable the auth debug panel in development mode
2. Test sign-in with slow network conditions
3. Verify loading states transition properly
4. Check for any console errors during authentication
5. Verify navigation occurs after successful authentication

## Related Files

The key files involved in authentication:

- `stores/authStore.ts` - Main authentication state management
- `components/auth/LoginScreen.tsx` - Login UI and authentication flow
- `components/auth/GoogleSignInNative.tsx` - Native Google authentication
- `app/oauth-callback.tsx` - OAuth callback handling
- `app/index.tsx` - Main navigation based on auth state
