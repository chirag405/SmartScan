// app/(auth)/_layout.tsx
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";

export default function AuthLayout() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/home" as any);
    }
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
