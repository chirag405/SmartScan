#!/usr/bin/env node

console.log("🔍 Google Web Client ID Setup Guide");
console.log("=====================================\n");

console.log(
  "To fix the authentication issue, you need to get your Google Web Client ID:"
);
console.log("");

console.log("📋 Step 1: Go to Google Cloud Console");
console.log("   https://console.cloud.google.com/");
console.log("");

console.log("🔑 Step 2: Navigate to Credentials");
console.log("   1. Select your project: smartscan-461808");
console.log("   2. Go to 'APIs & Services' → 'Credentials'");
console.log("   3. Look for 'OAuth 2.0 Client IDs' section");
console.log("");

console.log("🎯 Step 3: Find the Web Client ID");
console.log("   1. Look for an entry with Type: 'Web client'");
console.log(
  "   2. If you don't have one, click 'CREATE CREDENTIALS' → 'OAuth client ID'"
);
console.log("   3. Choose 'Web application' as the application type");
console.log("   4. Add these authorized redirect URIs:");
console.log("      - http://localhost:8081");
console.log("      - https://auth.expo.io/@your-expo-username/smartscan");
console.log(
  "   5. Copy the Client ID (it looks like: 123456789-abcdef.apps.googleusercontent.com)"
);
console.log("");

console.log("⚙️  Step 4: Update your .env.local file");
console.log("   Replace this line:");
console.log(
  "   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID_HERE"
);
console.log("");
console.log("   With your actual Client ID:");
console.log(
  "   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com"
);
console.log("");

console.log("🔄 Step 5: Restart your development server");
console.log("   1. Stop Metro bundler (Ctrl+C)");
console.log("   2. Run: npm start");
console.log("   3. Try signing in again");
console.log("");

console.log("❓ If you still have issues:");
console.log(
  "   1. Make sure the Web Client ID is from the 'Web client' type (NOT Android/iOS)"
);
console.log(
  "   2. Check that your Google Cloud project has the Google+ API enabled"
);
console.log("   3. Verify the redirect URIs are correctly configured");
console.log("");

console.log(
  "💡 The native Google Sign-In approach is more reliable than OAuth callbacks"
);
console.log(
  "   and should resolve the 'stuck loading' issue you were experiencing."
);
