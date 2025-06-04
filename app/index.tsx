import { AuthScreen } from "@/components/AuthScreen";
import { HomeScreen } from "@/components/HomeScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const { isAuthenticated, initialized } = useAuth();

  if (!initialized) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="auto" />
      {isAuthenticated ? <HomeScreen /> : <AuthScreen />}
    </>
  );
}
