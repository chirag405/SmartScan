import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import { LoadingScreen } from "../common/LoadingScreen";
import { useAuthStore } from "../../stores/authStore";

export const AuthLayout: React.FC = () => {
  const colorScheme = useColorScheme();
  const { user, loading, initialized, signInWithGoogle } = useAuthStore();

  useEffect(() => {
    if (initialized && user) {
      router.replace("/(tabs)");
    }
  }, [initialized, user]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      // Optionally, handle the error in the UI, e.g., show a message
    }
  };

  if (!initialized || loading) {
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
            loading={loading}
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
