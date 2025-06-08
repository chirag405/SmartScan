import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { clearSupabaseSession } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

interface AuthValidatorProps {
  children: React.ReactNode;
}

export const AuthValidator: React.FC<AuthValidatorProps> = ({ children }) => {
  const {
    user,
    validateSession,
    forceSignOut,
    loading,
    initialized,
    isSigningOut,
  } = useAuthStore();
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    // Only validate once when app starts and we have a user
    if (initialized && user && !loading && !isSigningOut && !hasValidated) {
      const validateOnStartup = async () => {
        try {
          console.log("Validating session on app startup");
          const isValid = await validateSession();
          if (!isValid) {
            console.log("Session validation failed on startup, signing out");
            await forceSignOut();
          } else {
            console.log("Session validation successful");
          }
        } catch (error) {
          console.error("Error validating session on startup:", error);
          // Don't force sign out on validation errors - let user continue
        } finally {
          setHasValidated(true);
        }
      };

      validateOnStartup();
    } else if (!user) {
      // Reset validation flag when user signs out
      setHasValidated(false);
    }
  }, [initialized, user, loading, isSigningOut, hasValidated]);

  const handleClearAllData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will sign you out and clear all cached data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear AsyncStorage completely
              await AsyncStorage.clear();

              // Clear Supabase session
              await clearSupabaseSession();

              // Force sign out
              await forceSignOut();

              Alert.alert("Success", "All data cleared. App will refresh.");
            } catch (error) {
              console.error("Error clearing all data:", error);
              Alert.alert("Error", "Failed to clear all data");
            }
          },
        },
      ]
    );
  };

  const handleValidateSession = async () => {
    try {
      const isValid = await validateSession();
      Alert.alert(
        "Session Status",
        isValid ? "Session is valid" : "Session is invalid - signing out",
        [{ text: "OK" }]
      );

      if (!isValid) {
        await forceSignOut();
      }
    } catch (error) {
      console.error("Error validating session:", error);
      Alert.alert("Error", "Failed to validate session");
    }
  };

  // Show debug options in development mode
  const showDebugUI = __DEV__ && showDebugOptions;

  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Debug UI for development */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setShowDebugOptions(!showDebugOptions)}
        >
          <Text style={styles.debugToggleText}>
            {showDebugOptions ? "✖" : "🔧"}
          </Text>
        </TouchableOpacity>
      )}

      {showDebugUI && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Auth Debug</Text>
          <Text style={styles.debugInfo}>
            User: {user ? user.email : "None"}
          </Text>
          <Text style={styles.debugInfo}>
            Loading: {loading ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugInfo}>
            Initialized: {initialized ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugInfo}>
            Signing Out: {isSigningOut ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugInfo}>
            Validated: {hasValidated ? "Yes" : "No"}
          </Text>

          <TouchableOpacity
            style={styles.debugButton}
            onPress={handleValidateSession}
          >
            <Text style={styles.debugButtonText}>Validate Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.debugButton, styles.debugButtonDanger]}
            onPress={handleClearAllData}
          >
            <Text
              style={[styles.debugButtonText, styles.debugButtonTextDanger]}
            >
              Clear All Data
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  debugToggle: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  debugToggleText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  debugPanel: {
    position: "absolute",
    top: 100,
    right: 20,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    padding: 20,
    borderRadius: 10,
    zIndex: 9998,
  },
  debugTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  debugInfo: {
    color: "white",
    fontSize: 14,
    marginBottom: 5,
  },
  debugButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  debugButtonDanger: {
    backgroundColor: "#FF3B30",
  },
  debugButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  debugButtonTextDanger: {
    color: "white",
  },
});
