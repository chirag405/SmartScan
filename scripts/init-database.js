/**
 * Database Initialization Script
 *
 * This script checks for required database tables and creates them if they don't exist.
 * It ensures that the app can work properly even after a database reset.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Note: This requires a service key with admin privileges

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("- EXPO_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) console.error("- SUPABASE_SERVICE_KEY");

  console.log("\nPlease make sure you have:");
  console.log("1. Created a .env.local file with the required variables");
  console.log(
    "2. Added a SUPABASE_SERVICE_KEY (this is different from the anon key)"
  );
  console.log(
    "   You can get this from the Supabase dashboard > Project Settings > API > service_role key"
  );

  process.exit(1);
}

// Initialize Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeDatabase() {
  console.log("🔍 Checking database structure...");

  try {
    // Check if users table exists
    const { data: usersTable, error: usersError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (usersError && usersError.code === "42P01") {
      // Table does not exist
      console.log("📦 Creating users table...");

      // SQL to create users table
      const { error: createError } = await supabase.rpc("create_users_table");

      if (createError) {
        console.error("❌ Failed to create users table:", createError.message);
        console.log(
          "\nTry creating the table manually in the Supabase dashboard with this SQL:"
        );
        console.log(`
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  document_count INTEGER DEFAULT 0,
  storage_used_mb FLOAT DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  email_verified BOOLEAN DEFAULT false
);

-- Add RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can read their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Function to create a user profile after sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`);
      } else {
        console.log("✅ Users table created successfully");
      }
    } else if (usersError) {
      console.error("❌ Error checking users table:", usersError.message);
    } else {
      console.log("✅ Users table exists");
    }

    // Check if documents table exists
    const { data: documentsTable, error: documentsError } = await supabase
      .from("documents")
      .select("id")
      .limit(1);

    if (documentsError && documentsError.code === "42P01") {
      // Table does not exist
      console.log("📦 Creating documents table...");

      // SQL to create documents table
      const { error: createError } = await supabase.rpc(
        "create_documents_table"
      );

      if (createError) {
        console.error(
          "❌ Failed to create documents table:",
          createError.message
        );
        console.log(
          "\nTry creating the table manually in the Supabase dashboard."
        );
      } else {
        console.log("✅ Documents table created successfully");
      }
    } else if (documentsError) {
      console.error(
        "❌ Error checking documents table:",
        documentsError.message
      );
    } else {
      console.log("✅ Documents table exists");
    }

    console.log("\n🔄 Checking database functions...");

    // Check if user creation function exists
    const { data: funcData, error: funcError } = await supabase.rpc(
      "check_function_exists",
      {
        function_name: "handle_new_user",
      }
    );

    if (funcError) {
      console.error(
        "❌ Error checking for handle_new_user function:",
        funcError.message
      );
      console.log("   You may need to create this function manually.");
    } else if (!funcData) {
      console.log("📦 Creating user profile creation function and trigger...");
      // This would require executing raw SQL which may not be possible with the anon key
      console.log(
        "❓ Unable to automatically create function. Please create it manually in the Supabase dashboard."
      );
    } else {
      console.log("✅ User profile creation function exists");
    }

    console.log("\n🏁 Database initialization complete!");
  } catch (error) {
    console.error(
      "❌ Unexpected error during database initialization:",
      error.message
    );
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
