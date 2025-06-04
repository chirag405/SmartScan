// app/(auth)/login.tsx
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
// Removed useState
import {
  ActivityIndicator,
  // Alert, // Not used
  Dimensions, // Dimensions not used
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  // TextInput, // Not used
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuthStore } from "../../stores/authStore";

// const { width } = Dimensions.get("window"); // Not used

export default function LoginScreen() {
  // Removed email, password, showPassword states
  // Get the whole store instance for easier access to all states/actions for logging
  const store = useAuthStore();

  const handleGoogleSignIn = async () => {
    console.log("[LoginScreen] handleGoogleSignIn: Called.");
    store.clearError();
    try {
      console.log("[LoginScreen] handleGoogleSignIn: Attempting signInWithGoogle...");
      // Directly use store's method
      const result = await store.signInWithGoogle();
      console.log("[LoginScreen] handleGoogleSignIn: Result from signInWithGoogle:", JSON.stringify(result, null, 2));

      if (result && !result.success) {
        console.error("[LoginScreen] handleGoogleSignIn: Google Sign-In failed explicitly by result:", result.error);
        // Error is already set in the store by signInWithGoogle, UI will reflect it using store.error
      } else if (!result) {
         console.warn("[LoginScreen] handleGoogleSignIn: signInWithGoogle returned undefined or null result. This might be okay if redirect is immediate.");
      } else {
        console.log("[LoginScreen] handleGoogleSignIn: signInWithGoogle call returned success (OAuth flow likely initiated).");
      }
    } catch (e) {
      // This catch block might be redundant if signInWithGoogle itself handles all its errors
      // and updates the store's error state. However, it can catch unexpected client-side errors.
      console.error("[LoginScreen] handleGoogleSignIn: Exception during signInWithGoogle call:", e);
      // Optionally, update store error if not already handled by signInWithGoogle
      // store.setError("An unexpected error occurred during sign-in attempt.");
    } finally {
      // This log shows the client-side store state *immediately after* initiating the OAuth call.
      // Due to the async nature of OAuth and redirects, the user/userData update will primarily be
      // logged via onAuthStateChange in authStore.ts *after* the OAuth callback.
      console.log("[LoginScreen] handleGoogleSignIn: Current store state (isLoading, error) after attempt:", {
        isLoading: store.isLoading, // Get current isLoading state
        error: store.error,         // Get current error state
        user: JSON.stringify(store.user, null, 2), // Log current user from store
        userData: JSON.stringify(store.userData, null, 2), // Log current userData from store
      });
    }
    // Navigation upon successful sign-in is typically handled by a listener (e.g., onAuthStateChange in authStore)
    // or by routing logic observing the user state changes in the application.
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Animated.View
          entering={FadeInUp.duration(1000).springify()}
          style={styles.headerContainer}
        >
          <View style={styles.logoContainer}>
            <Ionicons name="scan" size={60} color="#007AFF" />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Use your Google account to sign in to SmartScan
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(1000).springify()}
          style={styles.form}
        >
          <TouchableOpacity
            style={[styles.googleButton, store.isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={store.isLoading}
          >
            {store.isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon} // Will define this style or reuse existing
                />
                <Text style={styles.buttonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {error && (
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle" size={16} color="#ff3b30" />
              <Text style={styles.errorText}>{store.error}</Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(1000).delay(300).springify()}
          style={styles.signupContainer}
        >
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 48,
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
  form: {
    // marginBottom: 32, // Adjusted as content is less, spacing handled by button margins
  },
  // inputContainer, inputIcon, input, eyeIcon styles removed
  googleButton: {
    backgroundColor: "#007AFF", // Can be changed to Google's red #DB4437 or blue #4285F4
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    // marginRight: 8, // Removed as icon is on the left
  },
  buttonIcon: { // For Google icon on the left
    marginRight: 12,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ff3b30",
    marginBottom: 16, // Add margin below error message if signupContainer is present
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  // forgotPasswordButton, forgotPasswordText styles removed
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 16, // Ensure spacing from error message or button
  },
  signupText: {
    fontSize: 15,
    color: "#64748b",
  },
  linkText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
