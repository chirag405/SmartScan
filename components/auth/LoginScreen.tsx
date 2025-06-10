import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";
import { GoogleSignInWeb } from "./GoogleSignInWeb";

export const LoginScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const { loading, error, isSigningOut, user } = useAuthStore();

  useEffect(() => {
    if (error) {
      console.log("Authentication Error:", error);
    }
  }, [error]);

  // Reset local loading state when user changes (e.g., when authenticated)
  useEffect(() => {
    if (user) {
      console.log("User authenticated:", user.email);

      // Clear loading state and navigate to tabs
      useAuthStore.setState({ loading: false });
      router.replace("/(tabs)");
    }
  }, [user]);

  // Fix for stuck loading state - force clear after 8 seconds
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

  const isLoading = loading || isSigningOut;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text
              style={[
                styles.loadingText,
                { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
              ]}
            >
              Signing in...
            </Text>
          </View>
        ) : (
          <View style={styles.authContainer}>
            <Text
              style={[
                styles.title,
                { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
              ]}
            >
              Welcome to SmartScan
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
              ]}
            >
              Sign in to access your documents and start scanning
            </Text>

            <View style={styles.buttonContainer}>
              <GoogleSignInWeb />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 8,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    fontSize: 14,
  },
  authContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
