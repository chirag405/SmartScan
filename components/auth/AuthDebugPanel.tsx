import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export const AuthDebugPanel: React.FC = () => {
  const { user, loading, error, initialized, isSigningOut } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  const [appState, setAppState] = useState<any>(null);

  if (!__DEV__) {
    return null; // Only show in development
  }

  const checkSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setSessionInfo(JSON.stringify({ error: error.message }, null, 2));
      } else {
        const session = data?.session;
        setSessionInfo(
          JSON.stringify(
            {
              hasSession: !!session,
              user: session?.user
                ? {
                    id: session.user.id,
                    email: session.user.email,
                    has_metadata: !!session.user.user_metadata,
                  }
                : null,
              expires_at: session?.expires_at,
            },
            null,
            2
          )
        );
      }
    } catch (err) {
      setSessionInfo(
        JSON.stringify({ checkError: (err as Error).message }, null, 2)
      );
    }
  };

  const checkUserProfile = async () => {
    if (!user) {
      Alert.alert("Error", "No user is signed in");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        Alert.alert(
          "Database Error",
          `Error fetching profile: ${error.message}`
        );
        return;
      }

      if (!data) {
        Alert.alert(
          "Missing Profile",
          "User profile does not exist in the database. Try running the auth:fix script."
        );
      } else {
        Alert.alert("Profile Found", `Profile exists for ${data.email}`);
      }
    } catch (err) {
      Alert.alert("Error", `Check failed: ${(err as Error).message}`);
    }
  };

  const forceNavigateToTabs = () => {
    console.log("🔄 Force navigating to tabs");
    try {
      // Reset all states that might be preventing navigation
      useAuthStore.setState({ loading: false, initialized: true });
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 100);
    } catch (e) {
      console.error("Navigation error:", e);
      Alert.alert("Error", "Navigation failed. Try restarting the app.");
    }
  };

  const forceNavigateToLogin = () => {
    console.log("🔄 Force navigating to login");
    try {
      useAuthStore.setState({ loading: false });
      setTimeout(() => {
        router.replace("/");
      }, 100);
    } catch (e) {
      console.error("Navigation error:", e);
      Alert.alert("Error", "Navigation failed. Try restarting the app.");
    }
  };

  const getCurrentAppState = () => {
    // Capture current app state for debugging
    const authStore = useAuthStore.getState();
    setAppState(
      JSON.stringify(
        {
          user: authStore.user?.email || null,
          loading: authStore.loading,
          initialized: authStore.initialized,
          isSigningOut: authStore.isSigningOut,
          hasUserProfile: !!authStore.userProfile,
          route: "Current route info not available",
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  };

  const fixUserProfile = async () => {
    if (!user) {
      Alert.alert("Error", "No user is signed in");
      return;
    }

    try {
      Alert.alert(
        "Create User Profile",
        "This will attempt to create a user profile in the database. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Create Profile",
            onPress: async () => {
              try {
                // Get user name from metadata, handle different property names
                const userMetadata = (user.user_metadata as any) || {};
                const fullName =
                  userMetadata.full_name ||
                  userMetadata.name ||
                  userMetadata.preferred_username ||
                  "User";

                const userProfile = {
                  id: user.id,
                  email: user.email,
                  full_name: fullName,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  document_count: 0,
                  storage_used_mb: 0,
                  subscription_tier: "free",
                  email_verified: false,
                };

                const { data, error } = await supabase
                  .from("users")
                  .insert(userProfile)
                  .select()
                  .single();

                if (error) {
                  if (error.code === "23505") {
                    Alert.alert(
                      "Profile Exists",
                      "A profile already exists with this ID or email."
                    );
                  } else {
                    Alert.alert(
                      "Error",
                      `Failed to create profile: ${error.message}`
                    );
                  }
                } else {
                  Alert.alert("Success", "User profile created successfully!");
                }
              } catch (err) {
                Alert.alert(
                  "Error",
                  `Profile creation failed: ${(err as Error).message}`
                );
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert("Error", `Operation failed: ${(err as Error).message}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.minimizedContainer}
        onPress={() => setExpanded(true)}
      >
        <Ionicons name="bug-outline" size={16} color="white" />
        <Text style={styles.minimizedText}>
          {user ? "Signed In" : "Not Authenticated"}
          {loading ? " (Loading)" : ""}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={expanded}
        transparent
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Auth Debug Panel</Text>
              <TouchableOpacity
                onPress={() => setExpanded(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Auth State</Text>
                <Text style={styles.info}>
                  User: {user ? user.email : "null"}
                </Text>
                <Text style={styles.info}>
                  User ID: {user ? user.id.substring(0, 8) + "..." : "null"}
                </Text>
                <Text style={styles.info}>
                  Loading: {loading ? "true" : "false"}
                </Text>
                <Text style={styles.info}>
                  Initialized: {initialized ? "true" : "false"}
                </Text>
                <Text style={styles.info}>
                  Signing Out: {isSigningOut ? "true" : "false"}
                </Text>
                {error && <Text style={styles.error}>Error: {error}</Text>}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Session Info</Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={checkSession}
                  >
                    <Ionicons name="refresh" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {sessionInfo ? (
                  <ScrollView style={styles.codeBlock}>
                    <Text style={styles.code}>{sessionInfo}</Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.info}>
                    Press refresh to check session
                  </Text>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>App State</Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={getCurrentAppState}
                  >
                    <Ionicons name="refresh" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {appState ? (
                  <ScrollView style={styles.codeBlock}>
                    <Text style={styles.code}>{appState}</Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.info}>
                    Press refresh to check app state
                  </Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Debug Actions</Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    useAuthStore.setState({ loading: false });
                  }}
                >
                  <Text style={styles.actionButtonText}>
                    Clear Loading State
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={checkUserProfile}
                >
                  <Text style={styles.actionButtonText}>
                    Check User Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={fixUserProfile}
                >
                  <Text style={styles.actionButtonText}>Fix User Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    try {
                      await supabase.auth.refreshSession();
                      checkSession();
                    } catch (e) {
                      console.error("Failed to refresh session:", e);
                    }
                  }}
                >
                  <Text style={styles.actionButtonText}>Refresh Session</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.emergencyButton]}
                  onPress={forceNavigateToTabs}
                >
                  <Text style={styles.actionButtonText}>
                    🚀 Force Navigate to Tabs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.emergencyButton]}
                  onPress={forceNavigateToLogin}
                >
                  <Text style={styles.actionButtonText}>
                    🏠 Force Navigate to Login
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => useAuthStore.getState().forceSignOut()}
                >
                  <Text style={styles.actionButtonText}>⚠️ Force Sign Out</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  minimizedContainer: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
  },
  minimizedText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#2C2C2C",
  },
  title: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#7DF9FF", // Cyan
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  info: {
    color: "white",
    fontSize: 14,
    marginBottom: 5,
  },
  error: {
    color: "#FF6B6B", // Red
    fontSize: 14,
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: "#444",
    padding: 5,
    borderRadius: 5,
  },
  codeBlock: {
    backgroundColor: "#2C2C2C",
    borderRadius: 5,
    padding: 10,
    maxHeight: 200,
  },
  code: {
    color: "#A9FFA9", // Light green
    fontFamily: "monospace",
    fontSize: 12,
  },
  actionButton: {
    backgroundColor: "#2C5EA8", // Blue
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
    alignItems: "center",
  },
  emergencyButton: {
    backgroundColor: "#b71c1c", // Red
    marginTop: 16,
  },
  dangerButton: {
    backgroundColor: "#FF3B30", // Danger red
    marginTop: 16,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
