import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
}) => {
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colorScheme === "dark" ? "#1C1C1E" : "#FFFFFF",
          borderColor: colorScheme === "dark" ? "#3A3A3C" : "#E5E5EA",
        },
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {loading ? (
          <Ionicons
            name="refresh"
            size={20}
            color="#007AFF"
            style={styles.icon}
          />
        ) : (
          <Ionicons
            name="logo-google"
            size={20}
            color="#4285F4"
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.text,
            { color: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
