#!/usr/bin/env node

const os = require("os");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔍 SmartScan OAuth Configuration Helper");
console.log("========================================\n");

// Try to get port from running Expo server
let port = "8082"; // Default fallback port
try {
  // Use netstat on Windows, lsof on Unix-like systems
  const isWindows = process.platform === "win32";
  const command = isWindows ? "netstat -ano | findstr :8081" : "lsof -i :8081";

  const output = execSync(command).toString();
  if (output.includes("LISTENING") || output.includes("node")) {
    port = "8081";
  }
} catch (error) {
  // Port 8081 is not available, use 8082
  console.log("ℹ️ Port 8081 not in use, assuming port 8082\n");
}

// Get device IP address
const networkInterfaces = os.networkInterfaces();
let ipAddress = "";

// Find the first non-internal IPv4 address
Object.keys(networkInterfaces).forEach((interfaceName) => {
  networkInterfaces[interfaceName].forEach((iface) => {
    if (iface.family === "IPv4" && !iface.internal) {
      if (!ipAddress) ipAddress = iface.address;
    }
  });
});

// Prepare redirect URLs
const redirectUrls = [`exp://localhost:${port}`, `exp://127.0.0.1:${port}`];

if (ipAddress) {
  redirectUrls.push(`exp://${ipAddress}:${port}`);
}

// Always add the default Expo Go URL that might be used
redirectUrls.push(`smartscan://oauth-callback`);

console.log("🌐 Your OAuth Redirect URLs:");
console.log(
  "You need to add these URLs to your Google Cloud Console OAuth configuration:\n"
);

redirectUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

console.log("\n🚀 How to update your Google OAuth configuration:");
console.log(
  "1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials"
);
console.log("2. Find your OAuth 2.0 Client ID (Web application type)");
console.log("3. Click 'Edit' on your Web Client");
console.log(
  "4. In the 'Authorized redirect URIs' section, add all the URLs listed above"
);
console.log("5. Click 'Save'");

console.log(
  "\n⚠️ IMPORTANT: Your Web Client ID must be configured in .env.local"
);
try {
  const envPath = path.join(process.cwd(), ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");

  // Check if Web Client ID is set
  const clientIdMatch = envContent.match(
    /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=([^\n]+)/
  );
  if (
    clientIdMatch &&
    clientIdMatch[1] &&
    !clientIdMatch[1].includes("YOUR_")
  ) {
    console.log(
      `✅ Web Client ID is configured: ${clientIdMatch[1].substring(0, 12)}...`
    );
  } else {
    console.log("❌ Web Client ID is NOT properly configured in .env.local");
    console.log(
      "   Please update the EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID variable"
    );
  }
} catch (error) {
  console.log("❌ Error reading .env.local file");
}

console.log("\n✨ Once you've updated your OAuth configuration:");
console.log("1. Restart your Expo server: npm start");
console.log("2. Try signing in again");
console.log(
  "\n💡 NOTE: Safari may show 'invalid address' if the wrong redirect URL is used."
);
console.log(
  "    This means you need to update your Google Cloud Console configuration"
);
