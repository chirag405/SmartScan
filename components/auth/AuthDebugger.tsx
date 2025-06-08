import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export const AuthDebugger: React.FC = () => {
  const {
    user,
    userProfile,
    loading,
    error,
    initialized,
    isSigningOut,
    forceRefreshAuth,
    validateSession,
    forceSignOut,
  } = useAuthStore();

  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Monitor Supabase session in real-time
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSupabaseSession(session);
    };

    checkSession();
    const interval = setInterval(checkSession, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [refreshCount]);

  const handleForceRefresh = async () => {
    console.log("Manual force refresh triggered");
    await forceRefreshAuth();
    setRefreshCount((prev) => prev + 1);
  };

  const handleValidateSession = async () => {
    try {
      const isValid = await validateSession();
      Alert.alert(
        "Session Validation",
        isValid ? "Session is valid ✅" : "Session is invalid ❌"
      );
    } catch (error) {
      Alert.alert("Error", "Failed to validate session");
    }
  };

  const handleClearAll = async () => {
    Alert.alert("Force Sign Out", "This will clear all auth data. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          await forceSignOut();
          setRefreshCount((prev) => prev + 1);
        },
      },
    ]);
  };

  const handleGetCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    Alert.alert(
      "Current User",
      error
        ? `Error: ${error.message}`
        : data.user
        ? `User: ${data.user.email}`
        : "No user found"
    );
  };

  if (!__DEV__) {
    return null; // Only show in development
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Auth Debugger</Text>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zustand Store State:</Text>
          <Text style={styles.text}>User: {user ? user.email : "null"}</Text>
          <Text style={styles.text}>
            Profile: {userProfile?.full_name || "null"}
          </Text>
          <Text style={styles.text}>Loading: {loading ? "true" : "false"}</Text>
          <Text style={styles.text}>
            Initialized: {initialized ? "true" : "false"}
          </Text>
          <Text style={styles.text}>
            Signing Out: {isSigningOut ? "true" : "false"}
          </Text>
          <Text style={styles.text}>Error: {error || "null"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supabase Session:</Text>
          <Text style={styles.text}>
            Has Session: {supabaseSession ? "true" : "false"}
          </Text>
          <Text style={styles.text}>
            User Email: {supabaseSession?.user?.email || "null"}
          </Text>
          <Text style={styles.text}>
            Expires At:{" "}
            {supabaseSession?.expires_at
              ? new Date(supabaseSession.expires_at * 1000).toLocaleTimeString()
              : "null"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment:</Text>
          <Text style={styles.text}>
            App URL: {process.env.EXPO_PUBLIC_APP_URL}
          </Text>
          <Text style={styles.text}>
            Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleForceRefresh}>
            <Text style={styles.buttonText}>Force Refresh Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleValidateSession}
          >
            <Text style={styles.buttonText}>Validate Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetCurrentUser}
          >
            <Text style={styles.buttonText}>Get Current User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearAll}
          >
            <Text style={[styles.buttonText, styles.dangerButtonText]}>
              Force Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    bottom: 100,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    borderRadius: 10,
    padding: 15,
    zIndex: 9999,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  text: {
    color: "#cccccc",
    fontSize: 14,
    marginBottom: 4,
    fontFamily: "monospace",
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#FF3B30",
  },
  dangerButtonText: {
    color: "#ffffff",
  },
});
