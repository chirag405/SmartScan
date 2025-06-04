// Environment configuration checker
export const checkEnvironmentConfig = () => {
  const config = {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  const missingVars = [];

  if (!config.supabaseUrl) {
    missingVars.push("EXPO_PUBLIC_SUPABASE_URL");
  }

  if (!config.supabaseAnonKey) {
    missingVars.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingVars.length > 0) {
    console.error("❌ Missing environment variables:", missingVars);
    console.log("Please add these to your .env file:");
    missingVars.forEach((varName) => {
      console.log(`${varName}=your_value_here`);
    });
    return false;
  }

  console.log("✅ Environment configuration looks good!");
  console.log("Supabase URL:", config.supabaseUrl?.substring(0, 30) + "...");
  console.log("Anon Key configured:", !!config.supabaseAnonKey);

  return true;
};

export const debugAuthConfig = () => {
  console.log("🔧 Authentication Configuration Debug:");
  console.log("App Scheme: smartscan");
  console.log("Redirect URI: ", "smartscan://");

  // Test if we can create a supabase client
  try {
    const { supabase } = require("./supabaseClient");
    console.log("✅ Supabase client created successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to create Supabase client:", error);
    return false;
  }
};
