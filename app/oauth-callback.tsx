import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { supabase } from "../lib/supabaseClient";
import { authQueries } from "../server/auth";
import { useAuthStore } from "../stores/authStore";

export default function OAuthCallback() {
  const params = useLocalSearchParams();
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const { forceRefreshAuth } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log("OAuth callback triggered with params:", params);

        // Extract tokens from URL params
        const access_token = Array.isArray(params.access_token)
          ? params.access_token[0]
          : params.access_token;
        const refresh_token = Array.isArray(params.refresh_token)
          ? params.refresh_token[0]
          : params.refresh_token;
        const error = Array.isArray(params.error)
          ? params.error[0]
          : params.error;
        const error_description = Array.isArray(params.error_description)
          ? params.error_description[0]
          : params.error_description;

        // Check for OAuth errors
        if (error) {
          console.error("OAuth error:", error, error_description);
          setCallbackError(
            error_description || error || "Authentication failed"
          );
          setIsProcessing(false);

          // Clear loading state in auth store
          useAuthStore.setState({ loading: false });

          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        // Check for missing tokens
        if (!access_token || !refresh_token) {
          console.error("Missing OAuth tokens");
          setCallbackError("Authentication incomplete. Missing tokens.");
          setIsProcessing(false);

          // Clear loading state in auth store
          useAuthStore.setState({ loading: false });

          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        console.log("Setting session with OAuth tokens");

        // Set the session with the received tokens
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

        if (sessionError) {
          console.error("Session error:", sessionError);
          setCallbackError(
            `Failed to complete sign in: ${sessionError.message}`
          );
          setIsProcessing(false);

          // Clear loading state in auth store
          useAuthStore.setState({ loading: false });

          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        console.log("Session set successfully:", {
          user: sessionData?.user?.email,
          hasSession: !!sessionData?.session,
          userId: sessionData?.user?.id,
        });

        // Verify the session was actually set
        const { data: currentSession } = await supabase.auth.getSession();
        console.log("Current session after setSession:", {
          hasUser: !!currentSession?.session?.user,
          userEmail: currentSession?.session?.user?.email,
          userId: currentSession?.session?.user?.id,
        });

        // Force trigger auth state check in case listener doesn't fire
        console.log("Manually triggering auth state check");
        const { data: authUser } = await supabase.auth.getUser();
        console.log("Auth user after manual check:", {
          hasUser: !!authUser?.user,
          userEmail: authUser?.user?.email,
          userId: authUser?.user?.id,
          metadata: authUser?.user?.user_metadata,
        });

        if (!authUser?.user) {
          console.error("No user found after setSession");
          setCallbackError("Failed to retrieve user after authentication");
          setIsProcessing(false);

          // Clear loading state in auth store
          useAuthStore.setState({ loading: false });

          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        // Ensure user profile exists in database
        try {
          console.log("Checking if user profile exists in database");
          const profile = await authQueries.getUserProfile(authUser.user.id);

          if (!profile) {
            console.log("No profile found, creating one");
            await authQueries.createUserProfile(
              authUser.user.id,
              authUser.user.email || "",
              {
                full_name: authUser.user.user_metadata?.full_name || "User",
              }
            );
            console.log("User profile created successfully");
          } else {
            console.log("Existing user profile found:", profile.full_name);
          }
        } catch (profileError) {
          console.error("Error checking/creating user profile:", profileError);
          // Continue despite profile errors - don't block auth flow
        }

        // Add a delay before proceeding to allow state updates
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsProcessing(false);

        // DIRECT APPROACH: Don't wait for auth listener, manually set auth state
        console.log("Directly updating auth state with session data");
        try {
          // Get the current user data to ensure it's fresh
          const { data: userData } = await supabase.auth.getUser();

          if (userData?.user) {
            console.log("User data retrieved, manually updating auth store");

            // Update auth store directly with the user data
            const authUpdated = await forceRefreshAuth();

            console.log(
              "Auth store update result:",
              authUpdated ? "SUCCESS" : "FAILED"
            );

            if (!authUpdated) {
              console.error("Failed to update auth store");
              Alert.alert(
                "Authentication Error",
                "Failed to update authentication state. Please try signing in again."
              );

              // Clear loading state in auth store
              useAuthStore.setState({ loading: false });

              setTimeout(() => router.replace("/"), 3000);
              return;
            }

            // IMPORTANT: Explicitly clear loading state before redirecting
            console.log("Clearing loading state and redirecting to main app");
            useAuthStore.setState({ loading: false });

            // Wait for state update and redirect
            setTimeout(() => {
              console.log(
                "Auth state directly updated, redirecting to main app"
              );
              router.replace("/(tabs)");
            }, 500); // Reduced from 2000ms to 500ms for faster redirect
          } else {
            console.error("Failed to get user data after setting session");
            setCallbackError("Failed to retrieve user information");

            // Clear loading state in auth store
            useAuthStore.setState({ loading: false });

            setTimeout(() => router.replace("/"), 3000);
          }
        } catch (error) {
          console.error("Error in direct auth update:", error);
          setCallbackError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during authentication"
          );

          // Clear loading state in auth store
          useAuthStore.setState({ loading: false });

          setTimeout(() => router.replace("/"), 3000);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        setCallbackError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during authentication"
        );
        setIsProcessing(false);

        // Clear loading state in auth store
        useAuthStore.setState({ loading: false });

        setTimeout(() => router.replace("/"), 3000);
      }
    };

    handleOAuthCallback();
  }, [params]);

  if (callbackError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "red",
            textAlign: "center",
            fontSize: 16,
            marginBottom: 10,
          }}
        >
          Authentication Error
        </Text>
        <Text style={{ textAlign: "center", color: "#666" }}>
          {callbackError}
        </Text>
        <Text style={{ textAlign: "center", color: "#666", marginTop: 10 }}>
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return <LoadingScreen />;
}
