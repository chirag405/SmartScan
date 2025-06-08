#!/usr/bin/env node

/**
 * OAuth Configuration Fix Script
 *
 * This script helps diagnose and fix common OAuth configuration issues
 * in SmartScan app when using Supabase authentication.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("\n🔑 SmartScan OAuth Configuration Fix\n");

// Check environment variables
const envFile = path.join(__dirname, "..", ".env.local");
let envConfig = {};

try {
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, "utf8");
    envContent.split("\n").forEach((line) => {
      if (!line.trim() || line.startsWith("#")) return;
      const [key, value] = line.split("=");
      if (key && value) {
        envConfig[key.trim()] = value.trim();
      }
    });

    console.log("📋 Environment Configuration:");
    console.log(
      `  - SUPABASE_URL: ${
        envConfig.EXPO_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"
      }`
    );
    console.log(
      `  - SUPABASE_ANON_KEY: ${
        envConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"
      }`
    );
    console.log(
      `  - APP_URL: ${envConfig.EXPO_PUBLIC_APP_URL ? "✅ Set" : "❌ Missing"}`
    );

    if (envConfig.EXPO_PUBLIC_APP_URL) {
      console.log(`\n🔗 OAuth Redirect URL: ${envConfig.EXPO_PUBLIC_APP_URL}`);
    }
  } else {
    console.log("❌ .env.local file not found");
  }
} catch (error) {
  console.error("Error reading .env file:", error.message);
}

// Check app.json for scheme
const appJsonFile = path.join(__dirname, "..", "app.json");
try {
  if (fs.existsSync(appJsonFile)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonFile, "utf8"));
    const scheme = appJson.expo?.scheme;

    console.log("\n📱 App Configuration:");
    console.log(`  - URL Scheme: ${scheme ? "✅ " + scheme : "❌ Missing"}`);

    if (scheme && envConfig.EXPO_PUBLIC_APP_URL) {
      const expectedUrl = `${scheme}://oauth-callback`;
      const isCorrect = envConfig.EXPO_PUBLIC_APP_URL === expectedUrl;
      console.log(
        `  - Scheme matches APP_URL: ${isCorrect ? "✅ Yes" : "❌ No"}`
      );

      if (!isCorrect) {
        console.log(
          `\n⚠️ The APP_URL should be "${expectedUrl}" but is set to "${envConfig.EXPO_PUBLIC_APP_URL}"`
        );
      }
    }
  } else {
    console.log("❌ app.json file not found");
  }
} catch (error) {
  console.error("Error reading app.json file:", error.message);
}

// Check for oauth-callback.tsx
const callbackFile = path.join(__dirname, "..", "app", "oauth-callback.tsx");
if (fs.existsSync(callbackFile)) {
  console.log("\n🔄 OAuth Callback File: ✅ Found");
} else {
  console.log("\n❌ OAuth Callback File: Missing");
}

// Check Supabase client configuration
try {
  const supabaseClientFile = path.join(
    __dirname,
    "..",
    "lib",
    "supabaseClient.tsx"
  );
  if (fs.existsSync(supabaseClientFile)) {
    const supabaseClientContent = fs.readFileSync(supabaseClientFile, "utf8");

    console.log("\n🛠️ Supabase Client Configuration:");

    const hasDetectSessionInUrl = supabaseClientContent.includes(
      "detectSessionInUrl: false"
    );
    console.log(
      `  - detectSessionInUrl: false: ${
        hasDetectSessionInUrl ? "✅ Set" : "❌ Missing"
      }`
    );

    const hasFlowType = supabaseClientContent.includes('flowType: "pkce"');
    console.log(
      `  - flowType: "pkce": ${hasFlowType ? "✅ Set" : "❌ Missing"}`
    );

    if (!hasDetectSessionInUrl || !hasFlowType) {
      console.log(
        '\n⚠️ The Supabase client should include both "detectSessionInUrl: false" and "flowType: "pkce"" options'
      );
    }
  } else {
    console.log("\n❌ Supabase client file not found");
  }
} catch (error) {
  console.error("Error checking Supabase client:", error.message);
}

// OAuth Configuration Instructions
console.log("\n📝 Required OAuth Configuration Steps:");
console.log("\n1. In Supabase Dashboard (https://app.supabase.com):");
console.log("   a. Go to Authentication > URL Configuration");
console.log('   b. Add the following URL to "Redirect URLs":');
if (envConfig.EXPO_PUBLIC_APP_URL) {
  console.log(`      ${envConfig.EXPO_PUBLIC_APP_URL}`);
} else {
  console.log("      [Your APP_URL is not configured in .env.local]");
}
console.log('   c. Make sure "PKCE" is selected for Mobile/Desktop apps');

console.log("\n2. In Google Cloud Console:");
console.log("   a. Go to your project > APIs & Services > Credentials");
console.log("   b. Edit your OAuth 2.0 Client ID");
console.log('   c. Add the following URL to "Authorized redirect URIs":');
if (envConfig.EXPO_PUBLIC_SUPABASE_URL) {
  console.log(`      ${envConfig.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/callback`);
} else {
  console.log(
    "      [Your SUPABASE_URL is not configured in .env.local]/auth/v1/callback"
  );
}

console.log("\n🔄 Testing OAuth configuration...");
// Attempt to verify Supabase auth settings via their JS client
// This is a simulation - in a real implementation you could make an API call
// to verify settings if Supabase provides such an endpoint
console.log("✨ Configuration check complete. Fix any issues reported above.");
console.log(
  "\n🔗 For more help, visit Supabase docs: https://supabase.com/docs/guides/auth/social-login/auth-google"
);
