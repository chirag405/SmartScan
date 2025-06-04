// app/(auth)/verify.tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";

export default function VerifyScreen() {
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading");

  useEffect(() => {
    handleEmailVerification();
  }, []);

  const handleEmailVerification = async () => {
    try {
      if (!token_hash || !type) {
        setVerificationStatus("error");
        setIsLoading(false);
        return;
      }

      // Handle email verification
      if (type === "email") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });

        if (error) {
          console.error("Email verification error:", error);
          setVerificationStatus("error");
        } else {
          setVerificationStatus("success");
          // Redirect to home after successful verification
          setTimeout(() => {
            router.replace("/(tabs)/home");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    router.replace("/(auth)/login");
  };

  if (verificationStatus === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Verifying your email...</Text>
      </View>
    );
  }

  if (verificationStatus === "success") {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Email Verified!</Text>
        <Text style={styles.successText}>
          Your email has been successfully verified. Redirecting to your
          account...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.errorIcon}>❌</Text>
      <Text style={styles.errorTitle}>Verification Failed</Text>
      <Text style={styles.errorText}>
        We couldn't verify your email. The link may have expired or is invalid.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleReturnToLogin}>
        <Text style={styles.buttonText}>Return to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
