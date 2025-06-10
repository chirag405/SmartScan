import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/authStore";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const colorScheme = useColorScheme();
  const [showEmergencyButton, setShowEmergencyButton] = useState(false);

  useEffect(() => {
    // Show emergency button after 5 seconds of loading
    const timeout = setTimeout(() => {
      setShowEmergencyButton(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleEmergencyFix = () => {
    // Reset auth store loading state
    useAuthStore.setState({
      loading: false,
      isSigningOut: false,
      initialized: true,
    });

    // Navigate to tabs
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 100);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000000" : "#F2F2F7" },
      ]}
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text
          style={[
            styles.text,
            { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
        >
          SmartScan
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colorScheme === "dark" ? "#8E8E93" : "#8E8E93" },
          ]}
        >
          {message || "Loading..."}
        </Text>

        {showEmergencyButton && (
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyFix}
          >
            <Text style={styles.emergencyButtonText}>
              Loading Taking Too Long? Tap Here
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  emergencyButton: {
    marginTop: 40,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
