// Test Buffer polyfill functionality
const { Buffer } = require("buffer");

console.log("🔧 Buffer Polyfill Test");
console.log("=" * 30);

try {
  // Test 1: Basic Buffer creation
  const testBuffer = Buffer.from("Hello World", "utf8");
  console.log("✅ Buffer creation:", testBuffer.length, "bytes");

  // Test 2: Buffer from array
  const arrayBuffer = Buffer.from([72, 101, 108, 108, 111]);
  console.log("✅ Buffer from array:", arrayBuffer.toString());

  // Test 3: Buffer.isBuffer check
  console.log("✅ Buffer.isBuffer check:", Buffer.isBuffer(testBuffer));

  // Test 4: Mock React Native Blob data
  const mockFileData = {
    size: 100,
    type: "application/pdf",
    data: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
    constructor: { name: "Blob" },
    slice: () => {},
    close: () => {},
  };

  console.log("\n📱 Mock React Native Blob test:");
  console.log("  - Size:", mockFileData.size);
  console.log("  - Type:", mockFileData.type);
  console.log("  - Has data property:", "data" in mockFileData);
  console.log("  - Data type:", typeof mockFileData.data);

  // Test the conversion logic we implemented
  if (
    mockFileData &&
    typeof mockFileData === "object" &&
    "data" in mockFileData &&
    mockFileData.data
  ) {
    console.log("✅ React Native Blob detected");
    const data = mockFileData.data;
    if (typeof data === "string") {
      const buffer = Buffer.from(data, "base64");
      console.log("✅ Converted to buffer:", buffer.length, "bytes");
      console.log("✅ Buffer content:", buffer.toString());
    }
  }

  console.log("\n🎉 Buffer polyfill test completed successfully!");
} catch (error) {
  console.error("❌ Buffer polyfill test failed:", error);
}
