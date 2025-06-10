const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const testSupabaseStorage = async () => {
  console.log("🗄️  Supabase Storage Download Test");
  console.log("=" * 50);

  // Initialize Supabase client
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase credentials not found in .env.local");
    console.log(
      "Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
    );
    return;
  }

  console.log("✅ Supabase credentials found");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // List files in the documents bucket to find a test file
    console.log("\n📁 Listing files in documents bucket...");

    const { data: filesList, error: listError } = await supabase.storage
      .from("documents")
      .list("", { limit: 5 });

    if (listError) {
      console.error("❌ Error listing files:", listError);
      return;
    }

    if (!filesList || filesList.length === 0) {
      console.log("📭 No files found in documents bucket");

      // Create a test file to upload and then download
      console.log("\n📤 Creating test file for download test...");

      const testContent =
        "This is a test file for Supabase storage download test.";
      const testBlob = new Blob([testContent], { type: "text/plain" });
      const testFileName = `test-${Date.now()}.txt`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(testFileName, testBlob);

      if (uploadError) {
        console.error("❌ Error uploading test file:", uploadError);
        return;
      }

      console.log("✅ Test file uploaded:", uploadData.path);

      // Now download it
      console.log("\n📥 Downloading test file...");

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(uploadData.path);

      if (downloadError) {
        console.error("❌ Error downloading test file:", downloadError);
        return;
      }

      console.log("✅ Test file downloaded successfully");
      console.log("📊 File data analysis:");
      console.log("  - Type:", typeof fileData);
      console.log("  - Constructor:", fileData.constructor.name);
      console.log("  - Size:", fileData.size);
      console.log("  - Type property:", fileData.type);
      console.log("  - Is Buffer:", Buffer.isBuffer(fileData));
      console.log(
        "  - Has arrayBuffer method:",
        typeof fileData.arrayBuffer === "function"
      );
      console.log(
        "  - Has stream method:",
        typeof fileData.stream === "function"
      );
      console.log("  - Has text method:", typeof fileData.text === "function");

      // Test different conversion methods
      console.log("\n🔄 Testing conversion methods...");

      try {
        if (typeof fileData.arrayBuffer === "function") {
          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(
            "✅ arrayBuffer() method works, buffer size:",
            buffer.length
          );
        } else {
          console.log("❌ arrayBuffer() method not available");
        }
      } catch (error) {
        console.error("❌ Error with arrayBuffer():", error.message);
      }

      try {
        if (typeof fileData.text === "function") {
          const text = await fileData.text();
          console.log("✅ text() method works, content length:", text.length);
          console.log("📄 Content preview:", text.substring(0, 50));
        } else {
          console.log("❌ text() method not available");
        }
      } catch (error) {
        console.error("❌ Error with text():", error.message);
      }

      try {
        if (Buffer.isBuffer(fileData)) {
          console.log(
            "✅ File data is already a Buffer, size:",
            fileData.length
          );
        } else {
          const buffer = Buffer.from(fileData);
          console.log(
            "✅ Direct Buffer conversion works, size:",
            buffer.length
          );
        }
      } catch (error) {
        console.error("❌ Error with direct Buffer conversion:", error.message);
      }

      // Clean up test file
      console.log("\n🧹 Cleaning up test file...");
      await supabase.storage.from("documents").remove([uploadData.path]);
      console.log("✅ Test file cleaned up");
    } else {
      console.log(`📋 Found ${filesList.length} files:`);
      filesList.forEach((file, index) => {
        console.log(
          `  ${index + 1}. ${file.name} (${file.metadata?.size || "unknown size"})`
        );
      });

      // Test downloading the first file
      const testFile = filesList[0];
      console.log(`\n📥 Testing download of: ${testFile.name}`);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(testFile.name);

      if (downloadError) {
        console.error("❌ Error downloading file:", downloadError);
        return;
      }

      console.log("✅ File downloaded successfully");
      console.log("📊 File data analysis:");
      console.log("  - Type:", typeof fileData);
      console.log("  - Constructor:", fileData.constructor.name);
      console.log("  - Size:", fileData.size);
      console.log("  - Type property:", fileData.type);
      console.log("  - Is Buffer:", Buffer.isBuffer(fileData));
      console.log(
        "  - Has arrayBuffer method:",
        typeof fileData.arrayBuffer === "function"
      );
      console.log(
        "  - Has stream method:",
        typeof fileData.stream === "function"
      );
      console.log("  - Has text method:", typeof fileData.text === "function");

      // Test different conversion methods
      console.log("\n🔄 Testing conversion methods...");

      try {
        if (typeof fileData.arrayBuffer === "function") {
          const arrayBuffer = await fileData.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(
            "✅ arrayBuffer() method works, buffer size:",
            buffer.length
          );
        } else {
          console.log("❌ arrayBuffer() method not available");
        }
      } catch (error) {
        console.error("❌ Error with arrayBuffer():", error.message);
      }

      try {
        if (Buffer.isBuffer(fileData)) {
          console.log(
            "✅ File data is already a Buffer, size:",
            fileData.length
          );
        } else {
          const buffer = Buffer.from(fileData);
          console.log(
            "✅ Direct Buffer conversion works, size:",
            buffer.length
          );
        }
      } catch (error) {
        console.error("❌ Error with direct Buffer conversion:", error.message);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("\n🎉 Supabase storage test completed!");
};

// Run the test
testSupabaseStorage().catch(console.error);
