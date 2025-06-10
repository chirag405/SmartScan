import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

interface GoogleSignInNativeProps {
  loading?: boolean;
}

export const GoogleSignInNative: React.FC<GoogleSignInNativeProps> = ({
  loading = false,
}) => {
  const { loading: authLoading } = useAuthStore();

  useEffect(() => {
    // Configure Google Sign-In
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!webClientId || webClientId === "YOUR_GOOGLE_WEB_CLIENT_ID_HERE") {
      console.error("❌ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured!");
      console.error("Please set your Google Web Client ID in .env.local");
      console.error(
        "Get it from: Google Cloud Console > APIs & Credentials > OAuth 2.0 Client IDs"
      );
      console.error("Look for the 'Web client' type (NOT Android or iOS)");
      return;
    }

    GoogleSignin.configure({
      scopes: ["https://www.googleapis.com/auth/userinfo.profile"],
      webClientId: webClientId,
    });
  }, []);

  const signInWithGoogle = async () => {
    if (loading || authLoading) return;

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!webClientId || webClientId === "YOUR_GOOGLE_WEB_CLIENT_ID_HERE") {
      Alert.alert(
        "Configuration Error",
        "Google Web Client ID is not configured. Please check your .env.local file."
      );
      return;
    }

    try {
      // Set loading state directly in the store
      useAuthStore.setState({ loading: true, error: null });

      console.log("🔑 Starting native Google Sign-In");

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in and get user info
      const userInfo = await GoogleSignin.signIn();
      console.log("✅ Google Sign-In successful:", userInfo.data?.user?.email);

      // Check if we have an ID token
      if (userInfo.data?.idToken) {
        console.log("🎫 ID Token received, authenticating with Supabase");

        // Use the native signInWithIdToken method instead of OAuth
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });

        if (error) {
          console.error("❌ Supabase auth error:", error);
          throw error;
        }

        if (data?.user) {
          console.log("✅ Authentication successful:", data.user.email);
          // Let the auth listener handle setting the user state and loading
          // Don't set loading to false here - it will be handled by the auth listener
        } else {
          throw new Error("No user data returned from Supabase");
        }
      } else {
        throw new Error("No ID token present!");
      }
    } catch (error: any) {
      console.error("❌ Google Sign-In error:", error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("User cancelled the login flow");
        useAuthStore.setState({ loading: false, error: null });
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Sign-in operation is in progress already");
        useAuthStore.setState({
          loading: false,
          error: "Sign-in already in progress",
        });
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log("Play services not available or outdated");
        useAuthStore.setState({
          loading: false,
          error:
            "Google Play Services not available. Please update your device.",
        });
      } else {
        console.log("Some other error happened:", error.message);
        useAuthStore.setState({
          loading: false,
          error: error.message || "Failed to sign in with Google",
        });
        Alert.alert(
          "Sign In Error",
          error.message || "Failed to sign in with Google. Please try again."
        );
      }
    }
  };

  return (
    <GoogleSigninButton
      style={{ width: "100%", height: 48 }}
      size={GoogleSigninButton.Size.Wide}
      color={GoogleSigninButton.Color.Dark}
      onPress={signInWithGoogle}
      disabled={loading || authLoading}
    />
  );
};
