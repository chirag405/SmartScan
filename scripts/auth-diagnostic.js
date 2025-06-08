#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔍 SmartScan Authentication Diagnostic");
console.log("=====================================\n");

// Check environment configuration
console.log("📋 Environment Configuration:");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent.split("\n");

  lines.forEach((line) => {
    if (line.includes("EXPO_PUBLIC_")) {
      const [key] = line.split("=");
      if (key.includes("URL")) {
        console.log(`  ✅ ${key}: ${line.split("=")[1] || "MISSING"}`);
      } else {
        console.log(`  ✅ ${key}: [REDACTED]`);
      }
    }
  });
} else {
  console.log("  ❌ .env.local file not found");
}

// Check OAuth callback file
console.log("\n🔗 OAuth Implementation:");
const callbackPath = path.join(__dirname, "..", "app", "oauth-callback.tsx");
if (fs.existsSync(callbackPath)) {
  console.log("  ✅ OAuth callback file exists");

  const callbackContent = fs.readFileSync(callbackPath, "utf8");
  if (callbackContent.includes("setSession")) {
    console.log("  ✅ setSession implementation found");
  } else {
    console.log("  ❌ setSession implementation missing");
  }

  if (callbackContent.includes("router.replace")) {
    console.log("  ✅ Router redirect found");
  } else {
    console.log("  ❌ Router redirect missing");
  }
} else {
  console.log("  ❌ OAuth callback file missing");
}

// Check auth store
console.log("\n🏪 Auth Store:");
const authStorePath = path.join(__dirname, "..", "stores", "authStore.ts");
if (fs.existsSync(authStorePath)) {
  console.log("  ✅ Auth store exists");

  const authStoreContent = fs.readFileSync(authStorePath, "utf8");
  if (authStoreContent.includes("signInWithGoogle")) {
    console.log("  ✅ Google sign in method found");
  }

  if (authStoreContent.includes("onAuthStateChange")) {
    console.log("  ✅ Auth state listener found");
  }

  if (authStoreContent.includes("oauthTimeoutId")) {
    console.log("  ✅ OAuth timeout handling found");
  }
} else {
  console.log("  ❌ Auth store missing");
}

// Check app configuration
console.log("\n📱 App Configuration:");
const appJsonPath = path.join(__dirname, "..", "app.json");
if (fs.existsSync(appJsonPath)) {
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  console.log(`  ✅ App scheme: ${appConfig.expo.scheme || "MISSING"}`);
} else {
  console.log("  ❌ app.json missing");
}

// Diagnostic recommendations
console.log("\n💡 Diagnostic Summary:");
console.log("To debug the stuck authentication issue:");
console.log("1. Check Metro logs for 'OAuth callback triggered' messages");
console.log("2. Look for 'SIGNED_IN event received' in the console");
console.log("3. Verify 'Session set successfully' appears in logs");
console.log("4. Check if 'Cleared OAuth timeout' message appears");
console.log("5. Monitor auth store state changes with the debug panel");

console.log("\n🔧 If authentication is still stuck:");
console.log("- Enable the debug panel in development mode");
console.log("- Check if user state updates after OAuth callback");
console.log("- Verify the auth listener is firing correctly");
console.log("- Look for any error messages in the console");
