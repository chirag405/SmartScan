import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, initialized, isSigningOut, loading } = useAuthStore();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const [renderAttempts, setRenderAttempts] = useState(0);

  useEffect(() => {
    // Redirect to login if not authenticated, but avoid loops
    if (initialized && !user && !isSigningOut && !hasRedirected) {
      console.log("User not authenticated, redirecting to login");
      setHasRedirected(true);

      const timer = setTimeout(() => {
        router.replace("/");
      }, 100);

      return () => clearTimeout(timer);
    } else if (user && hasRedirected) {
      // Reset redirect flag when user signs in
      setHasRedirected(false);
    }
  }, [user, initialized, isSigningOut, hasRedirected]);

  // Handle error scenarios
  useEffect(() => {
    if (initialized && user && !isSigningOut && renderAttempts < 3) {
      // Track render attempts
      setRenderAttempts((prev) => prev + 1);
      console.log(`Tab layout render attempt: ${renderAttempts + 1}`);

      // Set a timeout to check if rendering failed
      const timeoutId = setTimeout(() => {
        if (user && !isSigningOut && renderAttempts >= 2) {
          console.log("Maximum render attempts reached, marking as failed");
          setRenderFailed(true);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [initialized, user, isSigningOut, renderAttempts]);

  // Emergency navigation back to home
  const goBackToHome = () => {
    router.replace("/");
  };

  // Don't render tabs if not authenticated or if signing out
  if (!user || isSigningOut || !initialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Loading app...</Text>
      </View>
    );
  }

  // Show error UI if rendering failed
  if (renderFailed) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading app screens</Text>
        <TouchableOpacity style={styles.button} onPress={goBackToHome}>
          <Text style={styles.buttonText}>Go Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#8E8E93" : "#8E8E93",
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          paddingTop: 8,
          height: 88,
        },
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0.1,
        },
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
          color: colorScheme === "dark" ? "#FFFFFF" : "#000000",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerTitle: "SmartScan",
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
          headerShown: false, // We handle the header in the documents component
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
          headerShown: false, // We handle the header in the chat component
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerTitle: "Profile",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
