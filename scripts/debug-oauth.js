#!/usr/bin/env node

/**
 * Debug script for OAuth issues
 * Run with: node scripts/debug-oauth.js
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 SmartScan OAuth Debug Tool\n");

// Check environment variables
console.log("📋 Environment Variables:");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const lines = envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"));

  lines.forEach((line) => {
    const [key, value] = line.split("=");
    if (key && key.includes("EXPO_PUBLIC")) {
      console.log(`  ✅ ${key}: ${value ? "SET" : "MISSING"}`);
    }
  });
} else {
  console.log("  ❌ .env.local file not found");
}

// Check app.json configuration
console.log("\n📱 App Configuration:");
const appJsonPath = path.join(__dirname, "..", "app.json");
if (fs.existsSync(appJsonPath)) {
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

  console.log(`  ✅ App scheme: ${appConfig.expo.scheme || "MISSING"}`);

  if (appConfig.expo.android && appConfig.expo.android.intentFilters) {
    console.log("  ✅ Android intent filters configured");
    appConfig.expo.android.intentFilters.forEach((filter, index) => {
      console.log(`    Filter ${index + 1}: ${JSON.stringify(filter.data)}`);
    });
  } else {
    console.log("  ❌ Android intent filters missing");
  }

  if (appConfig.expo.ios && appConfig.expo.ios.bundleIdentifier) {
    console.log(`  ✅ iOS bundle ID: ${appConfig.expo.ios.bundleIdentifier}`);
  } else {
    console.log("  ❌ iOS bundle ID missing");
  }
} else {
  console.log("  ❌ app.json file not found");
}

// Check OAuth callback file
console.log("\n🔗 OAuth Callback:");
const callbackPath = path.join(__dirname, "..", "app", "oauth-callback.tsx");
if (fs.existsSync(callbackPath)) {
  console.log("  ✅ OAuth callback file exists");
} else {
  console.log("  ❌ OAuth callback file missing");
}

// Check Supabase client configuration
console.log("\n🗄️  Supabase Configuration:");
const supabaseClientPath = path.join(
  __dirname,
  "..",
  "lib",
  "supabaseClient.tsx"
);
if (fs.existsSync(supabaseClientPath)) {
  const supabaseContent = fs.readFileSync(supabaseClientPath, "utf8");

  if (supabaseContent.includes("detectSessionInUrl: false")) {
    console.log("  ✅ detectSessionInUrl is set to false (correct for mobile)");
  } else {
    console.log("  ⚠️  detectSessionInUrl setting not found or incorrect");
  }

  if (supabaseContent.includes("persistSession: true")) {
    console.log("  ✅ persistSession is enabled");
  } else {
    console.log("  ❌ persistSession is not enabled");
  }
} else {
  console.log("  ❌ Supabase client file not found");
}

console.log("\n🔧 Troubleshooting Steps:");
console.log(
  "1. Make sure you have rebuilt the app after adding intent filters"
);
console.log(
  "2. Check that the OAuth redirect URL in Supabase matches EXPO_PUBLIC_APP_URL"
);
console.log(
  "3. Verify that the custom URL scheme is working with: npx expo start --dev-client"
);
console.log(
  '4. Test the deep link manually: adb shell am start -W -a android.intent.action.VIEW -d "smartscan://oauth-callback" com.chirag.smartscan'
);
console.log("5. Check the Metro bundler logs for any errors during OAuth flow");

console.log("\n✨ Debug complete!");
