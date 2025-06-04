import { checkEnvironmentConfig, debugAuthConfig } from "@/lib/envCheck";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    // Check environment configuration on app start
    if (__DEV__) {
      checkEnvironmentConfig();
      debugAuthConfig();
    }
  }, []);

  return <div>{/* ...existing JSX code... */}</div>;
}
