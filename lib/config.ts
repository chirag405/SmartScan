import Constants from "expo-constants";

// Environment configuration for React Native
export const config = {
  // Eden AI - OCR & Document Processing
  edenAI: {
    apiKey:
      Constants.expoConfig?.extra?.edenAiApiKey ||
      process.env.EXPO_PUBLIC_EDEN_AI_API_KEY,
    // Synchronous OCR endpoint for images
    ocrEndpoint: "https://api.edenai.run/v2/ocr/ocr",
    // Asynchronous OCR endpoint for multipage PDFs
    ocrAsyncEndpoint: "https://api.edenai.run/v2/ocr/ocr_async",
    // Get async OCR results endpoint
    ocrAsyncResultEndpoint: "https://api.edenai.run/v2/ocr/ocr_async",
  },

  // OpenAI API
  openai: {
    apiKey:
      Constants.expoConfig?.extra?.openaiApiKey ||
      process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  },

  // Supabase
  supabase: {
    url:
      Constants.expoConfig?.extra?.supabaseUrl ||
      process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey:
      Constants.expoConfig?.extra?.supabaseAnonKey ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Feature flags
  features: {
    enableOfflineMode: false,
    enableDebugLogs: __DEV__,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
  },
};

// Validation function to check if all required config is present
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.edenAI.apiKey) {
    errors.push("Eden AI API key is required");
  }

  if (!config.openai.apiKey) {
    errors.push("OpenAI API key is required");
  }

  if (!config.supabase.url) {
    errors.push("Supabase URL is required");
  }

  if (!config.supabase.anonKey) {
    errors.push("Supabase anonymous key is required");
  }

  if (errors.length > 0) {
    console.error("Configuration errors:", errors);
    return false;
  }

  return true;
};

// Helper function to log configuration status
export const logConfigStatus = () => {
  if (__DEV__) {
    console.log("📋 Configuration Status:");
    console.log(
      "- Eden AI API:",
      config.edenAI.apiKey ? "✅ Configured" : "❌ Missing"
    );
    console.log(
      "- OpenAI API:",
      config.openai.apiKey ? "✅ Configured" : "❌ Missing"
    );
    console.log(
      "- Supabase URL:",
      config.supabase.url ? "✅ Configured" : "❌ Missing"
    );
    console.log(
      "- Supabase Key:",
      config.supabase.anonKey ? "✅ Configured" : "❌ Missing"
    );
  }
};
