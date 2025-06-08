#!/usr/bin/env node

/**
 * Debug script to fix stuck authentication states
 * Run with: node scripts/fix-stuck-auth.js
 */

console.log("🔧 SmartScan Authentication Debug Tool");
console.log("=====================================");

console.log("\n📋 Quick Fix Steps for Stuck Loading:");
console.log("1. Close the app completely");
console.log("2. Clear app data (Android) or reinstall (iOS)");
console.log("3. Restart the app and try signing in again");

console.log("\n🔍 Debug Steps if Issue Persists:");
console.log("1. Check the development console for errors");
console.log('2. Look for "OAuth callback" or "Browser result" logs');
console.log("3. Verify network connectivity");
console.log("4. Use the in-app AuthDebugger (development mode only)");

console.log("\n📱 In-App Debug Tools (Development Mode):");
console.log("- Open the app in development mode");
console.log('- Look for "Auth Debugger" panel on the login screen');
console.log('- Use "Clear Stuck Loading" button');
console.log('- Use "Check Session" to verify Supabase connection');
console.log('- Use "Check Environment" to verify configuration');

console.log("\n🔧 Manual Reset Commands:");
console.log("Run these commands to completely reset:");
console.log("");
console.log("# Clear Expo cache");
console.log("npx expo start --clear");
console.log("");
console.log("# Clear npm cache and reinstall");
console.log("npm cache clean --force");
console.log("rm -rf node_modules");
console.log("npm install");
console.log("");
console.log("# Reset Expo development client");
console.log("npx expo install --fix");

console.log("\n⚙️ Environment Check:");
const requiredEnvVars = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_APP_URL",
];

let envOk = true;
const fs = require("fs");
const path = require("path");

try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");

    requiredEnvVars.forEach((varName) => {
      if (envContent.includes(`${varName}=`)) {
        console.log(`✅ ${varName}: Found`);
      } else {
        console.log(`❌ ${varName}: Missing`);
        envOk = false;
      }
    });
  } else {
    console.log("❌ .env.local file not found");
    envOk = false;
  }
} catch (error) {
  console.log("❌ Error reading .env.local:", error.message);
  envOk = false;
}

if (!envOk) {
  console.log("\n🚨 Environment issues detected!");
  console.log("Make sure your .env.local file contains:");
  console.log("EXPO_PUBLIC_SUPABASE_URL=your_supabase_url");
  console.log("EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key");
  console.log("EXPO_PUBLIC_APP_URL=smartscan://oauth-callback");
}

console.log("\n🔗 Common Causes of Stuck Loading:");
console.log("1. Deep link not properly configured (check app.json scheme)");
console.log("2. OAuth callback URL mismatch in Supabase dashboard");
console.log("3. Google Cloud Console OAuth settings incorrect");
console.log("4. Network issues or firewall blocking requests");
console.log("5. Browser not properly returning to app after OAuth");

console.log("\n📞 If you need more help:");
console.log("1. Check the browser console during sign-in");
console.log("2. Look at the development server logs");
console.log("3. Verify Supabase dashboard OAuth settings");
console.log("4. Test on a different device/network");

console.log("\n✨ Done! Try the suggested fixes above.");
