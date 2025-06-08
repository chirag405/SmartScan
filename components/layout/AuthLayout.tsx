import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { LoadingScreen } from "../common/LoadingScreen";

export const AuthLayout: React.FC = () => {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // TODO: Check authentication status
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // TODO: Implement actual auth check with Supabase
      // For now, simulate checking auth status
      setIsLoading(true);

      // Simulate auth check delay
      setTimeout(() => {
        setIsLoading(false);
        // For demo purposes, redirect to tabs
        // In real implementation, check actual auth status
        router.replace("/(tabs)");
      }, 1000);
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement Google Sign In with Supabase
      console.log("Google Sign In pressed");

      // Simulate sign in delay
      setTimeout(() => {
        setIsLoading(false);
        router.replace("/(tabs)");
      }, 2000);
    } catch (error) {
      console.error("Sign in failed:", error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.authSection}>
          <GoogleSignInButton
            onPress={handleGoogleSignIn}
            loading={isLoading}
          />
        </View>
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
    paddingHorizontal: 24,
  },
  authSection: {
    marginBottom: 32,
  },
});
