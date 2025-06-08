import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const colorScheme = useColorScheme();

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
});
