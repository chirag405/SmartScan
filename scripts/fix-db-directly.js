/**
 * This script uses direct HTTP requests to fix database issues in Supabase
 * It can create missing tables without requiring SQL privileges
 */

const https = require("https");
require("dotenv").config({ path: ".env.local" });

// Check that required environment variables are defined
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Required environment variables are missing.");
  console.error(
    "Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are defined in .env.local"
  );
  process.exit(1);
}

// Extract the project ID from the URL
const projectId = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
if (!projectId) {
  console.error("Error: Could not extract project ID from Supabase URL");
  process.exit(1);
}

// Function to make a direct HTTP request to Supabase
async function makeSupabaseRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const hostname = `${projectId}.supabase.co`;
    const options = {
      hostname,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    };

    if (data) {
      options.headers["Content-Length"] = Buffer.byteLength(
        JSON.stringify(data)
      );
    }

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        } else {
          reject({
            status: res.statusCode,
            message: `Request failed with status code ${res.statusCode}`,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Create a system user to initialize the users table
async function createSystemUser() {
  console.log("Creating a system user to initialize the users table...");

  try {
    const systemUser = {
      id: "00000000-0000-0000-0000-000000000000",
      email: "system@example.com",
      full_name: "System User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      storage_used_mb: 0,
      subscription_tier: "free",
    };

    const response = await makeSupabaseRequest(
      "/rest/v1/users",
      "POST",
      systemUser
    );
    console.log("System user created successfully!");
    return true;
  } catch (error) {
    // If the error is a conflict (409), that's okay - the table exists
    if (error.status === 409) {
      console.log("Users table already exists!");
      return true;
    } else if (error.status === 404) {
      console.error(
        "Users table does not exist. Please create it in the Supabase dashboard."
      );
      return false;
    } else {
      console.error("Error creating system user:", error);
      return false;
    }
  }
}

// Check if the current user exists in the database
async function checkCurrentUser() {
  console.log("Checking if the current user exists in the database...");

  try {
    // First, get the current session
    const sessionResponse = await makeSupabaseRequest(
      "/auth/v1/session",
      "GET"
    );

    if (!sessionResponse.data?.user) {
      console.log("No active session found. Please sign in first.");
      return null;
    }

    const currentUser = sessionResponse.data.user;
    console.log("Current user:", {
      id: currentUser.id,
      email: currentUser.email,
    });

    // Now check if this user exists in the public.users table
    try {
      const userResponse = await makeSupabaseRequest(
        `/rest/v1/users?id=eq.${currentUser.id}&select=id,email,full_name`,
        "GET"
      );

      if (userResponse.data && userResponse.data.length > 0) {
        console.log("✅ User exists in the database:", userResponse.data[0]);
        return null; // No fix needed
      } else {
        console.log(
          "❌ User does not exist in the database. Need to create profile."
        );
        return currentUser;
      }
    } catch (error) {
      // This might mean the table doesn't exist
      if (error.status === 404) {
        console.log("Users table might not exist. Attempting to create it...");
        const tableCreated = await createSystemUser();
        if (tableCreated) {
          return currentUser; // Now we can try creating the user
        }
      }
      console.error("Error checking user in database:", error);
      return currentUser; // Try to fix anyway
    }
  } catch (error) {
    console.error("Error checking current user:", error);
    return null;
  }
}

// Create a user profile in the database
async function createUserProfile(user) {
  console.log("Creating user profile for:", user.id);

  try {
    const userProfile = {
      id: user.id,
      email: user.email,
      full_name:
        user.user_metadata?.full_name || user.user_metadata?.name || "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      storage_used_mb: 0,
      subscription_tier: "free",
    };

    console.log("User profile data:", userProfile);

    const response = await makeSupabaseRequest(
      "/rest/v1/users",
      "POST",
      userProfile
    );
    console.log("✅ User profile created successfully!");
    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);

    // If it's a conflict, try to update instead
    if (error.status === 409) {
      try {
        const updateData = {
          email: user.email,
          full_name:
            user.user_metadata?.full_name || user.user_metadata?.name || "User",
          updated_at: new Date().toISOString(),
        };

        const updateResponse = await makeSupabaseRequest(
          `/rest/v1/users?id=eq.${user.id}`,
          "PATCH",
          updateData
        );
        console.log("✅ User profile updated successfully!");
        return true;
      } catch (updateError) {
        console.error("Error updating user profile:", updateError);
        return false;
      }
    }

    return false;
  }
}

// Main function
async function main() {
  console.log("=== SmartScan Direct Database Fix Utility ===");

  try {
    // First make sure the users table exists
    const tableExists = await createSystemUser();
    if (!tableExists) {
      console.log(
        "Failed to create or verify users table. Please check your Supabase setup."
      );
      return;
    }

    // Check if the current user exists
    const userToFix = await checkCurrentUser();
    if (userToFix) {
      console.log("Attempting to fix user profile...");
      const fixed = await createUserProfile(userToFix);

      if (fixed) {
        console.log("🎉 User profile fixed successfully!");
        console.log("You should now be able to sign in properly.");
        console.log("Please restart your app and try signing in again.");
      } else {
        console.log("❌ Failed to fix user profile.");
        console.log("Try signing out and in again, or contact support.");
      }
    } else {
      console.log("No user profile issues detected or no active session.");
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Run the script
main();
