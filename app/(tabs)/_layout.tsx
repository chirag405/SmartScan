// app/(tabs)/_layout.tsx
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { Text } from "react-native";
import { useAuthStore } from "../../stores/authStore";

export default function TabsLayout() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login" as any);
    }
  }, [user]);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
