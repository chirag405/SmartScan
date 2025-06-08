#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔄 SmartScan Auth Reset Tool");
console.log("===========================\n");

// Get paths
const projectRoot = path.resolve(__dirname, "..");
const expoDir = path.join(projectRoot, ".expo");

// 1. Clear Expo cache
console.log("1️⃣ Clearing Expo cache...");
try {
  if (fs.existsSync(expoDir)) {
    const cacheFiles = fs
      .readdirSync(expoDir)
      .filter(
        (file) =>
          file.includes("cache") ||
          file.includes("state") ||
          file.includes("auth")
      );

    cacheFiles.forEach((file) => {
      const filePath = path.join(expoDir, file);
      console.log(`   Deleting: ${file}`);
      fs.unlinkSync(filePath);
    });
    console.log("   ✅ Expo cache cleared");
  } else {
    console.log("   ⚠️ No .expo directory found");
  }
} catch (error) {
  console.error("   ❌ Failed to clear Expo cache:", error.message);
}

// 2. Fix app config
console.log("\n2️⃣ Verifying app configuration...");
try {
  const appJsonPath = path.join(projectRoot, "app.json");
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

    // Ensure scheme is set
    if (!appJson.expo.scheme) {
      console.log("   Adding scheme to app.json...");
      appJson.expo.scheme = "smartscan";
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      console.log("   ✅ Added scheme: smartscan");
    } else {
      console.log(`   ✅ Scheme already set: ${appJson.expo.scheme}`);
    }

    // Check deep links
    if (!appJson.expo.plugins) {
      console.log("   ⚠️ No plugins defined in app.json");
    }
  } else {
    console.log("   ❌ app.json not found");
  }
} catch (error) {
  console.error("   ❌ Failed to update app.json:", error.message);
}

// 3. Verify environment variables
console.log("\n3️⃣ Checking environment variables...");
try {
  const envPath = path.join(projectRoot, ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const hasAppUrl = envContent.includes("EXPO_PUBLIC_APP_URL=");

    if (hasAppUrl) {
      console.log("   ✅ EXPO_PUBLIC_APP_URL found in .env.local");
    } else {
      console.log("   ❌ EXPO_PUBLIC_APP_URL missing from .env.local");
      // Add the variable
      fs.appendFileSync(
        envPath,
        "\nEXPO_PUBLIC_APP_URL=smartscan://oauth-callback\n"
      );
      console.log("   ✅ Added EXPO_PUBLIC_APP_URL to .env.local");
    }
  } else {
    console.log("   ❌ .env.local not found");
  }
} catch (error) {
  console.error("   ❌ Failed to check environment variables:", error.message);
}

// 4. Restart with clean cache
console.log("\n4️⃣ Ready to restart Expo with clean cache");
console.log("   Run this command to start with clean state:");
console.log("   npx expo start --clear\n");

console.log("🔧 Additional troubleshooting:");
console.log('1. Open the login screen and tap "Show Auth Debugger"');
console.log('2. Use "Force Refresh Auth" after login if needed');
console.log('3. Try "Force Sign Out" if you get stuck');
console.log('4. Use "Get Current User" to check Supabase session');
