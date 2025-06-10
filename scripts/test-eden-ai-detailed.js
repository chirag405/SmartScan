const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const testEdenAIDetailed = async () => {
  console.log("🔍 Eden AI Detailed Configuration and File Handling Test");
  console.log("=" * 60);

  // Check API key
  const apiKey = process.env.EXPO_PUBLIC_EDEN_AI_API_KEY;
  if (!apiKey) {
    console.error("❌ Eden AI API key not found in environment variables");
    console.log("Please set EXPO_PUBLIC_EDEN_AI_API_KEY in your .env file");
    return;
  }

  console.log("✅ Eden AI API key found");
  console.log(
    `🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
  );

  // Test API connectivity
  try {
    console.log("\n🌐 Testing API connectivity...");

    // Test basic API access
    const healthResponse = await fetch(
      "https://api.edenai.run/v2/info/account",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (healthResponse.ok) {
      const accountInfo = await healthResponse.json();
      console.log("✅ API connectivity successful");
      console.log(`📊 Account credits: ${accountInfo.credits || "N/A"}`);
    } else {
      console.error(`❌ API connectivity failed: ${healthResponse.status}`);
      const errorText = await healthResponse.text();
      console.error(`Error details: ${errorText}`);
    }
  } catch (error) {
    console.error("❌ API connectivity error:", error.message);
  }

  // Test OCR endpoints
  console.log("\n📋 Testing OCR Endpoints...");

  // Test sync OCR endpoint
  try {
    const syncResponse = await fetch("https://api.edenai.run/v2/ocr/ocr", {
      method: "OPTIONS",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    console.log(
      `🔄 Sync OCR endpoint: ${syncResponse.status === 200 || syncResponse.status === 405 ? "✅ Available" : `❌ ${syncResponse.status}`}`
    );
  } catch (error) {
    console.error("❌ Sync OCR endpoint error:", error.message);
  }

  // Test async OCR endpoint
  try {
    const asyncResponse = await fetch(
      "https://api.edenai.run/v2/ocr/ocr_async",
      {
        method: "OPTIONS",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    console.log(
      `⏳ Async OCR endpoint: ${asyncResponse.status === 200 || asyncResponse.status === 405 ? "✅ Available" : `❌ ${asyncResponse.status}`}`
    );
  } catch (error) {
    console.error("❌ Async OCR endpoint error:", error.message);
  }

  // Test providers
  console.log("\n🏢 Testing Available Providers...");
  try {
    const providersResponse = await fetch(
      "https://api.edenai.run/v2/info/providers",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (providersResponse.ok) {
      const providers = await providersResponse.json();
      const ocrProviders = providers.ocr || [];
      console.log("✅ Available OCR providers:");
      ocrProviders.forEach((provider) => {
        console.log(
          `   - ${provider.name}: ${provider.status === "available" ? "✅" : "❌"}`
        );
      });
    } else {
      console.log("⚠️  Could not fetch provider list");
    }
  } catch (error) {
    console.error("❌ Provider test error:", error.message);
  }

  // Test file handling with a small test image
  console.log("\n📁 Testing File Handling...");

  // Create a minimal test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  console.log(`📏 Test image size: ${testImageBuffer.length} bytes`);

  // Test FormData creation
  try {
    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: "image/png" });
    formData.append("file", blob, "test.png");
    formData.append("providers", "google");
    formData.append("language", "en");

    console.log("✅ FormData creation successful");
    console.log(`📊 Blob size: ${blob.size} bytes`);
    console.log(`📊 Blob type: ${blob.type}`);

    // Test actual OCR call with test image
    console.log("\n🔍 Testing OCR with test image...");
    const ocrResponse = await fetch("https://api.edenai.run/v2/ocr/ocr", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (ocrResponse.ok) {
      const ocrResult = await ocrResponse.json();
      console.log("✅ OCR test successful");
      console.log("📊 OCR Response structure:", Object.keys(ocrResult));

      // Check each provider result
      Object.keys(ocrResult).forEach((provider) => {
        const result = ocrResult[provider];
        console.log(
          `   - ${provider}: ${result.status} ${result.status === "success" ? "✅" : "❌"}`
        );
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });
    } else {
      const errorData = await ocrResponse.text();
      console.error(`❌ OCR test failed: ${ocrResponse.status}`);
      console.error(`Error details: ${errorData}`);
    }
  } catch (error) {
    console.error("❌ File handling test error:", error.message);
  }

  // Test async OCR
  console.log("\n⏳ Testing Async OCR...");
  try {
    const formData = new FormData();
    const blob = new Blob([testImageBuffer], { type: "image/png" });
    formData.append("file", blob, "test.png");
    formData.append("providers", "google");
    formData.append("language", "en");

    const asyncResponse = await fetch(
      "https://api.edenai.run/v2/ocr/ocr_async",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (asyncResponse.ok) {
      const asyncResult = await asyncResponse.json();
      console.log("✅ Async OCR job submitted successfully");
      console.log(`🆔 Job ID: ${asyncResult.public_id}`);

      // Try to check the result (it might be processed quickly for a small image)
      if (asyncResult.public_id) {
        setTimeout(async () => {
          try {
            const resultResponse = await fetch(
              `https://api.edenai.run/v2/ocr/ocr_async/${asyncResult.public_id}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                },
              }
            );

            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              console.log(`📊 Async job status: ${resultData.status}`);
            }
          } catch (error) {
            console.log("⚠️  Could not check async result:", error.message);
          }
        }, 2000);
      }
    } else {
      const errorData = await asyncResponse.text();
      console.error(`❌ Async OCR test failed: ${asyncResponse.status}`);
      console.error(`Error details: ${errorData}`);
    }
  } catch (error) {
    console.error("❌ Async OCR test error:", error.message);
  }

  console.log("\n🎉 Eden AI detailed test completed!");
  console.log("\n📋 Summary:");
  console.log("1. Check that your API key has sufficient credits");
  console.log(
    "2. Ensure you're using the correct providers (google, microsoft work well)"
  );
  console.log("3. Verify file size and format before sending to API");
  console.log("4. Check network connectivity and firewall settings");
  console.log("5. Monitor the console logs for detailed error messages");
};

// Run the test
testEdenAIDetailed().catch(console.error);
