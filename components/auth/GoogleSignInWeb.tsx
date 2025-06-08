import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Get the host URL for the current environment
const getRedirectUrl = () => {
  // Get the host URL using Expo Constants
  const localhost = Constants.expoConfig?.hostUri || "localhost:8082";

  // Use either the configured URL or construct one based on host
  const redirectUrl = process.env.EXPO_PUBLIC_APP_URL || `exp://${localhost}`;

  console.log("🔗 Using redirect URL:", redirectUrl);

  return redirectUrl;
};

/**
 * Creates a user profile in the database if it doesn't exist
 * This handles the case where auth exists but the profile doesn't (e.g. after DB reset)
 */
const ensureUserProfileExists = async (
  userId: string,
  email: string,
  userData: any
) => {
  try {
    console.log("Ensuring user profile exists for:", userId);
    console.log(
      "User data available:",
      JSON.stringify({
        email,
        metadata: userData || {},
      })
    );

    // First check if the profile already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking profile:", profileError.message);
      console.error("Error details:", JSON.stringify(profileError));

      if (profileError.code === "42P01") {
        console.error(
          "Users table does not exist. This requires database setup."
        );

        // Try to create a minimal users table directly
        console.log("Attempting to create users table directly...");
        try {
          const { error: createError } = await supabase.rpc("execute_sql", {
            sql: `
              CREATE TABLE IF NOT EXISTS public.users (
                id UUID PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                document_count INTEGER DEFAULT 0,
                storage_used_mb FLOAT DEFAULT 0,
                subscription_tier TEXT DEFAULT 'free'
              );
            `,
          });

          if (createError) {
            console.error("Failed to create users table:", createError);
          } else {
            console.log("Users table created successfully");
          }
        } catch (e) {
          console.error("Error creating users table:", e);
        }
      }
      return false;
    }

    if (existingProfile) {
      console.log("✅ User profile already exists:", userId);
      return true;
    }

    // Profile doesn't exist, create it
    console.log("Creating missing user profile for:", userId);

    const userProfile = {
      id: userId,
      email: email,
      full_name: userData?.full_name || userData?.name || "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      storage_used_mb: 0,
      subscription_tier: "free",
      email_verified: false,
    };

    console.log(
      "Attempting to insert user profile with data:",
      JSON.stringify(userProfile)
    );

    const { data: newProfile, error: insertError } = await supabase
      .from("users")
      .insert(userProfile)
      .select()
      .single();

    if (insertError) {
      console.error(
        "Failed to create user profile. Error code:",
        insertError.code
      );
      console.error("Error message:", insertError.message);
      console.error("Error details:", JSON.stringify(insertError));

      // Try a minimal insert with just the required fields
      if (
        insertError.code === "42P01" ||
        insertError.message.includes("relation") ||
        insertError.message.includes("does not exist")
      ) {
        console.log(
          "Table appears to be missing. Attempting direct table creation..."
        );
        return false;
      }

      // Try a simpler insert with only required fields
      console.log("Attempting simplified profile creation...");
      const minimalProfile = {
        id: userId,
        email: email,
        full_name: "User",
      };

      const { error: minimalError } = await supabase
        .from("users")
        .insert(minimalProfile);

      if (minimalError) {
        console.error("Simplified profile creation also failed:", minimalError);
        return false;
      }

      console.log("✅ Created user profile with minimal fields");
      return true;
    }

    console.log("✅ User profile created successfully:", newProfile?.email);
    return true;
  } catch (error) {
    console.error("Error in ensureUserProfileExists:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return false;
  }
};

interface GoogleSignInWebProps {
  loading?: boolean;
}

