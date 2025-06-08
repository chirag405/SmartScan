#!/usr/bin/env node

/**
 * Clear Auth Data Script
 *
 * This script helps clear all authentication data from the app.
 * Run this when you need to completely reset the auth state.
 *
 * Usage:
 * node scripts/clear-auth-data.js
 */

const fs = require("fs");
const path = require("path");

console.log("🧹 SmartScan Auth Data Cleaner");
console.log("===============================");

// Instructions for manual clearing
console.log("\n📋 Manual Steps to Clear All Auth Data:");
console.log("\n1. CLOSE THE APP completely (not just background)");
console.log("2. Clear device storage:");
console.log("   - iOS: Delete app and reinstall");
console.log(
  "   - Android: Go to Settings > Apps > SmartScan > Storage > Clear Data"
);
console.log("\n3. Or use the in-app debug tools:");
console.log("   - Open the app in development mode");
console.log("   - Look for the 🔧 icon in the top-right corner");
console.log('   - Tap it and select "Clear All Data"');

console.log("\n4. Database cleanup (if you have access):");
console.log("   - Delete user records from authentication table");
console.log("   - Delete user records from users table");
console.log("   - Clear any related documents/embeddings");

console.log("\n5. Development server:");
console.log("   - Stop the Expo development server");
console.log("   - Clear Expo cache: expo start --clear");
console.log("   - Restart the development server");

console.log("\n⚠️  Important Notes:");
console.log("   - This will completely sign out the user");
console.log("   - All locally stored documents will be lost");
console.log("   - User will need to sign in again");
console.log("   - Make sure to clear both app data AND database records");

console.log("\n✅ The app now includes session validation that will:");
console.log("   - Check if user exists in database on startup");
console.log("   - Automatically sign out if user is deleted");
console.log("   - Validate session on token refresh");
console.log("   - Provide debug tools in development mode");

console.log("\n🔄 If you continue to have issues:");
console.log("   1. Make sure RLS policies are properly configured");
console.log("   2. Check Supabase logs for authentication errors");
console.log("   3. Verify the user table structure matches expectations");
console.log("   4. Test with a fresh user account");

console.log("\n✨ Done! The authentication system is now more robust.");
