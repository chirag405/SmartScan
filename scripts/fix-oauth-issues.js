#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🔧 SmartScan OAuth Troubleshooter");
console.log("================================\n");

// Read .env.local file
let envLocalContent = "";
try {
  envLocalContent = fs.readFileSync(
    path.join(process.cwd(), ".env.local"),
    "utf8"
  );
} catch (err) {
  console.log("❌ Could not read .env.local file");
  process.exit(1);
}

// Extract Google Client ID
const clientIdMatch = envLocalContent.match(
  /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=([^\r\n]+)/
);
const googleClientId = clientIdMatch ? clientIdMatch[1].trim() : null;

console.log("🔍 Checking environment configuration...");
console.log(
  `• Google Web Client ID: ${googleClientId ? "✅ Found" : "❌ Not found"}`
);

if (googleClientId) {
  console.log(`  ID: ${googleClientId.substring(0, 15)}...`);
}

// Check app.json for correct scheme
let appJsonContent = {};
try {
  appJsonContent = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "app.json"), "utf8")
  );
} catch (err) {
  console.log("❌ Could not read app.json file");
}

const scheme = appJsonContent.expo?.scheme || null;
console.log(`• App Scheme: ${scheme ? "✅ Found" : "❌ Not found"}`);
if (scheme) {
  console.log(`  Scheme: ${scheme}`);
}

// Check if URL variables match
const appUrlMatch = envLocalContent.match(/EXPO_PUBLIC_APP_URL=([^\r\n]+)/);
const appUrl = appUrlMatch ? appUrlMatch[1].trim() : null;

console.log(`• App URL: ${appUrl ? "✅ Found" : "❌ Not found"}`);
if (appUrl) {
  console.log(`  URL: ${appUrl}`);

  if (scheme && !appUrl.startsWith(`${scheme}://`)) {
    console.log(
      `  ⚠️ Warning: App URL doesn't match the scheme. Expected: ${scheme}://`
    );
  }
}

// Check if development server is running
let serverRunning = false;
let serverPort = null;
try {
  const isWindows = process.platform === "win32";
  const checkCommand = isWindows
    ? "netstat -ano | findstr 808"
    : "lsof -i :8081 -i :8082 | grep node";

  const output = execSync(checkCommand).toString();
  serverRunning = true;

  if (output.includes("8081")) {
    serverPort = 8081;
  } else if (output.includes("8082")) {
    serverPort = 8082;
  }
} catch (err) {
  // Server not running
}

console.log(
  `• Expo Server: ${serverRunning ? "✅ Running" : "❌ Not running"}`
);
if (serverRunning && serverPort) {
  console.log(`  Port: ${serverPort}`);
}

console.log("\n🔧 Common OAuth Issues and Fixes:");

console.log("\n1. Invalid Redirect URI");
console.log("   Make sure these URIs are added to your Google Cloud Console:");
if (serverPort) {
  console.log(`   • exp://localhost:${serverPort}`);
  console.log(`   • exp://127.0.0.1:${serverPort}`);
}
if (scheme) {
  console.log(`   • ${scheme}://oauth-callback`);
}
console.log("   • exp://localhost:8081");
console.log("   • exp://localhost:8082");

console.log("\n2. Authorization Code Flow");
console.log(
  "   We're using the authorization code flow, which returns a 'code' parameter"
);
console.log(
  "   This code must be exchanged for tokens using exchangeCodeForSession"
);

console.log("\n3. Missing Dependencies");
console.log("   Check that these dependencies are installed:");
console.log("   • expo-web-browser");
console.log("   • expo-constants");

console.log("\n4. Environment Variables");
console.log("   Make sure EXPO_PUBLIC_APP_URL matches your app scheme");
if (scheme && appUrl && !appUrl.startsWith(`${scheme}://`)) {
  console.log("   ❌ Mismatch detected! Would you like to fix it? (y/n)");
  rl.question("   > ", (answer) => {
    if (answer.toLowerCase() === "y") {
      const newAppUrl = `${scheme}://oauth-callback`;
      const newEnvContent = envLocalContent.replace(
        /EXPO_PUBLIC_APP_URL=([^\r\n]+)/,
        `EXPO_PUBLIC_APP_URL=${newAppUrl}`
      );
      fs.writeFileSync(path.join(process.cwd(), ".env.local"), newEnvContent);
      console.log(`   ✅ Updated EXPO_PUBLIC_APP_URL to ${newAppUrl}`);
    }

    console.log("\n✨ Next steps:");
    console.log("1. Restart your Expo server (npm start)");
    console.log("2. Clear your browser cache");
    console.log("3. Try signing in again");
    rl.close();
  });
} else {
  console.log("\n✨ Next steps:");
  console.log("1. Restart your Expo server (npm start)");
  console.log("2. Clear your browser cache");
  console.log("3. Try signing in again");
  rl.close();
}
