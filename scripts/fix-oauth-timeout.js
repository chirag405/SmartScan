#!/usr/bin/env node

/**
 * Debug script to diagnose and fix OAuth timeout issues
 * Run with: node scripts/fix-oauth-timeout.js
 */

console.log("🔄 SmartScan OAuth Timeout Diagnostic Tool");
console.log("==========================================");

const fs = require("fs");
const path = require("path");

// Check for essential files
console.log("\n🔍 Checking essential files...");
const essentialFiles = [
  { path: "app/oauth-callback.tsx", description: "OAuth callback handler" },
  { path: "lib/supabaseClient.tsx", description: "Supabase client" },
  { path: ".env.local", description: "Environment variables" },
  { path: "app.json", description: "App configuration" },
];

let allFilesExist = true;
essentialFiles.forEach((file) => {
  const filePath = path.join(__dirname, "..", file.path);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file.description} exists: ${file.path}`);
  } else {
    console.log(`❌ ${file.description} missing: ${file.path}`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log(
    "\n❌ Missing essential files. Please restore them before continuing."
  );
  process.exit(1);
}

// Check environment variables
console.log("\n🔍 Checking environment variables...");
const envPath = path.join(__dirname, "..", ".env.local");
const requiredEnvVars = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_APP_URL",
];

let envOk = true;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");

  requiredEnvVars.forEach((varName) => {
    const varRegex = new RegExp(`${varName}=(.+)`);
    const match = envContent.match(varRegex);

    if (match) {
      console.log(`✅ ${varName}: ${match[1]}`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      envOk = false;
    }
  });
} else {
  console.log("❌ .env.local file not found");
  envOk = false;
}

// Check app.json for correct scheme
console.log("\n🔍 Checking app.json configuration...");
const appJsonPath = path.join(__dirname, "..", "app.json");
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
    const scheme = appJson.expo?.scheme;

    if (scheme) {
      console.log(`✅ App scheme found: ${scheme}`);

      // Check if scheme matches EXPO_PUBLIC_APP_URL
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const appUrlMatch = envContent.match(/EXPO_PUBLIC_APP_URL=(.+)/);

        if (appUrlMatch) {
          const appUrl = appUrlMatch[1];
          if (appUrl.startsWith(`${scheme}://`)) {
            console.log(`✅ App URL (${appUrl}) matches scheme (${scheme}://)`);
          } else {
            console.log(
              `❌ App URL (${appUrl}) does not match scheme (${scheme}://)`
            );
            console.log(
              `   Fix: Update EXPO_PUBLIC_APP_URL to ${scheme}://oauth-callback`
            );
          }
        }
      }
    } else {
      console.log("❌ App scheme missing in app.json");
      console.log(
        '   Fix: Add "scheme": "smartscan" to expo section in app.json'
      );
    }
  } catch (error) {
    console.log(`❌ Error parsing app.json: ${error.message}`);
  }
} else {
  console.log("❌ app.json file not found");
}

// Provide troubleshooting steps
console.log("\n🚨 Common OAuth Timeout Fixes:");
console.log("1. Clear your browser cache and cookies");
console.log("2. Restart your development server with: npx expo start --clear");
console.log("3. Ensure your Supabase project has the correct redirect URL");
console.log("4. Check that your Google OAuth client is configured correctly");
console.log("5. Try signing in with incognito/private browser mode");
console.log("6. Ensure your device has a stable internet connection");

console.log("\n📱 App-Specific Fixes:");
console.log("1. Clear app data or reinstall the app");
console.log("2. Make sure your app's date and time are set correctly");
console.log("3. Check if your device blocks third-party cookies");
console.log("4. Verify no ad-blockers or privacy extensions are interfering");

console.log(
  "\n✅ Diagnostics complete! Follow the recommendations above to fix OAuth timeout issues."
);
