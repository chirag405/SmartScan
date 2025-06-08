/**
 * Auth Fix Script
 *
 * This script checks and fixes user authentication issues by ensuring
 * that authenticated users have corresponding profiles in the users table.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables:");
  if (!supabaseUrl) console.error("- EXPO_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) console.error("- EXPO_PUBLIC_SUPABASE_ANON_KEY");

  console.log(
    "\nPlease make sure you have a .env.local file with the required variables"
  );
  process.exit(1);
}

// Initialize Supabase client with anon key (limited permissions)
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuth() {
  console.log("🔍 Checking authentication status...");

  try {
    // Get current session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error("❌ Error fetching session:", sessionError.message);
      process.exit(1);
    }

    if (!sessionData.session) {
      console.log("⚠️ No active session found. Please sign in first.");
      process.exit(0);
    }

    const currentUser = sessionData.session.user;
    console.log(`✅ Found active session for user: ${currentUser.email}`);

    // Check if user has a profile in the public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Error checking user profile:", profileError.message);

      if (profileError.code === "42P01") {
        console.log(
          "\n⚠️ The users table does not exist. Run the init-database.js script first."
        );
      }

      process.exit(1);
    }

    if (!userProfile) {
      console.log(
        "⚠️ User does not have a profile in the users table. Creating one..."
      );

      // Create user profile
      const newUserProfile = {
        id: currentUser.id,
        email: currentUser.email,
        full_name:
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_count: 0,
        storage_used_mb: 0,
        subscription_tier: "free",
        email_verified: !!currentUser.email_confirmed_at,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("users")
        .insert(newUserProfile)
        .select()
        .single();

      if (createError) {
        console.error("❌ Failed to create user profile:", createError.message);
        console.log("\nPossible reasons:");
        console.log("- The users table might not exist");
        console.log("- The anonymous key might not have insert permissions");
        console.log("- There might be a conflict with an existing user");
        process.exit(1);
      }

      console.log("✅ User profile created successfully!");
    } else {
      console.log("✅ User profile exists in the database.");

      // Optional: Check for and fix any inconsistencies
      let needsUpdate = false;
      const updates = {};

      if (userProfile.email !== currentUser.email) {
        console.log(
          `⚠️ Email mismatch: DB has ${userProfile.email}, Auth has ${currentUser.email}`
        );
        updates.email = currentUser.email;
        needsUpdate = true;
      }

      const metadataName =
        currentUser.user_metadata?.full_name || currentUser.user_metadata?.name;
      if (metadataName && !userProfile.full_name) {
        console.log("⚠️ User profile is missing name information, updating...");
        updates.full_name = metadataName;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log("🔄 Updating user profile with correct information...");
        updates.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("users")
          .update(updates)
          .eq("id", currentUser.id);

        if (updateError) {
          console.error(
            "❌ Failed to update user profile:",
            updateError.message
          );
        } else {
          console.log("✅ User profile updated successfully!");
        }
      }
    }

    console.log("\n🔎 Checking for common authentication issues...");

    // Verify session works properly by making a test request
    const { data: testData, error: testError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (testError) {
      console.error("❌ Authentication test failed:", testError.message);
      console.log("\nPossible issues:");
      console.log("- Row Level Security (RLS) policies might be misconfigured");
      console.log("- The session might be expired");
      console.log("- The user might not have the correct permissions");
    } else if (!testData) {
      console.error(
        "❌ Authentication test failed: Unable to fetch own user data"
      );
    } else {
      console.log(
        "✅ Authentication test passed! Session is working correctly."
      );
    }

    console.log("\n🏁 Auth check complete!");
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    process.exit(1);
  }
}

// Run the auth fix script
fixAuth().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
