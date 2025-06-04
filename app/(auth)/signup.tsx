// app/(auth)/signup.tsx
import { Ionicons } from "@expo/vector-icons"; // Keep one Ionicons import
import { Link } from "expo-router";
// Removed useState, ActivityIndicator, Alert, TextInput, useAuthStore
import {
  // Dimensions, // Removed Dimensions
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
// Removed useAuthStore

// const { width } = Dimensions.get("window"); // Removed width

export default function SignupScreen() {
  // Removed all state variables and handleSignup function
  // Removed signUp, isLoading, error, clearError from useAuthStore

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Animated.View
            entering={FadeInUp.duration(1000).springify()}
            style={styles.headerContainer}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="key-outline" size={60} color="#007AFF" />
            </View>
            <Text style={styles.title}>Sign Up / Sign In</Text>
            <Text style={styles.subtitle}>
              We use Google for a secure and easy sign-in.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(1000).springify()}
            style={styles.form} // This style might need adjustment or replacement
          >
            <Text style={styles.infoText}>
              To create an account or sign in, please proceed to our login page and use Google Sign-In.
            </Text>
            {/* Form elements and error display removed */}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(1000).delay(300).springify()}
            style={styles.loginContainer}
          >
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40, // Keep or adjust as needed
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  form: { // Re-purpose or simplify this style for the info text container
    marginBottom: 32,
    alignItems: 'center', // Center the info text
  },
  infoText: { // New style for the informational message
    fontSize: 16,
    color: "#333", // Or another suitable color
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20, // Add some padding
  },
  // Removed: inputContainer, inputIcon, input, eyeIcon,
  // button, buttonDisabled, buttonText, buttonIcon,
  // errorContainer, errorText
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 16,
  },
  loginText: {
    fontSize: 15,
    color: "#64748b",
  },
  linkText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
