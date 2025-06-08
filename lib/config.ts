import Constants from "expo-constants";

// Environment configuration for React Native
export const config = {
  // Google Cloud Vision API - Note: Direct API calls from React Native require API key authentication
  googleVision: {
    apiKey:
      Constants.expoConfig?.extra?.googleVisionApiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY,
    endpoint: "https://vision.googleapis.com/v1/images:annotate",
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

  if (!config.googleVision.apiKey) {
    errors.push("Google Vision API key is required");
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
      "- Google Vision API:",
      config.googleVision.apiKey ? "✅ Configured" : "❌ Missing"
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
