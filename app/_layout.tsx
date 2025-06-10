import { Buffer } from "buffer";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import "react-native-reanimated";
import { AuthDebugPanel } from "../components/auth/AuthDebugPanel";
import { AuthValidator } from "../components/auth/AuthValidator";

// Make Buffer globally available
global.Buffer = Buffer;

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthValidator>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <AuthDebugPanel />
      <StatusBar style="auto" />
    </AuthValidator>
  );
}