export const GoogleSignInWeb: React.FC<GoogleSignInWebProps> = ({
  loading = false,
}) => {
  const { loading: authLoading } = useAuthStore();
  const [localLoading, setLocalLoading] = useState(false);

  // Use refs for timeouts to safely clear them
  const authTimeoutRef = useRef<any>(null);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    if (loading || authLoading || localLoading) return;

    try {
      setLocalLoading(true);
      useAuthStore.setState({ loading: true, error: null });

      console.log("🔑 Starting web-based Google Sign-In");

      // Set a safety timeout to clear loading state if auth takes too long
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }

      authTimeoutRef.current = setTimeout(() => {
        console.log(
          "⚠️ Auth safety timeout triggered - clearing loading state"
        );
        setLocalLoading(false);
        useAuthStore.setState({ loading: false });
      }, 60000); // 1 minute timeout

      // Get the appropriate redirect URL for the current environment
      const redirectUrl = getRedirectUrl();

      // Use Supabase's OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          scopes: "email profile",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          // The latest Supabase SDK uses PKCE by default
        },
      });

      if (error) {
        console.error("❌ OAuth initialization error:", error);
        throw error;
      }

      if (!data.url) {
        throw new Error("No OAuth URL returned");
      }

      console.log("🌐 Opening OAuth URL");

      // Open the OAuth URL with the same redirect URL
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log("🌐 OAuth result:", result.type);

      if (result.type === "success") {
        console.log("✅ OAuth completed successfully");

        // Parse the URL to extract tokens
        if (result.url) {
          console.log("🔍 Parsing URL:", result.url.substring(0, 20) + "...");

          try {
            // Parse the URL
            const url = new URL(result.url);
            console.log("🔗 URL protocol:", url.protocol);
            console.log("🔗 URL hash:", url.hash ? "present" : "not present");

            // Check if we have a fragment (hash) or query parameters
            let params;
            if (url.hash && url.hash.length > 1) {
              // Hash format (typical for implicit flow)
              const fragment = url.hash.substring(1);
              params = new URLSearchParams(fragment);
              console.log("📝 Using hash fragment for params");
            } else {
              // Query parameter format
              params = url.searchParams;
              console.log("📝 Using query params");
            }

            // Check for auth code (PKCE flow) or tokens (implicit flow)
            const code = params.get("code");
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            const error = params.get("error");
            const error_description = params.get("error_description");

            // Check for errors in the URL
            if (error) {
              console.error(
                "❌ Error in OAuth response:",
                error,
                error_description
              );

              // Check for database error specifically
              if (
                error === "server_error" &&
                error_description?.includes("Database error saving new user")
              ) {
                console.log(
                  "🔧 Detected database error. Attempting to fix by creating user profile..."
                );

                // Get the current session to get user details
                const { data: sessionData } = await supabase.auth.getSession();

                if (sessionData?.session?.user) {
                  const user = sessionData.session.user;

                  // Create the user profile
                  const profileFixed = await ensureUserProfileExists(
                    user.id,
                    user.email || "",
                    user.user_metadata
                  );

                  if (profileFixed) {
                    console.log(
                      "✅ Fixed user profile. Clearing loading state."
                    );

                    // Clear auth timeout
                    if (authTimeoutRef.current) {
                      clearTimeout(authTimeoutRef.current);
                      authTimeoutRef.current = null;
                    }

                    // Complete the auth process
                    setTimeout(() => {
                      console.log("🔄 Completing auth after profile fix");
                      useAuthStore.setState({ loading: false });
                      setLocalLoading(false);
                    }, 800);

                    return;
                  }
                }

                throw new Error(
                  "Failed to create user profile. Please try again or contact support."
                );
              }

              throw new Error(
                `${error}: ${error_description || "Unknown error"}`
              );
            }

            console.log("🔑 Auth parameters:", {
              hasCode: !!code,
              hasAccessToken: !!access_token,
              hasRefreshToken: !!refresh_token,
            });

            if (code) {
              console.log(
                "🔑 Authorization code received, exchanging for session"
              );

              // Exchange the code for a session
              const { data: sessionData, error: sessionError } =
                await supabase.auth.exchangeCodeForSession(code);

              if (sessionError) {
                console.error("❌ Code exchange error:", sessionError);
                throw sessionError;
              }

              if (sessionData?.user) {
                console.log(
                  "✅ Authentication successful:",
                  sessionData.user.email
                );

                // Clear auth timeout
                if (authTimeoutRef.current) {
                  clearTimeout(authTimeoutRef.current);
                  authTimeoutRef.current = null;
                }

                // Ensure user profile exists in the database
                await ensureUserProfileExists(
                  sessionData.user.id,
                  sessionData.user.email || "",
                  sessionData.user.user_metadata
                );

                // Set a short timeout before clearing loading state to allow auth listener to process
                setTimeout(() => {
                  console.log("🏁 Completing authentication process");
                  useAuthStore.setState({ loading: false });
                  setLocalLoading(false);
                }, 800);
              } else {
                throw new Error("No user data returned from code exchange");
              }
            } else if (access_token && refresh_token) {
              console.log("🎫 Tokens received, setting session");

              // Set the session directly
              const { data: sessionData, error: sessionError } =
                await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });

              if (sessionError) {
                console.error("❌ Session error:", sessionError);
                throw sessionError;
              }

              if (sessionData?.user) {
                console.log(
                  "✅ Authentication successful:",
                  sessionData.user.email
                );

                // Clear auth timeout
                if (authTimeoutRef.current) {
                  clearTimeout(authTimeoutRef.current);
                  authTimeoutRef.current = null;
                }

                // Ensure user profile exists in the database
                await ensureUserProfileExists(
                  sessionData.user.id,
                  sessionData.user.email || "",
                  sessionData.user.user_metadata
                );

                // Set a short timeout before clearing loading state to allow auth listener to process
                setTimeout(() => {
                  console.log("🏁 Completing authentication process");
                  useAuthStore.setState({ loading: false });
                  setLocalLoading(false);
                }, 800);
              } else {
                throw new Error("No user data returned");
              }
            } else {
              console.error("❌ No code or tokens found in URL");
              console.error("URL params:", Array.from(params.entries()));
              throw new Error("No authentication data found in OAuth response");
            }
          } catch (parseError: any) {
            console.error("❌ Error parsing OAuth URL:", parseError);
            throw new Error(
              `Error parsing OAuth response: ${
                parseError.message || "Unknown parsing error"
              }`
            );
          }
        } else {
          throw new Error("No URL returned from OAuth");
        }
      } else if (result.type === "cancel") {
        console.log("User cancelled OAuth");

        // Clear auth timeout
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }

        useAuthStore.setState({ loading: false, error: null });
        setLocalLoading(false);
      } else {
        throw new Error("OAuth failed or was dismissed");
      }
    } catch (error: any) {
      console.error("❌ Google Sign-In error:", error);

      // Clear auth timeout
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }

      useAuthStore.setState({
        loading: false,
        error: error.message || "Failed to sign in with Google",
      });

      Alert.alert(
        "Sign In Error",
        error.message || "Failed to sign in with Google. Please try again."
      );
      setLocalLoading(false);
    }
  };

  const isLoading = loading || authLoading || localLoading;

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={signInWithGoogle}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {isLoading ? (
          <Ionicons
            name="refresh"
            size={20}
            color="#007AFF"
            style={[styles.icon, styles.spinningIcon]}
          />
        ) : (
          <Ionicons
            name="logo-google"
            size={20}
            color="#4285F4"
            style={styles.icon}
          />
        )}
        <Text style={styles.text}>
          {isLoading ? "Signing in..." : "Continue with Google"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 12,
  },
  spinningIcon: {
    transform: [{ rotate: "0deg" }],
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
});
