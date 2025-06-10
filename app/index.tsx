import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Text, View } from "react-native";
import { LoginScreen } from "../components/auth/LoginScreen";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { useAuthStore } from "../stores/authStore";

export default function Index() {
  const { user, loading, initialized, isSigningOut } = useAuthStore();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const [stuckInLoading, setStuckInLoading] = useState(false);

  // Use ref with any type to avoid TypeScript issues with different timeout types
  const redirectTimeoutRef = useRef<any>(null);
  const safetyTimeoutRef = useRef<any>(null);
  const loadingTimeoutRef = useRef<any>(null);

  // Clear any previous redirect timeouts
  const clearTimeouts = useCallback(() => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Force navigate to tabs directly - for emergency use
  const forceNavigateToTabs = useCallback(() => {
    console.log("🔥 FORCE NAVIGATING to tabs");
    try {
      // Reset all states that might be preventing navigation
      clearTimeouts();
      setHasRedirected(false);
      setRedirectAttempts(0);
      setNavigationFailed(false);
      setStuckInLoading(false);
      useAuthStore.setState({ loading: false });

      // Use a short timeout to allow state updates to process
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 50);
    } catch (error) {
      console.error("Force navigation error:", error);
      Alert.alert(
        "Navigation Error",
        "Could not navigate to tabs. Please restart the app."
      );
    }
  }, [clearTimeouts]);

  // Handle navigation with safety mechanisms
  const navigateToTabs = useCallback(() => {
    try {
      console.log("🚀 Navigating to tabs");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Navigation error:", error);
      setNavigationFailed(true);
      // If navigation fails, reset the redirect state after a delay
      setTimeout(() => {
        setHasRedirected(false);
        setRedirectAttempts(0);
        useAuthStore.setState({ loading: false });
      }, 2000);
    }
  }, []);

  // Add a new function to handle loading state timeout
  const setupLoadingTimeout = useCallback(() => {
    // Clear any previous loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set a timeout to reset loading state if it's stuck
    loadingTimeoutRef.current = setTimeout(() => {
      const { loading: currentLoading } = useAuthStore.getState();
      if (currentLoading) {
        console.log("⚠️ Loading state appears stuck, forcing reset");
        useAuthStore.setState({ loading: false });
        setStuckInLoading(true);

        // If user is authenticated but we're stuck, try to navigate
        const { user: currentUser } = useAuthStore.getState();
        if (currentUser) {
          forceNavigateToTabs();
        }
      }
    }, 8000); // 8 seconds timeout for loading state
  }, [forceNavigateToTabs]);

  useEffect(() => {
    // Set up loading timeout whenever loading becomes true
    if (loading) {
      setupLoadingTimeout();
    }

    // Cleanup on unmount
    return () => {
      clearTimeouts();
    };
  }, [loading, clearTimeouts, setupLoadingTimeout]);

  useEffect(() => {
    // Only redirect when auth is initialized, we have a user, and haven't redirected yet
    if (initialized && user && !isSigningOut && !hasRedirected) {
      console.log("Redirecting authenticated user to tabs");
      setHasRedirected(true);
      setRedirectAttempts((prev) => prev + 1);

      // Clear any previous timeouts
      clearTimeouts();

      // Use replace instead of push to prevent back navigation to login
      redirectTimeoutRef.current = setTimeout(() => {
        // Ensure loading is false before navigation
        useAuthStore.setState({ loading: false });
        navigateToTabs();
      }, 100);

      // Set a safety timeout to reset if navigation doesn't complete
      safetyTimeoutRef.current = setTimeout(() => {
        console.log("⚠️ Safety timeout triggered - resetting redirect state");
        setHasRedirected(false);
        setNavigationFailed(true);
        useAuthStore.setState({ loading: false });
      }, 5000);

      return () => {
        clearTimeouts();
      };
    } else if (initialized && !user && hasRedirected) {
      // Reset redirect flag when user signs out
      setHasRedirected(false);
      setRedirectAttempts(0);
      setNavigationFailed(false);
      setStuckInLoading(false);
    }
  }, [
    initialized,
    user,
    isSigningOut,
    hasRedirected,
    clearTimeouts,
    navigateToTabs,
  ]);

  // Show loading screen while initializing or signing out
  if (!initialized || isSigningOut) {
    return <LoadingScreen />;
  }

  // Show login screen if no user
  if (!user) {
    return <LoginScreen />;
  }

  // Navigation failed, show emergency UI
  if (navigationFailed) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          Navigation to app screens failed. Please try manually navigating:
        </Text>
        <Button title="Go to Home Screen" onPress={forceNavigateToTabs} />
        <View style={{ height: 20 }} />
        <Button
          title="Sign Out"
          onPress={() => useAuthStore.getState().signOut()}
          color="#FF3B30"
        />
        <View style={{ height: 40 }} />
        <Text style={{ fontSize: 14, color: "gray", marginTop: 20 }}>
          If problems persist, try restarting the app
        </Text>
      </View>
    );
  }

  // If loading is stuck and we detected it, try to force navigate
  if (stuckInLoading && user) {
    forceNavigateToTabs();
    return <LoadingScreen message="Attempting to recover..." />;
  }

  // Show loading screen while redirecting (only briefly)
  if (hasRedirected || loading) {
    // Show info about redirect attempts if it's taking too long
    return (
      <LoadingScreen
        message={
          redirectAttempts > 1
            ? `Navigating to app... (Attempt ${redirectAttempts})`
            : undefined
        }
      />
    );
  }

  // Default to login screen
  return <LoginScreen />;
}
