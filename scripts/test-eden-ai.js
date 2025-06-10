/**
 * Simple test script to verify Eden AI configuration
 * Run with: node scripts/test-eden-ai.js
 */

// Load environment variables
require("dotenv").config();

const testEdenAIConfiguration = async () => {
  console.log("🧪 Testing Eden AI Configuration...\n");

  // Check if API key is present
  const apiKey = process.env.EXPO_PUBLIC_EDEN_AI_API_KEY;

  if (!apiKey) {
    console.error(
      "❌ EXPO_PUBLIC_EDEN_AI_API_KEY not found in environment variables"
    );
    console.log("Please add your Eden AI API key to your .env file");
    return;
  }

  console.log("✅ Eden AI API key found");
  console.log(`   Key starts with: ${apiKey.substring(0, 8)}...`);

  // Test Document Parser endpoint
  try {
    console.log("\n📄 Testing Document Parser endpoint...");
    const docResponse = await fetch(
      "https://api.edenai.run/v2/document/document_parsing",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (docResponse.status === 405) {
      console.log(
        "✅ Document Parser endpoint accessible (405 = Method Not Allowed is expected for GET)"
      );
    } else if (docResponse.status === 401) {
      console.error("❌ Invalid API key for Document Parser");
    } else {
      console.log(
        `ℹ️  Document Parser endpoint returned status: ${docResponse.status}`
      );
    }
  } catch (error) {
    console.error(
      "❌ Error accessing Document Parser endpoint:",
      error.message
    );
  }

  // Test Image OCR endpoint
  try {
    console.log("\n🖼️  Testing Image OCR endpoint...");
    const ocrResponse = await fetch("https://api.edenai.run/v2/image/ocr", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (ocrResponse.status === 405) {
      console.log(
        "✅ Image OCR endpoint accessible (405 = Method Not Allowed is expected for GET)"
      );
    } else if (ocrResponse.status === 401) {
      console.error("❌ Invalid API key for Image OCR");
    } else {
      console.log(
        `ℹ️  Image OCR endpoint returned status: ${ocrResponse.status}`
      );
    }
  } catch (error) {
    console.error("❌ Error accessing Image OCR endpoint:", error.message);
  }

  console.log("\n🎉 Eden AI configuration test completed!");
  console.log("\nNext steps:");
  console.log("1. Make sure you have credits in your Eden AI account");
  console.log("2. Test with actual documents in the app");
  console.log("3. Check the app logs for detailed processing information");
};

// Run the test
testEdenAIConfiguration().catch(console.error);
