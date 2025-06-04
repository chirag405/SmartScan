import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { useAuthStore } from "../stores/authStore";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri({
  scheme: "smartscan",
});

export const useAuth = () => {
  const {
    user,
    session,
    loading,
    initialized,
    signInWithGoogle, // Directly use from store
    signOut,
    initialize,
  } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]); // Added initialize to dependency array

  // Handle deep linking for OAuth
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log("Deep link received:", url);

      // Check if it's an OAuth callback
      if (
        url &&
        (url.includes("#access_token=") || url.includes("?access_token="))
      ) {
        console.log(
          "OAuth redirect detected, session will be handled by auth state listener"
        );
      }
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    user,
    session,
    loading,
    initialized,
    isAuthenticated: !!user && !!session, // Check for session as well
    signInWithGoogle, // Use from store
    signOut,
  };
};
