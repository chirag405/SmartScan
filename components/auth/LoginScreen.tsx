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
    }
  }, [user]);

  const isLoading = loading || isSigningOut;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <View style={styles.content}>
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
          <GoogleSignInWeb loading={isLoading} />
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text
              style={[
                styles.loadingText,
                { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
              ]}
            >
              {isSigningOut ? "Signing out..." : "Signing you in..."}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  errorText: {
    color: "#c62828",
    textAlign: "center",
    fontSize: 14,
  },
});
